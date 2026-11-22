# ADR-0001: Processamento dos XMLs no navegador

**Situação:** aceito · **Data:** 22/11/2026 · **Relacionado:** D01, D02, D03

## Contexto

A aplicação roda na Vercel, sem banco de dados e sem persistência. Os lotes típicos têm até 10 MB, e o professor já testou até 100 MB. As funções da Vercel aceitam no máximo 4,5 MB por requisição e têm tempo de execução limitado.

## Decisão

Toda a leitura (.xml e .zip), o processamento, o enriquecimento e a exportação acontecem **no navegador**. O servidor só entrega os arquivos estáticos e, opcionalmente, repassa chamadas de IA (`/api/ia`).

## Consequências

- Os XMLs nunca chegam ao servidor: não há o que vazar, gravar ou apagar lá.
- Não há limite de 4,5 MB nem de tempo de função para a extração.
- O limite passa a ser a memória do computador do usuário. Volumes de 100 MB funcionam em máquinas comuns.
- O código de domínio (parsers, serviços) não depende do navegador e é testado no Node (Vitest), o que permite movê-lo para um Web Worker ou para o servidor sem reescrever (ver ADR-0002).
