# Seção para IA · Prompt de reprodução do Extrator XML RTC

> **Para quem é este arquivo.** Para quem não assistiu à aula ao vivo do Prof. Camargo e quer entender o projeto com a ajuda de uma IA, ou pedir a uma IA que o reproduza. Copie o bloco abaixo inteiro para o assistente de IA de sua preferência e anexe (ou cole) a pasta `docs/` do repositório. Quanto mais da pasta `docs/sdd/` a IA receber, mais fiel será a reprodução.
>
> **Autoria.** O planejamento, a metodologia e as decisões são do **Prof. Camargo**. Este prompt, a especificação (SDD) e o código foram escritos em colaboração direta com **Claude (Anthropic)**. Mantenha esses créditos em qualquer reprodução.

---

```text
Você vai me ajudar a ENTENDER e, se eu pedir, a REPRODUZIR um projeto acadêmico chamado
"Extrator XML RTC", do Prof. Camargo, desenvolvido em colaboração com Claude (Anthropic).
Leia tudo antes de responder. Os documentos anexados (pasta docs/) são a fonte da verdade:
se algo aqui divergir deles, siga os documentos e me avise da divergência.

## 1. O que é o projeto (essência)

Uma aplicação web, publicada na Vercel, que ensina em etapas como se constrói uma automação
com IA aplicada à Reforma Tributária do Consumo brasileira (EC 132/2023, LC 214/2025, IBS e CBS).
Ela faz três coisas:

1. EXTRAI os dados brutos de XMLs fiscais (NF-e 55, NFC-e 65, CT-e 57 e NFS-e Nacional) para
   o padrão de planilhas do curso: aba "Documentos" (resumo) e aba "Itens Analítico" (granular).
2. REVISA a classificação tributária de cada operação (CST e cClassTrib do IBS/CBS) com modelos
   de IA externos, à luz de uma MATRIZ DE DECISÃO HUMANA de CFOP escrita pelo professor
   (5 Grupos Mestres: I Aquisições onerosas; II Prestações/vendas onerosas; III Movimentações
   técnicas e logísticas; IV Operações administrativas e simbólicas; V Regimes especiais,
   imunidade e exclusão).
3. FECHA o trabalho com um RESUMO EXECUTIVO: amostra, empresa, principais operações, nível de
   conformidade MEDIDO POR VALOR (R$) e relatório executivo redigido pelo Gemini.

A IA é "uma estagiária de alto nível, mas ainda uma estagiária": ela SUGERE; o profissional
contábil DECIDE e é o responsável técnico.

## 2. Regras inegociáveis (não altere sem decisão do professor)

R1. Sem banco de dados e sem persistência. Tudo vive na memória da aba do navegador. Nada em
    localStorage, sessionStorage, cookie ou servidor. Recarregar a página apaga a sessão.
R2. Os XMLs são processados NO NAVEGADOR e nunca vão ao servidor. À IA vão só "pares únicos",
    sem CNPJ, nomes, chaves de acesso, NCM ou direção da operação.
R3. Chaves de API chegam por um arquivo padrão carregado pelo usuário (JSON ou .env), ficam só
    em memória, fora do estado da interface, aparecem mascaradas e são redigidas em erros.
    Variáveis de ambiente da Vercel são alternativa, com o risco documentado.
R4. Par único = CFOP + CST + cClassTrib. O NCM NÃO entra na chave nem vai à IA.
R5. LITERALIDADE NAS REDUÇÕES: a coincidência de NCM ou de descrição não autoriza redução de
    alíquota; a norma exige correspondência literal do produto e do uso. A ferramenta NÃO
    confirma nem nega reduções: sinaliza ("reducao_literalidade") e exige revisão humana.
R6. Escopo pelo regime do EMITENTE: entram Regime Normal (CRT 3) e Simples com excesso de
    sublimite (CRT 2); ficam fora Simples Nacional (CRT 1) e MEI (CRT 4). Regime não
    identificado entra por padrão. A extração continua completa.
R7. Direção (entrada/saída) não entra na análise: é tema de crédito, não de classificação,
    e o CFOP já carrega o sentido da operação.
R8. CFOP em mais de um grupo da matriz é LIMITAÇÃO PROPOSITAL: sinaliza e exige revisão humana.
    CFOP fora da matriz: a IA julga pela essência e há revisão humana. A matriz não pretende
    cobrir todos os CFOPs; a tabela oficial de CFOP é o instrumento de base para os alunos.
R9. Itens sem CST/cClassTrib: a IA propõe do zero (PROPOSTA_INICIAL).
R10. Cada linha do trabalho de revisão mostra, lado a lado: o julgamento humano (matriz), a
     classificação existente no XML, a revisão da IA e QUAL MODELO JULGOU.
R11. Conformidade é medida por VALOR (R$), com a quantidade de pares ao lado.
R12. Créditos explícitos: "planejamento e decisões do Prof. Camargo; desenvolvimento em
     colaboração direta com Claude (Anthropic)".

## 3. Como a IA é usada dentro da aplicação

- 5 "vagas" de modelos GRATUITOS (":free") do OpenRouter, escolhidos um a um pelo usuário a
  partir da lista buscada ao vivo; a 6ª vaga é o Gemini (API do Google), usado como fallback.
- Os pares são divididos em lotes (padrão: 10). Rodízio: o lote i começa na vaga i; as vagas
  trabalham EM PARALELO; se uma falhar, os pares pendentes seguem para as outras e, por fim,
  para o Gemini.
- O código controla as cotas: requisições por minuto por vaga (janela de 60 s, reserva
  atômica) e por dia por provedor (no OpenRouter gratuito a cota é da CONTA: 50/dia, ou
  1.000/dia com créditos).
- Cada resposta passa por duas validações: estrutural (JSON completo, um resultado por id) e
  semântica (o cClassTrib proposto existe na tabela oficial e começa pelo CST proposto).
- O prompt de sistema é o "Prompt Mestre" do professor (versão para automação, v1.1), com a
  matriz e a tabela de classificação inseridas por inteiro. O formato exato de entrada e
  saída está em docs/sdd/08-CONTRATO-IA.md.
- O relatório executivo é UMA chamada ao Gemini (um Flash com cota gratuita, e um Flash-Lite
  de reserva) com os números já consolidados; ele não pode inventar valores. Erro 402 do
  Google = projeto ligado a faturamento pré-pago sem saldo: não tentar a reserva, explicar.

## 4. Ordem de leitura dos documentos

1. docs/sdd/00-INDICE.md e 01-VISAO-E-ESCOPO.md  (propósito, escopo, glossário)
2. docs/REGISTRO_DE_DECISOES.md                  (decisões D01 a D31 do professor)
3. docs/sdd/07-REGRAS-DE-NEGOCIO.md              (regras RN-01 a RN-30)
4. docs/sdd/02-REQUISITOS.md                     (RF-01 a RF-36, RNF-01 a RNF-09)
5. docs/sdd/03-ARQUITETURA.md e 04-MODELO-DE-DADOS.md
6. docs/sdd/05-FLUXOS.md, 06-FUNCOES.md e 08-CONTRATO-IA.md
7. docs/sdd/09-CRITERIOS-DE-ACEITE.md            (como provar que está pronto)
8. docs/adr/                                     (por que cada escolha técnica foi feita)
9. docs/PASSO_A_PASSO.md                         (como o usuário final usa)

## 5. Se eu pedir para REPRODUZIR

Stack de referência: Next.js 15 (App Router) + React 19 + TypeScript estrito + Tailwind 4 +
Zustand (sem persist) + fast-xml-parser + JSZip + SheetJS (pacote @e965/xlsx 0.20.3) +
react-markdown + Vitest. Deploy na Vercel. Você pode propor outra stack, mas as regras R1 a
R12 valem para qualquer uma.

Construa nesta ordem, e só avance quando os critérios de aceite da etapa passarem:

E1. Domínio: tipos de docs/sdd/04-MODELO-DE-DADOS.md.
E2. Leitura de .xml/.zip, detecção de tipo e parsers dos 4 documentos (preserve zeros à
    esquerda; mapeie o regime pelo CRT e pelo opSimpNac). Critérios CA-01 a CA-03.
E3. Extração por caminho, catálogo de campos e leitor de XSD. CA-04, CA-05.
E4. Exportação nas abas do professor (xlsx, xls, csv, txt). CA-06.
E5. Base de conhecimento: matriz humana, tabela de cClassTrib, tabela de CFOP, Prompt Mestre.
    CA-07 a CA-09.
E6. Escopo por regime e aglutinação em pares com as sinalizações. CA-10, CA-11.
E7. Segredos em memória, cliente HTTP dos provedores, controle de cota, validação e
    orquestrador (rodízio, paralelo, fallback). Teste tudo com provedores SIMULADOS.
    CA-12 a CA-18.
E8. Resumo executivo (indicadores por valor, painel, PDF, abas, relatório Gemini). CA-19.
E9. Telas na ordem da barra lateral (Início, Catálogo XSD, Campos, Leitura e processamento,
    Exportação, Configurar IA, Revisão por IA, Resumo executivo, Passo a passo, Sobre e
    créditos), com interface minimalista, didática, em português.
E10. Documentação: README, Passo a passo, Manutenção, Segurança, ADRs, SDD e créditos.

Ao reproduzir:
- Não peça nem use chaves reais nos testes; simule os provedores.
- Não invente regras fiscais: quando o documento não disser, pergunte.
- Mantenha os nomes de colunas das planilhas exatamente como em 04-MODELO-DE-DADOS.md.
- Ao terminar cada etapa, diga o que fez, o que testou e o que ficou pendente.

## 6. Se eu pedir só para ENTENDER

Explique em linguagem simples, para um estudante de Ciências Contábeis: o problema que a
ferramenta resolve, o caminho do XML até o resumo executivo, o papel da matriz humana, por
que a IA não decide sozinha, por que o NCM não autoriza reduções e como ler o índice de
conformidade por valor. Use exemplos com CFOPs comuns (5101, 5102, 6910) e sempre aponte
o documento de onde tirou cada informação.

Comece me dizendo, em até 10 linhas, o que entendeu do projeto e quais documentos recebeu.
```

---

## Notas para quem usa este prompt

- O prompt é propositalmente autossuficiente, mas a reprodução fiel depende da SDD (`docs/sdd/`) e do Registro de Decisões. Sem eles, a IA terá só a essência.
- Os arquivos da base de conhecimento (`public/conhecimento/`) são parte do método do professor. Uma reprodução deve usá-los como estão, ou versões revisadas pelo professor.
- Este prompt não contém nenhuma chave, dado de cliente ou XML real, e pode ser compartilhado.
