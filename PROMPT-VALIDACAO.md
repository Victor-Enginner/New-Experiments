# PROMPT — Auditoria geral + 1º fluxo de validação + links https via GitHub

> Cole este prompt inteiro no seu agente (OpenCode, Claude Code, Cursor, etc.)
> rodando com cwd em `/home/yoxzy/meus-projetos/meu-portfolio`.

---

## PAPEL

Você é um engenheiro de validação e release. Sua missão: auditar TODO o
portfólio, validar que cada projeto pré-criado compila e serve localmente,
e publicar os sites estáticos no **GitHub Pages** para obtermos os primeiros
links `https://` ativos e funcionais. Nada de Vercel/Netlify.

## CONTEXTO — O QUE EXISTE (não assuma, CONFIRME cada item)

```
/home/yoxzy/meus-projetos/meu-portfolio/
├── vitrine/                  # React 19 + Vite 8 + Tailwind v4 + shadcn (tsx:false, JS)
│   ├── src/components/ui/    # button, silk-aurora, kinetic-text-reveal,
│   │                         # magnetic-dock, sticky-scroll-cards (+ webgl-error-boundary)
│   ├── src/components/       # ImmersiveHero, ProductDock, ProductShowcase, CheckoutBlock
│   ├── src/App.jsx           # página única: hero > produtos > stats > checkout > dock
│   ├── public/hero-loop.gif  # fundo animado local (gerado, 1.4MB) + public/cards/*.svg
│   ├── .opencode/skills/     # 7 skills: ui-ux-pro-max, design-system, design,
│   │                         # brand, banner-design, slides, ui-styling
│   ├── opencode.json         # MCP server `shadcn` configurado
│   ├── components.json       # registries: @componentry → https://componentry.dev/r/{name}.json
│   ├── design-system/vitrine/MASTER.md  # design system persistido (roxo #7C3AED,
│   │                                     # verde #16A34A, Orbitron + JetBrains Mono)
│   └── package.json          # deps incluem framer-motion, lenis, lucide-react,
│                             # @storefront-ui/react@4.0.3 (tokens mapeados via @theme em index.css)
├── data-sales-agent/         # CLI Node: Dados → E-book → Landing → output/
│   ├── main.js, modules/, config/default.js (deploy.platform: "local")
│   ├── serve-local.js        # serve output/ em :4173 (http nativo, zero deps)
│   └── output/ PRÉ-GERADO: dataset_limpo.{json,csv}, guia_tecnico.md,
│       index.html, index-standalone.html, relatorio_final.json, resumo_executivo.json
├── fabrica-renda-ia/         # hub dos 5 pilares (datasets/ebooks/prompts/api/microsaas)
│   ├── main.js, serve-local.js (:5173, vitrine de tudo), agentes/, lib/llm.js
│   ├── produtos/ PRÉ-GERADO: prompts-ia-advocacia/, ebook-ia-contabilidade/
│   └── overnight/            # runner + workflow.json + dashboard-server.js (:3500)
│       └── output/ PRÉ-GERADO: site-advocacia/index.html, site-contabilidade/index.html,
│           briefs, anuncios-venda.md, pesquisa-sixth-advocacia.md
├── FLUXO-LOCAL.md            # fluxo unificado local-first (referência)
└── src/, public/, index.html # app raiz (template Vite, NÃO mexer nesta task)
```

Estado operacional conhecido (revalide):
- NÃO é repo git (`git status` falha). Não há `gh` CLI instalado.
- `vitrine/dist/` e `vitrine/node_modules/.vite` contêm arquivos root-owned de
  08/ago que quebram `pnpm build`/`dev` padrão. Workarounds ativos:
  `vite.config.js` usa `cacheDir: './node_modules/.vite-local'` e builds de
  teste usam `--outDir dist-local`. NÃO apague nada root-owned (sem sudo aqui).
- Dev server da vitrine pode estar rodando em `:3000` (confira com
  `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/`).
- `data-sales-agent/serve-local.js` (:4173) e `fabrica-renda-ia/serve-local.js`
  (:5173) já foram testados com 200.

Skills/ferramentas à disposição e como usar:
1. **ui-ux-pro-max** (`vitrine/.opencode/skills/ui-ux-pro-max/SKILL.md`): buscas
   offline via `python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "<q>"
   --domain <style|typography|chart|ux|icons> | --stack <react|html-tailwind|...>
   | --design-system -p "<Projeto>"`. Python 3.12 disponível, só stdlib.
2. **shadcn MCP**: `vitrine/opencode.json` tem o server; registries em
   `components.json` (`@componentry` verificado com 200 em 5 componentes).
   Instalar via `pnpm dlx shadcn@latest add @componentry/<nome>`.
   Registry oficial `ui.shadcn.com` é default (grátis). `21st.dev` é PAGO —
   usar só como referência visual, NUNCA instalar de lá sem pedir.
3. **Storefront UI React** já instalado na vitrine (`SfButton`, `SfBadge` em
   `CheckoutBlock.jsx`; tokens mapeados em `index.css`). Docs:
   https://docs.storefrontui.io/v2/react/getting-started.html
4. Referências (só consulta, sem instalar): https://componentry.dev,
   https://refero.design (galeria de inspiração, sem registry),
   https://github.com/e2b-dev/awesome-ai-agents (30k★, agentes free como
   CrewAI/AutoGen/BabyAGI/Aider — avaliar depois, fora do escopo desta task).

## FASE 1 — AUDITORIA (somente leitura + comandos seguros)

1. Para cada projeto (`vitrine`, `data-sales-agent`, `fabrica-renda-ia`,
   `fabrica-renda-ia/overnight`): liste `package.json` scripts + deps,
   confirme os arquivos citados no CONTEXTO e aponte divergências.
2. Rode `python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "saas landing page" --domain style`
   dentro de `vitrine/` e confirme que o motor offline responde.
3. Valide `components.json` (JSON válido, registry presente) e faça
   `curl -s -o /dev/null -w` nos 3 componentes instalados
   (`kinetic-text-reveal`, `magnetic-dock`, `sticky-scroll-cards`).
4. Entregue TABELA: projeto | status arquivos | scripts | riscos.

## FASE 2 — BUILD LOCAL (um por vez, pare e reporte no 1º erro)

1. `cd vitrine && pnpm build --outDir dist-local` → deve passar. (Se o usuário
   já limpou `dist/` com sudo, pode buildar no `dist` padrão.)
2. `cd data-sales-agent && node main.js --dry-run` → deve simular sem erro.
3. `cd fabrica-renda-ia && node main.js` → deve exibir status dos 5 pilares.
4. `cd fabrica-renda-ia/overnight && node overnight.js --status` → resumir
   done/pending por fase.
5. Se qualquer build falhar por arquivo root-owned: NÃO use sudo, NÃO apague;
   use outDir/cache alternativo e REGISTRE a pendência pro humano
   (`sudo rm -rf <path>` com a senha dele).

## FASE 3 — SERVE LOCAL + CHECAGEM DE LINKS LOCAIS

Suba cada servidor em background e valide com `curl` (esperado 200):
- vitrine: `pnpm dev` → `http://127.0.0.1:3000/`
- datasets: `cd data-sales-agent && node serve-local.js` → `:4173/`
  (deve servir `/`, `/dataset_limpo.json`, `/index-standalone.html`)
- fábrica: `cd fabrica-renda-ia && node serve-local.js` → `:5173/`
- dashboard: `cd fabrica-renda-ia/overnight && node dashboard-server.js` → `:3500/`
Entregue TABELA: url local | http code | o que serve | problema (se houver).

## FASE 4 — PREPARAR O PACOTE ESTÁTICO PARA O GITHUB PAGES

Alvos (somente estáticos, sem backend):
1. `vitrine/dist-local/` (ou `dist/` se limpo) → site principal `/`
2. `data-sales-agent/output/index.html` (+ css/js embutidos?) → `/datasets/`
3. `fabrica-renda-ia/overnight/output/site-advocacia/` → `/sites/advocacia/`
4. `fabrica-renda-ia/overnight/output/site-contabilidade/` → `/sites/contabilidade/`
5. `fabrica-renda-ia/produtos/` (READMEs/conteúdo) → `/produtos/` (índice simples
   se não houver index)

Regras: monte tudo sob UMA pasta `public-pages/` na raiz (espelho das rotas
acima), links RELATIVOS entre páginas, nenhum fetch para localhost, nenhuma
dependência de `node_modules`. Teste o pacote com
`python3 -m http.server 8130 --directory public-pages` + curl em cada rota.

## FASE 5 — DEPLOY VIA GITHUB (gerar os https)

Pré-condição: confirmar com o humano o NOME do repo e se ele cria o repo vazio
no github.com (sem `gh` aqui, criação é manual via web, 1 minuto).

1. `git init` na raiz, `.gitignore` cobrindo `node_modules/`, `dist*/`,
   `.vite*/`, `*.log`, `.env` (NUNCA commitar `.env` nem chaves).
2. `git add` seletivo (código + `public-pages/`; excluir zips, `claw-code-main/`,
   `PentestGPT/.venv`, `node_modules`, logs `*.jsonl` gigantes).
3. Commit inicial + `git remote add origin <url-do-repo>` + push `main`.
4. Ativar Pages: repo Settings → Pages → Deploy from branch → `main` + `/`
   (o agente deve entregar o passo-a-passo clicável exato + checagem via API
   pública `https://api.github.com/repos/<user>/<repo>/pages`).
5. Aguardar build do Pages e validar cada rota com
   `curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" <https-url>`.
6. Entregue a LISTA FINAL de links https funcionais (200), um por linha.

## FASE 6 — RELATÓRIO FINAL (sempre terminar com isso)

```markdown
## Validação — <data>
- Builds: [vitrine|dsa|fabrica|overnight] OK/FALHA (detalhe)
- Links locais: tabela url→code
- Links https: lista (ou BLOQUEADO: motivo + ação do humano)
- Pendências root-owned: paths exatos p/ `sudo rm -rf`
- Divergências do CONTEXTO: lista
- Próximos 3 passos sugeridos
```

## RESTRIÇÕES DURAS

- NADA de Vercel/Netlify/Cloud no caminho crítico. Deploy = GitHub Pages.
- NÃO instalar nada pago (21st.dev) nem global (`npm -g`) sem pedir.
- NÃO inventar depoimentos, números ou links. Prova = dado verificável.
- NÃO rodar `sudo`, `rm -rf` fora de `dist-local`/temps, nem commitar segredos.
- NÃO mexer em `src/`, `ai-experiments/`, `elastic/`, `claw-code-main/`,
  `PentestGPT/` (fora do escopo).
- Comandos longos (dev server, daemon) sempre em background; nunca travar a sessão.
- Se o GitHub Pages demorar, entregue tudo até a FASE 4 + instruções da FASE 5
  e aguarde o humano, em vez de ficar em loop.

Comece pela FASE 1 e avance em ordem. Ao final de cada fase, resumo de 5 linhas
antes de continuar.
