import { describe, it, expect } from 'vitest'
import { executarRevisao, cadeiaDoLote, type DependenciasRevisao } from '@/application/ia/OrquestradorRevisao'
import { ControleDeCota } from '@/application/ia/ControleDeCota'
import { ErroProvedor, type MensagemChat } from '@/infrastructure/ia/ClienteIA'
import { lerTabelaClassificacao } from '@/application/matriz/LeitorMatriz'
import { PARAMETROS_PADRAO, type ParUnico, type VagaModelo } from '@/domain/models/RevisaoIA'
import { lerConhecimento, resultadoValido } from '../helpers'

const tabela = lerTabelaClassificacao(lerConhecimento('classificacao_tributaria.json'))
const relogio = { agora: () => 0, dormir: async () => {} }

function par(id: string, extra: Partial<ParUnico> = {}): ParUnico {
  return { id, cfop: '5101', descricaoCfop: 'Venda de produção do estabelecimento', cstAtual: '000', cClassTribAtual: '000001', descricoesExemplo: ['x'], tiposDocumento: ['NFE'], ncms: ['25291000'], qtdNcms: 1, qtdItens: 1, valorTotal: 1, enquadramentos: [{ grupo: 'II', subgrupo: 'Venda de Produção', essencia: 'e' }], sinalizacoes: [], ...extra }
}

const vagas: VagaModelo[] = [
  ...[1, 2, 3, 4, 5].map((posicao) => ({ posicao, provedor: 'openrouter' as const, modelo: `m${posicao}:free`, rpm: 20, ativo: true })),
  { posicao: 6, provedor: 'gemini', modelo: 'gemini-3.5-flash-lite', rpm: 10, ativo: true },
]

/** Provedor simulado: responde válido para todos os ids recebidos, exceto nas vagas indicadas. */
function simulado(falham: Set<number> = new Set(), parcial = false): DependenciasRevisao & { usadas: number[] } {
  const usadas: number[] = []
  return {
    usadas,
    relogio,
    chamar: async (vaga, mensagens: MensagemChat[]) => {
      usadas.push(vaga.posicao)
      if (falham.has(vaga.posicao)) throw new ErroProvedor('limite', 'Limite de requisições do provedor atingido.', 429)
      const ids = (JSON.parse(mensagens[1]!.content.slice(mensagens[1]!.content.indexOf('{'))) as { pares: { id: string }[] }).pares.map((p) => p.id)
      const responder = parcial ? ids.slice(0, 1) : ids
      return { texto: JSON.stringify({ resultados: responder.map((id) => resultadoValido(id)) }), tokensEntrada: 100, tokensSaida: 10 }
    },
  }
}

const parametros = { ...PARAMETROS_PADRAO, paresPorLote: 2 }

describe('OrquestradorRevisao', () => {
  it('faz rodízio entre as 5 vagas do OpenRouter e deixa o Gemini como reserva', () => {
    expect(cadeiaDoLote(0, vagas).map((v) => v.posicao)).toEqual([1, 2, 3, 4, 5, 6])
    expect(cadeiaDoLote(6, vagas).map((v) => v.posicao)).toEqual([2, 3, 4, 5, 1, 6])
    expect(cadeiaDoLote(0, vagas.map((v) => ({ ...v, ativo: v.provedor === 'gemini' }))).map((v) => v.posicao)).toEqual([6])
  })

  it('julga todos os pares e registra o modelo que julgou cada linha', async () => {
    const deps = simulado()
    const pares = Array.from({ length: 10 }, (_, i) => par(`P${i + 1}`))
    const r = await executarRevisao({ pares, vagas, parametros, promptSistema: 'S', tabela }, deps)
    expect(deps.usadas).toEqual([1, 2, 3, 4, 5])
    expect(r.linhas.every((l) => l.resultado && l.validacao?.ok)).toBe(true)
    expect(r.linhas[0]!.modeloJulgador).toBe('openrouter::m1:free')
    expect(r.linhas[9]!.modeloJulgador).toBe('openrouter::m5:free')
    expect(r.linhas[0]!.revisaoHumanaObrigatoria).toBe(false)
    expect(r.chamadas.every((c) => c.status === 'OK')).toBe(true)
  })

  it('aplica o fallback até o Gemini quando as vagas falham', async () => {
    const deps = simulado(new Set([1, 2, 3, 4, 5]))
    const r = await executarRevisao({ pares: [par('P1')], vagas, parametros, promptSistema: 'S', tabela }, deps)
    expect(deps.usadas).toEqual([1, 2, 3, 4, 5, 6])
    expect(r.linhas[0]!.modeloJulgador).toBe('gemini::gemini-3.5-flash-lite')
    expect(r.linhas[0]!.tentativas).toEqual(['Vaga 1', 'Vaga 2', 'Vaga 3', 'Vaga 4', 'Vaga 5', 'Vaga 6'])
  })

  it('reenvia ao próximo modelo só os pares que vieram faltando', async () => {
    const deps = simulado(new Set(), true)
    const r = await executarRevisao({ pares: [par('P1'), par('P2')], vagas, parametros, promptSistema: 'S', tabela }, deps)
    expect(deps.usadas).toEqual([1, 2])
    expect(r.linhas.map((l) => l.modeloJulgador)).toEqual(['openrouter::m1:free', 'openrouter::m2:free'])
    expect(r.chamadas.map((c) => c.status)).toEqual(['PARCIAL', 'OK'])
  })

  it('pula o provedor com cota diária esgotada', async () => {
    const deps = simulado()
    const controle = new ControleDeCota({ openrouter: 0, gemini: 10 }, relogio)
    const r = await executarRevisao({ pares: [par('P1')], vagas, parametros, promptSistema: 'S', tabela, controle }, deps)
    expect(deps.usadas).toEqual([6])
    expect(r.chamadas.filter((c) => c.status === 'PULADA')).toHaveLength(5)
  })

  it('marca erro e revisão humana quando nenhum modelo julga', async () => {
    const deps = simulado(new Set([1, 2, 3, 4, 5, 6]))
    const r = await executarRevisao({ pares: [par('P1')], vagas, parametros, promptSistema: 'S', tabela }, deps)
    expect(r.linhas[0]!.resultado).toBeUndefined()
    expect(r.linhas[0]!.erro).toMatch(/Nenhum modelo/)
    expect(r.linhas[0]!.revisaoHumanaObrigatoria).toBe(true)
  })

  it('exige revisão humana para duplicidade e CFOP fora da matriz, mesmo com IA confiante', async () => {
    const r = await executarRevisao({ pares: [par('P1', { sinalizacoes: ['duplicidade_matriz'] }), par('P2', { sinalizacoes: ['cfop_fora_matriz'] })], vagas, parametros, promptSistema: 'S', tabela }, simulado())
    expect(r.linhas.every((l) => l.revisaoHumanaObrigatoria)).toBe(true)
  })

  it('interrompe quando o usuário cancela', async () => {
    const controlador = new AbortController()
    controlador.abort()
    const r = await executarRevisao({ pares: [par('P1')], vagas, parametros, promptSistema: 'S', tabela, signal: controlador.signal }, simulado())
    expect(r.interrompida).toBe(true)
    expect(r.linhas[0]!.erro).toMatch(/interrompida/)
  })

  it('em paralelo, cada vaga julga um lote ao mesmo tempo (D25); em série, um de cada vez', async () => {
    async function rodar(emParalelo: boolean) {
      let ativos = 0
      let maximo = 0
      const deps: DependenciasRevisao = {
        relogio,
        chamar: async (_vaga, mensagens: MensagemChat[]) => {
          ativos++
          maximo = Math.max(maximo, ativos)
          await new Promise((r) => setTimeout(r, 15))
          ativos--
          const ids = (JSON.parse(mensagens[1]!.content.slice(mensagens[1]!.content.indexOf('{'))) as { pares: { id: string }[] }).pares.map((p) => p.id)
          return { texto: JSON.stringify({ resultados: ids.map((id) => resultadoValido(id)) }) }
        },
      }
      const pares = Array.from({ length: 10 }, (_, i) => par(`P${i + 1}`))
      const r = await executarRevisao({ pares, vagas, parametros: { ...parametros, emParalelo }, promptSistema: 'S', tabela }, deps)
      return { maximo, r }
    }
    const paralelo = await rodar(true)
    expect(paralelo.maximo).toBe(5)
    expect(new Set(paralelo.r.linhas.map((l) => l.modeloJulgador)).size).toBe(5)
    expect(paralelo.r.linhas.every((l) => l.resultado)).toBe(true)
    expect((await rodar(false)).maximo).toBe(1)
  })

  it('exige revisão humana quando a IA propõe um cClassTrib de redução (literalidade, D22)', async () => {
    const deps: DependenciasRevisao = {
      relogio,
      chamar: async () => ({ texto: JSON.stringify({ resultados: [resultadoValido('P1', { parecer: 'DIVERGE', cst_proposto: '200', cclasstrib_proposto: '200032' })] }) }),
    }
    const r = await executarRevisao({ pares: [par('P1')], vagas, parametros, promptSistema: 'S', tabela }, deps)
    expect(r.linhas[0]!.validacao?.ok).toBe(true)
    expect(r.linhas[0]!.revisaoHumanaObrigatoria).toBe(true)
  })

  it('exige revisão humana para CFOP inexistente e redução já no XML', async () => {
    const r = await executarRevisao({ pares: [par('P1', { sinalizacoes: ['cfop_inexistente'] }), par('P2', { sinalizacoes: ['reducao_literalidade'] })], vagas, parametros, promptSistema: 'S', tabela }, simulado())
    expect(r.linhas.every((l) => l.revisaoHumanaObrigatoria)).toBe(true)
  })

  it('põe fora de uso a vaga com saldo esgotado (402) e não insiste nela nos lotes seguintes', async () => {
    const usadas: number[] = []
    const deps: DependenciasRevisao = {
      relogio,
      chamar: async (vaga) => {
        usadas.push(vaga.posicao)
        if (vaga.provedor === 'gemini') throw new ErroProvedor('credito', 'Saldo pré-pago do Google zerado.', 402)
        throw new ErroProvedor('limite', 'Limite atingido.', 429)
      },
    }
    const pares = Array.from({ length: 6 }, (_, i) => par(`P${i + 1}`))
    const r = await executarRevisao({ pares, vagas, parametros: { ...parametros, emParalelo: false }, promptSistema: 'S', tabela }, deps)
    expect(usadas.filter((v) => v === 6)).toHaveLength(1)
    expect(r.chamadas.filter((c) => c.vaga === 6 && c.status === 'PULADA')).toHaveLength(2)
    expect(r.linhas.every((l) => l.erro?.includes('Saldo pré-pago'))).toBe(true)
  })
})
