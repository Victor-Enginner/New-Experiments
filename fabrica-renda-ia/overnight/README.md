# 🌙 Overnight — Produção Noturna Multi-IA

Você dorme, o time de IAs produz. Este sistema orquestra o trabalho do **opencode** (eu) com **sixth**, **cline** e routers de LLM (omnirouter, 9router, freebuff) através de um **mapa JSON compartilhado**.

## 🗺️ Como funciona (3 peças)

```
┌─────────────────────────────────────────────────────┐
│  workflow.json  ← O MAPA (single source of truth)   │
│  tasks: id, tipo, owner, status, dependências       │
└──────────┬──────────────────────┬───────────────────┘
           │ executa minhas tasks │ lê e desenha
           ▼                      ▼
   overnight.js           dashboard.html
   (runner resumível)     (quadro visual 5s refresh)
           │
           ▼ produz
   output/ → briefs, packs, e-books, datasets, sites 3D
```

**A colaboração entre IAs é assíncrona via arquivo** — não existe "conversa" em tempo real entre ferramentas. O sixth executa a task dele, edita `workflow.json` marcando `done`, e meu modo `--daemon` detecta e destrava as tasks dependentes. É assim que times de agentes realmente cooperam.

## 🚀 Operação

```bash
cd overnight

# 1. Veja o mapa visual (deixe aberto no navegador)
node dashboard-server.js        # → http://localhost:3500

# 2. Rode a noite inteira (loop, pega tasks de outros agentes quando concluídas)
node overnight.js --daemon

# Ou só uma passada:
node overnight.js --once

# 3. Sem LLM (instantâneo, estrutura completa p/ validar)
node overnight.js --once --mock

# 4. Progresso no terminal
node overnight.js --status

# 5. Gerar pacote de instruções p/ colar nas outras IAs
node overnight.js --export-owner sixth   # → handoff-sixth.md
node overnight.js --export-owner cline   # → handoff-cline.md
```

## 🤖 Dividindo o trabalho com sixth / cline

1. `node overnight.js --export-owner sixth` → gera `handoff-sixth.md`
2. Abra o sixth e cole o conteúdo do handoff como instrução
3. Ele entrega → marca a task como `done` no `workflow.json`
4. Eu (em `--daemon`) vejo e executo o que dependia daquilo

O `handoff-cline.md` já sai com instruções reais (converter a landing 3D em Next 14 + shadcn/ui + Magic UI via CLI oficial).

## 🔌 Plugando seus routers (omnirouter, 9router, freebuff)

Edite `providers.json`: cada um é um endpoint **OpenAI-compatível** (`/v1/chat/completions`). Preencha `baseURL`, `apiKey`, `modelo`, mude `enabled: true`. O runner tenta na `ordem` e cai para o próximo se falhar/timeout. Se **todos** caírem → templates determinísticos (a noite nunca trava).

## 🎨 Arsenal visual (assets/)

Componentes **próprios** no estilo shadcn/Magic UI/ReactBits — livres p/ uso comercial, zero build:

| Backgrounds | Componentes |
|---|---|
| `bgAurora` (gradiente animado) | `glassCard` (glassmorphism) |
| `bgParticles` (constelação canvas) | `tiltCard` (3D segue o mouse) |
| `bgDotGrid` (dots + spotlight) | `gradientBorder` (borda cônica animada) |
| `bgGridLines` (grid perspectiva 3D) | `spotlightCard`, `marquee`, `counter`, `revealScroll` |

Fontes oficiais para expandir (MIT, via CLI — **não scraping**): ver `assets/registry.json`. Sites como 3dwebsites.design / superdesign.dev / originkit.dev: use como **referência de direção de arte**, recrie com nossos componentes (licenças variam — assuma protegido até confirmar).

## 📝 Adicionando tasks ao mapa

```json
{
  "id": "D1",
  "fase": "F2",
  "tipo": "gerar-landing-3d",
  "titulo": "Landing do Pack E-commerce",
  "owner": "opencode",
  "status": "pending",
  "dependencias": ["A1"],
  "llmObrigatorio": false,
  "params": { "briefDe": "output/brief-advocacia.json", "background": "bgGridLines", "saida": "output/site-ecommerce/index.html" }
}
```

Tipos que EU executo: `copywriting`, `gerar-landing-3d`, `gerar-pack-prompts`, `gerar-ebook`, `gerar-dataset`. Outros tipos → `skipped` (ou crie um handler em `lib/handlers.js`).

## ⚠️ Regras da noite

- **1 erro não para a fila** — task vira `error`, o resto continua
- **Logs** em `logs/overnight-AAAA-MM-DD.log` (leia de manhã como um standup)
- **Tasks humanas (H1/H2) são intencionais**: revisão e publicação exigem você. Produto sem revisão = reembolso; sem publicação = R$ 0.
