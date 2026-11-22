# 01 · Visão e escopo

## Propósito

Ferramenta acadêmica, publicada na Vercel, que mostra em etapas como se constrói uma automação com IA aplicada à **Reforma Tributária do Consumo** (EC 132/2023, LC 214/2025, IBS e CBS). Ela:

1. extrai os **dados brutos** de XMLs fiscais para o padrão de planilhas do curso;
2. revisa a **classificação tributária** de cada operação (CST e cClassTrib) com modelos de IA externos, à luz de uma **matriz de decisão humana** de CFOP, de autoria do professor;
3. fecha o trabalho com um **resumo executivo** por valor, para o saneamento dos erros.

A IA **apoia** o julgamento profissional e não o substitui. A responsabilidade técnica é sempre do profissional contábil.

## Público

| Público | Uso |
|---|---|
| Alunos do Prof. Camargo | Executar o fluxo completo em aula, comparar modelos de IA e ponderar sobre a matriz. |
| Contadores | Auditar a classificação RTC de um cliente a partir dos XMLs. |
| Mantenedores | Atualizar catálogo, matriz, prompt e provedores (ver `docs/MANUTENCAO.md`). |

## Dentro do escopo

- Documentos: **NF-e (55)**, **NFC-e (65)**, **CT-e (57)** e **NFS-e Nacional** (D04).
- Entrada: XMLs soltos ou `.zip` (inclusive `.zip` dentro de `.zip`, até 2 níveis). Volume típico até 10 MB por cliente; testado até 100 MB (D03).
- Saídas: `.xlsx`, `.xls`, `.csv` e `.txt` (D05); PDF do resumo executivo pela impressão do navegador.
- IA: 5 vagas de modelos gratuitos do OpenRouter, escolhidos pelo usuário, e o Gemini como 6ª vaga de fallback e redator do relatório executivo (D11, D28).
- Escopo da revisão: emitentes do **Regime Normal (CRT 3)** e do **Simples com excesso de sublimite (CRT 2)** (D23).

## Fora do escopo

| Item | Motivo |
|---|---|
| Banco de dados, contas de usuário, histórico | Decisão D02: sem persistência, por segurança dos dados. |
| Autenticação | D16: o Clerk fica como evolução. |
| NFS-e municipal (ABRASF) | D04. |
| Validação de XML contra o XSD | ADR-0004: o leitor de XSD serve para escolher campos. |
| Aplicação automática de redução de alíquota por NCM | D22: a norma exige literalidade; a ferramenta sinaliza e o profissional decide. |
| Revisão de optantes do Simples Nacional e MEI | D23: não destacam IBS/CBS como contribuinte comum. |
| Análise de crédito (entrada/saída) | D24: a auditoria é de classificação, não de crédito. |

## Princípios

1. **Nada é gravado.** Tudo vive na memória da aba do navegador (RNF-01).
2. **Os XMLs não saem do navegador.** Só os pares únicos, sem dados de pessoas, vão à IA (RNF-02).
3. **Chaves só em memória** e nunca exibidas por inteiro (RNF-03).
4. **A IA sugere; o humano decide.** Toda linha mostra o julgamento humano, a classificação do XML e a proposta da IA, com o modelo que julgou (D13).
5. **Módulos independentes**, para crescer sem quebrar o que já existe.
6. **Didática.** Telas explicam o que fazem; a documentação explica por quê.

## Glossário

| Termo | Significado |
|---|---|
| CFOP | Código Fiscal de Operações e Prestações (4 dígitos). |
| CST | Código de Situação Tributária do IBS/CBS (3 dígitos). |
| cClassTrib | Código de Classificação Tributária do IBS/CBS (6 dígitos; os 3 primeiros são o CST). |
| CRT | Código de Regime Tributário do emitente na NF-e/NFC-e/CT-e (1 Simples, 2 Simples com excesso de sublimite, 3 Regime Normal, 4 MEI). |
| Par único | Combinação CFOP + CST + cClassTrib que agrupa itens com o mesmo julgamento (D21). |
| Matriz humana | `Grupamentos-CFOP.md`: CFOP → Grupo Mestre (I a V) e subgrupo, com essência e argumentação. |
| Vaga | Posição de modelo de IA configurada (1 a 5 OpenRouter, 6 Gemini). |
| Lote | Conjunto de pares enviado numa chamada (padrão: 10). |
| Sinalização | Marca que o código põe no par (ex.: CFOP fora da matriz) e que orienta a IA e a revisão humana. |
