'use client'
/**
 * Módulo 6 (parte 2) · Revisão por IA: aglutina os itens em pares únicos, executa o
 * julgamento com rodízio de modelos e fallback, mostra o andamento e exporta o trabalho.
 */
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bot, Download, Loader2, Play, RotateCcw, Square } from 'lucide-react'
import { useExtratorStore } from '@/application/store/useExtratorStore'
import { aglutinarPares, dividirEmLotes } from '@/application/services/AglutinacaoService'
import { montarPromptSistema } from '@/application/ia/MontadorPrompt'
import { montarPlanilhasRevisao } from '@/application/ia/PlanilhaRevisao'
import { revisar, usoDaSessao } from '@/application/ia/ServicoRevisao'
import { baixar, FORMATOS, gerarArquivo, hojeIso, type FormatoExportacao } from '@/application/services/ExportService'
import type { LinhaRevisao, ParUnico } from '@/domain/models/RevisaoIA'
import { formatBRL } from '@/lib/utils'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Cartao } from '@/components/ui/Cartao'
import { Aviso } from '@/components/ui/Aviso'
import { Selo } from '@/components/ui/Selo'
import { Estatistica } from '@/components/ui/Estatistica'
import { BarraProgresso } from '@/components/ui/BarraProgresso'
import { useConhecimento } from '@/components/ia/useConhecimento'

const COR_PARECER = { CONCORDA: 'sucesso', DIVERGE: 'alerta', PROPOSTA_INICIAL: 'primario' } as const

function versaoPrompt(texto: string): string {
  const linha = texto.split('\n').find((l) => l.startsWith('# '))
  return linha ? linha.replace(/^#\s*/, '').trim() : 'Prompt Mestre'
}

export default function PaginaRevisao() {
  const s = useExtratorStore()
  const { conhecimento, matriz, tabela } = useConhecimento()
  const [formato, setFormato] = useState<FormatoExportacao>('xlsx')
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'divergentes' | 'revisao' | 'falhas'>('todos')
  const cancelador = useRef<AbortController | null>(null)

  const pares = useMemo<ParUnico[]>(() => (matriz ? aglutinarPares(s.documentos, matriz) : []), [s.documentos, matriz])
  const vagasAtivas = s.vagas.filter((v) => v.ativo && v.modelo.trim())
  const p = s.parametros
  const lotes = dividirEmLotes(pares, p.paresPorLote).length
  const uso = usoDaSessao(p)
  const temChave = (prov: 'openrouter' | 'gemini') => Boolean(s.chavesMascaradas[prov]) || (p.modoConexao === 'servidor' && Boolean(s.chavesServidor[prov]))
  const semChave = vagasAtivas.filter((v) => !temChave(v.provedor))
  const julgadas = new Set(s.linhasRevisao.filter((l) => l.resultado).map((l) => l.par.id))
  const pendentes = pares.filter((par) => !julgadas.has(par.id))

  const problemas: string[] = []
  if (s.documentos.length === 0) problemas.push('Carregue os XMLs na etapa Leitura e processamento.')
  if (vagasAtivas.length === 0) problemas.push('Configure ao menos um modelo em Configurar IA.')
  if (semChave.length > 0) problemas.push(`Sem chave para: ${[...new Set(semChave.map((v) => v.provedor))].join(', ')}. Carregue o arquivo de segredos.`)
  if (!conhecimento || !tabela) problemas.push('A base de conhecimento ainda não foi carregada (ou a tabela é inválida).')

  async function executar(somentePendentes: boolean) {
    if (!conhecimento || !tabela) return
    setErro(null)
    const alvo = somentePendentes ? pendentes : pares
    if (!somentePendentes) s.limparRevisao()
    s.iniciarRevisao()
    cancelador.current = new AbortController()
    try {
      const r = await revisar({
        pares: alvo,
        vagas: s.vagas,
        parametros: p,
        promptSistema: montarPromptSistema(conhecimento),
        tabela,
        signal: cancelador.current.signal,
        aoProgredir: s.definirProgresso,
        aoConcluirLinha: s.registrarLinha,
      })
      s.concluirRevisao(r.linhas, r.chamadas, usoDaSessao(p))
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
      s.concluirRevisao([], [], usoDaSessao(p))
    }
  }

  async function exportar() {
    if (!conhecimento) return
    try {
      const planilhas = montarPlanilhasRevisao(s.linhasRevisao, s.chamadas, {
        cnpjRaiz: s.cnpjRaiz,
        documentos: s.documentos.length,
        itens: s.documentos.reduce((n, d) => n + d.items.length, 0),
        versaoPrompt: versaoPrompt(conhecimento.promptMestre),
        paresPorLote: p.paresPorLote,
      })
      baixar(await gerarArquivo(planilhas, formato, `revisao-ia-rtc-${hojeIso()}`))
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  const linhas = s.linhasRevisao.filter((l: LinhaRevisao) =>
    filtro === 'todos' ? true
      : filtro === 'divergentes' ? l.resultado?.parecer === 'DIVERGE'
        : filtro === 'revisao' ? l.revisaoHumanaObrigatoria
          : !l.resultado,
  )
  const contagem = {
    concorda: s.linhasRevisao.filter((l) => l.resultado?.parecer === 'CONCORDA').length,
    diverge: s.linhasRevisao.filter((l) => l.resultado?.parecer === 'DIVERGE').length,
    proposta: s.linhasRevisao.filter((l) => l.resultado?.parecer === 'PROPOSTA_INICIAL').length,
    falhas: s.linhasRevisao.filter((l) => !l.resultado).length,
  }

  return (
    <>
      <CabecalhoPagina
        etapa="Módulo 6 · parte 2"
        titulo="Revisão por IA"
        descricao={
          <>
            Os itens são aglutinados por <strong>CFOP + NCM + CST + cClassTrib</strong>, e cada par único é julgado pela matriz de decisão. Ao lado
            do julgamento humano (sua matriz) e da classificação do XML, a IA <strong>concorda</strong> ou <strong>propõe</strong> outra classificação,
            com fundamentação.
          </>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <Estatistica rotulo="Pares únicos" valor={pares.length} detalhe={`de ${s.documentos.reduce((n, d) => n + d.items.length, 0)} itens`} />
        <Estatistica rotulo="Sem classificação" valor={pares.filter((x) => x.sinalizacoes.includes('sem_classificacao')).length} detalhe="IA propõe do zero" />
        <Estatistica rotulo="Fora da matriz" valor={pares.filter((x) => x.sinalizacoes.includes('cfop_fora_matriz')).length} detalhe="revisão humana" />
        <Estatistica rotulo="Duplicidade" valor={pares.filter((x) => x.sinalizacoes.includes('duplicidade_matriz')).length} detalhe="CFOP em 2 grupos" />
        <Estatistica rotulo="Chamadas previstas" valor={lotes} detalhe={`${p.paresPorLote} pares por chamada · usadas na sessão: OR ${uso.openrouter}/${p.cotaDiariaOpenRouter}, Gemini ${uso.gemini}/${p.cotaDiariaGemini}`} />
      </div>

      <Cartao className="mb-5" titulo="Execução" descricao={`${vagasAtivas.length} modelo(s) ativo(s): ${vagasAtivas.map((v) => `${v.posicao}·${v.modelo}`).join(', ') || 'nenhum'}`}>
        {problemas.length > 0 && (
          <div className="mb-3"><Aviso tipo="alerta" titulo="Antes de começar">{problemas.map((x) => <span key={x} className="block">{x}</span>)} <Link href="/ia/configuracao" className="underline">Abrir a configuração</Link></Aviso></div>
        )}
        {lotes > p.cotaDiariaOpenRouter - uso.openrouter + (p.cotaDiariaGemini - uso.gemini) && pares.length > 0 && (
          <div className="mb-3"><Aviso tipo="alerta">As chamadas previstas passam da cota restante. Aumente os pares por chamada ou divida a execução: os pares não julgados podem ser reprocessados depois.</Aviso></div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!s.emExecucao ? (
            <>
              <button className="botao botao-primario" disabled={problemas.length > 0 || pares.length === 0} onClick={() => executar(false)}><Play size={14} /> Iniciar revisão ({pares.length} pares)</button>
              {s.linhasRevisao.length > 0 && pendentes.length > 0 && (
                <button className="botao botao-secundario" disabled={problemas.length > 0} onClick={() => executar(true)}><RotateCcw size={14} /> Reprocessar não julgados ({pendentes.length})</button>
              )}
            </>
          ) : (
            <button className="botao botao-perigo" onClick={() => cancelador.current?.abort()}><Square size={14} /> Interromper</button>
          )}
        </div>
        {s.emExecucao && s.progresso && (
          <div className="mt-4">
            <BarraProgresso atual={s.progresso.paresJulgados} total={s.progresso.totalPares} texto={s.progresso.mensagem} />
          </div>
        )}
        {s.emExecucao && !s.progresso && <p className="mt-3 flex items-center gap-2 text-[0.8rem] text-[var(--color-text-muted)]"><Loader2 size={14} className="girando" /> Preparando…</p>}
        {erro && <div className="mt-3"><Aviso tipo="erro">{erro}</Aviso></div>}
      </Cartao>

      {s.linhasRevisao.length > 0 && (
        <Cartao
          titulo={<span className="flex items-center gap-2"><Bot size={16} /> Resultado linha a linha</span>}
          descricao={`Concorda ${contagem.concorda} · Diverge ${contagem.diverge} · Proposta inicial ${contagem.proposta} · Sem julgamento ${contagem.falhas}`}
          acoes={
            <>
              <select className="entrada w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
                <option value="todos">Todas as linhas</option>
                <option value="divergentes">Só divergências</option>
                <option value="revisao">Revisão humana obrigatória</option>
                <option value="falhas">Sem julgamento</option>
              </select>
              <select className="entrada w-auto" value={formato} onChange={(e) => setFormato(e.target.value as FormatoExportacao)}>
                {FORMATOS.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              <button className="botao botao-primario" disabled={s.emExecucao} onClick={exportar}><Download size={14} /> Exportar trabalho</button>
            </>
          }
        >
          <div className="max-h-[620px] overflow-auto">
            <table className="tabela">
              <thead>
                <tr><th>Par</th><th>CFOP · NCM</th><th>Humano</th><th>XML</th><th>IA</th><th>Parecer</th><th>Justificativa</th><th>Modelo</th><th /></tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.par.id}>
                    <td className="font-data text-[0.74rem]">{l.par.id}</td>
                    <td className="font-data text-[0.74rem]">{l.par.cfop || '—'}<span className="block text-[var(--color-text-muted)]">{l.par.ncm}</span><span className="block font-sans text-[0.7rem] text-[var(--color-text-muted)]">{formatBRL(l.par.valorTotal)}</span></td>
                    <td className="text-[0.76rem]">{l.par.enquadramentos.map((e) => `${e.grupo} · ${e.subgrupo}`).join(' / ') || <Selo cor="alerta">{l.par.cfop ? 'fora da matriz' : 'sem CFOP (NFS-e)'}</Selo>}</td>
                    <td className="font-data text-[0.74rem]">{l.par.cstAtual || '—'}<span className="block">{l.par.cClassTribAtual || '—'}</span></td>
                    <td className="font-data text-[0.74rem]">
                      {l.resultado ? <>{`G${l.resultado.grupo_ia}`}<span className="block">{l.resultado.cst_proposto}</span><span className="block">{l.resultado.cclasstrib_proposto}</span></> : '—'}
                      {l.validacao && !l.validacao.ok && <Selo cor="erro" titulo={l.validacao.problemas.join(' ')}>validação</Selo>}
                    </td>
                    <td>{l.resultado ? <Selo cor={COR_PARECER[l.resultado.parecer]}>{l.resultado.parecer.replace('_', ' ')}</Selo> : <Selo cor="erro">sem julgamento</Selo>}
                      {l.revisaoHumanaObrigatoria && <span className="mt-1 block"><Selo cor="alerta">revisão humana</Selo></span>}
                    </td>
                    <td className="max-w-[380px] text-[0.76rem] text-[var(--color-text-secondary)]">{l.resultado?.justificativa ?? l.erro}</td>
                    <td className="font-data max-w-[180px] truncate text-[0.7rem]" title={`${l.modeloJulgador ?? ''} · tentativas: ${l.tentativas.join(' → ')}`}>{l.modeloJulgador?.replace(/^openrouter::/, '') ?? '—'}</td>
                    <td className="text-[0.7rem] text-[var(--color-text-muted)]">{l.resultado?.confianca}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      )}
    </>
  )
}
