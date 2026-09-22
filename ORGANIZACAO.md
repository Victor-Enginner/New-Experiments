# 🗺️ ORGANIZAÇÃO DO PORTFÓLIO — Mapa Mental

> Mapa mestre de `meu-portfolio/`: o que é cada pasta, em qual repositório
> vive, e o que ainda falta separar. Atualizado conforme os repos são criados.
>
> Relacionado: [`semantica.md`](semantica.md) — semântica do SOC/SIEM (camada
> `elastic/`). Este arquivo é o mapa do **portfólio inteiro**.

## 📦 Repositórios

### Separados (git próprio, pastas no mesmo lugar — caminhos não mudam)

| Pasta local | Repositório GitHub | Status |
|---|---|---|
| `vitrine/` | [`Victor-Enginner/vitrine`](https://github.com/Victor-Enginner/vitrine) | ✅ criado via API + push (217 arquivos) + `CLAUDE.md` |
| `data-sales-agent/` | [`Victor-Enginner/data-sales-agent`](https://github.com/Victor-Enginner/data-sales-agent) | ✅ criado via API + push (32 arquivos) + `CLAUDE.md` |
| `fabrica-renda-ia/` | [`Victor-Enginner/fabrica-renda-ia`](https://github.com/Victor-Enginner/fabrica-renda-ia) | ✅ criado via API + push (58 arquivos) + `CLAUDE.md` + calendário 7d |
| `umbraala/` | [`Victor-Enginner/umbraala`](https://github.com/Victor-Enginner/umbraala) | ✅ Fase 0: `docs/DECISIONS.md` + scaffold Vite/React/TS (build verde) |
| forks de coleções (11) | ex.: `awesome-ai-agents`, `awesome-llm-apps`, `awesome-cli-coding-agents`, `awesome-agent-skills`, `awesome-copilot` + 6 | ✅ agentes importados; autoria dos originais preservada |

### Umbrella / site

| Pasta local | Repositório GitHub | Papel |
|---|---|---|
| raiz (`public-pages/`, `elastic/`, docs) | [`Victor-Enginner/New-Experiments`](https://github.com/Victor-Enginner/New-Experiments) | Site estático (branch `gh-pages`) + documentação + SOC |

**Site no ar:** <https://victor-enginner.github.io/New-Experiments/> — Pages ativo
(branch `gh-pages`, modo legacy) com **deploy automático**: todo push no `main`
roda `.github/workflows/pages.yml` (peaceiris/actions-gh-pages) e republica
`public-pages/` (substitui o fluxo manual `/tmp/ghp-site`).

**Dashboard operacional:** <https://victor-enginner.github.io/New-Experiments/dashboard/>

### Pastas que ficam como estão (por ora)

| Pasta | Papel | Observação |
|---|---|---|
| `ai-experiments/` (4,1 GB) | sensores do SOC + laboratório | **não versionar** (gitignore) — dividir em sub-repos no futuro se quiser |
| `elastic/` | SOC/SIEM (código do New-Experiments) | docs em `semantica.md` |
| `semantica/` | clone do OSS `semantica-agi/semantica` (referência) | **não é nosso** — não publicar como se fosse |
| `docs/` | evidências de pentest/forense | **privado** — nunca commitar (gitignore — blindado em `1c5eed5`+) |
| `PentestGPT/`, `claw-code-main/` | fora do escopo | gitignore |
| `src/`, `public/`, `index.html` | template Vite raiz (legado) | candidato a remoção futura |

## 🤖 Planos (a combinar)

- **~10+ repos de agentes CLI/LLM/VLM** — coleções tipo `awesome-ai-agents`,
  `awesome-cli-agents` + nossos próprios agentes (cada um vira repo próprio;
  os nossos agentes podem se atualizar sozinhos via git pull).
- **Automação de conteúdo** — `AgentTube` (YouTube) avaliar após auditoria de
  segurança; social via API oficial (não usar o `Social-Media-Automation`,
  commercial-prohibited + incompleto).

## ✅ Checklist de separação

- [x] `.gitignore` local criado em cada repo novo (sem `.env`, `node_modules`, `*.log`)
- [x] Auditoria: zero segredos nos 3 commits iniciais
- [x] Umbrella: os 3 removidos do index e adicionados ao `.gitignore`
- [x] Criar os repos no GitHub — 3 projetos + `umbraala` + 11 forks (via API)
- [x] `git remote add` + `git push` em cada um
- [x] Ativar GitHub Pages no `New-Experiments` (branch `gh-pages`) — via API
- [x] Deploy automático via GitHub Actions (`pages.yml` → push em `gh-pages`)
- [ ] UMBRAALA Fase 1 (tokens/emblema) — próximo marco do repo `umbraala`
- [ ] Dev server `pnpm dev` do umbraala verificado em navegador (build já verde)
