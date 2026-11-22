/**
 * @file ControleDeCota.ts
 * @description Instrumentação das chamadas para não estourar os limites dos provedores
 * (decisão D12).
 *
 * DOIS LIMITES
 *   1. Por minuto, por vaga de modelo (rpm). Ex.: modelos ":free" do OpenRouter aceitam
 *      cerca de 20 requisições por minuto. Antes de cada chamada, o controle espera o tempo
 *      que falta para a janela de 60 s ter espaço.
 *   2. Por dia, por provedor. Ex.: no OpenRouter a cota diária dos modelos ":free" é da
 *      CONTA (50/dia sem créditos; 1.000/dia com créditos comprados), compartilhada por
 *      todos os modelos gratuitos. Quando a cota acaba, a vaga é pulada e o fallback assume.
 *
 * PARALELISMO (D25)
 *   Várias vagas podem chamar ao mesmo tempo. Use reservar(), que confere a cota e o rpm
 *   e registra a chamada de forma atômica (sem espera entre a checagem e o registro).
 *
 * LIMITAÇÃO CONSCIENTE
 *   Sem persistência (decisão D02), a contagem diária vale para a SESSÃO. Se o aluno já usou
 *   a cota em outra aba ou aplicação, o provedor responderá 429 e o orquestrador tratará
 *   isso como "limite", passando ao próximo modelo.
 */

import type { IdProvedor } from '@/domain/models/RevisaoIA'

export interface Relogio {
  agora: () => number
  dormir: (ms: number, signal?: AbortSignal) => Promise<void>
}

export const relogioPadrao: Relogio = {
  agora: () => Date.now(),
  dormir: (ms, signal) =>
    new Promise((resolve) => {
      if (signal?.aborted) return resolve()
      const t = setTimeout(resolve, ms)
      signal?.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
    }),
}

const JANELA_MS = 60_000

export class ControleDeCota {
  private readonly historico = new Map<string, number[]>()
  private readonly usoDiario = new Map<IdProvedor, number>()

  constructor(
    private readonly cotasDiarias: Record<IdProvedor, number>,
    private readonly relogio: Relogio = relogioPadrao,
  ) {}

  /** Requisições ainda disponíveis hoje para o provedor (nesta sessão). */
  restanteHoje(provedor: IdProvedor): number {
    return Math.max(0, (this.cotasDiarias[provedor] ?? 0) - (this.usoDiario.get(provedor) ?? 0))
  }

  usadasHoje(provedor: IdProvedor): number {
    return this.usoDiario.get(provedor) ?? 0
  }

  /** Quanto tempo (ms) falta para a vaga poder fazer mais uma chamada dentro do rpm. */
  esperaNecessaria(vaga: string, rpm: number): number {
    if (rpm <= 0) return 0
    const agora = this.relogio.agora()
    const recentes = (this.historico.get(vaga) ?? []).filter((t) => agora - t < JANELA_MS)
    this.historico.set(vaga, recentes)
    if (recentes.length < rpm) return 0
    const maisAntiga = recentes[recentes.length - rpm] as number
    return JANELA_MS - (agora - maisAntiga) + 50
  }

  /** Aguarda a vez da vaga respeitando o rpm. Retorna o tempo esperado (ms). */
  async aguardarVez(vaga: string, rpm: number, signal?: AbortSignal): Promise<number> {
    let total = 0
    for (let espera = this.esperaNecessaria(vaga, rpm); espera > 0 && !signal?.aborted; espera = this.esperaNecessaria(vaga, rpm)) {
      await this.relogio.dormir(espera, signal)
      total += espera
    }
    return total
  }

  /**
   * Reserva uma chamada: espera a janela do rpm e, NO MESMO INSTANTE em que há vaga,
   * registra o uso. Com chamadas em paralelo (D25), isso evita que duas tarefas vejam a
   * mesma vaga livre e ambas passem do limite. Devolve false se a cota diária do
   * provedor acabou ou se a execução foi interrompida.
   */
  async reservar(vaga: string, rpm: number, provedor: IdProvedor, signal?: AbortSignal): Promise<boolean> {
    for (;;) {
      if (signal?.aborted || this.restanteHoje(provedor) <= 0) return false
      const espera = this.esperaNecessaria(vaga, rpm)
      if (espera <= 0) {
        this.registrar(vaga, provedor) // síncrono: nenhuma outra tarefa roda entre a checagem e o registro
        return true
      }
      await this.relogio.dormir(espera, signal)
    }
  }

  /** Registra uma chamada feita (conta no rpm da vaga e na cota diária do provedor). */
  registrar(vaga: string, provedor: IdProvedor): void {
    const lista = this.historico.get(vaga) ?? []
    lista.push(this.relogio.agora())
    this.historico.set(vaga, lista)
    this.usoDiario.set(provedor, (this.usoDiario.get(provedor) ?? 0) + 1)
  }
}
