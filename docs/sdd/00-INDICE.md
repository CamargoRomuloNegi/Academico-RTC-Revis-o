# SDD · Especificação do Extrator XML RTC (v1.1)

> **Autoria.** Planejamento, regras de negócio e decisões: **Prof. Camargo**. Especificação, arquitetura e código escritos em colaboração direta com **Claude (Anthropic)**, a partir dessas decisões.

Este conjunto descreve **o que** a aplicação faz, **por que** faz assim e **como** está construída, com detalhe suficiente para manter, evoluir ou reconstruir a ferramenta do zero. Ele complementa:

- o [Passo a passo](../PASSO_A_PASSO.md) (uso, tela a tela);
- o [Registro de Decisões](../REGISTRO_DE_DECISOES.md) (D01 a D31, a palavra do professor);
- os [ADRs](../adr/README.md) (decisões técnicas, com contexto e consequências);
- a [seção para IA](../ia/PROMPT_DE_REPRODUCAO.md) (prompt para outra IA reproduzir o projeto).

## Ordem de leitura

| # | Documento | Pergunta que responde |
|---|---|---|
| 01 | [Visão e escopo](01-VISAO-E-ESCOPO.md) | Para que serve, para quem, o que está dentro e fora. |
| 02 | [Requisitos](02-REQUISITOS.md) | O que a aplicação precisa fazer (funcionais) e como precisa se comportar (não funcionais). |
| 03 | [Arquitetura](03-ARQUITETURA.md) | Camadas, componentes, dependências e onde cada coisa roda. |
| 04 | [Modelo de dados](04-MODELO-DE-DADOS.md) | Entidades, tipos e colunas de cada planilha. |
| 05 | [Fluxos](05-FLUXOS.md) | Sequência de cada processo: extração, revisão, resumo. |
| 06 | [Funções](06-FUNCOES.md) | Cada módulo de código e suas funções públicas. |
| 07 | [Regras de negócio](07-REGRAS-DE-NEGOCIO.md) | Matriz, escopo, sinalizações, literalidade, conformidade. |
| 08 | [Contrato com a IA](08-CONTRATO-IA.md) | Prompt, entrada, saída JSON, validação, provedores e cotas. |
| 09 | [Critérios de aceite](09-CRITERIOS-DE-ACEITE.md) | Como saber que cada requisito está cumprido (ligado aos testes). |

## Convenções

- Requisitos: `RF-xx` (funcionais) e `RNF-xx` (não funcionais). Regras: `RN-xx`. Critérios: `CA-xx`.
- Decisões do professor: `Dxx` (Registro de Decisões). Decisões técnicas: `ADR-xxxx`.
- Caminhos de código são relativos à raiz do repositório.
- Os diagramas usam Mermaid, que o GitHub exibe direto na página.
