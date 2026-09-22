# 🤝 HANDOFF — Tasks para CLINE
Gerado em: 28/07/2026, 02:59:03
Origem: Fábrica de Renda IA → overnight/workflow.json

## Como devolver o resultado
1. Execute cada task abaixo.
2. Salve o entregável no caminho indicado em `params.saida` (relativo a overnight/).
3. Edite `overnight/workflow.json`: mude o `status` da task de `pending` para `done` e preencha `output`.
4. Se o runner estiver em modo --daemon, ele detecta e destrava as tasks dependentes automaticamente.

---

## Task X2 — Criar versão React/Next da vitrine com shadcn/ui + Magic UI (bento grid de benefícios)
- **Tipo:** componentes-react | **Fase:** F3
- **Depende de:** A3
- **Parâmetros:**
```json
{
  "base": "output/site-advocacia/index.html",
  "instrucoes": "Converter a landing estática em app Next 14 + Tailwind; instalar shadcn (button, card, accordion p/ FAQ) e Magic UI (marquee, animated-border) via CLI oficial",
  "saida": "../portfolio-vitrine/"
}
```

