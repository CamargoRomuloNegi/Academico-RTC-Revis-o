/**
 * Superfície padrão das telas: título, descrição opcional, ações à direita e conteúdo.
 */
import type { ReactNode } from 'react'

interface Props {
  titulo?: ReactNode
  descricao?: ReactNode
  acoes?: ReactNode
  children?: ReactNode
  className?: string
}

export function Cartao({ titulo, descricao, acoes, children, className = '' }: Props) {
  return (
    <section className={`cartao p-5 ${className}`}>
      {(titulo || acoes) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {titulo && <h2 className="text-[0.98rem] font-semibold tracking-tight">{titulo}</h2>}
            {descricao && <p className="mt-1 text-[0.83rem] leading-relaxed text-[var(--color-text-secondary)]">{descricao}</p>}
          </div>
          {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
