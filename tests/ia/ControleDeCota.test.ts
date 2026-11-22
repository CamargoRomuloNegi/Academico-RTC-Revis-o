import { describe, it, expect } from 'vitest'
import { ControleDeCota, type Relogio } from '@/application/ia/ControleDeCota'

function relogioFalso(): Relogio & { t: number } {
  const r = { t: 0, agora: () => r.t, dormir: async (ms: number) => { r.t += ms } }
  return r
}

describe('ControleDeCota', () => {
  it('respeita o rpm por vaga com janela de 60 s', async () => {
    const relogio = relogioFalso()
    const c = new ControleDeCota({ openrouter: 100, gemini: 100 }, relogio)
    for (let i = 0; i < 2; i++) {
      expect(await c.aguardarVez('v1', 2)).toBe(0)
      c.registrar('v1', 'openrouter')
    }
    const esperou = await c.aguardarVez('v1', 2)
    expect(esperou).toBeGreaterThanOrEqual(60_000)
    expect(await c.aguardarVez('v2', 2)).toBe(0) // outra vaga não espera
  })

  it('controla a cota diária por provedor', () => {
    const c = new ControleDeCota({ openrouter: 2, gemini: 5 }, relogioFalso())
    c.registrar('v1', 'openrouter')
    c.registrar('v2', 'openrouter')
    expect(c.restanteHoje('openrouter')).toBe(0)
    expect(c.restanteHoje('gemini')).toBe(5)
    expect(c.usadasHoje('openrouter')).toBe(2)
  })

  it('reservar() é atômico: tarefas em paralelo não passam do rpm nem da cota diária', async () => {
    const relogio = relogioFalso()
    const c = new ControleDeCota({ openrouter: 3, gemini: 5 }, relogio)
    const r = await Promise.all(Array.from({ length: 5 }, () => c.reservar('v1', 2, 'openrouter')))
    expect(r.filter(Boolean)).toHaveLength(3) // cota diária = 3
    expect(c.usadasHoje('openrouter')).toBe(3)
    expect(relogio.t).toBeGreaterThanOrEqual(60_000) // a 3ª esperou a janela (rpm = 2)
  })
})
