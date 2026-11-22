# ADR-0003: SheetJS pelo espelho `@e965/xlsx`

**Situação:** aceito · **Data:** 22/11/2026

## Contexto

A exportação precisa gerar `.xlsx` e `.xls` (BIFF8). A biblioteca de referência é o SheetJS. A versão publicada no npm com o nome `xlsx` parou na 0.18.5, que tem vulnerabilidades conhecidas (poluição de protótipo e ReDoS). As versões corrigidas são distribuídas pelo CDN oficial (`cdn.sheetjs.com`), que estava inacessível no ambiente de desenvolvimento.

## Decisão

Usar o pacote `@e965/xlsx` na versão **0.20.3**, um espelho no npm do código oficial dessa versão. A biblioteca é carregada sob demanda (`import()` dinâmico em `ExportService.ts`), só quando o usuário exporta.

## Consequências

- Versão corrigida, instalável por `npm install` em qualquer ambiente, inclusive na Vercel.
- Dependência de um terceiro que republica o pacote. Antes de atualizar, conferir se o espelho acompanha a versão oficial.
- A troca pela URL oficial é simples e está descrita em `docs/MANUTENCAO.md`.
- O carregamento sob demanda mantém as telas leves (a biblioteca só pesa no momento da exportação).
