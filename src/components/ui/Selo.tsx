/** Rótulo curto colorido (tipo de documento, status, grupo). */
import type { ReactNode } from 'react'

const CORES = {
  neutro: ['var(--color-bg)', 'var(--color-text-secondary)'],
  primario: ['var(--color-primary-light)', 'var(--color-primary)'],
  sucesso: ['var(--color-valid-light)', 'var(--color-valid)'],
  alerta: ['var(--color-warn-light)', 'var(--color-warn)'],
  erro: ['var(--color-error-light)', 'var(--color-error)'],
} as const

export function Selo({ cor = 'neutro', children, titulo }: { cor?: keyof typeof CORES; children: ReactNode; titulo?: string }) {
  const [fundo, texto] = CORES[cor]
  return (
    <span title={titulo} className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.7rem] font-semibold" style={{ background: fundo, color: texto }}>
      {children}
    </span>
  )
}
