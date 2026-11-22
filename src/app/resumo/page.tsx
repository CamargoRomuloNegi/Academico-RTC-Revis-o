'use client'
/**
 * Módulo 7 · Resumo executivo (decisões D26 a D28): painel com a amostra, a empresa, as
 * principais operações e o nível de conformidade por valor; relatório executivo gerado
 * pelo Gemini; impressão em PDF (pelo navegador) e exportação das abas de resumo.
 */
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download, FileText, Loader2, Printer, Sparkles, Square } from 'lucide-react'
import { useExtratorStore } from '@/application/store/useExtratorStore'
import { calcularIndicadores, planilhasResumo, ROTULO_SITUACAO, type SituacaoConformidade } from '@/application/resumo/ResumoExecutivo'
import { gerarRelatorioExecutivo } from '@/application/ia/ServicoRevisao'
import { baixar, formatarData, gerarArquivo, hojeIso } from '@/application/services/ExportService'
import { ROTULO_REGIME } from '@/domain/models/RevisaoIA'
import { formatBRL } from '@/lib/utils'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Cartao } from '@/components/ui/Cartao'
import { Aviso } from '@/components/ui/Aviso'
import { Estatistica } from '@/components/ui/Estatistica'
import { BarraRanking, BarraSegmentada, type Parte } from '@/components/resumo/Graficos'
import { useAglutinacao } from '@/components/ia/useAglutinacao'

/** Cores da conformidade: tons de estado do projeto + cinza neutro para "não julgado". */
const CORES: Record<SituacaoConformidade, [string, string]> = {
  conforme: ['#0e8f6b', '#ffffff'],
  divergente: ['#c2403f', '#ffffff'],
  semClassificacao: ['#d9a21e', '#171b26'],
  naoJulgado: ['#9aa3b2', '#171b26'],
}
const ORDEM: SituacaoConformidade[] = ['conforme', 'divergente', 'semClassificacao', 'naoJulgado']
/** Valor curto para os indicadores (o valor exato fica no detalhe e nas tabelas). */
const compacto = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`
    : v >= 1e3 ? `R$ ${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
      : formatBRL(v)
const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`)

export default function PaginaResumo() {
  const s = useExtratorStore()
  const { pares, escopo, tabelaCfop } = useAglutinacao()
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const cancelador = useRef<AbortController | null>(null)

  const ind = useMemo(
    () => (escopo ? calcularIndicadores({ documentos: s.documentos, cnpjRaiz: s.cnpjRaiz, escopo, pares, linhas: s.linhasRevisao, tabelaCfop }) : null),
    [escopo, s.documentos, s.cnpjRaiz, pares, s.linhasRevisao, tabelaCfop],
  )
  const temChaveGemini = Boolean(s.chavesMascaradas.gemini) || (s.parametros.modoConexao === 'servidor' && Boolean(s.chavesServidor.gemini))

  async function gerar() {
    if (!ind) return
    setErro(null)
    setGerando(true)
    cancelador.current = new AbortController()
    try {
      const r = await gerarRelatorioExecutivo(ind, s.parametros, cancelador.current.signal)
      s.definirRelatorio({ ...r, geradoEm: new Date().toISOString() })
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setGerando(false)
    }
  }

  async function exportar() {
    if (!ind) return
    try {
      baixar(await gerarArquivo(planilhasResumo(ind, s.relatorio), 'xlsx', `resumo-executivo-rtc-${hojeIso()}`))
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  if (s.documentos.length === 0 || !ind) {
    return (
      <>
        <CabecalhoPagina etapa="Módulo 7" titulo="Resumo executivo" descricao="O fechamento do trabalho: amostra, principais operações, conformidade e relatório executivo." />
        <Aviso tipo="alerta" titulo="Nenhum documento carregado">
          Comece pela etapa <Link href="/extracao" className="underline">Leitura e processamento</Link> e, para medir a conformidade, faça a <Link href="/ia/revisao" className="underline">Revisão por IA</Link>.
        </Aviso>
      </>
    )
  }

  const c = ind.conformidade
  const partes: Parte[] = ORDEM.map((k) => ({ nome: ROTULO_SITUACAO[k], valor: c[k].valor, qtd: c[k].pares, cor: CORES[k][0], tinta: CORES[k][1] }))
  const maxOp = Math.max(0, ...ind.principaisOperacoes.map((o) => o.valor))
  const maxGrupo = Math.max(0, ...ind.porGrupo.map((g) => g.valor))

  return (
    <>
      <CabecalhoPagina
        etapa="Módulo 7"
        titulo="Resumo executivo"
        descricao={<>Conformidade medida <strong>por valor (R$)</strong>, com a quantidade de pares ao lado. Use <em>Imprimir</em> para salvar em PDF.</>}
        acoes={
          <div className="nao-imprimir flex flex-wrap gap-2">
            <button className="botao botao-secundario" onClick={() => window.print()}><Printer size={14} /> Imprimir / PDF</button>
            <button className="botao botao-primario" onClick={exportar}><Download size={14} /> Exportar Excel</button>
          </div>
        }
      />

      {!ind.revisao.realizada && (
        <div className="nao-imprimir mb-4">
          <Aviso tipo="info">A revisão por IA ainda não foi feita nesta sessão: a amostra e as operações já aparecem, mas a conformidade só é medida depois da <Link href="/ia/revisao" className="underline">Revisão por IA</Link>.</Aviso>
        </div>
      )}

      {/* Empresa e amostra */}
      <Cartao className="mb-5" titulo="Empresa e amostra">
        <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <dl className="space-y-1.5 text-[0.84rem]">
            <div><dt className="micro-label inline">Empresa </dt><dd className="inline font-semibold">{ind.empresa.razaoSocial}</dd></div>
            <div><dt className="micro-label inline">CNPJ raiz </dt><dd className="font-data inline">{ind.empresa.cnpjRaiz ?? '—'}</dd></div>
            <div><dt className="micro-label inline">Regime </dt><dd className="inline">{ind.empresa.regime}</dd></div>
            <div><dt className="micro-label inline">Período </dt><dd className="inline">{ind.amostra.inicio ? `${formatarData(ind.amostra.inicio).slice(0, 10)} a ${formatarData(ind.amostra.fim).slice(0, 10)}` : '—'}</dd></div>
            <div><dt className="micro-label inline">Documentos por tipo </dt><dd className="inline">{Object.entries(ind.amostra.porTipo).map(([t, n]) => `${t} ${n}`).join(' · ')}</dd></div>
          </dl>
          <div className="text-[0.8rem] text-[var(--color-text-secondary)]">
            <p className="micro-label mb-1">Escopo da revisão (regime do emitente)</p>
            <p>Revisados: {ind.escopo.regimesNoEscopo.map((r) => ROTULO_REGIME[r]).join('; ')}.</p>
            <p className="mt-1">Fora do escopo: <strong>{ind.escopo.itensForaDoEscopo}</strong> item(ns) · {formatBRL(ind.escopo.valorForaDoEscopo)}.</p>
          </div>
        </div>
      </Cartao>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <Estatistica rotulo="Índice de conformidade" valor={pct(c.indicePorValor)} detalhe={`por valor · ${pct(c.indicePorPares)} por pares`} />
        <Estatistica rotulo="Valor revisado" valor={compacto(ind.escopo.valorNoEscopo)} detalhe={`${formatBRL(ind.escopo.valorNoEscopo)} · ${ind.escopo.itensNoEscopo} itens`} />
        <Estatistica rotulo="Pares únicos" valor={ind.pares} detalhe={`${ind.revisao.julgados} julgados pela IA`} />
        <Estatistica rotulo="Revisão humana" valor={ind.revisao.revisaoHumanaPares} detalhe={`pares · ${formatBRL(ind.revisao.revisaoHumanaValor)}`} />
      </div>

      {/* Conformidade */}
      <Cartao className="mb-5" titulo="Nível de conformidade por valor" descricao="Conforme = a IA concorda com o CST/cClassTrib do XML e a validação passou. O índice considera só o que já estava classificado (conforme ÷ conforme + divergente).">
        <BarraSegmentada partes={partes} rotulo="Conformidade por valor" />
        <table className="tabela mt-4">
          <thead><tr><th>Situação</th><th className="text-right">Valor</th><th className="text-right">Participação</th><th className="text-right">Pares</th></tr></thead>
          <tbody>
            {partes.map((p) => {
              const total = partes.reduce((s2, x) => s2 + x.valor, 0)
              return (
                <tr key={p.nome}>
                  <td><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: p.cor }} />{p.nome}</td>
                  <td className="font-data text-right">{formatBRL(p.valor)}</td>
                  <td className="font-data text-right">{total ? pct(p.valor / total) : '—'}</td>
                  <td className="font-data text-right">{p.qtd}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Cartao>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Cartao titulo="Principais operações" descricao="Os 10 CFOPs de maior valor no escopo.">
          <table className="tabela">
            <thead><tr><th>CFOP</th><th>Descrição</th><th className="w-[28%]">Valor</th><th className="text-right">Part.</th></tr></thead>
            <tbody>
              {ind.principaisOperacoes.map((o) => (
                <tr key={o.cfop}>
                  <td className="font-data">{o.cfop}</td>
                  <td className="text-[0.76rem]">{o.descricao}<span className="block text-[0.7rem] text-[var(--color-text-muted)]">{o.grupos}</span></td>
                  <td><BarraRanking valor={o.valor} maximo={maxOp} titulo={`CFOP ${o.cfop}: ${formatBRL(o.valor)}`} /><span className="font-data mt-1 block text-[0.72rem]">{formatBRL(o.valor)}</span></td>
                  <td className="font-data text-right text-[0.76rem]">{pct(o.participacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
        <Cartao titulo="Valor por grupo da matriz" descricao="Enquadramento humano (sua matriz) dos pares no escopo.">
          <table className="tabela">
            <tbody>
              {ind.porGrupo.map((g) => (
                <tr key={g.grupo}>
                  <td className="w-[38%] text-[0.78rem]">{g.grupo}<span className="block text-[0.7rem] text-[var(--color-text-muted)]">{g.pares} par(es)</span></td>
                  <td><BarraRanking valor={g.valor} maximo={maxGrupo} titulo={`${g.grupo}: ${formatBRL(g.valor)}`} /><span className="font-data mt-1 block text-[0.72rem]">{formatBRL(g.valor)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      </div>

      <Cartao className="mb-5" titulo="Pontos de atenção" descricao={`${ind.pontos.length} ponto(s), do maior para o menor valor. A lista completa vai na aba "Pontos de Atenção" do Excel.`}>
        {ind.pontos.length === 0 ? (
          <p className="text-[0.82rem] text-[var(--color-text-muted)]">Nenhum ponto de atenção identificado{ind.revisao.realizada ? '' : ' (a revisão por IA ainda não foi feita)'}.</p>
        ) : (
          <table className="tabela">
            <thead><tr><th>Tipo</th><th>Par · CFOP</th><th>Atual → Proposta</th><th className="text-right">Valor</th><th>Detalhe</th></tr></thead>
            <tbody>
              {ind.pontos.slice(0, 15).map((p, i) => (
                <tr key={`${p.par}-${p.tipo}-${i}`}>
                  <td className="whitespace-nowrap text-[0.76rem] font-semibold">{p.tipo}</td>
                  <td className="font-data text-[0.74rem]">{p.par} · {p.cfop}</td>
                  <td className="font-data text-[0.74rem]">{p.classificacaoAtual}{p.proposta && <span className="block">→ {p.proposta}</span>}</td>
                  <td className="font-data text-right text-[0.76rem]">{formatBRL(p.valor)}</td>
                  <td className="max-w-[420px] text-[0.76rem] text-[var(--color-text-secondary)]">{p.detalhe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>

      <Cartao
        titulo={<span className="flex items-center gap-2"><FileText size={16} /> Relatório executivo</span>}
        descricao={s.relatorio ? `Gerado por ${s.relatorio.modelo} em ${formatarData(s.relatorio.geradoEm)}.` : `Uma chamada ao Gemini (${s.parametros.modeloResumo}, reserva ${s.parametros.modeloResumoReserva}) com os números acima.`}
        acoes={
          <div className="nao-imprimir">
            {gerando ? (
              <button className="botao botao-perigo" onClick={() => cancelador.current?.abort()}><Square size={14} /> Interromper</button>
            ) : (
              <button className="botao botao-primario" disabled={!temChaveGemini} title={temChaveGemini ? '' : 'Carregue a chave do Gemini em Configurar IA'} onClick={gerar}>
                <Sparkles size={14} /> {s.relatorio ? 'Gerar de novo' : 'Gerar relatório'}
              </button>
            )}
          </div>
        }
      >
        {!temChaveGemini && <div className="nao-imprimir mb-3"><Aviso tipo="alerta">Sem chave do Gemini. Carregue o arquivo de segredos em <Link href="/ia/configuracao" className="underline">Configurar IA</Link>.</Aviso></div>}
        {gerando && <p className="flex items-center gap-2 text-[0.82rem] text-[var(--color-text-muted)]"><Loader2 size={14} className="girando" /> Redigindo o relatório…</p>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {s.relatorio && (
          <div className="conteudo-md text-[0.88rem]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.relatorio.texto}</ReactMarkdown>
          </div>
        )}
        <p className="mt-4 text-[0.72rem] text-[var(--color-text-muted)]">
          Parecer gerado com apoio de IA (&quot;um estagiário de alto nível, mas ainda um estagiário&quot;). A responsabilidade técnica é do profissional contábil.
        </p>
      </Cartao>
    </>
  )
}
