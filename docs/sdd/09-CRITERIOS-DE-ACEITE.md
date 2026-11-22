# 09 · Critérios de aceite

Cada critério é verificado por um teste automatizado (`npm test`, sem internet) ou pelo roteiro manual no fim deste documento. Na v1.1.0: **181 testes** em 20 arquivos.

## Automatizados

| ID | Critério | Requisitos / regras | Teste |
|---|---|---|---|
| CA-01 | NF-e, NFC-e, CT-e e NFS-e reais são lidos com os valores certos (inclusive IBS/CBS e zeros à esquerda). | RF-09, RN-04 | `tests/parsers/*` |
| CA-02 | CRT 1/2/3/4 viram SIMPLES_NACIONAL/SIMPLES_EXCESSO/RPA/MEI; NFS-e `opSimpNac` mapeado. | RF-12, RN-07 | `tests/parsers/ParserNFe.test.ts`, `ParserNFSe.test.ts` |
| CA-03 | CNPJ raiz detectado e direção atribuída. | RF-11, RN-01, RN-02 | `tests/services/TaxAnalyzerService.test.ts` |
| CA-04 | Campos extraídos por caminho absoluto, de documento e de item. | RF-04, RF-06 | `tests/xml/ExtratorPorCaminho.test.ts`, `CatalogoCampos.test.ts` |
| CA-05 | Pacote XSD vira dicionário; diferenças entre versões aparecem. | RF-02, RF-03 | `tests/xsd/LeitorXsd.test.ts` |
| CA-06 | Abas Documentos/Itens Analítico com as colunas do professor; csv/txt/xlsx/xls gerados; limite de volume. | RF-05, RF-14, RF-15 | `tests/services/ExportService.test.ts` |
| CA-07 | Matriz lida (5 grupos, subgrupos, CFOPs) e duplicidades identificadas. | RN-14, RN-30 | `tests/matriz/LeitorMatriz.test.ts` |
| CA-08 | Tabela de CFOP lida do JSON e de linhas de planilha; cClassTrib de redução reconhecido. | RF-21, RN-16, RN-18 | `tests/matriz/LeitorMatriz.test.ts` |
| CA-09 | Prompt v1.1 sem NCM e direção, com literalidade e novas sinalizações. | RN-12, RN-19 | `tests/matriz/LeitorMatriz.test.ts`, `tests/ia/MontadorPrompt.test.ts` |
| CA-10 | Pares por CFOP + CST + cClassTrib (NCM não separa), NFS-e sem CFOP, sinalizações. | RF-23, RF-24, RN-09–RN-18 | `tests/services/AglutinacaoService.test.ts` |
| CA-11 | Escopo por regime: CRT 1 e MEI fora, CRT 2 e 3 dentro, contagem do que ficou fora. | RF-22, RN-05–RN-08 | `tests/services/AglutinacaoService.test.ts` |
| CA-12 | Arquivo de segredos interpretado; chaves mascaradas e redigidas em erros. | RF-17, RNF-03 | `tests/ia/SegredosERedator.test.ts` |
| CA-13 | Cliente: modos direto/servidor, retentativa só para rede e 502/503/504, erros tipados. | RF-18 | `tests/ia/ClienteIA.test.ts` |
| CA-14 | Cota: rpm por vaga e cota diária; `reservar` atômico em paralelo. | RF-26 | `tests/ia/ControleDeCota.test.ts` |
| CA-15 | Validação estrutural e semântica. | RF-27, RN-24 | `tests/ia/ValidadorResposta.test.ts` |
| CA-16 | Rodízio, fallback até o Gemini, reenvio só dos inválidos, cota esgotada, interrupção. | RF-25, RF-28, RF-29 | `tests/ia/OrquestradorRevisao.test.ts` |
| CA-17 | Em paralelo, 5 vagas trabalham ao mesmo tempo; em série, uma. | RF-25, D25 | `tests/ia/OrquestradorRevisao.test.ts` |
| CA-18 | Revisão humana obrigatória em todas as condições de RN-20 (inclusive redução proposta). | RN-20 | `tests/ia/OrquestradorRevisao.test.ts` |
| CA-19 | Conformidade por valor e por pares; situação de cada par; abas e mensagens do relatório. | RF-32–RF-36, RN-25–RN-29 | `tests/resumo/ResumoExecutivo.test.ts` |

## Roteiro manual (antes de cada versão)

1. `npm run verificar` e `npm run build` sem erros.
2. Carregar os XMLs de `tests/fixtures` (8 arquivos) → 8 documentos, 0 erros.
3. Exportar xlsx e csv → arquivos baixados com as abas esperadas.
4. Carregar um arquivo de segredos de teste → a tela mostra só as chaves mascaradas; o HTML da página não contém a chave inteira.
5. Com provedores reais ou simulados (interceptando as chamadas no navegador, por exemplo com o Playwright): a revisão termina, a planilha traz "Modelo que julgou", e com "Pares por chamada" = 2 e 2 vagas ativas há 2 chamadas simultâneas.
6. Em /resumo: o painel mostra a conformidade; "Gerar relatório" chama o Gemini com os indicadores; "Imprimir / PDF" gera páginas sem a barra lateral; "Exportar Excel" baixa as 3 abas.
7. Nenhum erro no console do navegador além dos simulados.
