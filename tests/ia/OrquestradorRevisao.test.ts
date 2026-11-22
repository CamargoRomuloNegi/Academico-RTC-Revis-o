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
  return { id, cfop: '5101', ncm: '25291000', cstAtual: '000', cClassTribAtual: '000001', descricoesExemplo: ['x'], tiposDocumento: ['NFE'], direcoes: ['SAIDA'], qtdItens: 1, valorTotal: 1, enquadramentos: [{ grupo: 'II', subgrupo: 'Venda de Produção', essencia: 'e' }], sinalizacoes: [], ...extra }
}

const vagas: VagaModelo[] = [
  ...[1, 2, 3, 4, 5].map((posicao) => ({ posicao, provedor: 'openrouter' as const, modelo: `m${posicao}:free`, rpm: 20, ativo: true })),
  { posicao: 6, provedor: 'gemini', modelo: 'gemini-2.5-flash', rpm: 10, ativo: true },
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
    expect(r.linhas[0]!.modeloJulgador).toBe('gemini::gemini-2.5-flash')
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
})
