import { describe, it, expect } from 'vitest'
import { lerFixture } from '../helpers'
import { prepararDocumento, valorDocumento, valoresPorItem, extrairCampos, ehCampoDeItem } from '@/infrastructure/xml/ExtratorPorCaminho'
import { CATALOGO_CAMPOS } from '@/application/catalogo/CatalogoCampos'

describe('ExtratorPorCaminho', () => {
  it('remove o invólucro nfeProc e mantém a raiz NFe', () => {
    const doc = prepararDocumento(lerFixture('nfe/nfe_rpa_com_ibs.xml'))
    expect(doc?.raiz).toBe('NFe')
  })

  it('lê campo de documento preservando o texto', () => {
    const doc = prepararDocumento(lerFixture('nfe/nfe_rpa_com_ibs.xml'))!
    expect(valorDocumento(doc, 'NFe/infNFe/ide/natOp')).not.toBe('')
    expect(valorDocumento(doc, 'NFe/infNFe/emit/CNPJ')).toMatch(/^\d{14}$/)
  })

  it('lê atributo com @', () => {
    const doc = prepararDocumento(lerFixture('nfe/nfe_rpa_com_ibs.xml'))!
    expect(valorDocumento(doc, 'NFe/infNFe/@Id')).toMatch(/^NFe\d{44}$/)
  })

  it('devolve vazio para caminho inexistente ou de outra raiz', () => {
    const doc = prepararDocumento(lerFixture('nfe/nfe_rpa_com_ibs.xml'))!
    expect(valorDocumento(doc, 'NFe/infNFe/ide/naoExiste')).toBe('')
    expect(valorDocumento(doc, 'CTe/infCte/ide/natOp')).toBe('')
  })

  it('lê campos de item na ordem dos itens', () => {
    const xml = lerFixture('nfe/nfe_exportacao_multi_item.xml')
    const doc = prepararDocumento(xml)!
    const cfops = valoresPorItem(doc, 'NFE', 'NFe/infNFe/det/prod/CFOP')
    const quantidade = (xml.match(/<det /g) ?? []).length
    expect(cfops).toHaveLength(quantidade)
    expect(cfops.every((c) => /^\d{4}$/.test(c))).toBe(true)
  })

  it('reconhece o nível do campo pelo caminho', () => {
    expect(ehCampoDeItem('NFE', 'NFe/infNFe/det/prod/xProd')).toBe(true)
    expect(ehCampoDeItem('NFE', 'NFe/infNFe/ide/natOp')).toBe(false)
    expect(ehCampoDeItem('CTE', 'CTe/infCte/imp/IBSCBS/CST')).toBe(false)
  })

  it('extrai os campos do catálogo para CT-e e NFS-e', () => {
    const cte = extrairCampos(lerFixture('cte/cte_rpa_com_ibs.xml'), 'CTE', CATALOGO_CAMPOS, 1)
    expect(cte.documento['CTE:CTe/infCte/ide/UFIni']).toMatch(/^[A-Z]{2}$/)
    const nfse = extrairCampos(lerFixture('nfse/nfse_com_ibscbs.xml'), 'NFSE', CATALOGO_CAMPOS, 1)
    expect(nfse.documento['NFSE:NFSe/infNFSe/DPS/infDPS/serv/cServ/cTribNac']).not.toBe('')
  })

  it('não quebra com XML inválido', () => {
    const r = extrairCampos('<nao-fecha', 'NFE', CATALOGO_CAMPOS, 2)
    expect(r.itens).toHaveLength(2)
  })
})
