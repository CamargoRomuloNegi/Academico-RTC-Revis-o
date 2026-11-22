'use client'
/**
 * Navegação lateral: as etapas na ordem de uso, com indicadores do que já foi feito.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText } from 'lucide-react'
import { useExtratorStore } from '@/application/store/useExtratorStore'
import { ETAPAS, LINKS_APOIO } from './Navegacao'

export function BarraLateral() {
  const rota = usePathname()
  const documentos = useExtratorStore((s) => s.documentos.length)
  const campos = useExtratorStore((s) => s.camposSelecionados.length)
  const julgados = useExtratorStore((s) => s.linhasRevisao.filter((l) => l.resultado).length)
  const cnpj = useExtratorStore((s) => s.cnpjRaiz)

  const contador: Record<string, number> = { '/campos': campos, '/extracao': documentos, '/ia/revisao': julgados }

  const item = (href: string, rotulo: string, descricao: string | null, Icone: typeof FileText) => {
    const ativo = href === '/' ? rota === '/' : rota.startsWith(href)
    return (
      <Link key={href} href={href} className="group relative mb-0.5 flex items-center gap-3 rounded-[9px] px-3 py-2 transition-colors" style={{ background: ativo ? 'rgba(255,255,255,0.06)' : undefined }}>
        {ativo && <span className="absolute -left-3 top-[22%] bottom-[22%] w-[3px] rounded-r bg-[#4b6fe0]" />}
        <Icone size={16} color={ativo ? '#8ea6ee' : '#5c6474'} strokeWidth={2} />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.82rem] leading-tight" style={{ color: ativo ? '#eef1f6' : '#9aa2b1', fontWeight: ativo ? 550 : 450 }}>{rotulo}</span>
          {descricao && <span className="block text-[0.66rem] leading-tight" style={{ color: ativo ? '#6b7891' : '#454c5a' }}>{descricao}</span>}
        </span>
        {(contador[href] ?? 0) > 0 && (
          <span className="font-data rounded-full px-1.5 py-0.5 text-[0.62rem]" style={{ background: 'rgba(255,255,255,0.06)', color: '#aab6d4' }}>{contador[href]}</span>
        )}
      </Link>
    )
  }

  return (
    <aside className="flex w-[var(--sidebar-width)] shrink-0 flex-col bg-[var(--color-ink)] text-white">
      <div className="border-b border-[var(--color-ink-border)] px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'linear-gradient(135deg,#2f54c9,#4b6fe0)' }}>
            <FileText size={15} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[0.9rem] font-semibold leading-tight text-[#f4f5f7]">Extrator XML RTC</p>
            <p className="mt-0.5 text-[0.62rem] uppercase tracking-[0.08em] text-[#5c6474]">Dados brutos + IA</p>
          </div>
        </div>
        {cnpj && (
          <div className="mt-3.5 rounded-lg border border-[var(--color-ink-border)] bg-white/[0.04] px-3 py-2">
            <p className="text-[0.58rem] uppercase tracking-[0.09em] text-[#5c6474]">Empresa analisada</p>
            <p className="font-data text-[0.76rem] text-[#aab6d4]">CNPJ raiz {cnpj}</p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3.5">
        {ETAPAS.map((e) => item(e.href, e.rotulo, e.descricao, e.icone))}
        <div className="my-3 border-t border-[var(--color-ink-border)]" />
        {LINKS_APOIO.map((l) => item(l.href, l.rotulo, null, l.icone))}
      </nav>
      <div className="border-t border-[var(--color-ink-border)] px-5 py-3.5">
        <p className="text-[0.66rem] leading-relaxed text-[#5c6474]">XMLs processados no seu navegador. Nada é gravado em servidor.</p>
        <p className="font-data mt-1.5 text-[0.6rem] text-[#3b4250]">v1.0.0 · Prof. Camargo &amp; Claude</p>
      </div>
    </aside>
  )
}
