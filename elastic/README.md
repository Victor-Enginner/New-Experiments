# 🛡️ SOAR SIEM — Camada Elastic do Portfolio

Central de segurança (SOC/SIEM) com resposta automatizada (SOAR),
alimentada pelos sensores já existentes no `ai-experiments`.

## Categorias (por que é SOC/SIEM e não NOC)

| Camada  | O que faz                                            | Aqui                                   |
|---------|------------------------------------------------------|----------------------------------------|
| **NOC** | disponibilidade/desempenho (uptime, latência)        | não cobre (fora de escopo)             |
| **SIEM**| coleta, normaliza e correlaciona eventos de segurança| `netguard`, `egress`, `usage-history` → ES |
| **SOC** | operação que investiga e responde                    | `rules/evaluate.mjs` + dashboards       |
| **SOAR**| automação e resposta orquestrada                     | `egress.js` bloqueia + `actions/soar.mjs` |

## Arquitetura

```
┌─ sensores (já existem) ──────────────────────────────┐
│ netguard/netwatch  → netguard-alerts.jsonl  (JSONL)  │
│ lib/egress.js      → egress-blocks.jsonl    (JSONL)  │
│ usage-history.js   → banco do 9router (apiKey mascarada)│
│ noc-agent          → noc-health.jsonl       (JSONL)  │
└────────────┬─────────────────────────────────────────┘
             ▼
┌─ ingestão (shippers) ────────────────────────────────┐
│ netwatch-shipper → soc-netguard (via _bulk)          │
│ egress-shipper   → soc-egress                        │
│ usage-shipper    → soc-usage                         │
│ noc-shipper      → soc-noc                           │
│ idps-shipper     → soc-idps                          │
└────────────┬─────────────────────────────────────────┘
             ▼
┌─ detecção e resposta ────────────────────────────────┐
│ SIEM:  rules/*.json (estilo Sigma) → evaluate.mjs    │
│ NOC:   noc-agent (uptime/latência/disco/CPU/RAM)     │
│ IDPS:  idps-engine (signatures em tempo real)        │
│ findings → actions/soar.mjs → quarantine + notify    │
└──────────────────────────────────────────────────────┘
┌─ identidade (SSO) ───────────────────────────────────┐
│ Keycloak (realm soc, OIDC) → Kibana (login SSO)      │
└──────────────────────────────────────────────────────┘
```

## Fluxo de um bloqueio → ES → quarentena

1. `lib/egress.js` intercepta `http.request`/`fetch` e **bloqueia** (403/erro).
2. Grava a linha em `output/security/egress-blocks.jsonl` (sink, quando `sinkFile` setado).
3. `egress-shipper` faz tail (offset persistido) e envia ao índice `soc-egress`.
4. `evaluate.mjs` roda a regra `EGR-EXFIL-CANDIDATE` (≥5 bloqueios por host em 10m).
5. `soar.mjs` aplica **quarentena**: registra em `quarantine.jsonl` e, se
   `QUARANTINE_RELAY_URL` estiver definido, chama o relay que aplica
   `quarantineHost()` em tempo real.

## Uso

```bash
# enviar o que já existe e sair
npm run soc:ship

# tail em tempo real (por sensor)
npm run soc:netguard
npm run soc:egress
npm run soc:usage

# avaliar regras e ver findings
npm run soc:eval

# avaliar + executar resposta automatizada (SOAR)
npm run soc:soar

# sem Elastic? veja o que seria enviado
node elastic/ingest/netwatch-shipper.mjs --dry-run
```

## NOC (disponibilidade/desempenho)

`noc-agent.mjs` coleta a cada `NOC_INTERVAL_MS` (default 30s) e grava em
`output/security/noc-health.jsonl`:
- **por serviço** (`kind: service`): ES, Kibana, Keycloak (https 8443) e router
  → `up`, `latencyMs`, `http`, `reason`;
- **por sistema** (`kind: system`): `mem_pct`, `load1/5/15`, `disk_root_pct`,
  `disk_home_pct` (via `/proc`, sem root).

Regras NOC em `rules/noc-*`: `NOC-SVC-DOWN` (serviço fora do ar), `NOC-HIGH-LATENCY`
(≥2s), `NOC-DISK-PRESSURE` (≥90% em `/` ou `/home`).

```bash
npm run noc:agent    # coleta (--once para uma rodada)
npm run noc:ship     # envia ao soc-noc
```

## IDPS (detecção e prevenção de intrusão)

`idps-engine.mjs` consome os sinks dos sensores em tempo real (offset próprio em
`elastic/state/idps`, não disputa com os shippers) e aplica signatures:

| Signature | Alvo | Ação |
|---|---|---|
| `IDPS-EGR-BURST` | host bloqueado ≥4x em 10min | **quarantine** (egress passa a bloquear) |
| `IDPS-MITM-ARP` | ARP spoofing / gateway trocado | notify (critical) |
| `IDPS-DNS-HIJACK` | nameservers alterados | notify (high) |
| `IDPS-SUS-CONN` | conexão suspeita | notify (medium) |
| `IDPS-SVC-OUT` | serviço crítico fora do ar (NOC) | notify (critical) |

Cada decisão vai para `idps-decisions.jsonl` → `soc-idps`. Ações executadas via
`actions/soar.mjs` (exporta `applyFinding`, reusado pelo engine). Dedup por
`signature|target` com cooldown (`IDPS_COOLDOWN_MS`, default 15min).

```bash
npm run idps:engine   # monitor contínuo (--once para avaliar o que há)
npm run idps:ship     # envia decisões ao soc-idps
```

## Keycloak — SSO/OIDC para o Kibana

Keycloak 26.7 nativo (sem Docker) em `https://127.0.0.1:8443` (TLS self-signed),
realm `soc`. O login do Kibana (`https://127.0.0.1:5601`) oferece dois providers:
**"Entrar com Keycloak (SSO)"** (OIDC, principal) e **"Entrar com usuário do
Elasticsearch"** (fallback).

Fluxo: Kibana → realm OIDC `oidc1` no ES → Keycloak cliente `kibana-sso`
(confidencial) → usuário `soc-admin` (papel `soc-analyst`) → role mapping ES
`oidc-soc-admin` → `kibana_admin`.

Credenciais locais (`~/.elastic/`, modo 600): `keycloak_admin_password`,
`keycloak_soc_password`, `keycloak_kibana_secret`, `keycloak_keystore_password`.

> ⚠️ **Licença**: o realm OIDC do ES é feature Platinum/Enterprise. O cluster
> está em **trial (30 dias)** — `_license/start_trial`. Ao expirar, volta para
> Basic e o provider OIDC desativa (login básico continua funcionando).

## Configuração (env)

| Variável                 | Padrão              | Uso                              |
|--------------------------|---------------------|----------------------------------|
| `ES_URL`                 | `http://localhost:9200` | endpoint do Elasticsearch     |
| `ES_USER` / `ES_PASS`    | —                   | auth básica                      |
| `ES_PASS_FILE`           | —                   | arquivo com a senha (evita env)  |
| `ES_TLS_CA` / `ES_TLS_REJECT` | —            | CA TLS do ES + exigir certificado |
| `ES_API_KEY`             | —                   | API key (sobressai user/pass)    |
| `ES_INDEX_PREFIX`        | `soc`               | prefixo dos índices SIEM         |
| `ES_POLL_MS`             | `2000`              | intervalo do tailer/poll         |
| `EGRESS_SINK_FILE`       | —                   | arquivo JSONL onde o egress grava bloqueios |
| `QUARANTINE_RELAY_URL`   | —                   | endpoint SOAR para bloqueio em tempo real |
| `NOC_INTERVAL_MS`        | `30000`             | intervalo de coleta do noc-agent |
| `IDPS_WINDOW_MS`         | `600000` (10min)    | janela das signatures do IDPS |
| `IDPS_COOLDOWN_MS`       | `900000` (15min)    | dedup de ação por signature/target |
| `IDPS_EGR_BURST`         | `4`                 | limiar de bloqueios p/ IDPS-EGR-BURST |

> Segurança: **nenhuma API key crua chega ao Elastic**. `usage-history.js`
> mascara a chave (`sk-…xYz`) antes de serializar — o shipper apenas repassa.
> O estado processado dos tailers fica em `elastic/state/` (gitignored).

## Próximos passos

- [x] ELK real rodando **nativo** no sandbox (ver seção abaixo)
- [x] Detecção validada de ponta a ponta (findings no ES real)
- [x] NOC (disponibilidade/desempenho) + IDPS (tempo real/prevenção)
- [x] Keycloak SSO/OIDC no Kibana
- [ ] Dashboards Kibana sobre a data view `soc-*` (já criada)
- [ ] Hot-reload da quarentena nos processos que rodam o egress (ler `quarantine.jsonl` no install)
- [ ] `security:all` + CI com os shippers em modo `--once`
- [ ] Extender `EGRESS_SINK_FILE` para os serviços containerizados (a2a/mcp)

## ELK nativo no sandbox (sem Docker)

Esta máquina é um sandbox Flatpak **sem root** (sem Docker/sudo). O ELK real
roda com os **binários oficiais** em `~/elastic-native` (fora do repo):

| Componente | Local                                  | Endpoint               |
|------------|----------------------------------------|------------------------|
| Elasticsearch | `~/elastic-native/es` (8.15.3)      | `https://127.0.0.1:9200` |
| Kibana     | `~/elastic-native/kibana` (8.15.3)     | `https://127.0.0.1:5601` |

### Ciclo de vida

```bash
./elastic/start-native.sh          # sobe ES (se parado) e Kibana
./elastic/start-native.sh --no-kib # só o ES
./elastic/stop-native.sh           # derruba Kibana + ES (gracioso)
```

### Credenciais (somente locais, modo 600, fora do repo)

| Arquivo                    | Conteúdo                         |
|----------------------------|----------------------------------|
| `~/.elastic/es_password`   | superusuário `elastic` (login da UI) |
| `~/.elastic/kibana_password` | senha do `kibana_system`       |
| `~/.elastic/shipper_password` | usuário `shipper` (ingestão)  |
| `~/.elastic/env.sh`        | variáveis dos shippers (source antes de rodar) |

```bash
source ~/.elastic/env.sh && npm run soc:ship
```

### Bootstrap de segurança (nativo)

Feito uma vez via `curl`/`script -qec` (os binários exigem TTY real):

1. `elasticsearch-reset-password -u elastic -i` → senha do `elastic`;
2. `_security/user/_password` → `kibana_system`;
3. `_security/role/soc_ingest` → escopo mínimo (`read/write/create_index/…`
   só em `soc-*` + `monitor`/`manage_ilm` no cluster);
4. `_security/user/shipper` → usuário de ingestão com `soc_ingest`.

### Índices e mapping

O index template `_index_template/soc` (criado por `ensureSocTemplate()`, nos
shippers) força campos de agregação como `keyword` — sem isso, o mapeamento
dinâmico cria `text` e as regras agregadas (`EGR-EXFIL`, `USG-ANOMALY-COST`)
falham com `Fielddata is disabled`.

```bash
# validar pipeline de ponta a ponta
source ~/.elastic/env.sh
npm run soc:ship      # envia o que há nos JSONL/banco
npm run soc:eval      # findings → rules/*.json
npm run soc:soar -- --dry-run   # ações sem aplicar quarentena real
```

Resultado esperado com os dados de exemplo (`output/security/*.jsonl`):
`NETG-ARP-SPOOF`, `NETG-DNS-HIJACK`, `NETG-GW-CHANGE`, `EGR-EXFIL-CANDIDATE`.

### Troubleshooting nativo

- `~/elastic-native/logs/es-start.log` / `kibana.log` — logs de subida;
- Kibana não conecta ao ES: rodar `script -qec` para `kibana-keystore` e
  conferir `elasticsearch.password` + `xpack.security.encryptionKey`;
- `Fielddata is disabled…`: re-criar o índice (apagar `soc-*` por nome — o
  wildcard é bloqueado por `destructive_requires_name`) e reenviar;
- sem TTY real (`reset-password`/`keystore` penduram): usar
  `script -qec "comando"`.

## Deploy em Docker Swarm (proteção total)

Docker **Compose standalone não é usado** — o SOAR SIEM sobe via **Docker
Swarm**, que dá: secrets cifrados em repouso (Raft) e em trânsito (mTLS),
overlay IPsec/VXLAN entre serviços e reconciliação contínua de estado.

```
elastic/docker-stack.yml   → stack (ES + kibana + es-setup + shipper)
elastic/docker/            → Dockerfiles + entrypoints endurecidos
elastic/deploy.sh          → bootstrap completo
```

**Modelo de ameaça coberto:**

| Controle                    | Implementação                                        |
|-----------------------------|------------------------------------------------------|
| Segredos sem env            | senhas em `/run/secrets/*` (tmpfs), nunca em `environment` |
| TLS de ponta a ponta        | ES https + transport mTLS (`client.auth=required`), Kibana https |
| Usuário de menor privilégio | shippers autenticam como `shipper` (role `soc_ingest`, só `soc-*`); nunca `elastic` |
| Rede cifrada                | overlay `encrypted: 'true'` (IPsec/VXLAN)            |
| Containers endurecidos      | `cap_drop: ALL`, `no-new-privileges`, rootfs `read_only` (ES/shipper) |
| CA compartilhada            | volume `escerts` → kibana/shipper confiam no `http_ca.crt` |

**Deploy (na máquina que tem Docker Engine):**

```bash
./elastic/deploy.sh
```

O script: cria/inicia o swarm, gera segredos (openssl) e certificado
autoassinado do Kibana, builda as 3 imagens, faz `docker stack deploy`,
aguarda o ES ficar verde, roda o bootstrap (`kibana_system` + usuário
`shipper`), copia o CA para `~/.elastic/ca.crt` e deixa credenciais prontas
em `~/.elastic/env.sh`.

Depois, para usar os shippers **na máquina host** (ou um agendamento):

```bash
source ~/.elastic/env.sh && npm run soc:ship
```

> ⚠️ **Nesta máquina atual** o Docker não está instalado (sem `sudo`), então
> o `deploy.sh` deve rodar em uma máquina com Docker Engine + swarm.
> Enquanto isso, tudo pode ser validado localmente:
>
> ```bash
> npm run soc:ship -- --dry-run   # ou: node elastic/ingest/<shipper>.mjs --dry-run
> ```

### Bootstrap de segurança (o que o es-setup faz)

1. espera o ES ficar saudável;
2. define a senha do `kibana_system` (o ES só define a do `elastic`);
3. cria o papel `soc_ingest` com escopo mínimo (`read/write/create_index`
   apenas em `soc-*` + `monitor`/`manage_ilm` no cluster);
4. cria o usuário `shipper` com esse papel.

### Troubleshooting

```bash
docker service logs soc_elasticsearch   # ES
docker service logs soc_kibana         # kibana
docker service logs soc_shipper        # shippers
docker service ps soc_es-setup         # bootstrap (one-shot)
```
