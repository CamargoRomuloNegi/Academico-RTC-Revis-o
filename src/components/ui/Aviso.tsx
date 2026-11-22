/**
 * Caixa de aviso didática. Use "info" para explicar, "sucesso" para confirmar,
 * "alerta" para pontos de atenção e "erro" para falhas.
 */
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

const ESTILOS = {
  info: { icone: Info, cor: 'var(--color-primary)', fundo: 'var(--color-primary-light)' },
  sucesso: { icone: CheckCircle2, cor: 'var(--color-valid)', fundo: 'var(--color-valid-light)' },
  alerta: { icone: AlertTriangle, cor: 'var(--color-warn)', fundo: 'var(--color-warn-light)' },
  erro: { icone: XCircle, cor: 'var(--color-error)', fundo: 'var(--color-error-light)' },
} as const

export function Aviso({ tipo = 'info', titulo, children }: { tipo?: keyof typeof ESTILOS; titulo?: ReactNode; children?: ReactNode }) {
  const { icone: Icone, cor, fundo } = ESTILOS[tipo]
  return (
    <div className="flex gap-3 rounded-[var(--radius-sm)] px-4 py-3 text-[0.83rem] leading-relaxed" style={{ background: fundo }}>
      <Icone size={16} style={{ color: cor, flexShrink: 0, marginTop: 2 }} />
      <div className="min-w-0 text-[var(--color-text-secondary)]">
        {titulo && <p className="mb-0.5 font-semibold text-[var(--color-text-primary)]">{titulo}</p>}
        {children}
      </div>
    </div>
  )
}
