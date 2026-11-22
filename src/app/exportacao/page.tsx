'use client'
/**
 * Módulo 5 · Exportação: gera a planilha no padrão do professor (+ campos escolhidos)
 * no formato desejado, inteiramente no navegador.
 */
import { useState } from 'react'
import Link from 'next/link'
import { Download, Loader2 } from 'lucide-react'
import { useExtratorStore } from '@/application/store/useExtratorStore'
import { abaSobre, baixar, FORMATOS, gerarArquivo, hojeIso, montarPlanilhasExtracao, type FormatoExportacao } from '@/application/services/ExportService'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Cartao } from '@/components/ui/Cartao'
import { Aviso } from '@/components/ui/Aviso'

export default function PaginaExportacao() {
  const documentos = useExtratorStore((s) => s.documentos)
  const campos = useExtratorStore((s) => s.camposSelecionados)
  const cnpjRaiz = useExtratorStore((s) => s.cnpjRaiz)
  const [formato, setFormato] = useState<FormatoExportacao>('xlsx')
  const [incluirSobre, setIncluirSobre] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  const itens = documentos.reduce((s, d) => s + d.items.length, 0)

  async function exportar() {
    setGerando(true)
    setMensagem(null)
    await new Promise((r) => setTimeout(r, 30)) // deixa a tela mostrar o "gerando"
    try {
      const planilhas = montarPlanilhasExtracao(documentos, campos)
      if (incluirSobre) {
        planilhas.push(abaSobre('Extração de dados brutos · Extrator XML RTC', [
          ['CNPJ raiz analisado', cnpjRaiz ?? 'não identificado'],
          ['Documentos', documentos.length],
          ['Itens', itens],
          ['Campos adicionais', campos.map((c) => `${c.tipo}: ${c.caminho}`).join('; ') || 'nenhum'],
        ]))
      }
      const arquivo = await gerarArquivo(planilhas, formato, `extracao-rtc-${hojeIso()}`)
      baixar(arquivo)
      setMensagem({ tipo: 'sucesso', texto: `Arquivo ${arquivo.nome} gerado (${(arquivo.conteudo.size / 1024).toFixed(0)} KB).` })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro instanceof Error ? erro.message : String(erro) })
    } finally {
      setGerando(false)
    }
  }

  return (
    <>
      <CabecalhoPagina
        etapa="Módulo 5"
        titulo="Exportação"
        descricao={
          <>
            Gera o arquivo no padrão <strong>Documentos</strong> (resumo totalizado, uma linha por documento) + <strong>Itens Analítico</strong> (uma
            linha por item, pronta para filtros e tabelas dinâmicas). Os campos escolhidos na etapa Campos entram à direita.
          </>
        }
      />

      {documentos.length === 0 ? (
        <Aviso tipo="alerta" titulo="Nenhum documento carregado">
          Carregue os XMLs na etapa <Link className="underline" href="/extracao">Leitura e processamento</Link>.
        </Aviso>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <Cartao titulo="Formato do arquivo">
            <div className="grid gap-2 md:grid-cols-2">
              {FORMATOS.map((f) => (
                <label key={f.id} className="flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors" style={{ borderColor: formato === f.id ? 'var(--color-primary)' : 'var(--color-border)', background: formato === f.id ? 'var(--color-primary-light)' : undefined }}>
                  <input type="radio" name="formato" checked={formato === f.id} onChange={() => setFormato(f.id)} className="mt-1" />
                  <span><span className="block text-[0.88rem] font-semibold">{f.nome}</span><span className="block text-[0.76rem] text-[var(--color-text-secondary)]">{f.descricao}</span></span>
                </label>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-2 text-[0.82rem] text-[var(--color-text-secondary)]">
              <input type="checkbox" checked={incluirSobre} onChange={(e) => setIncluirSobre(e.target.checked)} /> Incluir a aba &quot;Sobre&quot; (data, totais, campos adicionais e créditos)
            </label>
            <div className="mt-5 flex items-center gap-3">
              <button className="botao botao-primario" onClick={exportar} disabled={gerando}>
                {gerando ? <Loader2 size={14} className="girando" /> : <Download size={14} />} Gerar e baixar
              </button>
              {mensagem && <span className="text-[0.82rem]" style={{ color: mensagem.tipo === 'erro' ? 'var(--color-error)' : 'var(--color-valid)' }}>{mensagem.texto}</span>}
            </div>
          </Cartao>
          <Cartao titulo="O que vai no arquivo">
            <ul className="space-y-2 text-[0.82rem] text-[var(--color-text-secondary)]">
              <li><strong className="font-data">{documentos.length}</strong> linhas na aba Documentos</li>
              <li><strong className="font-data">{itens}</strong> linhas na aba Itens Analítico</li>
              <li><strong className="font-data">{campos.length}</strong> coluna(s) adicional(is) {campos.length === 0 && <Link href="/campos" className="underline">escolher</Link>}</li>
              <li>CNPJ raiz: <span className="font-data">{cnpjRaiz ?? '—'}</span></li>
            </ul>
            <p className="mt-4 text-[0.75rem] leading-relaxed text-[var(--color-text-muted)]">Em CSV e TXT, cada aba vira um arquivo; com mais de uma aba, eles saem num .zip. Números usam vírgula decimal.</p>
          </Cartao>
        </div>
      )}
    </>
  )
}
