/**
 * @file route.ts (/api/ia)
 * @description Rota de passagem opcional ("modo via servidor") para os provedores de IA.
 *
 * QUANDO É USADA
 *   - Quando o navegador não consegue chamar o provedor direto (bloqueio de CORS ou rede).
 *   - Quando o professor prefere guardar as chaves nas variáveis de ambiente da Vercel
 *     (OPENROUTER_API_KEY e GEMINI_API_KEY), em vez de cada aluno enviar seu arquivo.
 *
 * SEGURANÇA
 *   - Sem estado e sem log: a rota não grava nada e não registra corpo, cabeçalho ou chave.
 *   - Só repassa para os dois provedores conhecidos e só para os caminhos permitidos
 *     (lista fechada), o que impede o uso da rota como proxy aberto.
 *   - A chave do arquivo do usuário chega no cabeçalho x-chave-ia e só existe durante a
 *     requisição. Sem esse cabeçalho, a rota usa a variável de ambiente, se houver.
 *   - GET /api/ia informa apenas SE há chave configurada no servidor (sim ou não).
 */

import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Tempo máximo da função (segundos). No plano Hobby da Vercel o teto efetivo pode ser menor. */
export const maxDuration = 300

const PROVEDORES = {
  openrouter: { base: 'https://openrouter.ai/api/v1', variavel: 'OPENROUTER_API_KEY' },
  gemini: { base: 'https://generativelanguage.googleapis.com/v1beta/openai', variavel: 'GEMINI_API_KEY' },
} as const

type Provedor = keyof typeof PROVEDORES

const CAMINHOS_PERMITIDOS: Record<string, 'GET' | 'POST'> = {
  '/chat/completions': 'POST',
  '/models': 'GET',
  '/key': 'GET',
}

const LIMITE_CORPO = 4 * 1024 * 1024 // a Vercel aceita até 4,5 MB por requisição

function erro(status: number, mensagem: string) {
  return NextResponse.json({ error: { message: mensagem } }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  return NextResponse.json(
    {
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(req: NextRequest) {
  const texto = await req.text()
  if (texto.length > LIMITE_CORPO) return erro(413, 'Requisição maior que o limite da rota (4 MB). Reduza os pares por lote.')

  let pedido: { provedor?: string; metodo?: string; caminho?: string; corpo?: unknown }
  try {
    pedido = JSON.parse(texto)
  } catch {
    return erro(400, 'Corpo inválido.')
  }

  const provedor = pedido.provedor as Provedor
  const config = PROVEDORES[provedor]
  const metodo = pedido.caminho ? CAMINHOS_PERMITIDOS[pedido.caminho] : undefined
  if (!config || !metodo || pedido.metodo !== metodo) return erro(400, 'Provedor ou caminho não permitido.')

  const chave = req.headers.get('x-chave-ia') || process.env[config.variavel]
  const publica = provedor === 'openrouter' && pedido.caminho === '/models'
  if (!chave && !publica) return erro(401, `Nenhuma chave disponível para ${provedor} (nem no arquivo, nem na variável ${config.variavel}).`)

  const cabecalhos: Record<string, string> = { 'Content-Type': 'application/json' }
  if (chave) cabecalhos.Authorization = `Bearer ${chave}`
  if (provedor === 'openrouter') {
    cabecalhos['HTTP-Referer'] = req.headers.get('origin') ?? 'https://vercel.app'
    cabecalhos['X-Title'] = 'Extrator XML RTC'
  }

  try {
    const resposta = await fetch(`${config.base}${pedido.caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: metodo === 'POST' ? JSON.stringify(pedido.corpo ?? {}) : undefined,
      signal: req.signal,
    })
    const corpo = await resposta.text()
    return new NextResponse(corpo, {
      status: resposta.status,
      headers: { 'Content-Type': resposta.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch {
    return erro(502, `Não foi possível conectar a ${provedor} a partir do servidor.`)
  }
}
