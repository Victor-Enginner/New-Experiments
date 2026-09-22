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
| `vitrine/` | *a criar* (sugerido: `Victor-Enginner/vitrine`) | ✅ commit inicial `9226968` (216 arquivos) |
| `data-sales-agent/` | *a criar* (sugerido: `Victor-Enginner/data-sales-agent`) | ✅ commit inicial `96cfb26` (31 arquivos) |
| `fabrica-renda-ia/` | *a criar* (sugerido: `Victor-Enginner/fabrica-renda-ia`) | ✅ commit inicial `1e14ff6` (56 arquivos) |

### Umbrella / site

| Pasta local | Repositório GitHub | Papel |
|---|---|---|
| raiz (`public-pages/`, `elastic/`, docs) | [`Victor-Enginner/New-Experiments`](https://github.com/Victor-Enginner/New-Experiments) | Site estático (branch `gh-pages`) + documentação + SOC |

### Pastas que ficam como estão (por ora)

| Pasta | Papel | Observação |
|---|---|---|
| `ai-experiments/` (4,1 GB) | sensores do SOC + laboratório | **não versionar** (gitignore) — dividir em sub-repos no futuro se quiser |
| `elastic/` | SOC/SIEM (código do New-Experiments) | docs em `semantica.md` |
| `semantica/` | clone do OSS `semantica-agi/semantica` (referência) | **não é nosso** — não publicar como se fosse |
| `docs/` | evidências de pentest/forense | **privado** — nunca commitar (gitignore) |
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
- [x] Umbrella: os3 removidos do index e adicionados ao `.gitignore`
- [ ] Criar os3 repos no github.com (1 min cada, via web)
- [ ] `git remote add` + `git push` em cada um
- [ ] Ativar GitHub Pages no `New-Experiments` (branch `gh-pages`) — pendente
- [ ] Deploy automático via GitHub Actions (opcional, após Pages ativo)
