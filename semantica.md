# Semântica do Projeto — SOAR SIEM do Portfólio (camada `elastic/`)

> ⚠️ **Nota de nomenclatura (importante):** este documento descreve o **seu** SOC/SIEM,
> implementado em Node.js na pasta [`elastic/`](elastic/) na raiz deste portfólio.
> Ele **não** se refere ao projeto OSS [`semantica-agi/semantica`](https://github.com/semantica-agi/semantica)
> (uma biblioteca Python de knowledge graph, sem relação com segurança operacional),
> que está clonado em [`semantica/`](semantica/) apenas como referência/estudo.
> Não há vínculo de código entre os dois.

---

## 1. Visão Geral

### 1.1 O que é
**SOAR SIEM — Camada Elastic do Portfólio**: um centro de operações de segurança
(SOC/SIEM) com resposta automatizada (SOAR), alimentado pelos sensores que já
existem no projeto [`ai-experiments`](ai-experiments).

### 1.2 Propósito
Coletar, normalizar e correlacionar eventos de segurança (bloqueios de egress,
alertas de rede, uso de API, saúde de serviços), detectar incidentes com regras
estilo Sigma, monitorar disponibilidade (NOC), detectar intrusões em tempo real
(IDPS) e executar respostas automatizadas (SOAR: notificação e quarentena).

### 1.3 Camadas — por que é SOC/SIEM e não só NOC

| Camada  | O que faz                                             | Implementação aqui                          |
|---------|-------------------------------------------------------|---------------------------------------------|
| **NOC** | disponibilidade/desempenho (uptime, latência, disco)  | `noc/noc-agent.mjs` + regras `rules/noc-*`  |
| **SIEM**| coleta, normaliza e correlaciona eventos de segurança | shippers → ES + `rules/*.json` → `evaluate.mjs` |
| **SOC** | operação que investiga e responde                     | `rules/evaluate.mjs` + dashboards Kibana    |
| **SOAR**| automação e resposta orquestrada                      | `lib/egress.js` bloqueia + `actions/soar.mjs` |

### 1.4 Tecnologias
- **Elastic Stack** (Elasticsearch 8.15.3, Kibana 8.15.3, Beats) — nativo ou via Docker Swarm
- **Node.js/ESM** — shippers, NOC, IDPS, SOAR (zero dependência extra)
- **Keycloak 26.7** — SSO/OIDC para o Kibana (realm `soc`)
- **Regras estilo Sigma** — `elastic/rules/*.json`
- **Docker Swarm** — orquestração para deploy (secrets + mTLS + overlay cifrado)

---

## 2. Arquitetura

```
┌─ sensores (já existem em ai-experiments) ─────────────┐
│ netguard/netwatch  → netguard-alerts.jsonl  (JSONL)   │
│ lib/egress.js      → egress-blocks.jsonl    (JSONL)   │
│ urlhaus-lookup.js  → urlhaus-alerts.jsonl   (JSONL)   │
│ usage-history.js   → banco do 9router (apiKey mascarada)│
│ noc-agent          → noc-health.jsonl       (JSONL)   │
└────────────┬──────────────────────────────────────────┘
             ▼
┌─ ingestão (elastic/ingest + noc/ + idps/) ────────────┐
│ netwatch-shipper → soc-netguard (via _bulk)           │
│ egress-shipper   → soc-egress                         │
│ usage-shipper    → soc-usage                          │
│ urlhaus-shipper  → soc-urlhaus                        │
│ noc-shipper      → soc-noc                            │
│ idps-shipper     → soc-idps                           │
└────────────┬──────────────────────────────────────────┘
             ▼
┌─ detecção e resposta ─────────────────────────────────┐
│ SIEM:  rules/*.json (estilo Sigma) → evaluate.mjs     │
│ NOC:   noc-agent (uptime/latência/disco/CPU/RAM)      │
│ IDPS:  idps-engine (signatures em tempo real)         │
│ findings → actions/soar.mjs → quarantine + notify     │
└───────────────────────────────────────────────────────┘
┌─ identidade (SSO) ────────────────────────────────────┐
│ Keycloak (realm soc, OIDC) → Kibana (login SSO)       │
└───────────────────────────────────────────────────────┘
```

**Índices** (prefixo `ES_INDEX_PREFIX`, default `soc`): `soc-netguard`,
`soc-egress`, `soc-usage`, `soc-urlhaus`, `soc-noc`, `soc-idps`.

### 2.1 Fluxo de um bloqueio → Elasticsearch → quarentena

1. `lib/egress.js` intercepta `http.request`/`fetch` e **bloqueia** (403/erro).
2. Grava a linha em `output/security/egress-blocks.jsonl` (sink, quando `sinkFile` setado).
3. `egress-shipper` faz tail (offset persistido em `elastic/state/`) e envia ao índice `soc-egress`.
4. `evaluate.mjs` roda a regra `EGR-EXFIL-CANDIDATE` (≥5 bloqueios por host em 10 min).
5. `soar.mjs` aplica **quarentena**: registra em `quarantine.jsonl` e, se
   `QUARANTINE_RELAY_URL` estiver definido, chama o relay que aplica
   `quarantineHost()` em tempo real.

---

## 3. Componentes Detalhados

### 3.1 NOC (disponibilidade/desempenho)
- **Implementação:** `noc/noc-agent.mjs` coleta a cada `NOC_INTERVAL_MS` (default 30 s)
  e grava em `output/security/noc-health.jsonl`.
- **Coleta por serviço** (`kind: service`): ES, Kibana, Keycloak (https 8443) e router
  → `up`, `latencyMs`, `http`, `reason`.
- **Coleta por sistema** (`kind: system`): `mem_pct`, `load1/5/15`, `disk_root_pct`,
  `disk_home_pct` (via `/proc`, sem root).
- **Regras:** `NOC-SVC-DOWN`, `NOC-HIGH-LATENCY` (≥2 s), `NOC-DISK-PRESSURE` (≥90% em `/` ou `/home`).
- **Uso:** `npm run noc:agent` (coleta, `--once` para uma rodada), `npm run noc:ship` (envia ao `soc-noc`).

### 3.2 IDPS (detecção e prevenção de intrusão)
- **Implementação:** `idps/idps-engine.mjs` consome os sinks dos sensores em tempo real
  (offset próprio em `elastic/state/idps`, não disputa com os shippers) e aplica signatures.
- **Signatures:**

| Signature | Alvo | Ação |
|---|---|---|
| `IDPS-EGR-BURST` | host bloqueado ≥4x em 10 min | **quarantine** (egress passa a bloquear) |
| `IDPS-MITM-ARP` | ARP spoofing / gateway trocado | notify (critical) |
| `IDPS-DNS-HIJACK` | nameservers alterados | notify (high) |
| `IDPS-SUS-CONN` | conexão suspeita | notify (medium) |
| `IDPS-SVC-OUT` | serviço crítico fora do ar (NOC) | notify (critical) |

- Cada decisão vai para `idps-decisions.jsonl` → `soc-idps`; ações executadas via
  `actions/soar.mjs` (exporta `applyFinding`, reusado pelo engine).
- Dedup por `signature|target` com cooldown (`IDPS_COOLDOWN_MS`, default 15 min).
- **Uso:** `npm run idps:engine` (monitor contínuo, `--once` para avaliar o que há), `npm run idps:ship`.

### 3.3 SIEM (coleta, normalização e correlação)
- **Implementação:** `rules/*.json` (estilo Sigma) avaliados por `rules/evaluate.mjs`.
- **Dois formatos de detecção:**
  - `{ query, minCount, timeRange }` — simples: count ≥ minCount;
  - `{ aggs: { field, minCount|maxCost, timeRange }, query }` — agregação por campo
    (usado por `EGR-EXFIL-CANDIDATE` e `USG-ANOMALY-COST`).
- **Regras SIEM/NOC avaliadas pelo evaluator** (as `engine: idps` ficam para o engine em tempo real):
  `EGR-EXFIL-CANDIDATE`, `NETG-ARP-SPOOF`, `NETG-DNS-HIJACK`, `NETG-GW-CHANGE`,
  `NOC-DISK-PRESSURE`, `NOC-HIGH-LATENCY`, `NOC-SVC-DOWN`, `USG-ANOMALY-COST`.
- **Índice template:** `ensureSocTemplate()` força campos de agregação como `keyword` —
  sem isso, o mapeamento dinâmico cria `text` e as regras agregadas falham com
  `Fielddata is disabled`.

### 3.4 SOAR (automação e resposta orquestrada)
- **Implementação:** `actions/soar.mjs` recebe os findings do `evaluate.mjs` e executa
  a ação definida na regra (`rule.response.action`):
  - `notify` — registra o incidente (console + log JSONL);
  - `quarantine` — adiciona o host à quarentena (`quarantine.jsonl` + relay opcional).
- **Uso:** `npm run soc:soar` (roda eval + aplica), `npm run soc:soar -- --dry-run`
  (mostra sem agir), `node elastic/actions/soar.mjs --rule EGR-EXFIL-CANDIDATE`.

### 3.5 SSO (Keycloak — identidade)
- Keycloak 26.7 **nativo** (sem Docker) em `https://127.0.0.1:8443` (TLS self-signed), realm `soc`.
- O login do Kibana (`https://127.0.0.1:5601`) oferece dois providers:
  **"Entrar com Keycloak (SSO)"** (OIDC, principal) e **"Entrar com usuário do
  Elasticsearch"** (fallback).
- Fluxo: Kibana → realm OIDC `oidc1` no ES → Keycloak cliente `kibana-sso`
  (confidencial) → usuário `soc-admin` (papel `soc-analyst`) → role mapping ES
  `oidc-soc-admin` → `kibana_admin`.
- Credenciais locais (`~/.elastic/`, modo 600): `keycloak_admin_password`,
  `keycloak_soc_password`, `keycloak_kibana_secret`, `keycloak_keystore_password`.
- > ⚠️ **Licença (atualizado em 22/09/2026)**: o realm OIDC é feature
  > Platinum/Enterprise. O trial (iniciado em 03/08/2026) **expirou em
  > 02/09/2026** e o cluster foi migrado para **Basic**
  > (`POST /_license/start_basic?acknowledge=true`). Em Basic o realm `oidc1`
  > é **ignorado**: o SSO/Keycloak fica **indisponível** até uma licença
  > Platinum+; no Kibana use o login "usuário do Elasticsearch". O servidor
  > Keycloak continua no ar em `https://127.0.0.1:8443`.

---

## 4. Projetos Complementares no Portfólio

> Os dois projetos abaixo moram na raiz deste portfólio e são **independentes**
> do SOAR SIEM — a relação descrita é de ecossistema (o SIEM protege a
> infraestrutura que os executa), não de integração de código implementada.

### 4.1 Fabrica-Renda-IA (`fabrica-renda-ia/`)
- **Propósito:** hub de agentes autônomos que transformam recursos em produtos
  vendáveis (datasets, e-books, prompts, APIs, micro-SaaS).
- **Tecnologia:** Python + Node.js (`main.js`), Ollama para LLM local, pnpm.
- **Uso:** `cd fabrica-renda-ia && npm install && node main.js`.

### 4.2 Data-Sales-Agent (`data-sales-agent/`)
- **Propósito:** pipeline que transforma dados brutos em produtos comerciais
  (dataset limpo → e-book → landing page → relatório).
- **Módulos:** Data Collector → Content Generator → Landing Builder → Relatório.
- **Uso:** `cd data-sales-agent && node main.js` (pipeline completo) ou
  `node main.js --module 1` (apenas coleta).

---

## 5. Fluxo de Dados

```
[Sensores (ai-experiments)] → [Shippers] → [Elasticsearch (índices soc-*)]
                                                ↓
                              [SIEM rules] → [NOC] → [IDPS] → [SOAR] → notify / quarantine
```

- **Implementado:** todo o caminho acima (validado de ponta a ponta — ver §10).
- **Opcional/futuro:** exportar eventos normalizados do SIEM como insumo para o
  Fabrica-Renda-IA / Data-Sales-Agent (hoje os dois projetos não leem os índices `soc-*`).

---

## 6. Configuração (env)

Precedência: **env → arquivo local (`elastic/.env`) → defaults**.

| Variável | Padrão | Uso |
|----------|---------|-----|
| `ES_URL` | `http://localhost:9200` | endpoint do Elasticsearch |
| `ES_USER` / `ES_PASS` | — | autenticação básica |
| `ES_PASS_FILE` | — | arquivo com a senha (evita env crua) |
| `ES_TLS_CA` / `ES_TLS_REJECT` | — | CA TLS do ES + exigir certificado |
| `ES_API_KEY` | — | API key (sobressai user/pass) |
| `ES_INDEX_PREFIX` | `soc` | prefixo dos índices SIEM |
| `ES_POLL_MS` | `2000` | intervalo do tailer/poll |
| `STATE_DIR` | `elastic/state/` | offset processado dos tailers (gitignored) |
| `SECURITY_OUTPUT_DIR` | `ai-experiments/output/security` | diretório dos sinks JSONL |
| `EGRESS_SINK_FILE` | — | arquivo JSONL onde o egress grava bloqueios |
| `QUARANTINE_RELAY_URL` | — | endpoint SOAR para bloqueio em tempo real |
| `NOC_INTERVAL_MS` | `30000` (30 s) | intervalo de coleta do noc-agent |
| `IDPS_WINDOW_MS` | `600000` (10 min) | janela das signatures do IDPS |
| `IDPS_COOLDOWN_MS` | `900000` (15 min) | dedup de ação por signature/target |
| `IDPS_EGR_BURST` | `4` | limiar de bloqueios p/ `IDPS-EGR-BURST` |

> **Segurança:** nenhuma API key crua chega ao Elastic — `usage-history.js`
> mascara a chave (`sk-…xYz`) antes de serializar; o shipper apenas repassa.

---

## 7. Deploy

### 7.1 Native (sandbox — nesta máquina)
Esta máquina é um sandbox **sem root/sem Docker**: o ELK real roda com os
**binários oficiais** em `~/elastic-native/` (fora do repo).

| Componente | Local | Endpoint |
|---|---|---|
| Elasticsearch 8.15.3 | `~/elastic-native/es` | `https://127.0.0.1:9200` |
| Kibana 8.15.3 | `~/elastic-native/kibana` | `https://127.0.0.1:5601` |

```bash
./elastic/start-native.sh          # sobe ES (se parado) e Kibana
./elastic/start-native.sh --no-kib # só o ES
./elastic/stop-native.sh           # derruba Kibana + ES (gracioso)
```

> O default do código é `http://localhost:9200`, mas o ELK nativo usa **https** —
> as variáveis corretas (`ES_URL`, `ES_TLS_CA`, senhas) ficam em `~/.elastic/env.sh`
> (`source ~/.elastic/env.sh` antes de rodar os shippers).

### 7.2 Docker Swarm (máquina com Docker Engine)
Docker Compose standalone **não é usado** — o stack sobe via Swarm (secrets
cifrados em repouso, mTLS em trânsito, overlay IPsec/VXLAN, reconciliação contínua):

```
elastic/docker-stack.yml   → stack (ES + kibana + es-setup + shipper)
elastic/docker/            → Dockerfiles + entrypoints endurecidos
elastic/deploy.sh          → bootstrap completo (swarm + secrets + certs + build + deploy)
```

> ⚠️ Nesta máquina o Docker não está instalado — `./elastic/deploy.sh` roda em
> uma máquina com Docker Engine + swarm. Enquanto isso, valide localmente com
> `node elastic/ingest/<shipper>.mjs --dry-run`.

**Modelo de ameaça coberto:**

| Controle | Implementação |
|---|---|
| Segredos sem env | senhas em `/run/secrets/*` (tmpfs), nunca em `environment` |
| TLS de ponta a ponta | ES https + transport mTLS (`client.auth=required`), Kibana https |
| Menor privilégio | shippers autenticam como `shipper` (role `soc_ingest`, só `soc-*`); nunca `elastic` |
| Rede cifrada | overlay `encrypted: 'true'` (IPsec/VXLAN) |
| Containers endurecidos | `cap_drop: ALL`, `no-new-privileges`, rootfs `read_only` (ES/shipper) |
| CA compartilhada | volume `escerts` → kibana/shipper confiam no `http_ca.crt` |

---

## 8. Segurança

- **Senhas:** nunca em `environment` — arquivos locais com modo 600 em `~/.elastic/`
  (`es_password`, `kibana_password`, `shipper_password`, `env.sh`, chaves do Keycloak).
- **TLS:** ES usa HTTPS + transport mTLS (`client.auth=required`); Kibana usa HTTPS.
- **Privilégio:** shippers autenticam-se como `shipper` (role `soc_ingest`, escopo
  mínimo em `soc-*`), nunca como `elastic`.
- **Estado:** offsets dos tailers em `elastic/state/` (gitignored).
- **Mascaramento:** API keys dos sensores são ofuscadas antes de sair do sensor.

---

## 9. Uso

> ⚠️ Os comandos `npm run …` existem no `package.json` da **raiz do portfólio**
> (`meu-portfolio/`) — rode-os de lá. Dentro de `semantica/` (clone OSS em Python)
> **não há scripts npm**.

```bash
# Enviar o que já existe e sair
npm run soc:ship

# Tail em tempo real (por sensor)
npm run soc:netguard
npm run soc:egress
npm run soc:usage

# NOC e IDPS
npm run noc:agent     # coleta (--once para uma rodada)
npm run noc:ship      # envia ao soc-noc
npm run idps:engine   # monitor contínuo (--once para avaliar)
npm run idps:ship     # envia decisões ao soc-idps

# Avaliar regras e ver findings
npm run soc:eval
npm run soc:eval -- --rule EGR-EXFIL-CANDIDATE
npm run soc:eval -- --json

# Avaliar + executar resposta automatizada (SOAR)
npm run soc:soar
npm run soc:soar -- --dry-run     # sem aplicar quarentena

# Sem Elastic? ver o que seria enviado
node elastic/ingest/netwatch-shipper.mjs --dry-run
```

**Validação de ponta a ponta** (com ELK nativo no ar):

```bash
./elastic/start-native.sh
source ~/.elastic/env.sh
npm run soc:ship                   # envia o que há nos JSONL/banco
npm run soc:eval                   # findings → rules/*.json
npm run soc:soar -- --dry-run      # ações sem aplicar quarentena real
```

Resultado esperado com os dados de exemplo (`output/security/*.jsonl`):
`NETG-ARP-SPOOF`, `NETG-DNS-HIJACK`, `NETG-GW-CHANGE`, `EGR-EXFIL-CANDIDATE`.

---

## 10. Status

| Item | Status |
|------|--------|
| ELK real rodando nativamente no sandbox | ✅ Completo |
| Detecção validada de ponta a ponta (findings no ES real) | ✅ Completo |
| NOC (disponibilidade/desempenho) + IDPS (tempo real/prevenção) | ✅ Completo |
| Keycloak SSO/OIDC no Kibana | ✅ Completo |
| Dashboards Kibana sobre a data view `soc-*` | ⏳ Pendente |
| Hot-reload da quarentena nos processos egress | ⏳ Pendente |
| `security:all` + CI com os shippers em modo `--once` | ⏳ Pendente |
| Estender `EGRESS_SINK_FILE` para serviços containerizados | ⏳ Pendente |

**Conferido em 2026-09-22 (sem ELK no ar):** shippers respondem em `--dry-run`,
`soc:eval` carrega as 8 regras SIEM/NOC e `soc:soar -- --dry-run` roda sem ações —
falhando apenas na conexão com o ES (`ECONNREFUSED 127.0.0.1:9200`), esperado
com o Elasticsearch parado.

---

## 11. Recomendações para Melhoria

1. **Dashboards Kibana** — visualizações sobre a data view `soc-*` (trends de
   bloqueios, health NOC, alertas IDPS); o script `elastic/kibana-dashboards.mjs` já existe.
2. **Hot-reload da quarentena** — os processos que rodam o egress devem reler
   `quarantine.jsonl` quando novas decisões chegam.
3. **CI/CD para shippers** — testes de integração com `--once`/`--dry-run` no pipeline.
4. ~~Tratar falha de conexão no `soc:eval`~~ — **corrigido em 22/09/2026**:
   `evaluateAllDetailed()` reporta `failures`; com o ES fora, `soc:eval` e
   `soc:soar` saem com exit 1 e aviso vermelho em vez de falso verde.
5. **`usage-shipper` sem binário `sqlite3`** — a leitura do histórico do 9router
   falha com `spawnSync sqlite3 ENOENT`; instalar o CLI `sqlite3` (ou ler via
   módulo Node) para que o índice `soc-usage` receba eventos.
6. **`EGRESS_SINK_FILE` para serviços containerizados** (a2a/mcp) além de hosts tradicionais.
7. **Métricas dos shippers** — CPU/memória para alertas proativos (alimentaria o próprio NOC).

---

## 12. Referências

- [`elastic/README.md`](elastic/README.md) — documentação operacional da camada SOC (fonte primária)
- [Elastic Stack Documentation](https://www.elastic.co/guide/en/management/current/) — guia oficial do ELK
- [Sigma Rules](https://github.com/SigmaHQ/sigma) — formato de regras que inspira `rules/*.json`
- [Keycloak OIDC Integration](https://keycloak.org/docs/latest/integration/oidc/) — integração SSO
- [Docker Swarm mode](https://docs.docker.com/engine/swarm/) — orquestração do deploy

---

---

## 13. Errata de Operação (22/09/2026)

Incidentes detectados e resolvidos nesta data:

1. **Trial expirado (02/09/2026)** deixava o cluster bloqueado
   ("license is non-compliant for [security]"): autenticação recusada, saúde do
   cluster em 403 e Kibana travado em 503. Corrigido com migração para **Basic**
   (ver §3.5) — cluster `green`.
2. **Arquivos de senha sobrescritos com valores inválidos** (`es_password`,
   `kibana_password`, `shipper_password`, todos gravados em 22/09 às 04:21):
   `elastic` e `shipper` foram regenerados via REST e regravados (perm 600).
   ⚠️ `kibana_password` **continua inválido** — o valor real está apenas no
   keystore do Kibana (`elasticsearch.password`); resetar exige atualizar os
   dois juntos.
3. **File realm de recuperação**: superusuário `socadmin` em
   `~/elastic-native/es/config/users` (hash bcrypt) + realm `filerec`
   (order -10) no `elasticsearch.yml` (backup: `elasticsearch.yml.bak-20260922`).
   Mantido como via de resgate caso as senhas nativas voltem a quebrar.
4. **Falsos verdes no `soc:eval`/`soc:soar`** corrigidos (ver §11, item 4).

---

*Documento de semântica do projeto: SOAR SIEM da camada `elastic/` deste portfólio.
O clone em `semantica/` ([semantica-agi/semantica](https://github.com/semantica-agi/semantica))
é um projeto OSS independente e não faz parte desta arquitetura.*
