# Manual de manutenção

Este documento explica **onde mexer** para cada tipo de mudança previsível. Antes de qualquer alteração, rode `npm run verificar` (tipos, lint e testes) para partir de uma base verde, e rode de novo ao terminar.

## Mapa rápido

| Quero mudar... | Arquivo(s) |
|---|---|
| Os campos extras oferecidos na tela Campos | `src/application/catalogo/CatalogoCampos.ts` |
| A orientação de onde obter os XSD | `src/application/catalogo/PacotesXsd.ts` |
| As colunas padrão das abas Documentos e Itens Analítico | `src/application/services/ExportService.ts` (`montarPlanilhasExtracao`) |
| A leitura de um tipo de documento | `src/infrastructure/parsers/Parser*.ts` |
| A matriz de CFOP, o prompt, a tabela de cClassTrib ou a tabela oficial de CFOP | `public/conhecimento/` |
| A chave dos pares, o escopo por regime e as sinalizações | `src/application/services/AglutinacaoService.ts` |
| Os indicadores, as abas e o prompt do resumo executivo | `src/application/resumo/ResumoExecutivo.ts` |
| O painel do resumo executivo | `src/app/resumo/page.tsx` e `src/components/resumo/Graficos.tsx` |
| As colunas do trabalho de revisão | `src/application/ia/PlanilhaRevisao.ts` |
| Valores padrão da IA (lote, cotas, tempo, temperatura, paralelo, regimes do escopo, modelos do relatório) | `src/domain/models/RevisaoIA.ts` (`PARAMETROS_PADRAO`) |
| Modelos iniciais das vagas | `src/application/store/useExtratorStore.ts` (`VAGAS_INICIAIS`) |
| Um provedor de IA novo | ver a seção "Acrescentar um provedor de IA" |
| As telas e a barra lateral | `src/app/<rota>/page.tsx` e `src/components/layout/Navegacao.ts` |
| O texto do Passo a passo | `docs/PASSO_A_PASSO.md` (a tela /ajuda lê este arquivo no build) |

## Convenção de caminhos de campo

Todo campo é identificado por um **caminho absoluto a partir da raiz do documento**, sem o invólucro de processamento (`nfeProc`, `cteProc`) e sem prefixo de namespace:

```
NFe/infNFe/ide/natOp                 campo de documento (NF-e e NFC-e)
NFe/infNFe/det/prod/cProd            campo de item (contém "det")
CTe/infCte/ide/modal                 CT-e
NFSe/infNFSe/DPS/infDPS/dCompet      NFS-e Nacional
```

Atributos usam `@`, por exemplo `NFe/infNFe/@Id`. A regra de nível está em `ehCampoDeItem` (`src/infrastructure/xml/ExtratorPorCaminho.ts`). Quando um caminho aparece várias vezes no mesmo documento, os valores saem unidos por ` | `.

O Leitor de XSD gera caminhos nesta mesma convenção, então um campo escolhido no módulo 1 funciona sem tradução no módulo 2.

## Atualizar o catálogo de campos (Nota Técnica nova)

Quando sair uma Nota Técnica que cria ou altera campos:

1. Baixe o pacote de esquemas novo no portal oficial (os links estão em `PacotesXsd.ts`).
2. Abra a tela **Catálogo XSD**, carregue o pacote **anterior** e depois o **novo**. A comparação lista o que entrou, saiu ou mudou.
3. Para campos que valem para todos os usuários, acrescente uma linha na lista do documento em `CatalogoCampos.ts`:

   ```ts
   ['Item · Código do Produto', 'NFe/infNFe/det/prod/cProd', 'Item', 'Descrição opcional'],
   ```

   O tema precisa ser um dos valores de `TemaCampo` (`src/domain/models/Campos.ts`). O nível é deduzido do caminho.
4. Se o pacote mudar de nome ou de endereço, atualize `PacotesXsd.ts`.
5. Rode `npm test`. O teste `tests/xml/CatalogoCampos.test.ts` confere que todo campo é único, começa pela raiz certa e tem o nível coerente com o caminho.
6. Registre a mudança no `CHANGELOG.md`.

Campos que só um usuário precisa **não exigem mudança de código**: ele os escolhe direto no Catálogo XSD.

## Atualizar a base de conhecimento da IA

Os quatro arquivos de `public/conhecimento/` são servidos como estáticos e baixados pelo navegador. Para testar uma versão nova sem publicar, use **Configurar IA → Base de conhecimento → Trocar**. Para torná-la padrão, substitua o arquivo na pasta e publique.

### Grupamentos-CFOP.md (matriz humana)

O código lê a estrutura com expressões regulares (`src/application/matriz/LeitorMatriz.ts`). Mantenha este formato:

```
**I. Aquisições Onerosas (Fato Gerador: SIM):**
Grupo=> **Bens para Industrialização**:
CFOP´s: {1101, 2101, 3101}
Essência=> texto
Argumentação Técnica (LC 214) => texto
```

- O grupo mestre é a linha em negrito com o algarismo romano (I a V).
- Cada subgrupo começa com `Grupo=>` e precisa da lista `CFOP´s: {...}` com códigos de 4 dígitos.
- Um CFOP listado em mais de um subgrupo **é aceito** e vira a sinalização "duplicidade_matriz" (revisão humana obrigatória). Isso é proposital (decisão D10).

Depois de trocar o arquivo, rode `npm test`: `tests/matriz/LeitorMatriz.test.ts` confere a leitura dos 5 grupos e as duplicidades conhecidas. Se a matriz mudar de propósito, ajuste as expectativas do teste.

### cfop_oficial.json (tabela oficial de CFOP)

Lista de objetos `{ "cfop", "descricao", "grupo", "inicioVigencia" }`, gerada a partir da planilha publicada no portal do Siscomex (o CONFAZ é o detentor oficial do CFOP). Para atualizar:

- **Sem código:** em Configurar IA → Base de conhecimento → Trocar, envie a planilha `.xlsx` nova. `cfopDeLinhasPlanilha` (`LeitorMatriz.ts`) acha o cabeçalho com as colunas "CFOP" e "Descrição" em qualquer linha; "Grupo" e "Vigência" são opcionais. Códigos repetidos ficam só uma vez.
- **Como padrão do projeto:** baixe o JSON convertido na mesma tela e substitua `public/conhecimento/cfop_oficial.json`. Ajuste a contagem esperada em `tests/matriz/LeitorMatriz.test.ts`.

A tabela não vai inteira ao prompt (seria grande demais): cada par leva só `descricao_oficial_cfop`.

### Prompt-Mestre-RTC.md

- Só o trecho entre `=== INÍCIO DO PROMPT DE SISTEMA ===` e `=== FIM DO PROMPT DE SISTEMA ===` vai para a IA.
- Os marcadores `{{GRUPAMENTOS_CFOP}}` e `{{CLASSIFICACAO_TRIBUTARIA}}` precisam ficar **sozinhos na linha**. A aplicação os substitui pelos arquivos completos (o JSON vai minificado para economizar tokens).
- O título `# ...` da primeira linha é gravado como "versão do prompt" na aba Sobre do trabalho. Mude o título a cada versão.
- **O formato de saída JSON é um contrato com o código.** Se mudar algum campo da resposta, atualize juntos: `ResultadoIA` em `src/domain/models/RevisaoIA.ts`, `validarResposta` em `src/application/ia/ValidadorResposta.ts`, as colunas em `PlanilhaRevisao.ts` e os testes de `tests/ia/`.

### classificacao_tributaria.json

É a tabela oficial de CST e cClassTrib, um array de objetos com as colunas do leiaute oficial. O código usa só três colunas (constantes em `src/domain/models/Matriz.ts`):

- `Código da Situação Tributária`
- `Código da Classificação Tributária`
- `Descrição do Código da Classificação Tributária`

Se a tabela oficial mudar o nome dessas colunas, ajuste as constantes. A validação semântica exige que o cClassTrib proposto exista na tabela e comece pelo CST proposto.

A coluna `Redução de Alíquota` ("Sim"/"Não") marca os cClassTrib de redução. É ela que liga a sinalização `reducao_literalidade` e a revisão humana obrigatória (`ehCClassTribDeReducao`, decisão D22). Se mudar de nome, ajuste `COLUNA_REDUCAO_ALIQUOTA` em `LeitorMatriz.ts`.

## Acrescentar um provedor de IA

Todo provedor precisa ter API **compatível com OpenAI** (`/chat/completions`). Passos:

1. `src/domain/models/RevisaoIA.ts`: acrescente o id em `IdProvedor`.
2. `src/infrastructure/ia/ClienteIA.ts`: inclua a URL em `URL_BASE` e, se houver, a função de listar modelos.
3. `src/infrastructure/ia/CofreSegredos.ts`: aceite a chave nova no arquivo de segredos (JSON e `.env`). Atualize `public/modelos/segredos-ia.modelo.json`.
4. `src/infrastructure/ia/Redator.ts`: acrescente o padrão de chave do provedor, para que nunca apareça em mensagens de erro.
5. `src/app/api/ia/route.ts`: inclua o provedor em `PROVEDORES` (URL e variável de ambiente).
6. `next.config.ts`: acrescente o domínio em `connect-src` da política de segurança de conteúdo (CSP). Sem isso, o navegador bloqueia o modo direto.
7. `useExtratorStore.ts` e a tela de configuração: crie a vaga, se o provedor for entrar no rodízio ou no fallback.
8. Escreva os testes equivalentes aos de `tests/ia/ClienteIA.test.ts`.

## Mudar o corte ou o escopo da revisão

- **Chave do par:** `chavePar` e o laço de `aglutinarPares` em `AglutinacaoService.ts`. Hoje é CFOP + CST + cClassTrib (D21). Se um campo entrar na chave, avalie se ele também deve ir à IA (`parParaEntrada` em `MontadorPrompt.ts`) e atualize a seção 8 do Prompt Mestre.
- **Escopo por regime:** `REGIMES_NO_ESCOPO_PADRAO` em `RevisaoIA.ts`. O regime vem do CRT (NF-e, NFC-e, CT-e) e de `opSimpNac` (NFS-e), mapeados nos parsers (`mapTaxRegime`).
- **Nova sinalização:** acrescente ao tipo `Sinalizacao`, marque em `aglutinarPares`, dê um rótulo em `PlanilhaRevisao.ts`, decida se exige revisão humana em `exigeRevisaoHumana` (`OrquestradorRevisao.ts`) e explique-a na seção 7 do Prompt Mestre.

## Ajustar o resumo executivo

- **Regra de conformidade:** `situacaoDoPar` e `calcularIndicadores` em `ResumoExecutivo.ts` (por valor, D27). Os testes em `tests/resumo/` documentam a regra.
- **Texto do relatório:** a constante `PROMPT_RELATORIO` no mesmo arquivo. Os números vão em JSON (`indicadoresParaIA`); a IA é instruída a não inventar valores.
- **Modelos:** `modeloResumo` e `modeloResumoReserva` em `PARAMETROS_PADRAO`; a chamada fica em `gerarRelatorioExecutivo` (`ServicoRevisao.ts`).
- **Gráficos:** HTML e CSS puros em `Graficos.tsx`, sem biblioteca, para imprimir bem. As regras visuais estão no comentário do arquivo e no ADR-0007.

## Ajustar o controle de cota

Os limites gratuitos mudam com frequência. Com as vagas em paralelo, use sempre `ControleDeCota.reservar()`, que confere a cota e o rpm e registra a chamada sem espera no meio (atômico). Os valores padrão estão em `PARAMETROS_PADRAO` e `VAGAS_INICIAIS`, e o usuário pode ajustá-los na tela a cada execução. A lógica (janela de 60 s por vaga e teto diário por provedor) está em `src/application/ia/ControleDeCota.ts`. A contagem diária vale para a sessão (não há persistência), o que está documentado no próprio arquivo.

## Dependências

- **SheetJS** vem do pacote `@e965/xlsx`, espelho no npm da versão oficial 0.20.3 (ADR-0003). Para atualizar, confira se o espelho acompanha a versão oficial publicada em `cdn.sheetjs.com`. Se a rede permitir, a troca pela URL oficial é uma linha no `package.json`: `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`, ajustando o `import()` em `ExportService.ts`.
- **Next.js**: siga as notas de migração oficiais e rode `npm run build` antes de publicar.
- Rode `npm audit` periodicamente.

## Testes

```
tests/
  fixtures/        XMLs reais anonimizados (NF-e, NFC-e, CT-e, NFS-e) e XSD mínimos
  parsers/         leitura de cada tipo de documento (herdados do comercial-assistida-xml)
  services/        processamento, aglutinação, exportação e regras tributárias
  xml/ xsd/        extração por caminho, catálogo e leitor de XSD
  matriz/          leitura da matriz, da tabela e do prompt
  ia/              cliente, segredos, cota, validação, prompt e orquestrador (provedor simulado, inclusive em paralelo)
  resumo/          indicadores, conformidade por valor, abas e mensagens do relatório executivo
```

Nenhum teste chama a internet. O orquestrador e o cliente recebem as funções de rede por injeção, então os testes simulam os provedores, inclusive erros 429, 503 e respostas inválidas.

## Publicação de uma versão nova

1. Atualize a versão em `package.json` e registre as mudanças em `CHANGELOG.md`.
2. `npm run verificar` e `npm run build`.
3. Envie para o GitHub. A Vercel publica sozinha a partir do ramo principal.
