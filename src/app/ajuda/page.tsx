/**
 * Passo a passo de uso, renderizado a partir de docs/PASSO_A_PASSO.md.
 * O arquivo é lido no build (componente de servidor), então a documentação do
 * repositório e a da tela são sempre a mesma: atualize só o .md.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export const dynamic = 'force-static'

export default function PaginaAjuda() {
  const texto = readFileSync(join(process.cwd(), 'docs', 'PASSO_A_PASSO.md'), 'utf-8')
  return (
    <article className="cartao conteudo-md max-w-[900px] px-9 py-8">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{texto}</ReactMarkdown>
    </article>
  )
}
