# Registros de Decisão de Arquitetura (ADR)

Cada ADR registra uma decisão técnica: o contexto, a decisão e as consequências. As decisões de negócio do professor (D01 a D20) estão em [`../REGISTRO_DE_DECISOES.md`](../REGISTRO_DE_DECISOES.md); os ADRs explicam **como** elas foram implementadas.

| ADR | Título | Situação |
|---|---|---|
| [0001](0001-processamento-no-navegador.md) | Processamento dos XMLs no navegador | Aceito |
| [0002](0002-web-worker-adiado.md) | Web Worker adiado | Aceito (revisar se o volume crescer) |
| [0003](0003-sheetjs-via-espelho-npm.md) | SheetJS pelo espelho `@e965/xlsx` | Aceito |
| [0004](0004-leitor-xsd-proprio.md) | Leitor de XSD próprio, para escolha de campos | Aceito |
| [0005](0005-rodizio-e-fallback-de-modelos.md) | Rodízio de 5 modelos, em paralelo, com fallback no Gemini | Aceito (revisado na v1.1) |
| [0006](0006-segredos-em-memoria.md) | Segredos só em memória | Aceito |
| [0007](0007-resumo-executivo.md) | Resumo executivo com gráficos em HTML e relatório pelo Gemini | Aceito |
| [0008](0008-escopo-por-regime-e-literalidade.md) | Escopo por regime, corte sem NCM e literalidade nas reduções | Aceito |

Para uma decisão nova, copie a estrutura de um ADR existente, use o próximo número e acrescente a linha nesta tabela.
