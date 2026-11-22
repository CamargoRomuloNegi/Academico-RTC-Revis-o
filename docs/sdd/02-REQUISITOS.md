# 02 · Requisitos

Cada requisito indica a decisão de origem e o critério de aceite correspondente (`09-CRITERIOS-DE-ACEITE.md`).

## Funcionais

### Módulo 1 · Catálogo XSD

| ID | Requisito | Origem |
|---|---|---|
| RF-01 | Orientar onde obter os pacotes oficiais de esquemas (NF-e/NFC-e, CT-e, NFS-e Nacional), com link para o portal. | Pedido inicial |
| RF-02 | Ler um pacote XSD (`.zip` ou `.xsd` soltos) e gerar um dicionário de campos: caminho, nome, tipo, ocorrência, folha/atributo, enumerações e documentação. | ADR-0004 |
| RF-03 | Comparar duas versões do mesmo esquema na sessão (campos adicionados, removidos e alterados). | Pedido inicial |
| RF-04 | Permitir incluir na extração qualquer campo do dicionário. | Pedido inicial |

### Módulo 2 · Campos

| ID | Requisito | Origem |
|---|---|---|
| RF-05 | Sempre exportar as abas padrão **Documentos** e **Itens Analítico**, com as colunas do modelo do professor. | D05 |
| RF-06 | Oferecer um catálogo de campos extras por tipo de documento e pontos de partida prontos. | Pedido inicial |
| RF-07 | Exportar e importar a seleção de campos em JSON (perfil). | D02 |

### Módulos 3 e 4 · Leitura e processamento

| ID | Requisito | Origem |
|---|---|---|
| RF-08 | Ler XMLs soltos e `.zip` (com `.zip` interno até 2 níveis), ignorando o que não for XML. | D03 |
| RF-09 | Detectar o tipo (NF-e, NFC-e, CT-e, NFS-e Nacional) e interpretar o documento. | D04 |
| RF-10 | Remover documentos repetidos pela chave de acesso. | Pedido inicial |
| RF-11 | Detectar a empresa analisada (CNPJ raiz mais frequente), permitir corrigi-la e marcar a direção de cada documento. | Pedido inicial |
| RF-12 | Identificar o regime do emitente: CRT 1, 2, 3, 4 e `opSimpNac` da NFS-e. | D23 |
| RF-13 | Registrar avisos e erros por arquivo. | Pedido inicial |

### Módulo 5 · Exportação

| ID | Requisito | Origem |
|---|---|---|
| RF-14 | Exportar em `.xlsx`, `.xls` (BIFF8), `.csv` (`;`) e `.txt` (`|`); vários arquivos de texto em um `.zip`. | D05 |
| RF-15 | Recusar volumes acima do limite do formato (xls 65.535 linhas; xlsx 1.048.575). | — |
| RF-16 | Incluir aba Sobre com data, totais e créditos. | D18 |

### Módulo 6 · IA

| ID | Requisito | Origem |
|---|---|---|
| RF-17 | Carregar chaves por arquivo padrão (JSON ou `.env`), só em memória, e permitir apagá-las. | D14 |
| RF-18 | Conectar de modo direto (navegador → provedor) ou via servidor (`/api/ia`, sem estado). | ADR-0006 |
| RF-19 | Buscar ao vivo os modelos gratuitos do OpenRouter e permitir escolher um por vaga (5 vagas); 6ª vaga Gemini. | D11 |
| RF-20 | Parametrizar na execução: pares por chamada, cotas diárias, tempo limite, temperatura, paralelo, regimes do escopo e modelos do relatório. | D11, D23, D25, D28 |
| RF-21 | Permitir trocar, na sessão, os quatro arquivos da base de conhecimento (prompt, matriz, tabela de cClassTrib, tabela de CFOP; esta também por `.xlsx`). | D19, D20, D29 |
| RF-22 | Filtrar o escopo pelo regime do emitente e informar o que ficou fora. | D23 |
| RF-23 | Aglutinar os itens no escopo em pares únicos **CFOP + CST + cClassTrib**, ordenados por valor. | D21 |
| RF-24 | Sinalizar: CFOP em mais de um grupo, CFOP fora da matriz (ou sem CFOP), CFOP inexistente na tabela oficial, item sem classificação, cClassTrib de redução. | D08–D10, D22, D29 |
| RF-25 | Distribuir os lotes entre as vagas em rodízio, **em paralelo**, com fallback até o Gemini. | D11, D25 |
| RF-26 | Respeitar as cotas por minuto (por vaga) e por dia (por provedor, na sessão). | D12 |
| RF-27 | Validar cada resposta (estrutura e semântica) e reenviar ao próximo modelo só os pares inválidos. | D19 |
| RF-28 | Registrar em cada linha o modelo que julgou e as vagas tentadas; registrar cada chamada. | D13 |
| RF-29 | Permitir interromper e reprocessar só os pares não julgados. | P04 |
| RF-30 | Exportar o trabalho de revisão (resumo, revisão linha a linha, comparativo de modelos, chamadas, sobre). | D07, D13 |

### Módulo 7 · Resumo executivo

| ID | Requisito | Origem |
|---|---|---|
| RF-31 | Mostrar empresa, amostra (período, documentos por tipo, itens, valor) e escopo. | D26 |
| RF-32 | Medir a conformidade **por valor**, com a quantidade de pares ao lado. | D27 |
| RF-33 | Mostrar as principais operações (10 CFOPs de maior valor) e o valor por grupo da matriz. | D26 |
| RF-34 | Listar os pontos de atenção do maior para o menor valor. | D26 |
| RF-35 | Gerar o relatório executivo com o Gemini (modelo principal e reserva). | D28 |
| RF-36 | Imprimir em PDF e exportar as abas do resumo para o Excel. | D26 |

## Não funcionais

| ID | Requisito | Origem |
|---|---|---|
| RNF-01 | Sem banco de dados e sem persistência: nada em `localStorage`, `sessionStorage`, cookie ou servidor. | D02 |
| RNF-02 | XMLs processados só no navegador; à IA vão só os pares (sem CNPJ, nomes, NCM ou direção). | ADR-0001, D22, D24 |
| RNF-03 | Chaves só em memória, fora do estado da interface, mascaradas na tela e redigidas em mensagens de erro. | D14, ADR-0006 |
| RNF-04 | CSP limitando conexões à própria aplicação e aos dois provedores. | ADR-0006 |
| RNF-05 | Publicável na Vercel sem configuração (plano Hobby); rota `/api/ia` com `maxDuration` 300 s e corpo até 4 MB. | D01 |
| RNF-06 | Volume de até 100 MB de XML sem travar a interface (cede a vez a cada 25 arquivos). | D03, ADR-0002 |
| RNF-07 | Interface em português, minimalista e didática, com a identidade do projeto de origem. | Pedido inicial |
| RNF-08 | Código TypeScript estrito, com testes automatizados sem acesso à internet. | D18 |
| RNF-09 | Documentação de manutenção, passo a passo, SDD e créditos explícitos. | D18, D30 |
