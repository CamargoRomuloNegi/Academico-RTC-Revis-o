'use client'
/**
 * Módulo 6 (parte 1) · Configurar IA: chaves (arquivo padrão, só em memória), modo de
 * conexão, 5 vagas do OpenRouter + 1 vaga do Gemini, parâmetros de execução e base de
 * conhecimento (Prompt Mestre, matriz, tabela de cClassTrib e tabela oficial de CFOP).
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Download, KeyRound, Loader2, RefreshCw, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useExtratorStore } from '@/application/store/useExtratorStore'
import { guardarChaves, interpretarArquivoSegredos, limparChaves, resumoChaves } from '@/infrastructure/ia/CofreSegredos'
import { listarModelosGemini, listarModelosOpenRouter, MODELOS_GEMINI_SUGERIDOS, verificarChaveOpenRouter } from '@/infrastructure/ia/ClienteIA'
import { cfopDeLinhasPlanilha, cfopsEmMaisDeUmGrupo } from '@/application/matriz/LeitorMatriz'
import { estimarTokens, montarPromptSistema } from '@/application/ia/MontadorPrompt'
import { baixar } from '@/application/services/ExportService'
import type { Conhecimento } from '@/application/store/useExtratorStore'
import { ROTULO_REGIME } from '@/domain/models/RevisaoIA'
import type { TaxRegime } from '@/domain/models/FiscalDocument'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Cartao } from '@/components/ui/Cartao'
import { Aviso } from '@/components/ui/Aviso'
import { Selo } from '@/components/ui/Selo'
import { useConhecimento } from '@/components/ia/useConhecimento'

type Mensagem = { tipo: 'sucesso' | 'erro' | 'alerta' | 'info'; texto: string } | null

const ARQUIVOS: { chave: keyof Omit<Conhecimento, 'origem'>; nome: string; arquivo: string; papel: string; aceitar: string }[] = [
  { chave: 'promptMestre', nome: 'Prompt Mestre (automação)', arquivo: 'Prompt-Mestre-RTC.md', papel: 'Identidade do agente, matriz de decisão, protocolo e formato de saída.', aceitar: '.md,.txt' },
  { chave: 'grupamentos', nome: 'Grupamentos-CFOP (matriz humana)', arquivo: 'Grupamentos-CFOP.md', papel: 'Julgamento humano: CFOP → Grupo Mestre, essência e fundamentação.', aceitar: '.md,.txt' },
  { chave: 'classificacaoJson', nome: 'Classificação tributária', arquivo: 'classificacao_tributaria.json', papel: 'Tabela oficial CST × cClassTrib usada pela IA e pela validação.', aceitar: '.json,.md,.txt' },
  { chave: 'cfopJson', nome: 'Tabela oficial de CFOP', arquivo: 'cfop_oficial.json', papel: 'Descrição oficial de cada CFOP (não vai inteira ao prompt: cada par leva a sua). Aceita a planilha do Siscomex.', aceitar: '.json,.xlsx,.xls' },
]

const REGIMES: TaxRegime[] = ['RPA', 'SIMPLES_EXCESSO', 'UNKNOWN', 'SIMPLES_NACIONAL', 'MEI']

/** Converte uma planilha de CFOP (.xlsx/.xls) para o JSON do projeto. */
async function planilhaCfopParaJson(arquivo: File): Promise<string> {
  const XLSX = await import('@e965/xlsx')
  const wb = XLSX.read(await arquivo.arrayBuffer(), { cellDates: true })
  const aba = wb.Sheets[wb.SheetNames[0] ?? '']
  if (!aba) throw new Error('A planilha está vazia.')
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, raw: true, defval: '' })
  return JSON.stringify(cfopDeLinhasPlanilha(linhas), null, 1)
}

export default function PaginaConfiguracaoIA() {
  const s = useExtratorStore()
  const { conhecimento, matriz, tabela, tabelaCfop, erroTabela, erroCfop, erro: erroConhecimento } = useConhecimento()
  const [erroTroca, setErroTroca] = useState<string | null>(null)
  const [msgChaves, setMsgChaves] = useState<Mensagem>(null)
  const [msgModelos, setMsgModelos] = useState<Mensagem>(null)
  const [buscando, setBuscando] = useState<'openrouter' | 'gemini' | 'chave' | null>(null)
  const [contextoMinimo, setContextoMinimo] = useState(100_000)
  const [soGratuitos, setSoGratuitos] = useState(true)

  // Consulta (uma vez) se o servidor tem chaves nas variáveis da Vercel.
  useEffect(() => {
    fetch('/api/ia', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { openrouter?: boolean; gemini?: boolean }) => s.definirChavesServidor({ openrouter: Boolean(d.openrouter), gemini: Boolean(d.gemini) }))
      .catch(() => s.definirChavesServidor({}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tokensPrompt = useMemo(() => (conhecimento ? estimarTokens(montarPromptSistema(conhecimento)) : 0), [conhecimento])
  const modelosFiltrados = s.modelosOpenRouter.filter((m) => (!soGratuitos || m.gratuito) && (m.contexto ?? 0) >= contextoMinimo)

  async function carregarSegredos(arquivo: File | undefined) {
    if (!arquivo) return
    const r = interpretarArquivoSegredos(await arquivo.text())
    if (Object.keys(r.chaves).length > 0) {
      guardarChaves(r.chaves)
      s.definirChavesMascaradas(resumoChaves())
    }
    setMsgChaves({ tipo: r.avisos.length ? 'alerta' : 'sucesso', texto: r.avisos.length ? r.avisos.join(' ') : `Chave(s) carregada(s) na memória: ${Object.keys(r.chaves).join(' e ')}.` })
  }

  function limpar() {
    limparChaves()
    s.definirChavesMascaradas({})
    setMsgChaves({ tipo: 'info', texto: 'Chaves apagadas da memória.' })
  }

  async function verificarOpenRouter() {
    setBuscando('chave')
    try {
      const info = await verificarChaveOpenRouter(s.parametros.modoConexao)
      setMsgChaves({ tipo: 'sucesso', texto: `Chave do OpenRouter válida${info.rotulo ? ` (${info.rotulo})` : ''}. ${info.gratuita ? 'Conta no plano gratuito: cerca de 50 requisições/dia aos modelos :free.' : 'Conta com créditos: cerca de 1.000 requisições/dia aos modelos :free.'}` })
      s.atualizarParametros({ cotaDiariaOpenRouter: info.gratuita ? 50 : 1000 })
    } catch (e) {
      setMsgChaves({ tipo: 'erro', texto: e instanceof Error ? e.message : String(e) })
    } finally {
      setBuscando(null)
    }
  }

  async function buscarModelos(provedor: 'openrouter' | 'gemini') {
    setBuscando(provedor)
    setMsgModelos(null)
    try {
      const modelos = provedor === 'openrouter' ? await listarModelosOpenRouter(s.parametros.modoConexao) : await listarModelosGemini(s.parametros.modoConexao)
      s.definirModelos(provedor, modelos)
      setMsgModelos({ tipo: 'sucesso', texto: provedor === 'openrouter' ? `${modelos.filter((m) => m.gratuito).length} modelos gratuitos encontrados no OpenRouter.` : `${modelos.length} modelos Gemini disponíveis para a sua chave.` })
    } catch (e) {
      setMsgModelos({ tipo: 'erro', texto: e instanceof Error ? e.message : String(e) })
    } finally {
      setBuscando(null)
    }
  }

  async function substituirArquivo(chave: keyof Omit<Conhecimento, 'origem'>, arquivo: File | undefined) {
    if (!arquivo || !conhecimento) return
    setErroTroca(null)
    try {
      const texto = chave === 'cfopJson' && /\.xlsx?$/i.test(arquivo.name) ? await planilhaCfopParaJson(arquivo) : await arquivo.text()
      s.definirConhecimento({ ...conhecimento, [chave]: texto, origem: { ...conhecimento.origem, [chave]: `enviado: ${arquivo.name}` } })
    } catch (e) {
      setErroTroca(`${arquivo.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const p = s.parametros
  const temChave = (prov: 'openrouter' | 'gemini') => Boolean(s.chavesMascaradas[prov]) || (p.modoConexao === 'servidor' && Boolean(s.chavesServidor[prov]))
  const duplicidades = matriz ? cfopsEmMaisDeUmGrupo(matriz) : []

  return (
    <>
      <CabecalhoPagina
        etapa="Módulo 6 · parte 1"
        titulo="Configurar a IA"
        descricao={
          <>
            Cinco modelos gratuitos do <strong>OpenRouter</strong> se revezam nos lotes, e o <strong>Gemini</strong> fica de reserva (fallback). A
            planilha final mostra qual modelo julgou cada linha, para você comparar os modelos.
          </>
        }
        acoes={<Link href="/ia/revisao" className="botao botao-primario">Ir para a revisão <ArrowRight size={14} /></Link>}
      />

      {/* 1. CHAVES */}
      <Cartao
        className="mb-5"
        titulo={<span className="flex items-center gap-2"><KeyRound size={16} /> 1. Chaves de API</span>}
        descricao="Carregue o arquivo padrão de segredos. Ele é lido só na memória desta aba: não vai para o servidor, não é gravado e some ao fechar ou recarregar a página."
        acoes={
          <>
            <a href="/modelos/segredos-ia.modelo.json" download className="botao botao-secundario botao-pequeno"><Download size={13} /> Baixar modelo do arquivo</a>
            <label className="botao botao-primario botao-pequeno"><Upload size={13} /> Carregar arquivo de segredos
              <input type="file" accept=".json,.env,.txt" className="hidden" onChange={(e) => { void carregarSegredos(e.target.files?.[0]); e.target.value = '' }} />
            </label>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {(['openrouter', 'gemini'] as const).map((prov) => (
            <div key={prov} className="rounded-lg border border-[var(--color-border)] p-3">
              <p className="text-[0.85rem] font-semibold">{prov === 'openrouter' ? 'OpenRouter' : 'Google Gemini'}</p>
              <p className="font-data mt-1 text-[0.8rem]">{s.chavesMascaradas[prov] ?? <span className="text-[var(--color-text-muted)]">nenhuma chave no arquivo</span>}</p>
              {s.chavesServidor[prov] && <p className="mt-1 text-[0.74rem] text-[var(--color-text-muted)]">Há chave nas variáveis da Vercel (usada no modo &quot;via servidor&quot;).</p>}
              <p className="mt-1 text-[0.72rem] text-[var(--color-text-muted)]">{prov === 'openrouter' ? 'Crie em openrouter.ai → Keys.' : 'Crie em aistudio.google.com → Get API key.'}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="botao botao-secundario botao-pequeno" disabled={!temChave('openrouter') || buscando !== null} onClick={verificarOpenRouter}>
            {buscando === 'chave' ? <Loader2 size={13} className="girando" /> : <ShieldCheck size={13} />} Verificar chave do OpenRouter
          </button>
          <button className="botao botao-perigo botao-pequeno" disabled={!s.chavesMascaradas.openrouter && !s.chavesMascaradas.gemini} onClick={limpar}><Trash2 size={13} /> Limpar chaves</button>
        </div>
        {msgChaves && <div className="mt-3"><Aviso tipo={msgChaves.tipo}>{msgChaves.texto}</Aviso></div>}
      </Cartao>

      {/* 2. CONEXÃO */}
      <Cartao className="mb-5" titulo="2. Modo de conexão">
        <div className="grid gap-2 md:grid-cols-2">
          {([
            ['direto', 'Direto do navegador (recomendado)', 'O navegador chama o provedor. A chave não passa pela Vercel.'],
            ['servidor', 'Via servidor (Vercel)', 'A rota /api/ia repassa a chamada, sem gravar nada. Use se o modo direto falhar por bloqueio de rede (CORS) ou para usar as chaves das variáveis da Vercel.'],
          ] as const).map(([id, nome, desc]) => (
            <label key={id} className="flex cursor-pointer gap-3 rounded-lg border p-3" style={{ borderColor: p.modoConexao === id ? 'var(--color-primary)' : 'var(--color-border)', background: p.modoConexao === id ? 'var(--color-primary-light)' : undefined }}>
              <input type="radio" className="mt-1" checked={p.modoConexao === id} onChange={() => s.atualizarParametros({ modoConexao: id })} />
              <span><span className="block text-[0.85rem] font-semibold">{nome}</span><span className="block text-[0.76rem] text-[var(--color-text-secondary)]">{desc}</span></span>
            </label>
          ))}
        </div>
      </Cartao>

      {/* 3. MODELOS */}
      <Cartao
        className="mb-5"
        titulo="3. Modelos"
        descricao={<>O prompt de sistema tem cerca de <strong className="font-data">{tokensPrompt.toLocaleString('pt-BR')}</strong> tokens (matriz e tabela completas). Escolha modelos com contexto maior que isso, com folga para a resposta.</>}
        acoes={
          <button className="botao botao-secundario botao-pequeno" disabled={buscando !== null} onClick={() => buscarModelos('openrouter')}>
            {buscando === 'openrouter' ? <Loader2 size={13} className="girando" /> : <RefreshCw size={13} />} Buscar modelos do OpenRouter
          </button>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-4 text-[0.8rem] text-[var(--color-text-secondary)]">
          <label className="flex items-center gap-2">Contexto mínimo
            <select className="entrada w-auto" value={contextoMinimo} onChange={(e) => setContextoMinimo(Number(e.target.value))}>
              {[32_000, 64_000, 100_000, 128_000, 200_000, 1_000_000].map((v) => <option key={v} value={v}>{v.toLocaleString('pt-BR')} tokens</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={soGratuitos} onChange={(e) => setSoGratuitos(e.target.checked)} /> Só gratuitos (:free)</label>
          {s.modelosOpenRouter.length > 0 && <span className="text-[var(--color-text-muted)]">{modelosFiltrados.length} modelo(s) atendem aos filtros</span>}
        </div>
        {msgModelos && <div className="mb-3"><Aviso tipo={msgModelos.tipo}>{msgModelos.texto}</Aviso></div>}

        <div className="overflow-x-auto">
          <table className="tabela">
            <thead><tr><th>Vaga</th><th>Papel</th><th>Modelo</th><th>Req./min</th><th>Ativa</th></tr></thead>
            <tbody>
              {s.vagas.map((v) => (
                <tr key={v.posicao}>
                  <td className="font-data">{v.posicao}</td>
                  <td>{v.provedor === 'openrouter' ? <Selo cor="primario">OpenRouter · rodízio</Selo> : <Selo cor="alerta">Gemini · fallback</Selo>}</td>
                  <td className="min-w-[340px]">
                    {v.provedor === 'openrouter' ? (
                      s.modelosOpenRouter.length > 0 ? (
                        <select className="entrada" value={v.modelo} onChange={(e) => s.atualizarVaga(v.posicao, { modelo: e.target.value })}>
                          <option value="">(escolha um modelo)</option>
                          {[...modelosFiltrados, ...s.modelosOpenRouter.filter((m) => m.id === v.modelo && !modelosFiltrados.includes(m))].map((m) => (
                            <option key={m.id} value={m.id}>{m.nome} · {m.contexto ? `${Math.round(m.contexto / 1000)}k` : '?'}{m.gratuito ? '' : ' · pago'}</option>
                          ))}
                        </select>
                      ) : (
                        <input className="entrada font-data" placeholder="ex.: fornecedor/modelo:free (ou clique em Buscar modelos)" value={v.modelo} onChange={(e) => s.atualizarVaga(v.posicao, { modelo: e.target.value.trim() })} />
                      )
                    ) : (
                      <div className="flex gap-2">
                        <select className="entrada" value={v.modelo} onChange={(e) => s.atualizarVaga(v.posicao, { modelo: e.target.value })}>
                          {[...new Set([...(s.modelosGemini.length ? s.modelosGemini.map((m) => m.id) : MODELOS_GEMINI_SUGERIDOS), v.modelo])].filter(Boolean).map((id) => <option key={id} value={id}>{id}</option>)}
                        </select>
                        <button className="botao botao-secundario botao-pequeno" title="Listar os modelos da sua chave" disabled={!temChave('gemini') || buscando !== null} onClick={() => buscarModelos('gemini')}>
                          {buscando === 'gemini' ? <Loader2 size={13} className="girando" /> : <RefreshCw size={13} />}
                        </button>
                      </div>
                    )}
                  </td>
                  <td><input type="number" min={1} max={120} className="entrada font-data w-20" value={v.rpm} onChange={(e) => s.atualizarVaga(v.posicao, { rpm: Math.max(1, Number(e.target.value) || 1) })} /></td>
                  <td><input type="checkbox" checked={v.ativo} onChange={(e) => s.atualizarVaga(v.posicao, { ativo: e.target.checked })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[0.74rem] leading-relaxed text-[var(--color-text-muted)]">
          Dica didática: escolha 5 modelos de famílias diferentes (ex.: Llama, Qwen, DeepSeek, Mistral, Gemma) para comparar estilos de raciocínio.
          Modelos gratuitos aparecem e somem do OpenRouter com frequência: busque a lista de novo a cada aula.
        </p>
      </Cartao>

      {/* 4. PARÂMETROS */}
      <Cartao className="mb-5" titulo="4. Parâmetros da execução" descricao="Valores ajustáveis a cada execução. As cotas diárias contam as requisições feitas nesta sessão.">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {([
            ['paresPorLote', 'Pares por chamada', 1, 40, 'Menos pares = respostas mais curtas e confiáveis; mais pares = menos chamadas.'],
            ['cotaDiariaOpenRouter', 'Cota diária OpenRouter', 1, 5000, '50 sem créditos; 1.000 com créditos (cota da conta, somando todos os :free).'],
            ['cotaDiariaGemini', 'Cota diária Gemini', 1, 5000, 'Confira o limite do seu plano no AI Studio.'],
            ['tempoLimiteSegundos', 'Tempo limite (s)', 30, 600, 'Modelos gratuitos podem demorar com prompts grandes.'],
          ] as const).map(([chave, rotulo, min, max, dica]) => (
            <label key={chave} className="block text-[0.78rem] text-[var(--color-text-secondary)] lg:col-span-1">
              <span className="micro-label block">{rotulo}</span>
              <input type="number" min={min} max={max} className="entrada font-data mt-1" value={p[chave]} onChange={(e) => s.atualizarParametros({ [chave]: Math.min(max, Math.max(min, Number(e.target.value) || min)) })} />
              <span className="mt-1 block text-[0.7rem] leading-snug text-[var(--color-text-muted)]">{dica}</span>
            </label>
          ))}
          <label className="block text-[0.78rem] text-[var(--color-text-secondary)]">
            <span className="micro-label block">Temperatura</span>
            <input type="number" step={0.1} min={0} max={1} className="entrada font-data mt-1" value={p.temperatura} onChange={(e) => s.atualizarParametros({ temperatura: Math.min(1, Math.max(0, Number(e.target.value))) })} />
            <span className="mt-1 block text-[0.7rem] leading-snug text-[var(--color-text-muted)]">Baixa (0 a 0,2) = respostas mais estáveis e técnicas.</span>
          </label>
          <label className="block text-[0.78rem] text-[var(--color-text-secondary)]">
            <span className="micro-label block">Execução</span>
            <span className="mt-2 flex items-center gap-2"><input type="checkbox" checked={p.emParalelo} onChange={(e) => s.atualizarParametros({ emParalelo: e.target.checked })} /> Vagas em paralelo</span>
            <span className="mt-1 block text-[0.7rem] leading-snug text-[var(--color-text-muted)]">Cada vaga do OpenRouter julga um lote ao mesmo tempo. Acelera; não aumenta a cota diária.</span>
          </label>
        </div>

        <div className="mt-5 grid gap-5 border-t border-[var(--color-border)] pt-4 lg:grid-cols-2">
          <div>
            <span className="micro-label block">Escopo da revisão · regime do emitente</span>
            <div className="mt-2 space-y-1.5">
              {REGIMES.map((r) => (
                <label key={r} className="flex items-center gap-2 text-[0.8rem]">
                  <input
                    type="checkbox"
                    checked={p.regimesNoEscopo.includes(r)}
                    onChange={(e) => s.atualizarParametros({ regimesNoEscopo: e.target.checked ? [...p.regimesNoEscopo, r] : p.regimesNoEscopo.filter((x) => x !== r) })}
                  />
                  {ROTULO_REGIME[r]}
                </label>
              ))}
            </div>
            <span className="mt-2 block text-[0.7rem] leading-snug text-[var(--color-text-muted)]">
              Padrão: Regime Normal e Simples com excesso de sublimite (destaca IBS/CBS como contribuinte comum). Simples Nacional e MEI ficam fora. Mudar o escopo reinicia a revisão.
            </span>
          </div>
          <div>
            <span className="micro-label block">Relatório executivo · Gemini</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([['modeloResumo', 'Modelo principal'], ['modeloResumoReserva', 'Reserva']] as const).map(([chave, rotulo]) => (
                <label key={chave} className="block text-[0.76rem] text-[var(--color-text-secondary)]">{rotulo}
                  <select className="entrada mt-1" value={p[chave]} onChange={(e) => s.atualizarParametros({ [chave]: e.target.value })}>
                    {[...new Set([...(s.modelosGemini.length ? s.modelosGemini.map((m) => m.id) : MODELOS_GEMINI_SUGERIDOS), p[chave]])].filter(Boolean).map((id) => <option key={id} value={id}>{id}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <span className="mt-2 block text-[0.7rem] leading-snug text-[var(--color-text-muted)]">
              Uma única chamada, com os números já consolidados. O Pro argumenta melhor; se falhar (ex.: limite do plano gratuito), a reserva assume.
            </span>
          </div>
        </div>
      </Cartao>

      {/* 5. BASE DE CONHECIMENTO */}
      <Cartao titulo="5. Base de conhecimento" descricao="Os três primeiros arquivos vão por inteiro à IA em cada chamada; a tabela de CFOP dá a descrição oficial de cada par. Você pode trocar qualquer um deles nesta sessão (ex.: uma nova versão da matriz) sem mexer no código.">
        {erroConhecimento && <Aviso tipo="erro">{erroConhecimento}</Aviso>}
        {erroTroca && <div className="mb-3"><Aviso tipo="erro">{erroTroca}</Aviso></div>}
        {!conhecimento && !erroConhecimento && <p className="flex items-center gap-2 text-[0.8rem] text-[var(--color-text-muted)]"><Loader2 size={14} className="girando" /> Carregando…</p>}
        {conhecimento && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {ARQUIVOS.map((a) => (
              <div key={a.chave} className="flex flex-col rounded-lg border border-[var(--color-border)] p-3">
                <p className="text-[0.85rem] font-semibold">{a.nome}</p>
                <p className="mt-1 flex-1 text-[0.76rem] text-[var(--color-text-secondary)]">{a.papel}</p>
                <p className="mt-2 text-[0.72rem] text-[var(--color-text-muted)]">
                  {conhecimento.origem[a.chave]} · <span className="font-data">{(conhecimento[a.chave].length / 1024).toFixed(0)} KB</span>
                </p>
                <div className="mt-2 flex gap-2">
                  <button className="botao botao-secundario botao-pequeno" onClick={() => baixar({ nome: a.arquivo, conteudo: new Blob([conhecimento[a.chave]], { type: 'text/plain;charset=utf-8' }) })}><Download size={13} /> Baixar</button>
                  <label className="botao botao-secundario botao-pequeno"><Upload size={13} /> Trocar
                    <input type="file" accept={a.aceitar} className="hidden" onChange={(e) => { void substituirArquivo(a.chave, e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
        {matriz && (
          <div className="mt-3 space-y-2">
            <Aviso tipo={matriz.subgrupos.length ? 'info' : 'erro'}>
              Matriz: <strong>{matriz.subgrupos.length}</strong> subgrupos e <strong>{matriz.porCfop.size}</strong> CFOPs.{' '}
              {duplicidades.length > 0 && <>CFOPs em mais de um grupo (revisão humana obrigatória): <span className="font-data">{duplicidades.join(', ')}</span>.</>}
              {tabela && <> Tabela: <strong>{tabela.registros.length}</strong> classificações.</>}
              {tabelaCfop && <> CFOP oficial: <strong>{tabelaCfop.registros.length}</strong> códigos.</>}
            </Aviso>
            {erroTabela && <Aviso tipo="erro">{erroTabela}</Aviso>}
            {erroCfop && <Aviso tipo="erro">Tabela de CFOP: {erroCfop}</Aviso>}
          </div>
        )}
      </Cartao>
    </>
  )
}
