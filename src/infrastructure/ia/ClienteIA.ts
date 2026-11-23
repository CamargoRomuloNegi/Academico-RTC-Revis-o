/**
 * @file ClienteIA.ts
 * @description Cliente HTTP único para os provedores compatíveis com a API de chat da OpenAI:
 * OpenRouter e Google Gemini (endpoint de compatibilidade OpenAI).
 *
 * DESENHO (portado do ITSA-Agente, ADR-0010: um cliente genérico com particularidades finas)
 *   - Um só formato de requisição: POST {base}/chat/completions, com Authorization: Bearer.
 *   - Dois modos de conexão:
 *       direto   → o navegador chama o provedor; a chave NÃO passa pela Vercel (padrão).
 *       servidor → o navegador chama /api/ia (rota da Vercel), que repassa ao provedor.
 *                  Usado quando o provedor bloqueia chamadas do navegador (CORS) ou quando
 *                  a chave está nas variáveis de ambiente da Vercel.
 *   - Política de retentativa (ADR-0004 do ITSA): repete só falha de conexão e 502/503/504,
 *     no máximo 2 vezes, com espera exponencial. Não repete 429 (limite) nem tempo esgotado:
 *     nesses casos, quem decide é o orquestrador, que passa ao próximo modelo (fallback).
 *   - Mensagens de erro em português, truncadas e passadas pelo Redator.
 */

import type { IdProvedor, ModeloDisponivel } from '@/domain/models/RevisaoIA'
import { obterChave } from './CofreSegredos'
import { redigir } from './Redator'

export const URL_BASE: Record<IdProvedor, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
}

export type ModoConexao = 'direto' | 'servidor'

/** Categoria do erro, usada pelo orquestrador para decidir o fallback. */
export type CodigoErro = 'rede' | 'tempo' | 'limite' | 'chave' | 'credito' | 'indisponivel' | 'requisicao' | 'resposta' | 'cancelado'

export class ErroProvedor extends Error {
  constructor(
    readonly codigo: CodigoErro,
    mensagem: string,
    readonly status?: number,
  ) {
    super(redigir(mensagem).slice(0, 400))
    this.name = 'ErroProvedor'
  }
}

const MENSAGENS_STATUS: Record<number, [CodigoErro, string]> = {
  400: ['requisicao', 'Requisição recusada pelo provedor.'],
  401: ['chave', 'Chave de API ausente, inválida ou expirada.'],
  402: ['credito', 'Créditos ou cota esgotados no provedor.'],
  403: ['chave', 'Acesso negado pela chave de API ou pela política do provedor.'],
  404: ['requisicao', 'Modelo ou recurso não encontrado no provedor.'],
  408: ['tempo', 'O provedor não respondeu a tempo.'],
  413: ['requisicao', 'O conteúdo enviado é maior do que o modelo aceita (contexto).'],
  422: ['requisicao', 'Requisição recusada pelo provedor.'],
  429: ['limite', 'Limite de requisições do provedor atingido.'],
  500: ['indisponivel', 'Erro interno no provedor.'],
  502: ['indisponivel', 'O provedor está indisponível no momento.'],
  503: ['indisponivel', 'O provedor está indisponível no momento.'],
  504: ['indisponivel', 'O provedor está indisponível no momento.'],
}

/**
 * Explicações específicas por provedor, para os erros que o usuário precisa resolver fora
 * da ferramenta. O caso típico do Gemini: 402 "prepayment credits are depleted" significa
 * que o projeto da chave está ligado a uma conta de faturamento PRÉ-PAGA sem saldo. O Google
 * bloqueia TODAS as chaves desse projeto (e da conta de faturamento), por isso criar outra
 * chave no mesmo projeto não resolve. O plano gratuito vale para projetos SEM faturamento.
 */
const EXPLICACOES_PROVEDOR: Partial<Record<IdProvedor, Partial<Record<number, string>>>> = {
  gemini: {
    402:
      'Saldo pré-pago do Google zerado: o projeto desta chave está ligado a uma conta de faturamento pré-paga sem crédito, e todas as chaves desse projeto ficam bloqueadas. Use uma chave de um projeto do AI Studio sem faturamento (plano gratuito) ou adicione crédito.',
    429: 'Limite do plano do Gemini atingido (por minuto ou por dia, por projeto). Aguarde ou use um modelo Flash-Lite, que tem cota gratuita maior.',
  },
  openrouter: {
    402: 'Créditos do OpenRouter esgotados. Os modelos :free não exigem saldo; confira se o modelo da vaga termina em ":free".',
  },
}

const STATUS_RETENTAVEIS = new Set([502, 503, 504])
const MAX_RETENTATIVAS = 2

/** Extrai a mensagem de erro dos formatos usuais ({error:{message}}, {error:"..."}, {detail}...). */
export function mensagemDoCorpo(corpo: string): string | undefined {
  try {
    const dados = JSON.parse(corpo) as Record<string, unknown> | Array<Record<string, unknown>>
    const obj = Array.isArray(dados) ? dados[0] : dados
    if (!obj) return undefined
    const erro = obj.error
    if (erro && typeof erro === 'object') {
      const e = erro as Record<string, unknown>
      const meta = e.metadata as Record<string, unknown> | undefined
      const detalhe = typeof meta?.raw === 'string' ? ` (${meta.raw})` : ''
      return typeof e.message === 'string' ? e.message + detalhe : undefined
    }
    if (typeof erro === 'string') return erro
    for (const chave of ['detail', 'message', 'title']) {
      if (typeof obj[chave] === 'string') return obj[chave] as string
    }
  } catch {
    // corpo não é JSON
  }
  return corpo.trim() ? corpo.trim().slice(0, 200) : undefined
}

export interface OpcoesRequisicao {
  provedor: IdProvedor
  metodo: 'GET' | 'POST'
  caminho: string
  corpo?: unknown
  modo: ModoConexao
  timeoutMs: number
  signal?: AbortSignal
  /** Chave explícita (usada só no teste de chave antes de guardar). */
  chave?: string
  /** Rotas públicas (ex.: lista de modelos do OpenRouter) dispensam a chave. */
  publica?: boolean
}

/** Funções de ambiente injetáveis, para os testes não dependerem de rede nem de relógio. */
export interface Ambiente {
  fetch: typeof fetch
  dormir: (ms: number) => Promise<void>
  origem: () => string
}

export const ambientePadrao: Ambiente = {
  fetch: (...args) => fetch(...args),
  dormir: (ms) => new Promise((r) => setTimeout(r, ms)),
  origem: () => (typeof window !== 'undefined' ? window.location.origin : 'http://localhost'),
}

function cabecalhos(provedor: IdProvedor, chave: string | undefined, origem: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (chave) h.Authorization = `Bearer ${chave}`
  if (provedor === 'openrouter') {
    h['HTTP-Referer'] = origem
    h['X-Title'] = 'Extrator XML RTC'
  }
  return h
}

/** Faz uma requisição a um provedor e devolve o JSON da resposta. */
export async function requisitar<T = unknown>(op: OpcoesRequisicao, amb: Ambiente = ambientePadrao): Promise<T> {
  const chave = op.chave ?? obterChave(op.provedor)
  if (!chave && !op.publica && op.modo === 'direto') {
    throw new ErroProvedor('chave', `Nenhuma chave de ${op.provedor} carregada. Envie o arquivo de segredos na tela de configuração.`)
  }

  let tentativa = 0
  for (;;) {
    const controlador = new AbortController()
    const cancelar = () => controlador.abort()
    op.signal?.addEventListener('abort', cancelar, { once: true })
    const relogio = setTimeout(() => controlador.abort(), op.timeoutMs)

    let resposta: Response
    try {
      if (op.modo === 'servidor') {
        const h: Record<string, string> = { 'Content-Type': 'application/json' }
        if (chave) h['x-chave-ia'] = chave
        resposta = await amb.fetch('/api/ia', {
          method: 'POST',
          headers: h,
          body: JSON.stringify({ provedor: op.provedor, metodo: op.metodo, caminho: op.caminho, corpo: op.corpo }),
          signal: controlador.signal,
        })
      } else {
        resposta = await amb.fetch(`${URL_BASE[op.provedor]}${op.caminho}`, {
          method: op.metodo,
          headers: cabecalhos(op.provedor, chave, amb.origem()),
          body: op.corpo === undefined ? undefined : JSON.stringify(op.corpo),
          signal: controlador.signal,
        })
      }
    } catch (erro) {
      clearTimeout(relogio)
      op.signal?.removeEventListener('abort', cancelar)
      if (op.signal?.aborted) throw new ErroProvedor('cancelado', 'Execução interrompida pelo usuário.')
      if (controlador.signal.aborted) throw new ErroProvedor('tempo', `O provedor não respondeu em ${Math.round(op.timeoutMs / 1000)} s.`)
      if (tentativa < MAX_RETENTATIVAS) {
        await amb.dormir(1000 * 2 ** tentativa)
        tentativa++
        continue
      }
      const detalhe = erro instanceof Error ? erro.message : String(erro)
      throw new ErroProvedor(
        'rede',
        `Não foi possível conectar a ${op.provedor} (${detalhe}). Se o erro persistir no modo direto, use o modo "via servidor".`,
      )
    }

    let texto: string
    try {
      texto = await resposta.text()
    } catch {
      clearTimeout(relogio)
      op.signal?.removeEventListener('abort', cancelar)
      if (op.signal?.aborted) throw new ErroProvedor('cancelado', 'Execução interrompida pelo usuário.')
      throw new ErroProvedor('tempo', `O provedor não concluiu a resposta em ${Math.round(op.timeoutMs / 1000)} s.`)
    }
    clearTimeout(relogio)
    op.signal?.removeEventListener('abort', cancelar)

    if (STATUS_RETENTAVEIS.has(resposta.status) && tentativa < MAX_RETENTATIVAS) {
      await amb.dormir(1000 * 2 ** tentativa)
      tentativa++
      continue
    }
    if (!resposta.ok) {
      const [codigo, generico] = MENSAGENS_STATUS[resposta.status] ?? (['requisicao', `Erro HTTP ${resposta.status}.`] as [CodigoErro, string])
      const padrao = EXPLICACOES_PROVEDOR[op.provedor]?.[resposta.status] ?? generico
      const detalhe = mensagemDoCorpo(texto)
      throw new ErroProvedor(codigo, detalhe ? `${padrao} Detalhe: ${detalhe}` : padrao, resposta.status)
    }
    try {
      return JSON.parse(texto) as T
    } catch {
      throw new ErroProvedor('resposta', 'O provedor respondeu fora do formato JSON esperado.', resposta.status)
    }
  }
}

// ---------------------------------------------------------------------------
// CHAT
// ---------------------------------------------------------------------------

export interface MensagemChat {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface RespostaChat {
  texto: string
  tokensEntrada?: number
  tokensSaida?: number
  motivoFim?: string
}

interface CorpoRespostaChat {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  error?: { message?: string }
}

export interface PedidoChat {
  provedor: IdProvedor
  modelo: string
  mensagens: MensagemChat[]
  temperatura: number
  timeoutMs: number
  modo: ModoConexao
  signal?: AbortSignal
}

/** Envia uma conversa (sem streaming) e devolve o texto da resposta. */
export async function enviarChat(p: PedidoChat, amb: Ambiente = ambientePadrao): Promise<RespostaChat> {
  const corpo: Record<string, unknown> = {
    model: p.modelo,
    messages: p.mensagens,
    temperature: p.temperatura,
  }
  // O OpenRouter ignora o parâmetro nos modelos que não o suportam; ajuda os demais a
  // devolverem JSON puro. O Gemini é instruído só pelo prompt.
  if (p.provedor === 'openrouter') corpo.response_format = { type: 'json_object' }

  const dados = await requisitar<CorpoRespostaChat>(
    { provedor: p.provedor, metodo: 'POST', caminho: '/chat/completions', corpo, modo: p.modo, timeoutMs: p.timeoutMs, signal: p.signal },
    amb,
  )
  // O OpenRouter pode devolver 200 com um erro do provedor final no corpo.
  if (dados.error?.message) throw new ErroProvedor('indisponivel', `Erro do provedor: ${dados.error.message}`)
  const escolha = dados.choices?.[0]
  const texto = escolha?.message?.content ?? ''
  if (!texto.trim()) throw new ErroProvedor('resposta', 'O modelo devolveu uma resposta vazia.')
  return {
    texto,
    tokensEntrada: dados.usage?.prompt_tokens,
    tokensSaida: dados.usage?.completion_tokens,
    motivoFim: escolha?.finish_reason,
  }
}

// ---------------------------------------------------------------------------
// CATÁLOGO DE MODELOS E VERIFICAÇÃO DE CHAVE
// ---------------------------------------------------------------------------

interface ModeloOpenRouterBruto {
  id: string
  name?: string
  context_length?: number
  pricing?: { prompt?: string; completion?: string }
}

/** Um modelo é gratuito no OpenRouter quando termina em ":free" ou tem preço zero. */
export function ehGratuitoOpenRouter(m: ModeloOpenRouterBruto): boolean {
  if (m.id.endsWith(':free')) return true
  return Number(m.pricing?.prompt ?? NaN) === 0 && Number(m.pricing?.completion ?? NaN) === 0
}

/** Lista os modelos do OpenRouter (rota pública: dispensa a chave). */
export async function listarModelosOpenRouter(modo: ModoConexao, amb: Ambiente = ambientePadrao): Promise<ModeloDisponivel[]> {
  const dados = await requisitar<{ data?: ModeloOpenRouterBruto[] }>(
    { provedor: 'openrouter', metodo: 'GET', caminho: '/models', modo, timeoutMs: 30_000, publica: true },
    amb,
  )
  return (dados.data ?? [])
    .filter((m) => typeof m.id === 'string')
    .map((m) => ({
      provedor: 'openrouter' as const,
      id: m.id,
      nome: m.name ?? m.id,
      contexto: m.context_length,
      gratuito: ehGratuitoOpenRouter(m),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

/** Lista os modelos do Gemini disponíveis para a chave carregada. */
export async function listarModelosGemini(modo: ModoConexao, amb: Ambiente = ambientePadrao): Promise<ModeloDisponivel[]> {
  const dados = await requisitar<{ data?: { id: string }[] }>(
    { provedor: 'gemini', metodo: 'GET', caminho: '/models', modo, timeoutMs: 30_000 },
    amb,
  )
  return (dados.data ?? [])
    .map((m) => m.id.replace(/^models\//, ''))
    .filter((id) => id.startsWith('gemini') && !/embedding|image|tts|audio|live/i.test(id))
    .map((id) => ({ provedor: 'gemini' as const, id, nome: id, gratuito: true }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

/** Dados seguros de GET /key do OpenRouter (a chave em si nunca volta). */
export interface InfoChaveOpenRouter {
  rotulo?: string
  gratuita: boolean
  limiteCreditos: number | null
  usoCreditos?: number
}

/**
 * Verifica a chave do OpenRouter. GET /models é público e não prova nada (lição do
 * ITSA-Agente), por isso a verificação usa GET /key.
 */
export async function verificarChaveOpenRouter(modo: ModoConexao, chave?: string, amb: Ambiente = ambientePadrao): Promise<InfoChaveOpenRouter> {
  const dados = await requisitar<{ data?: { label?: string; is_free_tier?: boolean; limit?: number | null; usage?: number } }>(
    { provedor: 'openrouter', metodo: 'GET', caminho: '/key', modo, timeoutMs: 20_000, chave },
    amb,
  )
  const d = dados.data ?? {}
  return { rotulo: d.label, gratuita: d.is_free_tier ?? true, limiteCreditos: d.limit ?? null, usoCreditos: d.usage }
}

/**
 * Modelos Gemini sugeridos quando a listagem não está disponível. Todos com cota no plano
 * gratuito (conferido em ai.google.dev/gemini-api/docs/rate-limits, nov/2026):
 *   gemini-3.5-flash-lite e gemini-3.1-flash-lite → 15 RPM, 500 por dia
 *   gemini-3.8-flash e gemini-3.6-flash           → 5 RPM, 20 por dia
 * A família 2.5 ficou restrita a quem já a usava, e os modelos Pro não têm cota gratuita.
 */
export const MODELOS_GEMINI_SUGERIDOS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite']
