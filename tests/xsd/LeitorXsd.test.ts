import { describe, it, expect } from 'vitest'
import { lerFixture } from '../helpers'
import { lerPacoteXsd, compararDicionarios } from '@/infrastructure/xsd/LeitorXsd'

function pacote() {
  return new Map([
    ['nfeMini.xsd', lerFixture('xsd/nfeMini.xsd')],
    ['tiposMini.xsd', lerFixture('xsd/tiposMini.xsd')],
  ])
}

describe('LeitorXsd', () => {
  it('encontra a raiz NFe e expande a árvore com tipos de outro arquivo', () => {
    const [dic] = lerPacoteXsd(pacote())
    expect(dic?.raiz).toBe('NFe')
    expect(dic?.versao).toBe('4.00')
    const caminhos = dic!.entradas.map((e) => e.caminho)
    expect(caminhos).toContain('NFe/infNFe/ide/natOp')
    expect(caminhos).toContain('NFe/infNFe/det/imposto/IBSCBS/cClassTrib')
    expect(caminhos).toContain('NFe/infNFe/det/imposto/IBSCBS/gIBSCBS/vBC')
    expect(caminhos).toContain('NFe/infNFe/@Id')
    expect(caminhos).toContain('NFe/infNFe/det/@nItem')
  })

  it('traz documentação, tipo, ocorrência e enumerações', () => {
    const [dic] = lerPacoteXsd(pacote())
    const porCaminho = new Map(dic!.entradas.map((e) => [e.caminho, e]))
    expect(porCaminho.get('NFe/infNFe/ide/natOp')?.documentacao).toBe('Descrição da Natureza da Operação')
    expect(porCaminho.get('NFe/infNFe/det/imposto/IBSCBS/CST')?.tipo).toBe('TCst')
    expect(porCaminho.get('NFe/infNFe/det')?.maxOcorrencias).toBe('990')
    expect(porCaminho.get('NFe/infNFe/det/imposto/IBSCBS')?.minOcorrencias).toBe('0')
    expect(porCaminho.get('NFe/infNFe/det/imposto/ICMS')?.minOcorrencias).toBe('0') // dentro de choice
    expect(porCaminho.get('NFe/infNFe/ide/tpNF')?.enumeracoes).toEqual(['0', '1'])
    expect(porCaminho.get('NFe/infNFe/ide/natOp')?.folha).toBe(true)
    expect(porCaminho.get('NFe/infNFe/ide')?.folha).toBe(false)
  })

  it('não expande a assinatura digital de outro namespace', () => {
    const [dic] = lerPacoteXsd(pacote())
    expect(dic!.entradas.some((e) => e.caminho === 'NFe/Signature')).toBe(true)
    expect(dic!.entradas.some((e) => e.caminho.startsWith('NFe/Signature/'))).toBe(false)
  })

  it('avisa sobre arquivos que não são XSD', () => {
    const p = pacote()
    p.set('leia-me.xsd', 'texto qualquer')
    const [dic] = lerPacoteXsd(p)
    expect(dic!.avisos.some((a) => a.includes('leia-me.xsd'))).toBe(true)
  })

  it('compara duas versões do dicionário', () => {
    const [antigo] = lerPacoteXsd(pacote())
    const novoPacote = pacote()
    novoPacote.set('nfeMini.xsd', lerFixture('xsd/nfeMini.xsd').replace('<xs:element name="tpNF" type="TTpNF"/>', '<xs:element name="tpNF" type="TTpNF"/><xs:element name="cMunFGIBS" type="xs:string" minOccurs="0"/>'))
    const [novo] = lerPacoteXsd(novoPacote)
    const dif = compararDicionarios(antigo!, novo!)
    expect(dif.adicionados.map((e) => e.caminho)).toEqual(['NFe/infNFe/ide/cMunFGIBS'])
    expect(dif.removidos).toHaveLength(0)
  })
})
