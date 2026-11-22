# 07 · Regras de negócio

As regras são do Prof. Camargo (Registro de Decisões). O código as implementa nos arquivos indicados; os testes as documentam.

## Extração

| ID | Regra | Onde |
|---|---|---|
| RN-01 | A empresa analisada é o CNPJ raiz (8 dígitos) que mais aparece entre emitentes e destinatários; o usuário pode informar outro. | `TaxAnalyzerService.detectMainCnpjRoot` |
| RN-02 | Direção: emitente = empresa → saída; destinatário = empresa → entrada; senão, desconhecida. É **só descritiva** (D24). | `TaxAnalyzerService.enrichDocument` |
| RN-03 | Documentos com a mesma chave de acesso entram uma vez. | `ProcessamentoService` |
| RN-04 | Zeros à esquerda (CFOP, NCM, CST, cClassTrib, CNPJ) são preservados. | parsers (`parseTagValue: false`) |

## Escopo da revisão (D23)

| ID | Regra |
|---|---|
| RN-05 | Vale o regime do **emitente** do documento, porque é ele quem classifica. |
| RN-06 | Entram por padrão: Regime Normal (CRT 3), Simples com excesso de sublimite (CRT 2, destaca os tributos como contribuinte comum) e regime não identificado. Ficam fora: Simples Nacional (CRT 1) e MEI (CRT 4). O usuário pode alterar. |
| RN-07 | NFS-e Nacional: `opSimpNac` 1 (não optante) = Regime Normal; 2 = MEI; 3 = Simples (ME/EPP). O leiaute não distingue o excesso de sublimite. |
| RN-08 | A extração continua completa; o escopo vale para a revisão e o resumo. O que ficou fora é contado por regime (documentos, itens, valor). |

## Pares únicos (D21, D22, D24)

| ID | Regra |
|---|---|
| RN-09 | Chave do par: **CFOP + CST + cClassTrib** (após remover não dígitos do CFOP e espaços dos códigos). |
| RN-10 | NFS-e não tem CFOP: o código guardado no campo `cfop` pelo parser (cTribNac) é descartado; o par fica com CFOP vazio e é julgado pela essência do serviço. |
| RN-11 | Cada par guarda até 3 descrições de exemplo (D31), os tipos de documento, a quantidade de itens, o valor total (soma do valor líquido) e a descrição oficial do CFOP. Os NCMs (até 5, por valor) ficam só para conferência humana. |
| RN-12 | NCM e direção **não** vão para a IA. |
| RN-13 | Os pares são ordenados por valor total, do maior para o menor, e numerados P001, P002… |

## Sinalizações

| ID | Sinalização | Quando | Efeito |
|---|---|---|---|
| RN-14 | `duplicidade_matriz` | O CFOP está em mais de um Grupo Mestre da matriz (limitação proposital, D10). | Revisão humana obrigatória. |
| RN-15 | `cfop_fora_matriz` | O CFOP não está na matriz, ou o par não tem CFOP (NFS-e) (D09). | A IA julga pela essência; revisão humana obrigatória. |
| RN-16 | `cfop_inexistente` | O CFOP não consta na tabela oficial (D29). | Red flag; revisão humana obrigatória. |
| RN-17 | `sem_classificacao` | O item veio sem CST e sem cClassTrib (D08). | A IA propõe do zero (`PROPOSTA_INICIAL`). |
| RN-18 | `reducao_literalidade` | O cClassTrib do XML é de redução de alíquota (coluna "Redução de Alíquota" = Sim) (D22). | A IA não confirma nem nega a redução pelo produto; revisão humana obrigatória. |

## Literalidade nas reduções (D22)

RN-19. A coincidência de NCM, ou de descrição, **não autoriza** redução de alíquota: a norma exige que o produto e o seu uso correspondam literalmente ao previsto. A ferramenta não automatiza essa análise. Ela:

- não envia o NCM à IA;
- instrui a IA a julgar a essência (Grupo Mestre e CST) e a indicar, na documentação recomendada, o que o profissional deve conferir;
- marca revisão humana obrigatória quando o cClassTrib do XML **ou o proposto** é de redução.

## Revisão humana obrigatória

RN-20. A linha sai com revisão humana obrigatória se **qualquer** condição for verdadeira:

1. sinalização `duplicidade_matriz`, `cfop_fora_matriz`, `cfop_inexistente` ou `reducao_literalidade`;
2. o par não foi julgado;
3. a validação semântica falhou;
4. o cClassTrib proposto é de redução;
5. a própria IA indicou `revisao_humana_obrigatoria = true`;
6. a confiança é `BAIXA`.

Implementação: `exigeRevisaoHumana` em `OrquestradorRevisao.ts`.

## Parecer da IA

| ID | Regra |
|---|---|
| RN-21 | `CONCORDA` só se o CST e o cClassTrib propostos forem iguais aos atuais. |
| RN-22 | `DIVERGE` quando propõe outra classificação. |
| RN-23 | `PROPOSTA_INICIAL` quando o item não tinha classificação. |
| RN-24 | O cClassTrib proposto deve existir na tabela oficial e começar pelo CST proposto (validação semântica). Uma falha não descarta a resposta: a linha é aceita e marcada. |

## Conformidade (D27)

| ID | Regra |
|---|---|
| RN-25 | **Conforme:** o par tinha classificação, a IA concordou e a validação passou. |
| RN-26 | **Divergente:** a IA propôs outra classificação, ou concordou com um código reprovado na validação. |
| RN-27 | **Sem classificação:** o par veio sem CST/cClassTrib. **Não julgado:** nenhum modelo julgou (ou a revisão não foi feita). |
| RN-28 | **Índice de conformidade por valor** = valor conforme ÷ (valor conforme + valor divergente). O mesmo cálculo por pares aparece ao lado. Sem pares classificados e julgados, o índice é indefinido. |
| RN-29 | Pontos de atenção: divergências, validações reprovadas, CFOP inexistente, sem classificação, reduções a conferir e não julgados, ordenados por valor. |

## Matriz humana

RN-30. A matriz (`Grupamentos-CFOP.md`) é a âncora de decisão e **não** pretende cobrir todos os CFOPs. A tabela oficial de CFOP é o instrumento de base para os alunos ponderarem sobre os CFOPs que ficaram fora dela (D29). Os 5 Grupos Mestres: I Aquisições onerosas; II Prestações/vendas onerosas; III Movimentações técnicas e logísticas; IV Operações administrativas e simbólicas; V Regimes especiais, imunidade e exclusão.
