import { describe, it, expect } from 'vitest'
import { extrairJson, validarResposta, validarSemantica } from '@/application/ia/ValidadorResposta'
import { lerTabelaClassificacao } from '@/application/matriz/LeitorMatriz'
import { lerConhecimento, resultadoValido } from '../helpers'

describe('ValidadorResposta', () => {
  it('extrai JSON de cercas de código e de texto ao redor', () => {
    expect(extrairJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(extrairJson('Segue: {"a":2} fim')).toEqual({ a: 2 })
    expect(() => extrairJson('sem json')).toThrow(/JSON/)
  })

  it('aceita resultados válidos e normaliza códigos, grupos e enums', () => {
    const texto = JSON.stringify({ resultados: [resultadoValido('P1', { grupo_ia: 'Grupo ii', cst_proposto: 0, cclasstrib_proposto: 1, parecer: 'concorda', confianca: 'média' })] })
    const { validos, invalidos } = validarResposta(texto, ['P1'])
    expect(invalidos.size).toBe(0)
    expect(validos[0]).toMatchObject({ grupo_ia: 'II', cst_proposto: '000', cclasstrib_proposto: '000001', parecer: 'CONCORDA', confianca: 'MEDIA' })
  })

  it('devolve à fila os pares ausentes, incompletos ou com JSON ilegível', () => {
    const texto = JSON.stringify({ resultados: [resultadoValido('P1'), resultadoValido('P2', { grupo_ia: 'VI' }), resultadoValido('PX')] })
    const { validos, invalidos } = validarResposta(texto, ['P1', 'P2', 'P3'])
    expect(validos.map((v) => v.id)).toEqual(['P1'])
    expect([...invalidos.keys()]).toEqual(['P2', 'P3'])
    expect(invalidos.get('P2')).toMatch(/grupo_ia/)
    expect(validarResposta('não é json', ['P1']).invalidos.get('P1')).toMatch(/JSON/)
  })

  it('valida a proposta contra a tabela oficial', () => {
    const tabela = lerTabelaClassificacao(lerConhecimento('classificacao_tributaria.json'))
    const base = validarResposta(JSON.stringify({ resultados: [resultadoValido('P1')] }), ['P1']).validos[0]!
    expect(validarSemantica(base, tabela)).toMatchObject({ ok: true, problemas: [] })
    expect(validarSemantica(base, tabela).descricaoCClassTrib).toContain('tributadas integralmente')
    const inexistente = validarSemantica({ ...base, cclasstrib_proposto: '000999' }, tabela)
    expect(inexistente.ok).toBe(false)
    const cstErrado = validarSemantica({ ...base, cst_proposto: '200' }, tabela)
    expect(cstErrado.problemas[0]).toMatch(/não pertence ao CST/)
  })
})
