# 08 · Contrato com a IA

## Provedores

| Provedor | URL base (compatível com OpenAI) | Uso | Particularidade |
|---|---|---|---|
| OpenRouter | `https://openrouter.ai/api/v1` | Vagas 1 a 5 (modelos `:free`). | `response_format: { type: 'json_object' }`; pode devolver 200 com erro no corpo (tratado). |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | Vaga 6 (fallback) e relatório executivo. | Instruído só pelo prompt. |

Caminhos usados: `POST /chat/completions`, `GET /models`, `GET /key` (OpenRouter). Modo **direto** (navegador → provedor, `Authorization: Bearer <chave>`) ou **servidor** (`POST /api/ia` com `{ provedor, caminho, metodo, corpo }` e a chave no cabeçalho `x-chave-ia`, ou a variável de ambiente do servidor).

## Limites e cotas

| Limite | Padrão | Controle |
|---|---|---|
| Requisições por minuto, por vaga | 20 (OpenRouter), 10 (Gemini) | Janela deslizante de 60 s em `ControleDeCota.reservar`. |
| Requisições por dia, por provedor (sessão) | 50 (OpenRouter sem créditos; 1.000 com créditos, cota da **conta**), 200 (Gemini) | Vaga pulada (`PULADA`) quando acaba; o fallback assume. |
| Tempo limite por chamada | 180 s | `AbortController` no `ClienteIA`. |
| Retentativas | 2 (rede, 502, 503, 504), espera 1 s e 2 s | 429 e tempo esgotado não repetem. |

## Revisão: mensagens

- **system**: o trecho do `Prompt-Mestre-RTC.md` entre `=== INÍCIO DO PROMPT DE SISTEMA ===` e `=== FIM DO PROMPT DE SISTEMA ===`, com `{{GRUPAMENTOS_CFOP}}` trocado pelo `.md` completo da matriz e `{{CLASSIFICACAO_TRIBUTARIA}}` pelo JSON completo da tabela (minificado). Cerca de 50 mil tokens.
- **user**: `Julgue os N pares abaixo seguindo estritamente a Matriz de Decisão e responda somente com o JSON da seção 9.` seguido do JSON:

```json
{
  "pares": [
    {
      "id": "P001",
      "cfop": "5101",
      "descricao_oficial_cfop": "Venda de produção do estabelecimento",
      "descricoes_exemplo": ["Feldspato M4", "Feldspato"],
      "tipos_documento": ["NFE"],
      "cst_atual": "000",
      "cclasstrib_atual": "000001",
      "grupos_matriz_humana": [{ "grupo": "II", "subgrupo": "Venda de Produção", "essencia": "..." }],
      "sinalizacoes": [],
      "qtd_itens": 3,
      "valor_total": 151.55
    }
  ]
}
```

Campos **não** enviados de propósito: NCM (D22), direção (D24), CNPJ, nomes, chaves de acesso.

## Revisão: resposta esperada

```json
{
  "resultados": [
    {
      "id": "P001",
      "analise_juridica": "...", "analise_contabil": "...", "analise_fiscal_rtc": "...", "analise_operacional": "...",
      "matriz_passo_a_passo": "P1 SIM → P2 SIM → P3 NÃO → Grupo II",
      "grupo_ia": "II",
      "concorda_com_grupo_humano": true,
      "parecer": "CONCORDA",
      "cst_proposto": "000",
      "cclasstrib_proposto": "000001",
      "justificativa": "...", "fundamentacao_legal": "...",
      "red_flags": "", "duvidas": "", "documentacao_recomendada": "",
      "confianca": "ALTA",
      "revisao_humana_obrigatoria": false
    }
  ]
}
```

Regras da resposta (seção 9 do Prompt Mestre): um resultado por `id`, na mesma ordem; textos até 600 caracteres; `parecer` em CONCORDA, DIVERGE ou PROPOSTA_INICIAL; `confianca` em ALTA, MEDIA ou BAIXA; `grupo_ia` em I a V.

## Validação

| Camada | O que verifica | Se falhar |
|---|---|---|
| Estrutural (`validarResposta`) | JSON legível (tolera texto e cercas ao redor), lista `resultados`, um item por `id` enviado, todos os campos obrigatórios com valores permitidos. | O par volta à fila e segue para a próxima vaga da cadeia. Os válidos do mesmo lote são aproveitados (`PARCIAL`). |
| Semântica (`validarSemantica`) | cClassTrib proposto existe na tabela e começa pelo CST proposto. | A linha é aceita, marcada "Validação: FALHOU" e com revisão humana obrigatória. |

## Rodízio, paralelo e fallback

- Lote *i* começa na vaga `(i mod N) + 1` do OpenRouter, onde N é o número de vagas ativas; a cadeia segue pelas demais vagas do OpenRouter e termina no Gemini.
- Com `emParalelo`, trabalham N tarefas ao mesmo tempo, cada uma pegando o próximo lote livre.
- Cada linha registra `modeloJulgador` (`provedor::modelo`) e `tentativas` (vagas, em ordem).

## Relatório executivo

- **system**: `PROMPT_RELATORIO` (`ResumoExecutivo.ts`): auditor sênior; seções Contexto da amostra, Principais operações, Nível de conformidade, Pontos prioritários de análise (5 a 10, por impacto financeiro), Recomendações, Limitações; usar só os números recebidos; conformidade por valor; literalidade nas reduções; mencionar o volume fora do escopo; até 700 palavras; lembrete final de responsabilidade técnica.
- **user**: `Indicadores consolidados (JSON):` + `indicadoresParaIA(ind)` (empresa, amostra, escopo, pares, revisão, conformidade com índices em %, 10 principais operações, distribuição na matriz, até 25 pontos de atenção).
- **Resposta**: Markdown livre, exibido no painel e copiado para a aba "Resumo Executivo".
- **Modelos**: `modeloResumo` (padrão `gemini-2.5-pro`); se falhar, `modeloResumoReserva` (`gemini-2.5-flash`). Temperatura 0,3. Conta na cota diária do Gemini.

## Aviso obrigatório

Cada linha da planilha de revisão recebe: "Parecer gerado por IA ('um estagiário de alto nível, mas ainda um estagiário'). Confirme as informações sensíveis. A responsabilidade técnica é do profissional contábil."
