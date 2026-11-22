/**
 * Gráficos do resumo executivo, em HTML/CSS puro (sem biblioteca), para imprimir bem em PDF.
 *
 * Regras de visualização adotadas (para manutenção):
 *   - Conformidade é UMA grandeza dividida em partes → barra segmentada alta, com 2 px de
 *     espaço entre as partes, rótulo de percentual dentro quando cabe, legenda com os
 *     nomes e a tabela logo abaixo (a cor nunca é a única pista).
 *   - Rankings (CFOPs, grupos) são de uma série só → barras horizontais finas de um único
 *     tom, com o valor em texto ao lado (sem legenda: o título nomeia a série).
 *   - Dica ao passar o mouse (title) em toda marca.
 */
import { formatBRL } from '@/lib/utils'

export interface Parte {
  nome: string
  valor: number
  qtd: number
  cor: string
  /** Cor do texto dentro do bloco (contraste). */
  tinta: string
}

const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

export function BarraSegmentada({ partes, rotulo }: { partes: Parte[]; rotulo: string }) {
  const total = partes.reduce((s, p) => s + p.valor, 0)
  const visiveis = partes.filter((p) => p.valor > 0)
  return (
    <figure aria-label={`${rotulo}: ${partes.map((p) => `${p.nome} ${total ? pct(p.valor / total) : '0%'}`).join(', ')}`}>
      <div className="flex h-7 w-full gap-[2px]">
        {total === 0 && <div className="h-full w-full rounded bg-[var(--color-border)]" />}
        {visiveis.map((p) => {
          const parte = p.valor / total
          return (
            <div
              key={p.nome}
              title={`${p.nome}: ${formatBRL(p.valor)} · ${pct(parte)} · ${p.qtd} par(es)`}
              className="flex h-full items-center overflow-hidden rounded px-2 text-[0.72rem] font-semibold"
              style={{ width: `${parte * 100}%`, background: p.cor, color: p.tinta }}
            >
              {parte >= 0.08 ? pct(parte) : ''}
            </div>
          )
        })}
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.74rem] text-[var(--color-text-secondary)]">
        {partes.map((p) => (
          <span key={p.nome} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.cor }} />
            {p.nome}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

/** Linha de ranking: rótulo, barra fina proporcional e valor. */
export function BarraRanking({ valor, maximo, titulo }: { valor: number; maximo: number; titulo: string }) {
  const largura = maximo > 0 ? Math.max(1.5, (valor / maximo) * 100) : 0
  return (
    <div className="h-2.5 w-full rounded-r bg-transparent" title={titulo}>
      <div className="h-full rounded-r" style={{ width: `${largura}%`, background: 'var(--color-primary)' }} />
    </div>
  )
}
