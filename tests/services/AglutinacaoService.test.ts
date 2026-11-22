import { describe, it, expect } from 'vitest'
import { documentosDe, lerConhecimento } from '../helpers'
import { aglutinarPares, dividirEmLotes, chavePar } from '@/application/services/AglutinacaoService'
import { lerMatrizHumana, lerTabelaCfop, lerTabelaClassificacao } from '@/application/matriz/LeitorMatriz'
import type { FiscalDocument, TaxRegime } from '@/domain/models/FiscalDocument'

const matriz = lerMatrizHumana(lerConhecimento('Grupamentos-CFOP.md'))
const tabelaCfop = lerTabelaCfop(lerConhecimento('cfop_oficial.json'))
const tabelaClassificacao = lerTabelaClassificacao(lerConhecimento('classificacao_tributaria.json'))

type ItemTeste = { cfop: string; ncm: string; cst?: string; cClassTrib?: string; valor: number; desc: string }

function docSintetico(itens: ItemTeste[], extra: Partial<FiscalDocument> = {}): FiscalDocument {
  return {
    access_key: Math.random().toString(), document_type: 'NFE', version: '4.00', issue_date: '2026-02-01T10:00:00-03:00',
    purpose: 'NORMAL', tax_regime: 'RPA', issuer: { cnpj_cpf: '11111111000111', name: 'A' }, receiver: { cnpj_cpf: '22222222000122', name: 'B' },
    total_value: 0, totals: {}, status: 'VALID', source_filename: 'x.xml', raw_xml: '', direction: 'OUTBOUND',
    items: itens.map((i, n) => ({
      item_number: n + 1, description: i.desc, cfop: i.cfop, ncm: i.ncm, gross_value: i.valor, discount_value: 0, net_value: i.valor,
      taxes_current: {}, rtc: { cst: i.cst, c_class_trib: i.cClassTrib },
    })),
    ...extra,
  }
}

describe('AglutinacaoService', () => {
  it('aglutina por CFOP + CST + cClassTrib (o NCM não separa pares) e soma quantidades e valores', () => {
    const doc = docSintetico([
      { cfop: '5101', ncm: '25291000', cst: '000', cClassTrib: '000001', valor: 100, desc: 'Feldspato' },
      { cfop: '5101', ncm: '68022000', cst: '000', cClassTrib: '000001', valor: 50.55, desc: 'Granito' },
      { cfop: '5101', ncm: '25291000', valor: 10, desc: 'Feldspato' },
    ])
    const { pares } = aglutinarPares([doc, docSintetico([{ cfop: '5101', ncm: '25291000', cst: '000', cClassTrib: '000001', valor: 1, desc: 'Feldspato' }])], matriz, { tabelaCfop })
    expect(pares).toHaveLength(2)
    expect(pares[0]).toMatchObject({ id: 'P001', qtdItens: 3, valorTotal: 151.55, descricoesExemplo: ['Feldspato', 'Granito'], ncms: ['25291000', '68022000'], qtdNcms: 2 })
    expect(pares[0]?.descricaoCfop).toMatch(/Venda de produção/i)
    expect(pares[0]?.enquadramentos[0]?.grupo).toBe('II')
    expect(pares[0]?.sinalizacoes).toEqual([])
    expect(pares[1]?.sinalizacoes).toEqual(['sem_classificacao'])
    expect(pares[0]).not.toHaveProperty('direcoes')
  })

  it('NFS-e não usa o cTribNac como CFOP (CFOP vazio, julgamento pela essência)', () => {
    const doc = docSintetico([{ cfop: '100901', ncm: '', cst: '000', cClassTrib: '000001', valor: 10, desc: 'Serviço' }], { document_type: 'NFSE' })
    const { pares } = aglutinarPares([doc], matriz, { tabelaCfop })
    expect(pares[0]?.cfop).toBe('')
    expect(pares[0]?.sinalizacoes).toContain('cfop_fora_matriz')
    expect(pares[0]?.sinalizacoes).not.toContain('cfop_inexistente')
  })

  it('sinaliza CFOP fora da matriz, CFOP em mais de um grupo e CFOP inexistente', () => {
    const { pares } = aglutinarPares([docSintetico([
      { cfop: '5949', ncm: '1', cst: '410', cClassTrib: '410999', valor: 3, desc: 'Outras' },
      { cfop: '3127', ncm: '2', cst: '000', cClassTrib: '000001', valor: 2, desc: 'Drawback' },
      { cfop: '5999', ncm: '3', cst: '000', cClassTrib: '000001', valor: 1, desc: 'Erro de digitação' },
    ])], matriz, { tabelaCfop })
    expect(pares.find((p) => p.cfop === '5949')?.sinalizacoes).toEqual(['cfop_fora_matriz'])
    expect(pares.find((p) => p.cfop === '3127')?.sinalizacoes).toEqual(['duplicidade_matriz'])
    expect(pares.find((p) => p.cfop === '5999')?.sinalizacoes).toEqual(['cfop_fora_matriz', 'cfop_inexistente'])
  })

  it('sinaliza cClassTrib de redução de alíquota (literalidade, D22)', () => {
    const { pares } = aglutinarPares([docSintetico([{ cfop: '5101', ncm: '30049099', cst: '200', cClassTrib: '200032', valor: 5, desc: 'Medicamento' }])], matriz, { tabelaClassificacao })
    expect(pares[0]?.sinalizacoes).toContain('reducao_literalidade')
  })

  it('filtra pelo regime do emitente: Simples (CRT 1) e MEI ficam fora; CRT 2 e RPA entram (D23)', () => {
    const item = (valor: number): ItemTeste[] => [{ cfop: '5101', ncm: '1', cst: '000', cClassTrib: '000001', valor, desc: 'x' }]
    const doc = (r: TaxRegime, v: number) => docSintetico(item(v), { tax_regime: r })
    const { pares, escopo } = aglutinarPares([doc('RPA', 10), doc('SIMPLES_EXCESSO', 20), doc('SIMPLES_NACIONAL', 40), doc('MEI', 80), doc('UNKNOWN', 1)], matriz)
    expect(pares).toHaveLength(1)
    expect(pares[0]?.valorTotal).toBe(31)
    expect(escopo).toMatchObject({ itensNoEscopo: 3, valorNoEscopo: 31, itensForaDoEscopo: 2, valorForaDoEscopo: 120 })
    expect(escopo.porRegime.MEI).toEqual({ documentos: 1, itens: 1, valor: 80 })

    const soRpa = aglutinarPares([doc('RPA', 10), doc('SIMPLES_EXCESSO', 20)], matriz, { regimesNoEscopo: ['RPA'] })
    expect(soRpa.escopo.valorNoEscopo).toBe(10)
  })

  it('funciona com os XMLs reais das fixtures', async () => {
    const docs = await documentosDe(['nfe/nfe_rpa_com_ibs.xml', 'nfe/nfe_exportacao_multi_item.xml', 'cte/cte_rpa_com_ibs.xml'])
    const { pares, escopo } = aglutinarPares(docs, matriz, { tabelaCfop, tabelaClassificacao })
    expect(pares.length).toBeGreaterThan(0)
    expect(pares.reduce((s, p) => s + p.qtdItens, 0)).toBe(escopo.itensNoEscopo)
    expect(escopo.itensNoEscopo + escopo.itensForaDoEscopo).toBe(docs.reduce((s, d) => s + d.items.length, 0))
  })

  it('divide em lotes e gera chave estável', () => {
    expect(dividirEmLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(dividirEmLotes([1], 0)).toEqual([[1]])
    expect(chavePar(' 5101', '000', '000001 ')).toBe('5101|000|000001')
  })
})
