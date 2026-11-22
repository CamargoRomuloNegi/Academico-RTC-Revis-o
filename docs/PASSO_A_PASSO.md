# Passo a passo

Este guia mostra o uso ideal da aplicação, na ordem em que as telas aparecem na barra lateral. Para só extrair os dados, bastam os passos 3 e 4. A revisão por IA (passos 5 e 6) e o resumo executivo (passo 7) são opcionais e partem do resultado da extração.

> **Antes de tudo.** Nada é gravado. Os XMLs, as planilhas e as chaves de API ficam só na memória desta aba do navegador. Se você recarregar ou fechar a página, tudo é perdido, então **exporte o resultado antes de sair**.

## 1. Catálogo XSD (opcional)

Use esta tela quando quiser conhecer os campos oficiais de um documento ou incluir na extração um campo que não está no catálogo pronto.

1. Em cada cartão (NF-e/NFC-e, CT-e, NFS-e Nacional), clique em **Abrir portal** para baixar o pacote de esquemas mais recente. Os pacotes saem nas Notas Técnicas publicadas nos portais oficiais.
2. Arraste o **.zip do pacote** (ou os arquivos **.xsd** soltos) para a área de carga.
3. A aplicação mostra o dicionário: caminho de cada campo, ocorrência (obrigatório ou opcional), tipo e a documentação oficial.
4. Use a busca para achar um campo (ex.: `IBSCBS`, `cClassTrib`, `natOp`) e clique em **+** para incluí-lo na extração (o botão vira ✓; clique de novo para remover). Ele aparece na tela **Campos** com o tema "XSD (personalizado)".
5. Se você carregar uma segunda versão do mesmo esquema na mesma sessão, a tela mostra **o que entrou, saiu ou mudou** entre as duas. É assim que se acompanha uma Nota Técnica nova.

> O leitor serve para **escolher campos**, não para validar XMLs contra o esquema.

## 2. Campos

A planilha sempre sai com o padrão do curso:

- **Documentos**: chave de acesso, tipo, direção, finalidade, data, emitente, destinatário, regime, valor total, status e os totais de IBS/CBS.
- **Itens Analítico**: o cabeçalho do documento repetido em cada item, mais descrição, CFOP, NCM, valores, CST, cClassTrib, bases, alíquotas e valores de IBS UF, IBS Município, CBS, ICMS, PIS, COFINS e ISS.

Nesta tela você acrescenta colunas **à direita** desse padrão:

1. Escolha um **ponto de partida** (Somente o padrão, Identificação da operação, Reforma Tributária completa ou Catálogo inteiro).
2. Alterne entre NF-e, NFC-e, CT-e e NFS-e e marque ou desmarque campo a campo.
3. Campos de item (por exemplo, `det/prod/cEAN`) vão para a aba Itens Analítico. Campos de documento vão para as duas abas.
4. **Exportar perfil** salva sua seleção em um arquivo JSON. Na próxima aula, **Importar perfil** recupera a mesma seleção.

## 3. Leitura e processamento

1. Arraste os **XMLs** ou um **.zip** com eles. Pode ser um .zip com outros .zip dentro (até dois níveis). Arquivos que não são XML são ignorados e aparecem no registro.
2. A aplicação detecta o tipo de cada arquivo (NF-e, NFC-e, CT-e ou NFS-e), interpreta e **remove duplicatas** pela chave de acesso.
3. Confira os números: documentos, itens, entradas, saídas e quantos itens já trazem CST/cClassTrib.
4. **Empresa analisada.** A aplicação descobre sozinha o CNPJ da empresa (o CNPJ raiz que mais aparece) e, com ele, marca cada documento como entrada ou saída. Se ela errar, digite o CNPJ raiz (8 dígitos) e clique em **Aplicar**. **Voltar à detecção automática** desfaz.
5. O **registro** no fim da página lista avisos e erros por arquivo. Marque **Só avisos e erros** para filtrar.

Você pode carregar mais arquivos depois: eles se somam aos que já estão na sessão.

## 4. Exportação

1. Escolha o formato:
   - **xlsx** (recomendado): uma planilha com as abas Documentos, Itens Analítico e Sobre.
   - **xls**: formato antigo, limitado a 65.535 linhas por aba.
   - **csv** (separado por `;`) ou **txt** (separado por `|`): um arquivo por aba, entregues juntos em um .zip.
2. Clique em **Gerar e baixar**. O arquivo é gerado no próprio navegador e baixado.

A aba **Sobre** do arquivo registra a data, a quantidade de documentos e os créditos da ferramenta.

## 5. Configurar a IA

### 5.1 Chaves de API

1. Clique em **Baixar modelo do arquivo**. Você recebe `segredos-ia.modelo.json`.
2. Preencha:
   - `openrouter_api_key`: crie em [openrouter.ai](https://openrouter.ai) → *Keys*. Começa com `sk-or-`.
   - `gemini_api_key`: crie no [Google AI Studio](https://aistudio.google.com/apikey). Começa com `AIza`.
3. Clique em **Carregar arquivo de segredos** e escolha o arquivo preenchido. A tela mostra só o início e o fim de cada chave.
4. *(Opcional)* **Verificar chave do OpenRouter** consulta o OpenRouter e mostra o limite e o uso da sua conta.
5. **Limpar chaves** apaga as chaves da memória na hora.

> Guarde o arquivo preenchido só no seu computador. Não envie a ninguém e não o coloque no GitHub. Também é aceito um arquivo no formato `.env` com `OPENROUTER_API_KEY=` e `GEMINI_API_KEY=`.

### 5.2 Modo de conexão

- **Direto do navegador (recomendado)**: o navegador fala com o provedor e a chave não passa pela Vercel.
- **Via servidor**: a rota `/api/ia` da aplicação repassa a chamada sem gravar nada. Use se a rede da instituição bloquear o modo direto, ou se o administrador tiver cadastrado chaves nas variáveis da Vercel.

### 5.3 Modelos

1. Clique em **Buscar modelos do OpenRouter**. A lista vem ao vivo do OpenRouter e mostra só os modelos gratuitos (`:free` ou preço zero). Também é possível digitar o identificador do modelo.
2. Escolha um modelo para cada uma das **5 vagas do OpenRouter**. Prefira modelos diferentes entre si: a planilha final mostra qual modelo julgou cada linha, e comparar modelos é parte do exercício.
3. A **vaga 6 é o Gemini**, usado como fallback. O padrão é `gemini-2.5-flash`. O botão ao lado lista os modelos disponíveis na sua chave.
4. Em cada vaga, **Req./min** limita as chamadas por minuto (o padrão é 20 no OpenRouter gratuito e 10 no Gemini). Desmarque uma vaga para tirá-la do rodízio.
5. Prefira modelos com **janela de contexto grande**. A tela mostra o tamanho aproximado do prompt de sistema, que vai inteiro em cada chamada.

### 5.4 Parâmetros da execução

| Parâmetro | Padrão | O que faz |
|---|---|---|
| Pares por chamada | 10 | Quantos pares vão em cada pedido à IA. Mais pares = menos chamadas, mas respostas maiores e mais sujeitas a erro. |
| Cota diária OpenRouter | 50 | Teto de chamadas nesta sessão. Sem créditos comprados, o OpenRouter aceita 50 chamadas por dia **somando todos os modelos gratuitos**. Com créditos, 1.000. |
| Cota diária Gemini | 200 | Teto de chamadas do fallback nesta sessão. Confira o limite atual da sua chave no AI Studio. |
| Tempo limite (s) | 180 | Quanto esperar cada resposta antes de desistir e passar ao próximo modelo. |
| Temperatura | 0,1 | Baixa = respostas mais estáveis e técnicas. |
| Vagas em paralelo | ligado | Cada vaga ativa do OpenRouter julga um lote ao mesmo tempo. Com 5 vagas, a revisão fica cerca de 5 vezes mais rápida. **Não aumenta a cota diária**: ela continua sendo da conta. |

**Escopo da revisão (regime do emitente).** Só entram na revisão os itens de documentos cujo **emitente** é do Regime Normal (CRT 3) ou do Simples com excesso de sublimite (CRT 2), que destaca os tributos como um contribuinte comum. Optantes do Simples Nacional (CRT 1) e MEI (CRT 4) ficam fora. Documentos sem regime identificado entram, para não passarem sem análise. Você pode mudar isso nas caixas de seleção; mudar o escopo reinicia a revisão. A extração (passo 4) continua completa, com a coluna Regime.

**Relatório executivo.** Escolha o modelo do Gemini que redige o relatório do passo 7 (padrão: `gemini-2.5-pro`) e o de reserva (`gemini-2.5-flash`), usado se o principal falhar.

### 5.5 Base de conhecimento

A base tem quatro arquivos. Os três primeiros vão **inteiros** para a IA em toda chamada:

- **Grupamentos-CFOP.md**: a matriz de decisão humana (grupos I a V, subgrupos, essência e argumentação).
- **Prompt-Mestre-RTC.md**: as instruções e o formato de resposta.
- **classificacao_tributaria.json**: a tabela oficial de CST e cClassTrib.
- **cfop_oficial.json**: a tabela oficial de CFOP (fonte: portal Siscomex). Ela não vai inteira para a IA: cada par leva só a descrição oficial do seu CFOP. Também mostra a descrição nas telas e planilhas e sinaliza CFOP inexistente. Para trocá-la, você pode enviar a própria planilha `.xlsx` do Siscomex.

Cada um pode ser **baixado** e **trocado** nesta sessão, por exemplo para testar uma nova revisão da matriz, sem mexer no código. A tela avisa quais CFOPs aparecem em mais de um grupo (limitação proposital, com revisão humana obrigatória).

> A matriz do professor não pretende cobrir todos os CFOPs. A tabela oficial é o instrumento de base para os alunos ponderarem sobre os CFOPs que ficaram fora dela.

## 6. Revisão por IA

1. Com os XMLs já processados (passo 3), a tela mostra os **pares únicos** (CFOP + CST + cClassTrib) dos emitentes no escopo, quantos estão sem classificação, quantos estão fora da matriz, quantos têm CFOP em mais de um grupo e as **chamadas previstas**. Um aviso informa quantos itens ficaram fora do escopo por regime.
2. Se aparecer **Antes de começar**, resolva os itens listados (falta de chave, de modelo etc.).
3. Se as chamadas previstas passarem da cota, aumente os pares por chamada ou faça a revisão em etapas: os pares não julgados podem ser reprocessados depois.
4. Clique em **Iniciar revisão**. A barra mostra o progresso e o modelo em uso. **Interromper** para a execução a qualquer momento, sem perder o que já foi julgado.
5. Como a distribuição funciona:
   - o lote 1 vai para a vaga 1, o lote 2 para a vaga 2, e assim por diante (**rodízio**), e as vagas trabalham **ao mesmo tempo** (paralelo);
   - se uma vaga falhar (erro, limite, cota ou resposta inválida), os pares pendentes seguem para as outras vagas e, por último, para o Gemini (**fallback**);
   - toda resposta é **validada pelo código**: o JSON precisa ter todos os pares, e o cClassTrib proposto precisa existir na tabela oficial e pertencer ao CST proposto.
6. Ao terminar, use **Reprocessar não julgados** para dar nova chance aos pares que falharam em todos os modelos.
7. Filtre o resultado por **Todas as linhas**, **Só divergências**, **Revisão humana obrigatória** ou **Sem julgamento**.
8. Clique em **Exportar trabalho**.

### O arquivo de revisão

| Aba | Conteúdo |
|---|---|
| Resumo Executivo, Principais Operações, Pontos de Atenção | As mesmas abas do passo 7, com os números desta revisão. |
| Revisão IA | Uma linha por par. CFOP e a sua descrição oficial, os NCMs de maior valor (só para conferência humana), colunas **[Humano]** (grupo, subgrupo e essência da matriz), **[XML]** (CST e cClassTrib existentes), **[IA]** (parecer, proposta, justificativa, fundamentação, análises, red flags, confiança), validação do código, **revisão humana obrigatória**, **modelo que julgou** e vagas tentadas. |
| Comparativo Modelos | Por modelo: chamadas, falhas, pares julgados, concordâncias, divergências, propostas iniciais, falhas de validação, confiança baixa, tempo médio e tokens. |
| Chamadas IA | O registro de cada chamada: lote, vaga, modelo, início, duração, status, pares enviados e válidos, tokens e mensagem. |
| Sobre | CNPJ analisado, totais, pares julgados e não julgados, versão do prompt e créditos. |

### Como ler o parecer

- **CONCORDA**: a IA mantém o CST/cClassTrib do XML.
- **DIVERGE**: a IA propõe outro CST/cClassTrib e justifica.
- **PROPOSTA_INICIAL**: o item não tinha classificação e a IA propõe do zero.

Quando faltam dados para julgar com segurança, a IA indica confiança baixa e preenche as colunas de dúvidas e documentação recomendada.

Linhas com CFOP fora da matriz, CFOP em mais de um grupo, CFOP inexistente na tabela oficial, **cClassTrib de redução de alíquota** (no XML ou proposto), falha de validação, sem julgamento, confiança baixa ou que a própria IA indicou saem marcadas como **revisão humana obrigatória**. Na NFS-e não há CFOP: o par é julgado pela essência do serviço e também sai marcado.

### Nota acadêmica do professor: NCM e reduções de alíquota

O NCM **não** é enviado à IA e **não** separa os pares. Muitas NCMs aparecem nos anexos de redução da LC 214, mas a simples coincidência de NCM não autoriza a redução: a norma exige **literalidade** quanto ao produto e ao seu uso (por exemplo, um item de uso em equipamentos médicos não se confunde com outro de mesma NCM). Aplicar a redução pela NCM levaria a um erro grosseiro. Por isso a ferramenta apenas **sinaliza** os cClassTrib de redução, e a análise fica com o profissional contábil. Os NCMs de maior valor de cada par aparecem na planilha só para essa conferência humana.

## 7. Resumo executivo

O fechamento do trabalho. Funciona mesmo antes da revisão (mostra a amostra e as operações), mas a conformidade só é medida depois dela.

1. **Empresa e amostra:** razão social e CNPJ raiz da empresa analisada, regime, período, documentos por tipo e o que ficou fora do escopo por regime.
2. **Indicadores:** índice de conformidade, valor revisado, pares únicos e pares com revisão humana obrigatória.
3. **Nível de conformidade por valor:** uma barra dividida em Conforme, Divergente, Sem classificação e Não julgado, com a tabela de valores, participação e pares logo abaixo.
   - **Conforme:** a IA concorda com o CST/cClassTrib do XML e a validação do código passou.
   - **Divergente:** a IA propõe outra classificação, ou concorda com um código que a validação reprovou.
   - **Índice de conformidade** = valor conforme ÷ (valor conforme + valor divergente). Ele mede a qualidade do que já estava classificado; o que veio sem classificação aparece à parte.
4. **Principais operações:** os 10 CFOPs de maior valor, com a descrição oficial e o enquadramento da matriz.
5. **Valor por grupo da matriz:** quanto do valor cai em cada Grupo Mestre, fora da matriz ou em mais de um grupo.
6. **Pontos de atenção:** divergências, itens sem classificação, CFOP inexistente, reduções a conferir e pares não julgados, do maior para o menor valor.
7. **Relatório executivo:** clique em **Gerar relatório**. Uma única chamada ao Gemini recebe os números consolidados e redige o relatório (contexto, operações, conformidade, pontos prioritários, recomendações e limitações).
8. **Imprimir / PDF** abre a impressão do navegador sem a barra lateral: escolha "Salvar como PDF". **Exportar Excel** baixa as abas Resumo Executivo, Principais Operações e Pontos de Atenção.

> O relatório executivo recebe a razão social e o CNPJ raiz da empresa, além dos números. Os pares da revisão não levam dados de pessoas.

> A IA é uma estagiária de alto nível: rápida, incansável e às vezes errada. Toda sugestão precisa da conferência de um profissional.

## Dúvidas frequentes

**Fechei a aba sem exportar. Dá para recuperar?** Não. A aplicação não grava nada, por desenho. Carregue os XMLs de novo.

**A revisão está lenta.** Confira se **Vagas em paralelo** está ligado e se as 5 vagas do OpenRouter têm modelo. Cada chamada leva o prompt completo (cerca de 50 mil tokens) e pede uma análise detalhada por par; modelos gratuitos escrevem devagar. Reduzir o escopo (regime) e manter o corte CFOP + CST + cClassTrib já diminui muito o número de chamadas.

**A revisão parou com "limite" ou "cota".** A cota diária gratuita do OpenRouter é da conta inteira. Espere o dia seguinte, compre créditos (a cota sobe para 1.000/dia) ou continue só com o Gemini, desativando as vagas do OpenRouter.

**O modo direto falhou com erro de rede.** Mude para **Via servidor** na configuração.

**Um XML não foi lido.** Confira o registro na tela de leitura. Só são aceitos NF-e, NFC-e, CT-e e NFS-e Nacional. A NFS-e no padrão ABRASF (municipal) está fora do escopo.

**Posso usar outra matriz ou outro prompt?** Sim, troque o arquivo na seção Base de conhecimento. Para tornar a troca definitiva, veja `docs/MANUTENCAO.md`.

## Para estudar o projeto

Quem não assistiu à aula pode começar pela **seção para IA** (`docs/ia/PROMPT_DE_REPRODUCAO.md` no repositório): é um prompt que apresenta o projeto a um assistente de IA, que passa a explicar a ferramenta ou a ajudar a reproduzi-la. A especificação completa está em `docs/sdd/`.
