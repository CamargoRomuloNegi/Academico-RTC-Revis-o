# ADR-0002: Web Worker adiado

**Situação:** aceito, a revisar se o volume crescer · **Data:** 22/11/2026 · **Relacionado:** D02, D03, ADR-0001

## Contexto

O planejamento inicial (D02) previa processar os XMLs em um Web Worker, para que a interface não travasse. Na prática, com os volumes informados (até 10 MB por cliente, testes até 100 MB), o processamento na thread principal é rápido, desde que ceda a vez à interface de tempos em tempos.

Um Web Worker exige empacotar os parsers à parte, serializar os documentos entre as threads e duplicar o tratamento de erros, o que aumenta a complexidade de manutenção.

## Decisão

Processar na thread principal, **cedendo à interface a cada 25 arquivos** (`ProcessamentoService.processarArquivos`), com barra de progresso. O Web Worker fica como evolução.

## Consequências

- Código mais simples e um único caminho de execução, fácil de testar.
- Com volumes muito acima de 100 MB, a interface pode ficar lenta durante a leitura.
- **Quando revisar:** se os lotes reais passarem com frequência de 100 MB. A migração é localizada: `processarArquivos` já recebe os arquivos e devolve documentos e registros; basta executá-la dentro de um Worker e trocar a chamada na tela de leitura.
