import { describe, it, expect, vi, afterEach } from 'vitest'
import { gerarRelatorioExecutivo } from '@/application/ia/ServicoRevisao'
import { guardarChaves, limparChaves } from '@/infrastructure/ia/CofreSegredos'
import { PARAMETROS_PADRAO } from '@/domain/models/RevisaoIA'
import { calcularIndicadores } from '@/application/resumo/ResumoExecutivo'

afterEach(() => {
  limparChaves()
  vi.unstubAllGlobals()
})

const indicadores = calcularIndicadores({
  documentos: [],
  cnpjRaiz: '',
  escopo: { regimesNoEscopo: ['RPA'], itensNoEscopo: 0, valorNoEscopo: 0, itensForaDoEscopo: 0, valorForaDoEscopo: 0, porRegime: {} },
  pares: [],
  linhas: [],
})
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status })

function simularFetch(respostas: Response[]) {
  const modelos: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    modelos.push((JSON.parse(String(init?.body)) as { model: string }).model)
    const r = respostas.shift()
    if (!r) throw new Error('sem resposta simulada')
    return r
  }))
  return modelos
}

describe('Relatório executivo (Gemini)', () => {
  it('usa por padrão modelos com cota gratuita (sem 2.5 e sem Pro)', () => {
    expect(PARAMETROS_PADRAO.modeloResumo).toBe('gemini-3.8-flash')
    expect(PARAMETROS_PADRAO.modeloResumoReserva).toBe('gemini-3.5-flash-lite')
  })

  it('passa à reserva quando o principal atinge o limite (429)', async () => {
    guardarChaves({ gemini: 'AIzaSyA0123456789abcdefghijklmnopqrstu' })
    const modelos = simularFetch([
      resposta({ error: { message: 'Quota exceeded' } }, 429),
      resposta({ choices: [{ message: { content: '## Contexto\nok' }, finish_reason: 'stop' }] }),
    ])
    const r = await gerarRelatorioExecutivo(indicadores, { ...PARAMETROS_PADRAO, cotaDiariaGemini: 50 })
    expect(modelos).toEqual(['gemini-3.8-flash', 'gemini-3.5-flash-lite'])
    expect(r.modelo).toBe('gemini::gemini-3.5-flash-lite')
  })

  it('não tenta a reserva quando o projeto está sem saldo (402) e explica o motivo', async () => {
    guardarChaves({ gemini: 'AIzaSyA0123456789abcdefghijklmnopqrstu' })
    const modelos = simularFetch([resposta({ error: { message: 'Your prepayment credits are depleted.' } }, 402)])
    await expect(gerarRelatorioExecutivo(indicadores, { ...PARAMETROS_PADRAO, cotaDiariaGemini: 51 })).rejects.toThrow(/projeto do AI Studio sem faturamento/)
    expect(modelos).toEqual(['gemini-3.8-flash'])
  })
})
