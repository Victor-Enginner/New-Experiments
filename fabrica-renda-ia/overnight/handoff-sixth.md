# 🤝 HANDOFF — Tasks para SIXTH
Gerado em: 28/07/2026, 03:32:39
Origem: Fábrica de Renda IA → overnight/workflow.json

## Como devolver o resultado
1. Execute cada task abaixo.
2. Salve o entregável no caminho indicado em `params.saida` (relativo a overnight/).
3. Edite `overnight/workflow.json`: mude o `status` da task de `pending` para `done` e preencha `output`.
4. Se o runner estiver em modo --daemon, ele detecta e destrava as tasks dependentes automaticamente.

---

## Task X3 — Pesquisar 5 dores em alta no nicho CONTABILIDADE + 5 headlines + recomendação final (mesmo formato da X1: fontes reais, gatilhos mentais, preço sugerido)
- **Tipo:** pesquisa-tendencias | **Fase:** F1
- **Depende de:** nada
- **Parâmetros:**
```json
{
  "nicho": "ia-contabilidade",
  "entregavel": "5 dores + 5 headlines + recomendação final + ações imediatas, em markdown",
  "saida": "output/pesquisa-sixth-contabilidade.md",
  "referencia": "Use output/pesquisa-sixth-advocacia.md como modelo de formato e profundidade"
}
```

