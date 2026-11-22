import { describe, it, expect, vi, afterEach } from 'vitest'
import { requisitar, enviarChat, listarModelosOpenRouter, ehGratuitoOpenRouter, ErroProvedor, mensagemDoCorpo, type Ambiente } from '@/infrastructure/ia/ClienteIA'
import { guardarChaves, limparChaves } from '@/infrastructure/ia/CofreSegredos'

afterEach(() => limparChaves())

function ambiente(respostas: (Response | Error)[]): Ambiente & { chamadas: { url: string; init?: RequestInit }[] } {
  const chamadas: { url: string; init?: RequestInit }[] = []
  return {
    chamadas,
    fetch: vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      chamadas.push({ url: String(url), init })
      const r = respostas.shift()
      if (!r) throw new Error('sem resposta simulada')
      if (r instanceof Error) throw r
      return r
    }) as unknown as typeof fetch,
    dormir: async () => {},
    origem: () => 'https://app.exemplo',
  }
}

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status })

describe('ClienteIA', () => {
  it('exige chave no modo direto', async () => {
    await expect(requisitar({ provedor: 'gemini', metodo: 'GET', caminho: '/models', modo: 'direto', timeoutMs: 1000 }, ambiente([]))).rejects.toMatchObject({ codigo: 'chave' })
  })

  it('envia Bearer e cabeçalhos do OpenRouter no modo direto', async () => {
    guardarChaves({ openrouter: 'sk-or-v1-abcdefghijklmnop' })
    const amb = ambiente([json({ choices: [{ message: { content: '{"resultados":[]}' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 2 } })])
    const r = await enviarChat({ provedor: 'openrouter', modelo: 'x:free', mensagens: [{ role: 'user', content: 'oi' }], temperatura: 0, timeoutMs: 1000, modo: 'direto' }, amb)
    expect(r).toMatchObject({ texto: '{"resultados":[]}', tokensEntrada: 10, tokensSaida: 2 })
    const h = amb.chamadas[0]!.init!.headers as Record<string, string>
    expect(amb.chamadas[0]!.url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(h.Authorization).toBe('Bearer sk-or-v1-abcdefghijklmnop')
    expect(h['X-Title']).toBe('Extrator XML RTC')
    expect(JSON.parse(String(amb.chamadas[0]!.init!.body)).response_format).toEqual({ type: 'json_object' })
  })

  it('no modo servidor chama /api/ia e leva a chave em x-chave-ia', async () => {
    guardarChaves({ gemini: 'AIzaSyA0123456789abcdefghijklmnopqrstu' })
    const amb = ambiente([json({ data: [] })])
    await requisitar({ provedor: 'gemini', metodo: 'GET', caminho: '/models', modo: 'servidor', timeoutMs: 1000 }, amb)
    expect(amb.chamadas[0]!.url).toBe('/api/ia')
    expect((amb.chamadas[0]!.init!.headers as Record<string, string>)['x-chave-ia']).toMatch(/^AIza/)
    expect(JSON.parse(String(amb.chamadas[0]!.init!.body))).toMatchObject({ provedor: 'gemini', metodo: 'GET', caminho: '/models' })
  })

  it('repete 503 e falha de rede, mas não repete 429', async () => {
    guardarChaves({ openrouter: 'sk-or-v1-abcdefghijklmnop' })
    const amb = ambiente([new Response('', { status: 503 }), new TypeError('Failed to fetch'), json({ ok: 1 })])
    await expect(requisitar({ provedor: 'openrouter', metodo: 'GET', caminho: '/key', modo: 'direto', timeoutMs: 1000 }, amb)).resolves.toEqual({ ok: 1 })
    expect(amb.chamadas).toHaveLength(3)

    const amb429 = ambiente([json({ error: { message: 'Rate limit exceeded: free-models-per-day' } }, 429)])
    const erro = (await requisitar({ provedor: 'openrouter', metodo: 'GET', caminho: '/key', modo: 'direto', timeoutMs: 1000 }, amb429).catch((e: unknown) => e)) as ErroProvedor
    expect(erro).toBeInstanceOf(ErroProvedor)
    expect(erro.codigo).toBe('limite')
    expect(erro.message).toContain('free-models-per-day')
    expect(amb429.chamadas).toHaveLength(1)
  })

  it('trata erro dentro de resposta 200 do OpenRouter e resposta vazia', async () => {
    guardarChaves({ openrouter: 'sk-or-v1-abcdefghijklmnop' })
    const pedido = { provedor: 'openrouter' as const, modelo: 'm', mensagens: [], temperatura: 0, timeoutMs: 1000, modo: 'direto' as const }
    await expect(enviarChat(pedido, ambiente([json({ error: { message: 'upstream' } })]))).rejects.toMatchObject({ codigo: 'indisponivel' })
    await expect(enviarChat(pedido, ambiente([json({ choices: [{ message: { content: '' } }] })]))).rejects.toMatchObject({ codigo: 'resposta' })
  })

  it('lista modelos do OpenRouter sem chave e identifica os gratuitos', async () => {
    const amb = ambiente([json({ data: [
      { id: 'b/modelo:free', name: 'B grátis', context_length: 131072, pricing: { prompt: '0', completion: '0' } },
      { id: 'a/pago', name: 'A pago', context_length: 200000, pricing: { prompt: '0.000001', completion: '0.000002' } },
    ] })])
    const modelos = await listarModelosOpenRouter('direto', amb)
    expect(modelos.map((m) => [m.id, m.gratuito])).toEqual([['a/pago', false], ['b/modelo:free', true]])
    expect(ehGratuitoOpenRouter({ id: 'x', pricing: { prompt: '0', completion: '0' } })).toBe(true)
  })

  it('extrai mensagens de erro de vários formatos', () => {
    expect(mensagemDoCorpo('{"error":{"message":"m","metadata":{"raw":"r"}}}')).toBe('m (r)')
    expect(mensagemDoCorpo('[{"error":{"message":"gemini"}}]')).toBe('gemini')
    expect(mensagemDoCorpo('{"detail":"d"}')).toBe('d')
    expect(mensagemDoCorpo('texto')).toBe('texto')
  })
})
