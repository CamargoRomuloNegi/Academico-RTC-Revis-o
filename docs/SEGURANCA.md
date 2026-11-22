# Segurança e tratamento de dados

Este documento descreve como a aplicação trata os XMLs, as planilhas e as chaves de API, e quais riscos continuam existindo. Ele acompanha as decisões D02, D14 e D15 do [Registro de Decisões](REGISTRO_DE_DECISOES.md) e o [ADR-0006](adr/0006-segredos-em-memoria.md).

## Resumo

| Item | Onde fica | Por quanto tempo |
|---|---|---|
| XMLs carregados | Memória da aba do navegador | Até recarregar ou fechar a aba |
| Dados extraídos e resultado da IA | Memória da aba do navegador | Até recarregar ou fechar a aba |
| Planilhas exportadas | Computador do usuário (download) | Responsabilidade do usuário |
| Chaves do arquivo de segredos | Memória da aba, fora do estado da interface | Até **Limpar chaves**, recarregar ou fechar a aba |
| Chaves nas variáveis da Vercel (opcional) | Servidor da Vercel | Até o administrador removê-las |

Não há banco de dados, `localStorage`, `sessionStorage`, cookies nem registros (logs) de conteúdo.

## Os XMLs não saem do navegador

A leitura, o processamento e a exportação acontecem no próprio navegador ([ADR-0001](adr/0001-processamento-no-navegador.md)). Nenhum XML é enviado à Vercel.

O que **sai** do navegador, e só por ação do usuário:

- **Revisão por IA:** os **pares únicos** enviados ao provedor escolhido: CFOP e a sua descrição oficial, CST, cClassTrib, até três descrições de produto, tipo de documento, o enquadramento da matriz, as sinalizações, a quantidade de itens e o valor total do par. CNPJ, nomes, endereços, chaves de acesso, NCM e direção da operação **não** são enviados.
- **Relatório executivo:** uma chamada ao Gemini com os **indicadores consolidados**: razão social e CNPJ raiz da empresa analisada, regime, período, totais, conformidade, principais CFOPs e os pontos de atenção (pares, valores e justificativas). Nenhum XML, item ou dado de terceiros vai junto.

> **Atenção aos termos dos provedores gratuitos.** Modelos `:free` do OpenRouter podem ter os pedidos registrados e usados pelo provedor do modelo para treinamento. Consulte as políticas de privacidade em *openrouter.ai → Settings → Privacy* e, se necessário, restrinja os provedores que aceitam registrar dados. O mesmo vale para o nível gratuito da API do Gemini.

A decisão D15 registra que a LGPD não exige tratamento adicional aqui: os dados são do cliente, sob responsabilidade do contador, e os campos enviados à IA não identificam pessoas.

## Chaves de API

### Arquivo de segredos (recomendado)

- O usuário baixa o modelo (`public/modelos/segredos-ia.modelo.json`), preenche e carrega na tela **Configurar IA**.
- `src/infrastructure/ia/CofreSegredos.ts` guarda as chaves em uma variável do módulo, **fora** do estado da interface (Zustand). A interface só recebe a versão mascarada (`sk-or-v1…abcd`).
- O arquivo é lido e descartado: o conteúdo não é guardado.
- **Limpar chaves** apaga as chaves da memória na hora.

### Modo de conexão

- **Direto** (padrão): o navegador chama `openrouter.ai` ou `generativelanguage.googleapis.com`. A chave vai só ao provedor.
- **Via servidor**: o navegador envia a chave à rota `/api/ia` no cabeçalho `x-chave-ia`. A rota repassa ao provedor e esquece. Ela:
  - aceita só dois provedores e uma lista fechada de caminhos (`/chat/completions`, `/models`, `/key`), para não virar um proxy aberto;
  - limita o corpo a 4 MB;
  - não registra corpo, cabeçalho nem chave.

### Variáveis de ambiente da Vercel (opcional)

Se `OPENROUTER_API_KEY` ou `GEMINI_API_KEY` estiverem configuradas, a rota `/api/ia` as usa quando o usuário não envia a própria chave.

> **Risco conhecido.** Não há autenticação nesta versão (D16). Qualquer pessoa que acessar o endereço da aplicação poderá consumir a cota dessas chaves pelo modo "via servidor". Só use variáveis de ambiente com a **Deployment Protection** da Vercel ativada (Settings → Deployment Protection), ou depois da integração com o Clerk prevista no roadmap.

### Redação de mensagens

Toda mensagem de erro exibida ou registrada na aba "Chamadas IA" passa por `src/infrastructure/ia/Redator.ts`, que mascara padrões de chave (`sk-or-…`, `AIza…`, `Bearer …`). Isso evita que uma chave apareça em um print de tela ou em uma planilha compartilhada.

## Cabeçalhos de segurança

Definidos em `next.config.ts` para todas as rotas:

- **Content-Security-Policy**: `connect-src` só permite a própria aplicação, `openrouter.ai` e `generativelanguage.googleapis.com`. Se um script malicioso fosse injetado, não conseguiria enviar as chaves a outro endereço. Iframes de terceiros são bloqueados (`frame-ancestors 'none'`).
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` restritiva e `Strict-Transport-Security`.

Limitação: `script-src` inclui `'unsafe-inline'`, exigido pelos scripts de hidratação do Next.js sem um mecanismo de *nonce*. A proteção principal contra vazamento de chaves é o `connect-src`.

## Boas práticas para os usuários

1. Use uma chave de API **só para esta aplicação**, para poder revogá-la sem afetar outros usos.
2. Não envie o arquivo de segredos preenchido por e-mail, chat ou GitHub.
3. Em computador compartilhado, clique em **Limpar chaves** e feche a aba ao terminar.
4. As planilhas exportadas contêm os dados do cliente. Guarde-as com o mesmo cuidado dos XMLs originais.

## Como reportar um problema

Abra uma *issue* no repositório descrevendo o problema **sem** incluir chaves, XMLs ou planilhas reais.
