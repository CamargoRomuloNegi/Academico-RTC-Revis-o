/**
 * Layout raiz: fontes locais (@fontsource, sem CDN), barra lateral e área de conteúdo.
 */
import type { Metadata } from 'next'
import './globals.css'
import '@fontsource/outfit/300.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import { BarraLateral } from '@/components/layout/BarraLateral'

export const metadata: Metadata = {
  title: 'Extrator XML RTC',
  description: 'Extração de dados brutos de XMLs fiscais (NF-e, NFC-e, CT-e, NFS-e) e revisão de CST/cClassTrib por IA à luz da Reforma Tributária do Consumo.',
  robots: 'noindex, nofollow',
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex h-screen overflow-hidden">
          <BarraLateral />
          <main className="min-w-0 flex-1 overflow-y-auto px-8 py-7">
            <div className="mx-auto max-w-[1180px]">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}
