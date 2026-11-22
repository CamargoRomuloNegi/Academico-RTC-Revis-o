'use client'
/**
 * Módulo 2 · Campos: o padrão do professor sai sempre; aqui o usuário escolhe os campos
 * adicionais (do catálogo embarcado ou do XSD) e pode salvar a escolha como perfil (.json).
 */
import { useMemo, useState } from 'react'
import { Download, Upload, X } from 'lucide-react'
import { useExtratorStore } from '@/application/store/useExtratorStore'
import { CATALOGO_CAMPOS, PRESETS } from '@/application/catalogo/CatalogoCampos'
import { baixar, hojeIso } from '@/application/services/ExportService'
import type { CampoCatalogo, PerfilSelecao, TemaCampo, TipoDocumento } from '@/domain/models/Campos'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Cartao } from '@/components/ui/Cartao'
import { Aviso } from '@/components/ui/Aviso'
import { Selo } from '@/components/ui/Selo'

const TIPOS: { id: TipoDocumento; nome: string }[] = [
  { id: 'NFE', nome: 'NF-e (55)' },
  { id: 'NFCE', nome: 'NFC-e (65)' },
  { id: 'CTE', nome: 'CT-e (57)' },
  { id: 'NFSE', nome: 'NFS-e Nacional' },
]

const PADRAO_DOCUMENTOS = 'Chave de Acesso, Tipo, Direção, Finalidade, Data Emissão, Emitente CNPJ e Nome, Destinatário CNPJ e Nome, Regime, Valor Total, Status, [RTC] Base IBS/CBS, Total IBS, Total CBS e Saldo.'
const PADRAO_ITENS = 'Cabeçalho do documento + Nº Item, Descrição, CFOP, NCM, Valores Bruto/Desconto/Líquido, Impacto RTC, [RTC] CST, cClassTrib, Base, Alíquotas e Valores de IBS UF, IBS Município e CBS, ICMS, PIS, COFINS e ISS.'

function eValido(dados: unknown): dados is PerfilSelecao {
  const p = dados as PerfilSelecao
  return p?.formato === 'extrator-xml-rtc/perfil-campos' && Array.isArray(p.campos)
}

export default function PaginaCampos() {
  const selecionados = useExtratorStore((s) => s.camposSelecionados)
  const alternar = useExtratorStore((s) => s.alternarCampo)
  const definir = useExtratorStore((s) => s.definirCampos)
  const [tipo, setTipo] = useState<TipoDocumento>('NFE')
  const [mensagem, setMensagem] = useState<string | null>(null)

  const ids = new Set(selecionados.map((c) => c.id))
  const doTipo = useMemo(() => {
    const extrasXsd = selecionados.filter((c) => c.origem === 'xsd' && c.tipo === tipo)
    const todos = [...CATALOGO_CAMPOS.filter((c) => c.tipo === tipo), ...extrasXsd]
    const grupos = new Map<TemaCampo, CampoCatalogo[]>()
    for (const c of todos) grupos.set(c.tema, [...(grupos.get(c.tema) ?? []), c])
    return [...grupos.entries()]
  }, [tipo, selecionados])

  function aplicarPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) return
    const manterXsd = id === 'padrao' ? [] : selecionados.filter((c) => c.origem === 'xsd')
    definir([...CATALOGO_CAMPOS.filter(preset.filtro), ...manterXsd])
  }

  function exportarPerfil() {
    const perfil: PerfilSelecao = { formato: 'extrator-xml-rtc/perfil-campos', versao: 1, nome: 'Perfil de campos', criadoEm: new Date().toISOString(), campos: selecionados }
    baixar({ nome: `perfil-campos-${hojeIso()}.json`, conteudo: new Blob([JSON.stringify(perfil, null, 2)], { type: 'application/json' }) })
  }

  async function importarPerfil(arquivo: File | undefined) {
    if (!arquivo) return
    try {
      const dados: unknown = JSON.parse(await arquivo.text())
      if (!eValido(dados)) throw new Error('O arquivo não é um perfil de campos do Extrator XML RTC.')
      definir(dados.campos)
      setMensagem(`Perfil importado: ${dados.campos.length} campo(s).`)
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : String(erro))
    }
  }

  return (
    <>
      <CabecalhoPagina
        etapa="Módulo 2"
        titulo="Campos da extração"
        descricao={
          <>
            A planilha sempre sai no <strong>padrão do professor</strong> (abas Documentos e Itens Analítico). Aqui você escolhe as colunas
            adicionais. Campos de item geram um valor por item; campos de documento se repetem em cada item daquele documento.
          </>
        }
        acoes={
          <>
            <button className="botao botao-secundario" onClick={exportarPerfil} disabled={selecionados.length === 0}><Download size={14} /> Exportar perfil</button>
            <label className="botao botao-secundario"><Upload size={14} /> Importar perfil
              <input type="file" accept=".json" className="hidden" onChange={(e) => { void importarPerfil(e.target.files?.[0]); e.target.value = '' }} />
            </label>
          </>
        }
      />
      {mensagem && <div className="mb-4"><Aviso tipo="info">{mensagem}</Aviso></div>}

      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <Cartao titulo="Aba Documentos (sempre incluída)"><p className="text-[0.8rem] leading-relaxed text-[var(--color-text-secondary)]">{PADRAO_DOCUMENTOS}</p></Cartao>
        <Cartao titulo="Aba Itens Analítico (sempre incluída)"><p className="text-[0.8rem] leading-relaxed text-[var(--color-text-secondary)]">{PADRAO_ITENS}</p></Cartao>
      </div>

      <Cartao titulo="Pontos de partida" descricao="Conjuntos prontos. Depois é só marcar ou desmarcar campo a campo." className="mb-5">
        <div className="grid gap-2 md:grid-cols-4">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => aplicarPreset(p.id)} className="rounded-lg border border-[var(--color-border)] p-3 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]">
              <p className="text-[0.85rem] font-semibold">{p.nome}</p>
              <p className="mt-1 text-[0.75rem] leading-snug text-[var(--color-text-secondary)]">{p.descricao}</p>
            </button>
          ))}
        </div>
      </Cartao>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Cartao
          titulo={
            <span className="flex flex-wrap gap-2">
              {TIPOS.map((t) => (
                <button key={t.id} onClick={() => setTipo(t.id)} className={`botao botao-pequeno ${t.id === tipo ? 'botao-primario' : 'botao-secundario'}`}>{t.nome}</button>
              ))}
            </span>
          }
        >
          <div className="space-y-5">
            {doTipo.map(([tema, campos]) => (
              <div key={tema}>
                <p className="micro-label mb-2">{tema}</p>
                <div className="grid gap-1.5 md:grid-cols-2">
                  {campos.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--color-border)] px-3 py-2 transition-colors hover:bg-[var(--color-bg)]" style={ids.has(c.id) ? { borderColor: 'var(--color-primary)', background: 'var(--color-primary-light)' } : undefined}>
                      <input type="checkbox" className="mt-1" checked={ids.has(c.id)} onChange={() => alternar(c)} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-[0.82rem] font-medium">{c.rotulo} <Selo cor={c.nivel === 'item' ? 'primario' : 'neutro'}>{c.nivel}</Selo></span>
                        <span className="font-data block truncate text-[0.68rem] text-[var(--color-text-muted)]" title={c.caminho}>{c.caminho}</span>
                        {c.descricao && <span className="block text-[0.72rem] leading-snug text-[var(--color-text-secondary)]">{c.descricao}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Cartao>

        <Cartao titulo={`Selecionados (${selecionados.length})`} descricao="Viram colunas, à direita do padrão." acoes={selecionados.length > 0 && <button className="botao botao-fantasma botao-pequeno" onClick={() => definir([])}>Limpar</button>}>
          {selecionados.length === 0 ? (
            <p className="text-[0.8rem] text-[var(--color-text-muted)]">Nenhum campo extra. A exportação sairá só com o padrão.</p>
          ) : (
            <ul className="max-h-[560px] space-y-1 overflow-y-auto">
              {selecionados.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[0.78rem] hover:bg-[var(--color-bg)]">
                  <span className="min-w-0 truncate"><Selo>{c.tipo}</Selo> {c.rotulo}</span>
                  <button title="Remover" onClick={() => alternar(c)} className="text-[var(--color-text-muted)] hover:text-[var(--color-error)]"><X size={13} /></button>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  )
}
