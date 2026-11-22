# ADR-0006: Segredos só em memória

**Situação:** aceito · **Data:** 22/11/2026 · **Relacionado:** D14, D16 · **Origem:** ADR-0007 do ITSA-Agente

## Contexto

Os alunos usam chaves de API próprias. Não há autenticação nesta versão. O professor pediu que os segredos fossem "subidos na aplicação via arquivo padrão, sem gravação e sem exposição", com as variáveis da Vercel como alternativa.

## Decisão

- As chaves chegam por um **arquivo de segredos** (JSON ou `.env`) carregado pelo usuário.
- `CofreSegredos.ts` guarda as chaves em uma variável de módulo, **fora do estado da interface**; a interface só vê a versão mascarada.
- Nada é gravado: sem `localStorage`, `sessionStorage`, cookie, URL ou servidor.
- Modo **direto** como padrão (a chave vai só ao provedor). Modo **via servidor** como alternativa, por uma rota sem estado e sem log, com lista fechada de provedores e caminhos.
- Variáveis de ambiente da Vercel aceitas só como alternativa, com o risco documentado.
- `Redator.ts` mascara chaves em toda mensagem de erro.
- CSP limita `connect-src` aos provedores conhecidos.

## Consequências

- Recarregar a página exige carregar o arquivo de novo. É o preço de não gravar nada.
- Sem autenticação, chaves nas variáveis da Vercel ficam expostas ao consumo de qualquer visitante. Mitigação: Deployment Protection ou, no futuro, Clerk (D16). Detalhes em `docs/SEGURANCA.md`.
