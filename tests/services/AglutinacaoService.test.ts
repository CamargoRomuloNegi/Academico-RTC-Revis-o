import { describe, it, expect } from 'vitest'
import { documentosDe, lerConhecimento } from '../helpers'
import { aglutinarPares, dividirEmLotes, chavePar } from '@/application/services/AglutinacaoService'
import { lerMatrizHumana } from '@/application/matriz/LeitorMatriz'
import type { FiscalDocument } from '@/domain/models/FiscalDocument'

const matriz = lerMatrizHumana(lerConhecimento('Grupamentos-CFOP.md'))

function docSintetico(itens: { cfop: string; ncm: string; cst?: string; cClassTrib?: string; valor: number; desc: string }[]): FiscalDocument {
  return {
    access_key: Math.random().toString(), document_type: 'NFE', version: '4.00', issue_date: '2026-02-01T10:00:00-03:00',
    purpose: 'NORMAL', tax_regime: 'RPA', issuer: { cnpj_cpf: '11111111000111', name: 'A' }, receiver: { cnpj_cpf: '22222222000122', name: 'B' },
    total_value: 0, totals: {}, status: 'VALID', source_filename: 'x.xml', raw_xml: '', direction: 'OUTBOUND',
    items: itens.map((i, n) => ({
      item_number: n + 1, description: i.desc, cfop: i.cfop, ncm: i.ncm, gross_value: i.valor, discount_value: 0, net_value: i.valor,
      taxes_current: {}, rtc: { cst: i.cst, c_class_trib: i.cClassTrib },
    })),
  }
}

describe('AglutinacaoService', () => {
  it('aglutina por CFOP + NCM + CST + cClassTrib e soma quantidades e valores', () => {
    const doc = docSintetico([
      { cfop: '5101', ncm: '25291000', cst: '000', cClassTrib: '000001', valor: 100, desc: 'Feldspato' },
      { cfop: '5101', ncm: '25291000', cst: '000', cClassTrib: '000001', valor: 50.55, desc: 'Feldspato M4' },
      { cfop: '5101', ncm: '25291000', valor: 10, desc: 'Feldspato' },
    ])
    const pares = aglutinarPares([doc, docSintetico([{ cfop: '5101', ncm: '25291000', cst: '000', cClassTrib: '000001', valor: 1, desc: 'Feldspato' }])], matriz)
    expect(pares).toHaveLength(2)
    expect(pares[0]).toMatchObject({ id: 'P001', qtdItens: 3, valorTotal: 151.55, descricoesExemplo: ['Feldspato', 'Feldspato M4'], direcoes: ['SAIDA'] })
    expect(pares[0]?.enquadramentos[0]?.grupo).toBe('II')
    expect(pares[0]?.sinalizacoes).toEqual([])
    expect(pares[1]?.sinalizacoes).toEqual(['sem_classificacao'])
  })

  it('NFS-e não usa o cTribNac como CFOP (CFOP vazio, julgamento pela essência)', () => {
    const doc = { ...docSintetico([{ cfop: '100901', ncm: '', cst: '000', cClassTrib: '000001', valor: 10, desc: 'Serviço' }]), document_type: 'NFSE' as const }
    const [par] = aglutinarPares([doc], matriz)
    expect(par?.cfop).toBe('')
    expect(par?.sinalizacoes).toContain('cfop_fora_matriz')
  })

  it('sinaliza CFOP fora da matriz e CFOP em mais de um grupo', () => {
    const pares = aglutinarPares([docSintetico([
      { cfop: '5949', ncm: '1', cst: '410', cClassTrib: '410999', valor: 2, desc: 'Outras' },
      { cfop: '3127', ncm: '2', cst: '000', cClassTrib: '000001', valor: 1, desc: 'Drawback' },
    ])], matriz)
    expect(pares.find((p) => p.cfop === '5949')?.sinalizacoes).toEqual(['cfop_fora_matriz'])
    expect(pares.find((p) => p.cfop === '3127')?.sinalizacoes).toEqual(['duplicidade_matriz'])
  })

  it('funciona com os XMLs reais das fixtures', async () => {
    const docs = await documentosDe(['nfe/nfe_rpa_com_ibs.xml', 'nfe/nfe_exportacao_multi_item.xml', 'cte/cte_rpa_com_ibs.xml'])
    const pares = aglutinarPares(docs, matriz)
    const itens = docs.reduce((s, d) => s + d.items.length, 0)
    expect(pares.length).toBeGreaterThan(0)
    expect(pares.reduce((s, p) => s + p.qtdItens, 0)).toBe(itens)
  })

  it('divide em lotes e gera chave estável', () => {
    expect(dividirEmLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(dividirEmLotes([1], 0)).toEqual([[1]])
    expect(chavePar(' 5101', '1', '000', '000001 ')).toBe('5101|1|000|000001')
  })
})
