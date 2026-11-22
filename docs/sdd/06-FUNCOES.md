# 06 · Funções

Catálogo das funções públicas, por módulo. Cada arquivo tem um cabeçalho com o propósito e as decisões que implementa; este documento é o índice.

## Infraestrutura

| Arquivo | Função | Entrada → Saída | Regras |
|---|---|---|---|
| `arquivos/LeitorArquivos.ts` | `lerArquivos(files, extensoes)` | `File[]` → `{ arquivos: {nome, conteudo}[], ignorados[] }` | `.zip` dentro de `.zip` até 2 níveis; ignora `__MACOSX`. |
| | `lerZip(buffer, ...)` | ZIP → arquivos | Usado por `lerArquivos` e pelo leitor de XSD. |
| `parsers/DocumentDetector.ts` | `detectDocumentType(xml)` | texto → tipo | Pela raiz e pelo modelo (55/65). |
| `parsers/ParserFactory.ts` | `parseDocument(xml, nome)` | texto → `ParseResult` | Escolhe o parser. |
| `parsers/Parser{NFe,NFCe,CTe,NFSe}.ts` | `parse(xml, nome)` | texto → `FiscalDocument` + logs | `mapTaxRegime`: CRT 1/2/3/4 → SIMPLES_NACIONAL/SIMPLES_EXCESSO/RPA/MEI; NFS-e `opSimpNac` 1/2/3 → RPA/MEI/SIMPLES_NACIONAL. |
| `xml/ExtratorPorCaminho.ts` | `extrairCampos(xml, tipo, campos, qtdItens)` | → `{ documento, itens[] }` | Caminho absoluto; vários valores unidos por ` \| `. |
| | `ehCampoDeItem(tipo, caminho)` | → boolean | NF-e/NFC-e: caminho com `det`. |
| `xsd/LeitorXsd.ts` | `lerPacoteXsd(Map<nome, conteudo>)` | → `DicionarioXsd[]` | Ver ADR-0004. |
| | `compararDicionarios(a, b)` | → adicionados, removidos, alterados | |
| `ia/ClienteIA.ts` | `requisitar(op, amb)` | → JSON | Modos direto/servidor; retentativa só rede e 502/503/504; erros tipados (`ErroProvedor.codigo`: rede, tempo, limite, chave, credito, indisponivel, requisicao, resposta, cancelado). |
| | `enviarChat(pedido)` | → `{ texto, tokens, motivoFim }` | `response_format: json_object` só no OpenRouter. |
| | `listarModelosOpenRouter`, `listarModelosGemini`, `verificarChaveOpenRouter` | | |
| `ia/CofreSegredos.ts` | `interpretarArquivoSegredos(texto)` | JSON ou `.env` → chaves + avisos | |
| | `guardarChaves`, `obterChave`, `resumoChaves`, `limparChaves` | | Variável de módulo; nada persiste. |
| `ia/Redator.ts` | `redigir(texto)`, `mascararChave(chave)` | | Mascara `sk-or-…`, `AIza…`, `Bearer …` e segredos registrados. |

## Aplicação

| Arquivo | Função | Entrada → Saída | Regras |
|---|---|---|---|
| `catalogo/CatalogoCampos.ts` | `CATALOGO_CAMPOS`, `PRESETS`, `idCampo` | | Catálogo embarcado e pontos de partida. |
| `catalogo/PacotesXsd.ts` | `PACOTES_XSD`, `tiposPorRaiz` | | Orientação dos portais. |
| `services/ProcessamentoService.ts` | `processarArquivos(arquivos, aoProgredir)` | → documentos, logs, falhas, duplicados | Cede a vez a cada 25. |
| | `enriquecer(docs, cnpjInformado)` | → docs com direção + CNPJ raiz | |
| `services/TaxAnalyzerService.ts` | `detectMainCnpjRoot`, `enrichDocument`, `determineRtcImpact`, `calculateApuracao` | | Herdado do comercial-assistida-xml. |
| `services/ExportService.ts` | `montarPlanilhasExtracao(docs, campos)` | → `Planilha[]` | Colunas do professor + extras à direita. |
| | `gerarArquivo(planilhas, formato, nome)` | → arquivo | xlsx/xls (SheetJS dinâmico), csv/txt com BOM; zip se várias abas. |
| | `validarVolume`, `abaSobre`, `formatarData`, `baixar`, `hojeIso` | | Datas no fuso de Brasília. |
| `matriz/LeitorMatriz.ts` | `lerMatrizHumana(md)` | → `MatrizHumana` | Regex de estrutura (ver MANUTENCAO). |
| | `cfopsEmMaisDeUmGrupo(matriz)` | → CFOPs | Limitação proposital (D10). |
| | `lerTabelaClassificacao(json)` | → `TabelaClassificacao` | Erro claro se inválida. |
| | `ehCClassTribDeReducao(tabela, codigo)` | → boolean | Coluna "Redução de Alíquota" = Sim (D22). |
| | `lerTabelaCfop(json)`, `cfopDeLinhasPlanilha(linhas)` | → `TabelaCfop` / registros | Cabeçalho em qualquer linha; repetidos uma vez (D29). |
| | `extrairModeloPrompt(md)` | → texto entre os marcadores | Marcadores sozinhos na linha. |
| `services/AglutinacaoService.ts` | `aglutinarPares(docs, matriz, { regimesNoEscopo, tabelaCfop, tabelaClassificacao })` | → `{ pares, escopo }` | Escopo por regime (D23); chave CFOP + CST + cClassTrib (D21); NFS-e sem CFOP; sinalizações; ordem por valor. |
| | `chavePar`, `cfopDoItem`, `dividirEmLotes` | | |
| `ia/MontadorPrompt.ts` | `montarPromptSistema(base)` | → texto | Substitui marcadores; JSON minificado. |
| | `parParaEntrada(par)`, `montarMensagens(prompt, lote)` | → mensagens | Sem NCM e sem direção. |
| | `estimarTokens(texto)` | → número | ≈ 4 caracteres por token. |
| `ia/ValidadorResposta.ts` | `extrairJson`, `validarResposta(texto, ids)` | → válidos + inválidos (motivo) | Tolera texto e cercas ao redor do JSON. |
| | `validarSemantica(resultado, tabela)` | → `ValidacaoSemantica` | cClassTrib existe e começa pelo CST. |
| `ia/ControleDeCota.ts` | `ControleDeCota.reservar(vaga, rpm, provedor, signal)` | → boolean | Atômico: espera a janela de 60 s e registra; false se a cota diária acabou. |
| | `restanteHoje`, `usadasHoje`, `esperaNecessaria`, `aguardarVez`, `registrar` | | |
| `ia/OrquestradorRevisao.ts` | `executarRevisao(entrada, deps)` | → linhas, chamadas, interrompida | Rodízio, paralelo, fallback, validação, revisão humana. |
| | `cadeiaDoLote(i, vagas)`, `quantidadeDeTarefas(vagas, p, lotes)`, `exigeRevisaoHumana(linha, tabela)`, `rotuloVaga` | | |
| `ia/PlanilhaRevisao.ts` | `montarPlanilhasRevisao(linhas, chamadas, meta)` | → Revisão IA, Comparativo, Chamadas, Sobre | `rotuloSinalizacao`, `DISCLAIMER`. |
| `ia/ServicoRevisao.ts` | `carregarConhecimentoPadrao()` | → 4 textos | `ARQUIVOS_CONHECIMENTO`. |
| | `revisar(entrada)` | → `ResultadoRevisao` | Liga o orquestrador ao `ClienteIA` com o controle de cota da sessão. |
| | `gerarRelatorioExecutivo(ind, p, signal)` | → `{ texto, modelo }` | Gemini principal e reserva (D28). |
| | `usoDaSessao(p)` | → uso por provedor | |
| `resumo/ResumoExecutivo.ts` | `calcularIndicadores(entrada)` | → `IndicadoresResumo` | Conformidade por valor (D27). |
| | `situacaoDoPar(par, linha)` | → conforme, divergente, semClassificacao, naoJulgado | |
| | `indicadoresParaIA`, `montarMensagensRelatorio`, `planilhasResumo` | | |
| `store/useExtratorStore.ts` | `useExtratorStore` | | Estado da sessão; `VAGAS_INICIAIS`. |

## Interface

| Arquivo | Papel |
|---|---|
| `components/ia/useConhecimento.ts` | Carrega e interpreta os 4 arquivos da base. |
| `components/ia/useAglutinacao.ts` | Pares e escopo compartilhados por Revisão e Resumo (mesmos ids). |
| `components/resumo/Graficos.tsx` | `BarraSegmentada`, `BarraRanking` (HTML/CSS puros). |
| `components/layout/Navegacao.ts` | Lista das etapas (barra lateral e tela inicial). |
| `app/api/ia/route.ts` | `GET` (há chave no servidor?) e `POST` (repasse com lista fechada). |
