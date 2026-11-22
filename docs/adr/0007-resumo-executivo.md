# ADR-0007: Resumo executivo com gráficos em HTML e relatório pelo Gemini

**Situação:** aceito · **Data:** 22/11/2026 · **Relacionado:** D26, D27, D28

## Contexto

O professor pediu um último passo: um resumo com gráficos objetivos (tamanho da amostra, empresa, principais operações, nível de conformidade) e um relatório executivo com os pontos que devem ser analisados. A conformidade deve ser medida por valor (D27), e o relatório deve ser redigido pelo Gemini, pela capacidade argumentativa (D28).

## Decisão

1. **Indicadores puros.** `src/application/resumo/ResumoExecutivo.ts` calcula tudo a partir dos documentos, do escopo, dos pares e das linhas da revisão, sem rede. Regras:
   - situação de cada par: conforme (concorda e validação ok), divergente (propõe outro código ou concorda com código reprovado), sem classificação, não julgado;
   - índice de conformidade = valor conforme ÷ (valor conforme + valor divergente), com o mesmo índice por pares ao lado;
   - pontos de atenção determinísticos, ordenados por valor.
2. **Gráficos em HTML e CSS**, sem biblioteca: uma barra segmentada para a conformidade (uma grandeza dividida em partes) e barras horizontais finas de um tom para os rankings. Cada gráfico tem legenda ou título, dica ao passar o mouse e uma tabela com os números, para que a cor nunca seja a única pista.
3. **PDF pelo navegador.** O painel tem uma folha de estilo de impressão (`@media print` em `globals.css`) que esconde a barra lateral e os botões. "Imprimir / PDF" usa a impressão do próprio navegador.
4. **Excel.** As abas "Resumo Executivo", "Principais Operações" e "Pontos de Atenção" saem no export do painel e no início do trabalho de revisão. A biblioteca gratuita (SheetJS Community) não cria gráficos nativos do Excel; os gráficos ficam no painel e no PDF.
5. **Relatório pelo Gemini.** Uma única chamada, com os indicadores consolidados em JSON e um prompt que proíbe inventar números e reforça a literalidade nas reduções. Modelo principal configurável (padrão `gemini-2.5-pro`) e reserva (`gemini-2.5-flash`). A chamada conta na cota diária do Gemini da sessão.

## Consequências

- O resumo funciona mesmo sem revisão (amostra e operações) e se completa depois dela.
- Sem dependência de biblioteca de gráficos: menos peso e impressão previsível.
- O relatório envia ao Gemini a razão social e o CNPJ raiz da empresa analisada (documentado em `docs/SEGURANCA.md`).
- O texto do relatório é apoio: o painel e o Excel trazem os números que o sustentam.
