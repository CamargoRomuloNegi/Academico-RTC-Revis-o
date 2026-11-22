# ADR-0005: Rodízio de 5 modelos com fallback no Gemini

**Situação:** aceito, revisado na v1.1 · **Data:** 22/11/2026 · **Relacionado:** D07, D11, D12, D13, D21, D25, P04

## Contexto

A revisão usa modelos gratuitos, que têm limites baixos e mudam com frequência: no OpenRouter, cerca de 20 requisições por minuto por modelo e 50 por dia **por conta** (1.000 com créditos comprados), somando todos os modelos `:free`. Modelos gratuitos também saem do ar sem aviso e às vezes devolvem JSON inválido. O professor quer comparar modelos e saber qual julgou cada linha.

## Decisão

1. **Aglutinação.** Os itens dos emitentes no escopo (ADR-0008) viram pares únicos **CFOP + CST + cClassTrib** (`AglutinacaoService`; na v1.0 o NCM também fazia parte da chave), ordenados por valor. Na NFS-e, que não tem CFOP, o CFOP fica vazio e o par é julgado pela essência do serviço.
2. **Lotes.** Os pares vão em lotes (padrão: 10 por chamada), com o prompt de sistema completo em cada chamada.
3. **Rodízio.** O lote *n* vai para a vaga *n* do OpenRouter (1 a 5, voltando à 1).
3a. **Paralelo (v1.1, D25).** Com `emParalelo`, trabalham ao mesmo tempo tantas tarefas quantas forem as vagas ativas do OpenRouter. Cada tarefa pega o próximo lote livre de uma fila compartilhada; pelo rodízio, lotes simultâneos começam em vagas diferentes. Desligado, volta à execução em série da v1.0.
4. **Fallback.** Se a vaga falhar, os pares **pendentes** do lote seguem para as outras vagas do OpenRouter e, por último, para a vaga 6 (Gemini).
5. **Validação em duas camadas.** Estrutural (JSON, todos os ids, campos obrigatórios) e semântica (cClassTrib existe na tabela oficial e pertence ao CST). Pares inválidos voltam para a fila do próximo modelo; os válidos do mesmo lote são aproveitados.
6. **Cota.** `ControleDeCota.reservar()` espera a janela de 60 s quando o rpm da vaga é atingido e pula a vaga quando a cota diária do provedor (contada na sessão) acaba. A checagem e o registro acontecem sem espera entre eles, para que tarefas em paralelo não ultrapassem os limites.
7. **Retentativas.** Só para falha de rede e 502/503/504 (até 2, com espera exponencial). Erro 429 e tempo esgotado passam direto ao próximo modelo, para não gastar cota.
8. **Sem julgamento.** Se nenhum modelo julgar o par, a linha sai "não julgada" com o último motivo e pode ser reprocessada (proposta P04).
9. **Rastreabilidade.** Cada linha registra o modelo que julgou e as vagas tentadas; cada chamada fica na aba "Chamadas IA".

O orquestrador recebe a função de chamada por injeção, sem conhecer HTTP.

## Consequências

- A planilha mostra os 5 modelos lado a lado e a aba "Comparativo Modelos" resume o desempenho de cada um.
- Uma falha isolada não para a execução.
- Em paralelo, o tempo total cai aproximadamente na proporção do número de vagas ativas. A cota diária não muda: paralelizar acelera, mas não amplia o número de chamadas possíveis.
- Na v1.0, com 486 pares de uma massa real (corte com NCM, sem filtro de regime e em série), a revisão levava mais de uma hora. O novo corte, o escopo por regime e o paralelismo atacam as três causas.
- A contagem diária não enxerga o uso feito fora da sessão; nesse caso o provedor responde 429 e o fallback assume.
- Os testes (`tests/ia/OrquestradorRevisao.test.ts`) simulam provedores com erros, limites e respostas inválidas, sem internet.
