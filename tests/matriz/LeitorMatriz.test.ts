import { describe, it, expect } from 'vitest'
import { lerConhecimento } from '../helpers'
import { lerMatrizHumana, cfopsEmMaisDeUmGrupo, lerTabelaClassificacao, extrairModeloPrompt, lerTabelaCfop, cfopDeLinhasPlanilha, ehCClassTribDeReducao } from '@/application/matriz/LeitorMatriz'

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

  it('v1.1: sem NCM e sem direção na entrada; literalidade nas reduções; novas sinalizações', () => {
    const modelo = extrairModeloPrompt(lerConhecimento('Prompt-Mestre-RTC.md'))
    expect(modelo).not.toMatch(/`ncm`|`direcoes`/)
    expect(modelo).toContain('descricao_oficial_cfop')
    expect(modelo).toMatch(/literalidade/i)
    expect(modelo).toContain('"cfop_inexistente"')
    expect(modelo).toContain('"reducao_literalidade"')
  })
})

describe('LeitorMatriz · tabela oficial de CFOP', () => {
  const tabela = lerTabelaCfop(lerConhecimento('cfop_oficial.json'))

  it('carrega a tabela padrão (Siscomex) sem códigos repetidos', () => {
    expect(tabela.registros.length).toBe(590)
    expect(tabela.porCfop.get('5101')?.descricao).toMatch(/Venda de produção/i)
    expect(tabela.porCfop.has('5999')).toBe(false)
  })

  it('converte as linhas de uma planilha com cabeçalho em qualquer linha', () => {
    const linhas = [
      ['CFOP: Código Fiscal'], [],
      ['GRUPO CFOP', 'CFOP', 'DESCRIÇÃO_CFOP', 'Início Vigência'],
      ['5000 - SAÍDAS', 5101, 'Venda de produção  do estabelecimento', new Date('2006-01-01T00:00:00Z')],
      ['5000 - SAÍDAS', 5101, 'repetido', ''],
      ['', 'x', 'lixo', ''],
    ]
    expect(cfopDeLinhasPlanilha(linhas)).toEqual([{ cfop: '5101', descricao: 'Venda de produção do estabelecimento', grupo: '5000 - SAÍDAS', inicioVigencia: '2006-01-01' }])
    expect(() => cfopDeLinhasPlanilha([['a', 'b']])).toThrow(/cabeçalho/)
  })

  it('recusa JSON inválido ou sem CFOP válido', () => {
    expect(() => lerTabelaCfop('{')).toThrow(/JSON/)
    expect(() => lerTabelaCfop('[{"cfop":"12"}]')).toThrow(/Nenhum CFOP/)
  })

  it('identifica cClassTrib de redução de alíquota pela tabela oficial', () => {
    const t = lerTabelaClassificacao(lerConhecimento('classificacao_tributaria.json'))
    expect(ehCClassTribDeReducao(t, '200032')).toBe(true)
    expect(ehCClassTribDeReducao(t, '000001')).toBe(false)
    expect(ehCClassTribDeReducao(null, '200032')).toBe(false)
  })
})
