'use client'
/**
 * Módulo 1 · Catálogo XSD: orienta sobre os pacotes oficiais e lê, na sessão, o pacote
 * enviado pelo usuário, gerando o dicionário de campos e a comparação com a versão anterior.
 */
import { useMemo, useState } from 'react'
import { ExternalLink, Plus, Check, Search } from 'lucide-react'
import { useExtratorStore } from '@/application/store/useExtratorStore'
import { PACOTES_XSD, tiposPorRaiz } from '@/application/catalogo/PacotesXsd'
import { idCampo } from '@/application/catalogo/CatalogoCampos'
import { lerArquivos } from '@/infrastructure/arquivos/LeitorArquivos'
import { compararDicionarios, lerPacoteXsd, type DicionarioXsd, type EntradaDicionario } from '@/infrastructure/xsd/LeitorXsd'
import { ehCampoDeItem } from '@/infrastructure/xml/ExtratorPorCaminho'
import type { CampoCatalogo } from '@/domain/models/Campos'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Cartao } from '@/components/ui/Cartao'
import { Aviso } from '@/components/ui/Aviso'
import { Selo } from '@/components/ui/Selo'
import { ZonaArquivos } from '@/components/ui/ZonaArquivos'

const LIMITE_LINHAS = 300

/** Converte uma entrada do XSD em campos extraíveis (NF-e gera para 55 e 65). */
function camposDaEntrada(dic: DicionarioXsd, entrada: EntradaDicionario): CampoCatalogo[] {
  const partes = entrada.caminho.split('/')
  const rotulo = `${partes.slice(-2).join('.')}`
  return tiposPorRaiz(dic.raiz).map((tipo) => ({
    id: idCampo(tipo, entrada.caminho),
    rotulo: `[XSD] ${rotulo}`,
    tipo,
    caminho: entrada.caminho,
    nivel: ehCampoDeItem(tipo, entrada.caminho) ? 'item' : 'documento',
    tema: 'XSD (personalizado)',
    descricao: entrada.documentacao,
    origem: 'xsd',
  }))
}

export default function PaginaCatalogo() {
  const dicionarios = useExtratorStore((s) => s.dicionarios)
  const anteriores = useExtratorStore((s) => s.dicionariosAnteriores)
  const carregar = useExtratorStore((s) => s.carregarDicionarios)
  const selecionados = useExtratorStore((s) => s.camposSelecionados)
  const definirCampos = useExtratorStore((s) => s.definirCampos)
  const [lendo, setLendo] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro' | 'alerta'; texto: string } | null>(null)
  const [raizAtiva, setRaizAtiva] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [soFolhas, setSoFolhas] = useState(true)

  const ativo = dicionarios.find((d) => d.raiz === raizAtiva) ?? dicionarios[0]
  const anterior = ativo ? anteriores.find((d) => d.raiz === ativo.raiz) : undefined
  const diferenca = ativo && anterior ? compararDicionarios(anterior, ativo) : null

  const filtradas = useMemo(() => {
    if (!ativo) return []
    const termo = busca.trim().toLowerCase()
    return ativo.entradas.filter((e) => (!soFolhas || e.folha) && (!termo || e.caminho.toLowerCase().includes(termo) || e.documentacao.toLowerCase().includes(termo)))
  }, [ativo, busca, soFolhas])

  const idsSelecionados = new Set(selecionados.map((c) => c.id))

  async function receber(arquivos: File[]) {
    setLendo(true)
    setMensagem(null)
    try {
      const lidos = await lerArquivos(arquivos, ['.xsd'])
      if (lidos.arquivos.length === 0) {
        setMensagem({ tipo: 'erro', texto: 'Nenhum arquivo .xsd foi encontrado. Envie o .zip do pacote oficial ou os arquivos .xsd.' })
        return
      }
      const novos = lerPacoteXsd(new Map(lidos.arquivos.map((a) => [a.nome, a.conteudo])))
      if (novos.length === 0) {
        setMensagem({ tipo: 'alerta', texto: `Foram lidos ${lidos.arquivos.length} arquivos, mas nenhuma raiz de documento (NFe, CTe, NFSe) foi encontrada.` })
        return
      }
      carregar(novos)
      setRaizAtiva(novos[0]?.raiz ?? null)
      setMensagem({ tipo: 'sucesso', texto: `Pacote lido: ${novos.map((d) => `${d.raiz} (${d.entradas.length} elementos)`).join(', ')}. ${lidos.arquivos.length} arquivo(s) .xsd.` })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro instanceof Error ? erro.message : String(erro) })
    } finally {
      setLendo(false)
    }
  }

  function alternar(entrada: EntradaDicionario) {
    if (!ativo) return
    const campos = camposDaEntrada(ativo, entrada)
    const jaTem = campos.every((c) => idsSelecionados.has(c.id))
    definirCampos(jaTem ? selecionados.filter((c) => !campos.some((n) => n.id === c.id)) : [...selecionados, ...campos])
  }

  return (
    <>
      <CabecalhoPagina
        etapa="Módulo 1"
        titulo="Catálogo XSD"
        descricao={
          <>
            O XSD é o &quot;contrato&quot; oficial de cada documento fiscal: ele define todos os campos, seus tipos e quando são obrigatórios. A
            aplicação já traz um catálogo de campos pronto (etapa Campos). Aqui você aprende onde obter os pacotes oficiais e pode carregar um
            deles para <strong>descobrir qualquer campo</strong> e comparar versões quando sai uma nova Nota Técnica.
          </>
        }
      />

      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        {PACOTES_XSD.map((p) => (
          <Cartao key={p.raiz} titulo={p.documento}>
            <dl className="space-y-2 text-[0.8rem] leading-relaxed text-[var(--color-text-secondary)]">
              <div><dt className="micro-label">Onde obter</dt><dd>{p.portal}: {p.oQueProcurar}</dd></div>
              <div><dt className="micro-label">Arquivo principal</dt><dd className="font-data">{p.arquivoPrincipal}</dd></div>
              <div><dt className="micro-label">Reforma Tributária</dt><dd>{p.reforma}</dd></div>
            </dl>
            <a href={p.urlPortal} target="_blank" rel="noreferrer" className="botao botao-secundario botao-pequeno mt-3">
              Abrir portal <ExternalLink size={13} />
            </a>
          </Cartao>
        ))}
      </div>

      <Cartao
        titulo="Carregar um pacote de XSD"
        descricao="Envie o .zip do pacote oficial (ou os arquivos .xsd soltos). A leitura acontece no navegador e vale para esta sessão. Ao enviar um pacote novo da mesma raiz, a tela mostra o que mudou."
        className="mb-5"
      >
        <ZonaArquivos aceitar=".zip,.xsd" titulo={lendo ? 'Lendo o pacote…' : 'Arraste o pacote .zip ou os arquivos .xsd'} dica="Ex.: pacote de liberação da NF-e 4.00, esquemas do CT-e 4.00 ou da NFS-e Nacional" desabilitado={lendo} aoEscolher={receber} />
        {mensagem && <div className="mt-3"><Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso></div>}
      </Cartao>

      {ativo && (
        <Cartao
          titulo={
            <span className="flex flex-wrap items-center gap-2">
              Dicionário de campos
              {dicionarios.map((d) => (
                <button key={d.raiz} onClick={() => setRaizAtiva(d.raiz)} className={`botao botao-pequeno ${d.raiz === ativo.raiz ? 'botao-primario' : 'botao-secundario'}`}>
                  {d.raiz} {d.versao && `v${d.versao}`}
                </button>
              ))}
            </span>
          }
          descricao={`${ativo.entradas.length} elementos e atributos, lidos de ${ativo.arquivos.length} arquivo(s). Clique em + para incluir um campo na extração (ele aparece na etapa Campos).`}
        >
          {diferenca && (
            <div className="mb-4">
              <Aviso tipo={diferenca.adicionados.length + diferenca.removidos.length + diferenca.alterados.length ? 'alerta' : 'sucesso'} titulo="Comparação com a versão anterior desta sessão">
                {diferenca.adicionados.length} campo(s) novo(s), {diferenca.removidos.length} removido(s) e {diferenca.alterados.length} alterado(s).
                {diferenca.adicionados.length > 0 && (
                  <span className="font-data mt-1 block text-[0.74rem]">Novos: {diferenca.adicionados.slice(0, 12).map((e) => e.caminho).join(' · ')}{diferenca.adicionados.length > 12 ? ' …' : ''}</span>
                )}
                {diferenca.removidos.length > 0 && (
                  <span className="font-data mt-1 block text-[0.74rem]">Removidos: {diferenca.removidos.slice(0, 12).map((e) => e.caminho).join(' · ')}{diferenca.removidos.length > 12 ? ' …' : ''}</span>
                )}
              </Aviso>
            </div>
          )}
          {ativo.avisos.length > 0 && (
            <details className="mb-3 text-[0.78rem] text-[var(--color-text-muted)]">
              <summary className="cursor-pointer">{ativo.avisos.length} aviso(s) da leitura</summary>
              <ul className="mt-1 list-disc pl-5">{ativo.avisos.slice(0, 50).map((a) => <li key={a}>{a}</li>)}</ul>
            </details>
          )}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input className="entrada pl-8" placeholder="Buscar por caminho ou documentação (ex.: IBSCBS, cClassTrib, natOp)" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-[0.8rem] text-[var(--color-text-secondary)]">
              <input type="checkbox" checked={soFolhas} onChange={(e) => setSoFolhas(e.target.checked)} /> Só campos com valor
            </label>
            <span className="text-[0.78rem] text-[var(--color-text-muted)]">{filtradas.length} resultado(s)</span>
          </div>
          <div className="max-h-[520px] overflow-auto rounded-lg border border-[var(--color-border)]">
            <table className="tabela">
              <thead><tr><th /><th>Caminho</th><th>Tipo</th><th>Ocorrência</th><th>Documentação</th></tr></thead>
              <tbody>
                {filtradas.slice(0, LIMITE_LINHAS).map((e) => {
                  const marcado = camposDaEntrada(ativo, e).every((c) => idsSelecionados.has(c.id))
                  return (
                    <tr key={e.caminho}>
                      <td>
                        {e.folha && (
                          <button title={marcado ? 'Remover da extração' : 'Incluir na extração'} onClick={() => alternar(e)} className={`botao botao-pequeno ${marcado ? 'botao-primario' : 'botao-secundario'}`}>
                            {marcado ? <Check size={13} /> : <Plus size={13} />}
                          </button>
                        )}
                      </td>
                      <td className="font-data text-[0.75rem]">{e.caminho}</td>
                      <td className="font-data text-[0.74rem] text-[var(--color-text-secondary)]">{e.tipo}</td>
                      <td>
                        <Selo cor={e.minOcorrencias === '0' ? 'neutro' : 'primario'}>{e.minOcorrencias === '0' ? 'opcional' : 'obrigatório'}</Selo>{' '}
                        {e.maxOcorrencias !== '1' && <Selo cor="alerta">até {e.maxOcorrencias === 'unbounded' ? '∞' : e.maxOcorrencias}</Selo>}
                      </td>
                      <td className="max-w-[420px] text-[0.78rem] text-[var(--color-text-secondary)]">
                        {e.documentacao}
                        {e.enumeracoes.length > 0 && <span className="font-data block text-[0.7rem] text-[var(--color-text-muted)]">Valores: {e.enumeracoes.join(', ')}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtradas.length > LIMITE_LINHAS && <p className="mt-2 text-[0.76rem] text-[var(--color-text-muted)]">Mostrando {LIMITE_LINHAS} de {filtradas.length}. Refine a busca para ver os demais.</p>}
        </Cartao>
      )}
    </>
  )
}
