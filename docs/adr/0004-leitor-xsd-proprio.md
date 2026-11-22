# ADR-0004: Leitor de XSD próprio, para escolha de campos

**Situação:** aceito · **Data:** 22/11/2026 · **Relacionado:** módulo 1

## Contexto

O módulo 1 precisa orientar o usuário sobre os campos oficiais e acompanhar as Notas Técnicas. Bibliotecas de validação XSD para JavaScript dependem de código nativo (libxml2) ou de WebAssembly pesado, e não fazem o que interessa aqui: listar os campos com caminho, ocorrência e documentação.

## Decisão

Escrever um leitor próprio (`src/infrastructure/xsd/LeitorXsd.ts`) que transforma o pacote XSD em um **dicionário de campos** na mesma convenção de caminhos do extrator. Ele resolve `include`/`import` por nome, `ref`, tipos nomeados, `sequence`, `choice` (tratado como opcional), `group`, extensões de `complexContent` e `simpleContent`, e atributos.

Limitações conscientes:

- **Não valida** XMLs contra o esquema.
- Não expande a assinatura digital (`ds:Signature`).
- Recursões de tipo são cortadas na primeira repetição, e a profundidade é limitada a 24 níveis.
- Raízes reconhecidas: `NFe`, `CTe`, `CTeOS`, `NFSe` e `DPS`.

## Consequências

- O usuário escolhe campos novos de uma Nota Técnica sem esperar mudança de código.
- A comparação entre duas versões do pacote mostra o que entrou, saiu ou mudou.
- Validação contra o esquema, se um dia for necessária, será outra decisão (provavelmente no servidor).
