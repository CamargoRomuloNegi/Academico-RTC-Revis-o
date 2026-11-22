/**
 * Cabeçalho de cada etapa: número do módulo, título e o "porquê" da etapa.
 * O texto "O que acontece aqui" é parte da proposta didática do projeto.
 */
import type { ReactNode } from 'react'

interface Props {
  etapa?: string
  titulo: string
  descricao: ReactNode
  acoes?: ReactNode
}

export function CabecalhoPagina({ etapa, titulo, descricao, acoes }: Props) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {etapa && <p className="micro-label mb-1.5">{etapa}</p>}
        <h1 className="text-[1.55rem] font-semibold tracking-tight">{titulo}</h1>
        <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--color-text-secondary)]">{descricao}</p>
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </header>
  )
}
