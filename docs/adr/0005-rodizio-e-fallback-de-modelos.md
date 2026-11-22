# ADR-0005: Rodízio de 5 modelos com fallback no Gemini

**Situação:** aceito · **Data:** 22/11/2026 · **Relacionado:** D06, D07, D11, D12, D13, P04

## Contexto

A revisão usa modelos gratuitos, que têm limites baixos e mudam com frequência: no OpenRouter, cerca de 20 requisições por minuto por modelo e 50 por dia **por conta** (1.000 com créditos comprados), somando todos os modelos `:free`. Modelos gratuitos também saem do ar sem aviso e às vezes devolvem JSON inválido. O professor quer comparar modelos e saber qual julgou cada linha.

## Decisão

1. **Aglutinação.** Os itens viram pares únicos CFOP + NCM + CST + cClassTrib (`AglutinacaoService`), ordenados por valor. Na NFS-e, que não tem CFOP, o CFOP fica vazio e o par é julgado pela essência do serviço.
2. **Lotes.** Os pares vão em lotes (padrão: 10 por chamada), com o prompt de sistema completo em cada chamada.
3. **Rodízio.** O lote *n* vai para a vaga *n* do OpenRouter (1 a 5, voltando à 1).
4. **Fallback.** Se a vaga falhar, os pares **pendentes** do lote seguem para as outras vagas do OpenRouter e, por último, para a vaga 6 (Gemini).
5. **Validação em duas camadas.** Estrutural (JSON, todos os ids, campos obrigatórios) e semântica (cClassTrib existe na tabela oficial e pertence ao CST). Pares inválidos voltam para a fila do próximo modelo; os válidos do mesmo lote são aproveitados.
6. **Cota.** `ControleDeCota` espera a janela de 60 s quando o rpm da vaga é atingido e pula a vaga quando a cota diária do provedor (contada na sessão) acaba.
7. **Retentativas.** Só para falha de rede e 502/503/504 (até 2, com espera exponencial). Erro 429 e tempo esgotado passam direto ao próximo modelo, para não gastar cota.
8. **Sem julgamento.** Se nenhum modelo julgar o par, a linha sai "não julgada" com o último motivo e pode ser reprocessada (proposta P04).
9. **Rastreabilidade.** Cada linha registra o modelo que julgou e as vagas tentadas; cada chamada fica na aba "Chamadas IA".

O orquestrador recebe a função de chamada por injeção, sem conhecer HTTP.

## Consequências

- A planilha mostra os 5 modelos lado a lado e a aba "Comparativo Modelos" resume o desempenho de cada um.
- Uma falha isolada não para a execução.
- A contagem diária não enxerga o uso feito fora da sessão; nesse caso o provedor responde 429 e o fallback assume.
- Os testes (`tests/ia/OrquestradorRevisao.test.ts`) simulam provedores com erros, limites e respostas inválidas, sem internet.
