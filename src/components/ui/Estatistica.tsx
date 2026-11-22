/** Indicador numérico grande e leve. */
import type { ReactNode } from 'react'

export function Estatistica({ rotulo, valor, detalhe }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode }) {
  return (
    <div className="cartao px-4 py-3.5">
      <p className="micro-label">{rotulo}</p>
      <p className="font-data mt-1 text-[1.45rem] font-light leading-tight">{valor}</p>
      {detalhe && <p className="mt-0.5 text-[0.74rem] text-[var(--color-text-muted)]">{detalhe}</p>}
    </div>
  )
}
