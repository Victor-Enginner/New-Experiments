# 🔌 Fluxo Local Unificado — data-sales-agent + fábrica (sem Vercel)

> Mantidos **separados**, operados **juntos**. Tudo roda e vende a partir da sua máquina.
> Vercel removida do caminho crítico. Pagamento continua externo (link), site continua local.

## 🗺️ Mapa em 30 segundos

```
[data-sales-agent]  Dados → E-book → Landing → output/ ─┐
                                                        ├→ [serve local :4173 / :5173] → link pagamento → venda
[fabrica-renda-ia]  prompts / ebooks / datasets ────────┘
                         ↕ overnight (madrugada, Ollama)
```

| Projeto | Papel | Comando guia | Serve em |
|---|---|---|---|
| `data-sales-agent/` | Pilar 1: dataset → landing de venda | `node main.js` / `npm run local` | `npm run serve` → :4173 |
| `fabrica-renda-ia/` | Pilares 2-5: prompts, ebooks, api, microsaas | `node main.js --agente X --nicho Y` | `npm run serve` → :5173 (vitrine de tudo) |
| `fabrica-renda-ia/overnight/` | Automação noturna (fila + dashboard) | `node overnight.js --once --mock` | `node dashboard-server.js` → :3500 |

## 🚀 Fluxo guiado (interativo, hoje)

```bash
# 1. Dataset → landing local
cd data-sales-agent
node main.js --dry-run        # simula
node main.js                  # gera output/
npm run serve                 # http://127.0.0.1:4173

# 2. Prompts / e-book (estrutura hoje, conteúdo à noite)
cd ../fabrica-renda-ia
node main.js --nichos
node main.js --agente prompts --nicho ia-advocacia --mock
node main.js --agente ebooks --nicho ia-advocacia --mock
npm run serve                 # http://127.0.0.1:5173 (vê tudo: produtos + sites 3D + datasets)

# 3. Revisão humana (obrigatória antes de vender)
# ver fabrica-renda-ia/REVISAO-HUMANA.md
```

## 🌙 Fluxo automático (overnight, madrugada)

```bash
cd fabrica-renda-ia/overnight
node overnight.js --status          # ver fila
node overnight.js --once --mock     # teste instantâneo
node overnight.js --once            # com LLM (Ollama gemma2, lento ~2-4h/e-book)
node overnight.js --daemon          # loop 60s, pega tasks destravadas

# Dashboard visual (outro terminal):
node dashboard-server.js            # http://localhost:3500
```

Agendar toda madrugada (systemd/cron, exemplo cron 02:00):

```cron
0 2 * * * cd /home/yoxzy/meus-projetos/meu-portfolio/fabrica-renda-ia/overnight && node overnight.js --once >> logs/cron.log 2>&1
```

## 💳 Como vender sem Vercel

1. Site fica no seu PC (`npm run serve`).
2. Pagamento via link externo na landing: Hotmart / Kiwify / Gumroad / Pix / WhatsApp (já suportado pelo `autoPublisher.js`).
3. Entrega: após pagamento confirmado, envie ZIP do `output/` ou link do Kaggle/Gumroad.
4. (Opcional) Expor temporariamente sem deploy:
   ```bash
   cloudflared tunnel --url http://127.0.0.1:5173
   # gera URL pública temporária apontando pro seu serve local
   ```

## ✅ O que foi desconectado da Vercel

- `data-sales-agent/config/default.js`: `deploy.platform: "local"`, removidos `vercelProject`/`netlifySite`, adicionado `deploy.local {host,port}`.
- `data-sales-agent/main.js` + `README.md`: próximos passos agora dizem `npm run serve`, não "publique na Vercel".
- `fabrica-renda-ia/overnight/workflow.json` H2: publicar = servir local + marketplaces, não deploy Vercel.
- Novos: `data-sales-agent/serve-local.js` (:4173), `fabrica-renda-ia/serve-local.js` (:5173).

## 🧪 Fora da caixinha (experimento de IAs)

Ideia central: **o CLI é o agente**. `main.js` orquestra, `overnight.js` é a fila autônoma, `workflow.json` é a memória compartilhada entre IAs (você + sixth + cline + eu). Cada IA edita o mapa, o daemon continua sozinho. Nenhum cloud lock-in no caminho.
