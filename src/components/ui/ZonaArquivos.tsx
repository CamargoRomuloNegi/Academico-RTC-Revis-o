'use client'
/**
 * Área de "arrastar e soltar" para envio de arquivos. Os arquivos são lidos no navegador;
 * nada é enviado a servidor.
 */
import { useRef, useState, type ReactNode } from 'react'
import { Upload } from 'lucide-react'

interface Props {
  aceitar: string
  multiplos?: boolean
  desabilitado?: boolean
  titulo: ReactNode
  dica?: ReactNode
  aoEscolher: (arquivos: File[]) => void
}

export function ZonaArquivos({ aceitar, multiplos = true, desabilitado, titulo, dica, aoEscolher }: Props) {
  const [arrastando, setArrastando] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  const entregar = (lista: FileList | null) => {
    if (!lista || lista.length === 0 || desabilitado) return
    aoEscolher(Array.from(lista))
    if (entrada.current) entrada.current.value = ''
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !desabilitado && entrada.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') entrada.current?.click() }}
      onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastando(false); entregar(e.dataTransfer.files) }}
      className="flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed px-6 py-9 text-center transition-colors"
      style={{
        borderColor: arrastando ? 'var(--color-primary)' : 'var(--color-border-strong)',
        background: arrastando ? 'var(--color-primary-light)' : 'var(--color-surface)',
        opacity: desabilitado ? 0.5 : 1,
      }}
    >
      <Upload size={28} style={{ color: arrastando ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
      <p className="mt-3 text-[0.92rem] font-medium">{titulo}</p>
      {dica && <p className="mt-1 text-[0.78rem] text-[var(--color-text-muted)]">{dica}</p>}
      <input ref={entrada} type="file" accept={aceitar} multiple={multiplos} className="hidden" onChange={(e) => entregar(e.target.files)} />
    </div>
  )
}
