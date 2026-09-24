# 🧠 MEMÓRIA — Handoff completo para o GPT Astra

> Tudo que foi decidido/descoberto nesta sessão sobre repos open-source,
> design UI/UX, melhorias de frontend e implementação de GitHubs open-source.
> Cole este arquivo inteiro no Astra para dar contexto contínuo.

---

## 1) Quem é o dono disso tudo

- **GitHub:** `Victor-Enginner` — portfólio em `/home/yoxzy/meus-projetos/meu-portfolio/`
- **Objetivo macro:** portfólio = **organização de repos**, cada projeto com git próprio,
  agentes por repo (`AGENTS.md`), e os agentes se atualizando via `git pull`.
- **Plano declarado:** subir **10+ repos de agentes** (CLI, LLM, VLM, awesome-lists)
  + os agentes próprios dele.

## 2) Repos próprios criados/publishados nesta sessão

| Repo | Papel | Estado |
|---|---|---|
| `Victor-Enginner/vitrine` | vitrine React do portfólio | ✅ 217 arquivos + `AGENTS.md` |
| `Victor-Enginner/data-sales-agent` | pipeline dados → e-book → landing | ✅ 32 arquivos + `AGENTS.md` |
| `Victor-Enginner/fabrica-renda-ia` | hub de produtos IA (5 pilares) | ✅ 58 arquivos + `AGENTS.md` + `calendario-7dias.md` (o usuário dispensou o calendário — NÃO gastar tempo nele) |
| `Victor-Enginner/umbraala` | **plataforma de IA (academia de engenharia de IA)** | ✅ Fase 0 + Fase 1 (ver §6) |
| `Victor-Enginner/New-Experiments` | umbrella: site estático (Pages) + SOC/SIEM `elastic/` + docs | ✅ site no ar com deploy automático |

## 3) Links de GitHub open-source que ele pediu (e veredito)

| Repo | Veredito da sessão |
|---|---|
| `darkzOGx/youtube-automation-agent` (AgentTube) | 🟡 **MADURO mas pesado** — pipeline YouTube ponta a ponta (roteiro → TTS → montagem → SEO → gates humanos → publicação). **RED FLAG: README abre com endereço de token pump.fun (memecoin)** → auditar ANTES de `npm install`, rodar isolado. Encaixe: promover os produtos dele |
| `vasani-arpit/Social-Media-Automation` | 🔴 **NÃO usar** — incompleto (README pede contribuidor), "commercial use strictly prohibited", Puppeteer sobre sessão logada viola ToS → risco de ban. Alternativa: API oficial (Bluesky/LinkedIn) |
| Coleções forkadas (13, confirmadas via API): `awesome-ai-agents`, `awesome-cli-coding-agents`, `awesome-llm-apps`, `awesome-agent-skills`, `awesome-copilot`, `awesome-claude-code`, `awesome-claude-code-subagents`, `awesome-claude-skills`, `agentic-awesome-skills`, `awesome-LLM-resources`, `continue`, `cli`, `pihole-lists` | ✅ forkados com autoria preservada — matéria-prima pra curadoria dos agentes por repo |

**Regra combinada:** nada de Social-Media-Automation; conteúdo futuro via API oficial
ou AgentTube (após auditoria); coleções awesome = insumo de curadoria.

## 4) Arquitetura de repos combinada

- **Separar ≠ mover pastas:** cada projeto ganhou `git init` DENTRO da pasta —
  nenhum caminho hardcoded quebrou (`../data-sales-agent`, `elastic/config.mjs` OK).
- **Umbrella `New-Experiments`** ficou só com: `public-pages/` (site), `elastic/` (SOC), docs.
- `.gitignore` blindado: `docs/` (**evidências de pentest — NUNCA commitar**),
  `ai-experiments/` (4,1 GB), `semantica/`, `PentestGPT/`, `claw-code-main/`, `.env`, `*.jsonl`.
- `ORGANIZACAO.md` = mapa mental do portfólio (publicado no umbrella).
- `semantica.md` = semântica do SOC/SIEM (com errata da recuperação da licença).

## 5) Site (Pages) — feito de forma 100% automatizada

- URL: `https://victor-enginner.github.io/New-Experiments/` (+ `/dashboard/`, `/datasets/`,
  `/sites/advocacia/`, `/sites/contabilidade/`, `/produtos/`) — todas 200.
- Pages ativado **via API** (branch `gh-pages`, modo legacy).
- **Deploy automático:** `.github/workflows/pages.yml` — push no `main` →
  `peaceiris/actions-gh-pages` publica `public-pages/` (o modo `workflow`/deploy-pages
  deu 404 na API, por isso o push na gh-pages).
- Dashboard operacional de IAs: `public-pages/dashboard/index.html` — design system
  da vitrine (Orbitron + JetBrains Mono), snapshot **honesto** (sem métricas inventadas).

## 6) UMBRAALA — a plataforma de IA (estado exato)

- **Fonte de verdade:** `umbraala/docs/DECISIONS.md` (inventário, stack, riscos, log §9)
  + `umbraala/docs/PROMPT-CODEX.md` (prompt de orquestração pro agente Codex — Fase 2 em diante).
- **Fase 0 ✅:** scaffold Vite+React+TS (pnpm 11 — `allowBuilds: esbuild` em
  `pnpm-workspace.yaml`, NÃO remover), build verde.
- **Fase 1 ✅ (commit `e8bd83e`):** tokens autorais (Tailwind v4 `@theme inline`:
  preto mineral `#0a0a0b`, vermelho SÓ alerta, verde orgânico = descoberta),
  **emblema autoral** (`src/components/emblema.tsx`: núcleo + 7 partes orgânicas,
  sem marcas de terceiros), primitivos **shadcn `base-nova`** (button/dialog/tooltip)
  sobre **Base UI 1.8.0** adaptados pro Vite, shell responsivo com tooltips reais,
  `prefers-reduced-motion`, **110 kB gzip** (budget < 120).
- **Fases restantes:** 2 entrada cinematográfica pulável → 3 portal (MODO DEMONSTRAÇÃO
  explícito) → 4 missão "garbage in, garbage out" (motor determinístico puro +
  testes vitest) → 5 consoles (Academia/Lab/Operações) → 6 infra real.
- **Regra de ouro do projeto:** nada finge funcionar (implementado vs simulação
  determinística vs futuro); identidade autoral — NUNCA reproduzir Umbrella/RE/Duna.

## 7) UI/UX — decisões de design que ele pediu ("melhores MCPs de UI")

- **Hierarquia combinada:** shadcn/ui = camada de operação (primitives acessíveis);
  registries (Componentry/21st.dev/Originkit) = catálogo de peças, NUNCA sistema
  visual a copiar; identidade (tokens/emblema/paisagem) = **sempre autoral**.
- **Estado da rede na sessão:** shadcn registry `base-nova` 200 em
  `https://ui.shadcn.com/r/styles/base-nova/{button,dialog,tooltip}.json`;
  **Componentry (`componentry.dev/r/*`) = 404** (limitação registrada no DECISIONS §9);
  pacote do Base UI é `@base-ui/react` (1.8.0); template base-nova usa
  `IconPlaceholder` → substituído por `lucide-react`.
- Pesquisar referências ANTES de codificar UI é ordem obrigatória do prompt mestre.
- `vitrine/components.json` usa registries `@componentry` e estilo `base-nova`.

## 8) SOC/SIEM (elastic/) — contexto operacional

- ELK recuperado: trial expirado 02/09/2026 → `POST /_license/start_basic` (Basic ativo,
  cluster green). Superusuário de resgate: file realm `socadmin` (revisar depois).
- **OIDC/SSO (Keycloak) saiu do ar** — feature Platinum; botão SSO removido do
  `kibana.yml` (login local `elastic` + `~/.elastic/es_password`).
- Bugs corrigidos: `soc:eval`/`soc:soar` falso-verde (exit 1 agora quando o ES está fora).
- Pendências: `usage-shipper` sem binário `sqlite3`; `kibana_password` de arquivo inválido
  (real só no keystore); revogar/rotar credenciais expostas na sessão.
- Dashboard Kibana "SOC SIEM — Visão Geral" + data view `soc-*` OK.

## 9) Pendências vivas (o Astra pode assumir)

1. **UMBRAALA Fase 2** — seguir `umbraala/docs/PROMPT-CODEX.md` (estado declarado lá).
2. **Auditar AgentTube** antes de instalar (isolamento, red flag memecoin).
3. **Curadoria dos ~10 repos de agentes** — escolher agentes das coleções forkadas
   pra cada repo (`AGENTS.md` de cada um já dá contexto).
4. **Limpar template Vite legado** da raiz do umbrella (`src/`, `public/`, `index.html`).
5. **Repos dos agentes PRÓPRIOS** dele (ainda não criados).
6. Deploy automático igual ao do umbrella nos outros repos (se ele quiser).
7. Segurança: revogar credenciais que circularam na sessão.

## 10) Estilo de trabalho que ele respondeu bem

- Executar sem perguntar demais; registrar divergências honestamente (sem fingir).
- Sempre validar com build/curl/testes e mostrar resultado medido.
- Docs vivas: `ORGANIZACAO.md` (portfólio), `semantica.md` (SOC),
  `DECISIONS.md` (umbraala) — atualizar a cada mudança relevante.
- Commits descritivos em pt-BR, push só quando pedido ou como parte do fluxo combinado.
