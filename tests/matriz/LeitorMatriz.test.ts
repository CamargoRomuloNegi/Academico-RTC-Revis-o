import { describe, it, expect } from 'vitest'
import { lerConhecimento } from '../helpers'
import { lerMatrizHumana, cfopsEmMaisDeUmGrupo, lerTabelaClassificacao, extrairModeloPrompt } from '@/application/matriz/LeitorMatriz'

describe('LeitorMatriz · Grupamentos-CFOP do professor', () => {
  const matriz = lerMatrizHumana(lerConhecimento('Grupamentos-CFOP.md'))

  it('lê os 5 Grupos Mestres e todos os subgrupos', () => {
    expect(new Set(matriz.subgrupos.map((s) => s.grupo))).toEqual(new Set(['I', 'II', 'III', 'IV', 'V']))
    expect(matriz.subgrupos.length).toBeGreaterThanOrEqual(30)
    expect(matriz.subgrupos.every((s) => s.cfops.length > 0)).toBe(true)
  })

  it('consulta CFOP → grupo, subgrupo e essência', () => {
    const venda = matriz.porCfop.get('5101')
    expect(venda).toHaveLength(1)
    expect(venda?.[0]?.grupo).toBe('II')
    expect(venda?.[0]?.subgrupo).toBe('Venda de Produção')
    expect(venda?.[0]?.essencia).toContain('Fornecimento oneroso')
  })

  it('aplica a revisão 1 (grafia corrigida e códigos saneados)', () => {
    expect(matriz.subgrupos.some((s) => s.subgrupo === 'Venda de Mercadoria (Revenda)')).toBe(true)
    expect(matriz.subgrupos.some((s) => s.subgrupo === 'Lançamentos Fiscais/Contábeis')).toBe(true)
    expect(matriz.porCfop.get('1124')?.[0]?.grupo).toBe('I')
    expect(matriz.porCfop.get('1216')?.[0]?.grupo).toBe('III')
  })

  it('identifica as duplicidades propositais (3127, 3129, 7207)', () => {
    expect(cfopsEmMaisDeUmGrupo(matriz)).toEqual(['3127', '3129', '7207'])
  })

  it('tolera um .md vazio ou fora do formato', () => {
    expect(lerMatrizHumana('# nada aqui').subgrupos).toHaveLength(0)
  })
})

describe('LeitorMatriz · tabela de classificação tributária', () => {
  it('indexa os 138 registros por cClassTrib', () => {
    const tabela = lerTabelaClassificacao(lerConhecimento('classificacao_tributaria.json'))
    expect(tabela.registros).toHaveLength(138)
    expect(tabela.porCClassTrib.get('000001')?.['Código da Situação Tributária']).toBe('000')
  })

  it('recusa JSON inválido com mensagem clara', () => {
    expect(() => lerTabelaClassificacao('{')).toThrow(/JSON válido/)
    expect(() => lerTabelaClassificacao('[]')).toThrow(/lista/)
  })
})

describe('LeitorMatriz · Prompt Mestre', () => {
  it('extrai apenas o trecho entre os marcadores', () => {
    const modelo = extrairModeloPrompt(lerConhecimento('Prompt-Mestre-RTC.md'))
    expect(modelo.startsWith('# AGENTE RTC')).toBe(true)
    expect(modelo).toContain('{{GRUPAMENTOS_CFOP}}')
    expect(modelo).toContain('{{CLASSIFICACAO_TRIBUTARIA}}')
    expect(modelo).not.toContain('Como a aplicação usa este arquivo')
  })
})
