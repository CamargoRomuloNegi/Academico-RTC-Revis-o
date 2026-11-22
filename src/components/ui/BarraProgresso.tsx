/** Barra de progresso com texto opcional. */
export function BarraProgresso({ atual, total, texto }: { atual: number; total: number; texto?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((atual / total) * 100)) : 0
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
        <div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[0.76rem] text-[var(--color-text-muted)]">
        <span className="font-data">{pct}%</span>
        {texto ? ` · ${texto}` : ''}
      </p>
    </div>
  )
}
