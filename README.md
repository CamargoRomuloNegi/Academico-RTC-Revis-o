# Extrator XML RTC

Ferramenta acadêmica para **extrair dados brutos de XMLs fiscais** (NF-e 55, NFC-e 65, CT-e 57 e NFS-e Nacional), exportá-los no padrão de planilhas do curso e **revisar a classificação tributária (CST / cClassTrib) da Reforma Tributária do Consumo com apoio de IA**, à luz de uma matriz de decisão humana.

> **Créditos.** O planejamento, as regras de negócio e as decisões são do **Prof. Camargo**. O desenvolvimento foi feito em colaboração direta com **Claude (Anthropic)**, que escreveu o código, os testes e a documentação a partir dessas decisões. Partes do código vêm dos repositórios do professor `comercial-assistida-xml` (parsers, catálogo e exportação) e `ITSA-Agente` (cliente de IA, segredos e redação de logs). Detalhes na tela **Sobre e créditos** da aplicação.

---

## O que a aplicação faz

| Módulo | Tela | Função |
|---|---|---|
| 1 | Catálogo XSD | Orienta onde obter os esquemas oficiais e lê um pacote XSD (.zip ou .xsd) para virar um dicionário de campos, com comparação entre versões. |
| 2 | Campos | Define quais campos extras saem na planilha, além do padrão. Perfis podem ser exportados e importados em JSON. |
| 3 e 4 | Leitura e processamento | Lê XMLs soltos ou .zip (inclusive .zip dentro de .zip), detecta o tipo, interpreta, remove duplicatas pela chave de acesso e identifica a direção (entrada/saída) pela empresa analisada. |
| 5 | Exportação | Gera o arquivo nas abas **Documentos** e **Itens Analítico**, em xlsx, xls, csv ou txt. |
| 6 | Configurar IA / Revisão por IA | Aglutina os itens em pares únicos **CFOP + NCM + CST + cClassTrib**, distribui os pares entre 5 modelos gratuitos do OpenRouter em rodízio, com o Gemini como fallback, valida as respostas e exporta o trabalho de revisão linha a linha. |

O guia de uso completo está em [`docs/PASSO_A_PASSO.md`](docs/PASSO_A_PASSO.md), que também aparece dentro da aplicação na tela **Passo a passo**.

## Princípios

- **Sem banco de dados e sem persistência.** Tudo vive na memória da aba do navegador. Ao fechar ou recarregar a página, os dados somem.
- **Processamento no navegador.** Os XMLs nunca são enviados ao servidor (ADR-0001).
- **Segredos só em memória.** As chaves de API vêm de um arquivo carregado pelo usuário e não são gravadas em lugar nenhum (ADR-0006 e [`docs/SEGURANCA.md`](docs/SEGURANCA.md)).
- **A IA não decide.** Ela sugere. Cada linha mostra o julgamento humano (matriz), a classificação existente no XML, a proposta da IA e o modelo que julgou. A revisão humana continua obrigatória.

## Tecnologia

Next.js 15 (App Router) · React 19 · TypeScript estrito · Tailwind CSS 4 · Zustand (sem persistência) · fast-xml-parser · JSZip · SheetJS (`@e965/xlsx`, ADR-0003) · Vitest.

## Como rodar localmente

Requisitos: Node.js 20 ou superior.

```bash
npm install
npm run dev          # http://localhost:3000
```

Outros comandos:

```bash
npm test             # testes automatizados (Vitest)
npm run typecheck    # checagem de tipos
npm run lint         # ESLint
npm run verificar    # os três acima em sequência
npm run build        # build de produção
```

## Publicar na Vercel

1. Crie um repositório no GitHub e envie o conteúdo deste projeto.
2. Na Vercel, **Add New → Project**, importe o repositório. O framework (Next.js) é detectado sozinho; não há configuração extra.
3. *(Opcional)* Em **Settings → Environment Variables**, cadastre `OPENROUTER_API_KEY` e/ou `GEMINI_API_KEY` (veja [`.env.example`](.env.example)). Só faça isso se ativar a **Deployment Protection** da Vercel, porque sem autenticação qualquer visitante poderia consumir a cota dessas chaves. O caminho recomendado é cada usuário carregar o próprio arquivo de segredos.
4. Faça o deploy.

A única rota de servidor é `/api/ia`, um repasse sem estado para os provedores de IA, usado apenas no modo de conexão "via servidor". Ela tem `maxDuration` de 300 s (plano Hobby da Vercel com Fluid Compute) e não grava nem registra nada.

## Estrutura

```
src/
  app/                     telas (uma pasta por rota) e a rota /api/ia
  components/              componentes de interface (ui/, layout/, ia/)
  domain/models/           tipos do domínio (documento fiscal, campos, matriz, revisão)
  application/
    catalogo/              catálogo de campos e orientação dos pacotes XSD
    matriz/                leitura da matriz humana, da tabela de cClassTrib e do prompt
    services/              processamento, enriquecimento, aglutinação e exportação
    ia/                    prompt, validação, controle de cota, orquestrador, planilha de revisão
    store/                 estado da sessão (Zustand, só em memória)
  infrastructure/
    parsers/               parsers de NF-e, NFC-e, CT-e e NFS-e
    xml/                   extração de campos por caminho
    xsd/                   leitor de esquemas XSD
    arquivos/              leitura de .xml e .zip
    ia/                    cliente HTTP dos provedores, cofre de segredos, redator de logs
public/
  conhecimento/            matriz de CFOP, prompt-mestre e tabela de cClassTrib (base da IA)
  modelos/                 modelo do arquivo de segredos
docs/                      passo a passo, manutenção, segurança, decisões e ADRs
tests/                     testes automatizados e arquivos de exemplo
```

## Documentação

| Documento | Para quem | Conteúdo |
|---|---|---|
| [`docs/PASSO_A_PASSO.md`](docs/PASSO_A_PASSO.md) | Alunos e usuários | Como usar a aplicação, tela a tela. |
| [`docs/MANUTENCAO.md`](docs/MANUTENCAO.md) | Quem mantém o código | Como atualizar catálogo, matriz, prompt, provedores e dependências. |
| [`docs/SEGURANCA.md`](docs/SEGURANCA.md) | Todos | Como os dados e as chaves são tratados, e os riscos conhecidos. |
| [`docs/REGISTRO_DE_DECISOES.md`](docs/REGISTRO_DE_DECISOES.md) | Todos | Decisões do professor (D01 a D20) e pendências. |
| [`docs/adr/`](docs/adr/) | Quem mantém o código | Decisões de arquitetura, com contexto e consequências. |
| [`CHANGELOG.md`](CHANGELOG.md) | Todos | Histórico de versões. |

## Evoluções previstas

- Autenticação com Clerk, para liberar com segurança as chaves das variáveis da Vercel (D16).
- Processamento em Web Worker para volumes muito acima de 100 MB (ADR-0002).
- Leiaute ABRASF da NFS-e municipal (hoje fora do escopo, D04).

## Aviso

Ferramenta de apoio didático. As sugestões da IA não substituem a análise de um profissional habilitado nem constituem parecer fiscal ou jurídico.
