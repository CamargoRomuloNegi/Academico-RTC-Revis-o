/**
 * Regressão: identificadores numéricos com zero à esquerda (CNPJ, CPF, NCM, CST,
 * chaves de acesso) não podem ser convertidos em número pelo parser XML.
 *
 * Sintoma original: <CNPJ>01234567000189</CNPJ> virava 1234567000189 (13 dígitos),
 * extractCnpjRoot() retornava null e a apuração não encontrava o CNPJ analisado.
 */
import { describe, it, expect } from 'vitest'
import { ParserNFe } from '@/infrastructure/parsers/ParserNFe'
import { ParserNFCe } from '@/infrastructure/parsers/ParserNFCe'
import { ParserCTe } from '@/infrastructure/parsers/ParserCTe'
import { ParserNFSe } from '@/infrastructure/parsers/ParserNFSe'
import { extractCnpjRoot, formatCnpjCpf } from '@/lib/utils'
import {
  detectMainCnpjRoot, enrichDocument, calculateApuracao,
} from '@/application/services/TaxAnalyzerService'

const CNPJ_ZERO   = '01234567000189' // raiz 01234567
const CNPJ_ZERO_2 = '00123456000190' // raiz 00123456 (dois zeros)
const CPF_ZERO    = '00123456789'
const CHAVE_44    = '35260112345678000190550010000012341000012345'

const nfeXml = (mod: '55' | '65' = '55') => `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe><infNFe versao="4.00" Id="NFe${CHAVE_44}">
    <ide><mod>${mod}</mod><dhEmi>2026-03-10T10:00:00-03:00</dhEmi><finNFe>1</finNFe></ide>
    <emit><CNPJ>${CNPJ_ZERO}</CNPJ><xNome>EMITENTE ZERO</xNome><IE>0123456789</IE><CRT>3</CRT>
      <enderEmit><UF>SP</UF></enderEmit></emit>
    <dest><CNPJ>${CNPJ_ZERO_2}</CNPJ><xNome>DEST ZERO</xNome><enderDest><UF>SP</UF></enderDest></dest>
    <det nItem="1">
      <prod><xProd>Item</xProd><NCM>01012100</NCM><CFOP>5102</CFOP><vProd>100.00</vProd></prod>
      <imposto>
        <ICMS><ICMS00><CST>00</CST><vBC>100.00</vBC><pICMS>18.00</pICMS><vICMS>18.00</vICMS></ICMS00></ICMS>
        <IBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib>
          <gIBSCBS><vBC>100.00</vBC><gIBSUF><pIBSUF>0.1</pIBSUF><vIBSUF>0.10</vIBSUF></gIBSUF>
            <gIBSMun><pIBSMun>0</pIBSMun><vIBSMun>0</vIBSMun></gIBSMun><vIBS>0.10</vIBS>
            <gCBS><pCBS>0.9</pCBS><vCBS>0.90</vCBS></gCBS></gIBSCBS></IBSCBS>
      </imposto>
    </det>
    <total><ICMSTot><vProd>100.00</vProd><vNF>100.00</vNF></ICMSTot>
      <IBSCBSTot><vBCIBSCBS>100.00</vBCIBSCBS><gIBS><vIBS>0.10</vIBS></gIBS><gCBS><vCBS>0.90</vCBS></gCBS></IBSCBSTot>
    </total>
  </infNFe></NFe>
</nfeProc>`

const cteXml = `<?xml version="1.0" encoding="UTF-8"?>
<cteProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/cte">
  <CTe><infCte versao="4.00" Id="CTe${CHAVE_44}">
    <ide><CFOP>6353</CFOP><dhEmi>2026-03-10T10:00:00-03:00</dhEmi><tpCTe>0</tpCTe></ide>
    <emit><CNPJ>${CNPJ_ZERO}</CNPJ><xNome>TRANSPORTADORA</xNome><CRT>3</CRT></emit>
    <rem><CNPJ>${CNPJ_ZERO_2}</CNPJ><xNome>REMETENTE</xNome></rem>
    <dest><CPF>${CPF_ZERO}</CPF><xNome>DESTINATARIO PF</xNome></dest>
    <vPrest><vTPrest>50.00</vTPrest><Comp><xNome>Frete</xNome><vComp>50.00</vComp></Comp></vPrest>
    <imp></imp>
    <infCTeNorm><infDoc><infNFe><chave>${CHAVE_44}</chave></infNFe></infDoc></infCTeNorm>
  </infCte></CTe>
</cteProc>`

const nfseXml = `<?xml version="1.0" encoding="UTF-8"?>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">
  <infNFSe Id="NFS${CHAVE_44}">
    <emit><xNome>PRESTADOR ZERO</xNome></emit>
    <nNFSe>1</nNFSe>
    <valores><vBC>200.00</vBC><pAliqAplic>2.00</pAliqAplic><vISSQN>4.00</vISSQN></valores>
    <DPS><infDPS>
      <dhEmi>2026-03-10T10:00:00-03:00</dhEmi>
      <prest><CNPJ>${CNPJ_ZERO}</CNPJ><regTrib><opSimpNac>1</opSimpNac></regTrib></prest>
      <toma><CNPJ>${CNPJ_ZERO_2}</CNPJ><xNome>TOMADOR ZERO</xNome></toma>
      <serv><cServ><cTribNac>010101</cTribNac><xDescServ>Servico</xDescServ></cServ></serv>
      <valores><vServPrest><vServ>200.00</vServ></vServPrest></valores>
    </infDPS></DPS>
  </infNFSe>
</NFSe>`

describe('extractCnpjRoot / formatCnpjCpf — zeros à esquerda perdidos', () => {
  it('mantém a raiz de CNPJ com zero à esquerda (14 dígitos)', () => {
    expect(extractCnpjRoot(CNPJ_ZERO)).toBe('01234567')
    expect(extractCnpjRoot('01.234.567/0001-89')).toBe('01234567')
  })

  it('recupera CNPJ de 13 dígitos (zero perdido por conversão numérica)', () => {
    expect(extractCnpjRoot('1234567000189')).toBe('01234567')
    expect(extractCnpjRoot('123456000190')).toBe('00123456') // 12 dígitos, dois zeros perdidos
  })

  it('CPF de 11 dígitos continua sendo usado integralmente', () => {
    expect(extractCnpjRoot(CPF_ZERO)).toBe(CPF_ZERO)
  })

  it('rejeita entradas sem relação com CNPJ/CPF', () => {
    expect(extractCnpjRoot('')).toBeNull()
    expect(extractCnpjRoot('CONSUMIDOR_FINAL')).toBeNull()
    expect(extractCnpjRoot('12345')).toBeNull()
  })

  it('formata CNPJ de 13 dígitos restaurando o zero', () => {
    expect(formatCnpjCpf('1234567000189')).toBe('01.234.567/0001-89')
  })
})

describe('Parsers preservam identificadores com zero à esquerda', () => {
  it('NF-e: CNPJ, IE, NCM e CST ficam como string original', () => {
    const r = new ParserNFe().parse(nfeXml(), 'nfe.xml')
    expect(r.success).toBe(true)
    const d = r.document!
    expect(d.issuer.cnpj_cpf).toBe(CNPJ_ZERO)
    expect(d.receiver.cnpj_cpf).toBe(CNPJ_ZERO_2)
    expect(d.issuer.ie).toBe('0123456789')
    expect(d.items[0]!.ncm).toBe('01012100')
    expect(d.items[0]!.taxes_current.icms_cst).toBe('00')
    expect(d.access_key).toBe(CHAVE_44)
  })

  it('NFC-e: mesmo comportamento da NF-e', () => {
    const r = new ParserNFCe().parse(nfeXml('65'), 'nfce.xml')
    expect(r.document!.issuer.cnpj_cpf).toBe(CNPJ_ZERO)
  })

  it('CT-e: CNPJ/CPF e chave NF-e referenciada (44 dígitos) intactos', () => {
    const r = new ParserCTe().parse(cteXml, 'cte.xml')
    expect(r.success).toBe(true)
    const d = r.document!
    expect(d.issuer.cnpj_cpf).toBe(CNPJ_ZERO)
    expect(d.sender?.cnpj_cpf).toBe(CNPJ_ZERO_2)
    expect(d.receiver.cnpj_cpf).toBe(CPF_ZERO)
    expect(d.referenced_keys).toEqual([CHAVE_44])
  })

  it('NFS-e: CNPJ do prestador e do tomador intactos', () => {
    const r = new ParserNFSe().parse(nfseXml, 'nfse.xml')
    expect(r.success).toBe(true)
    expect(r.document!.issuer.cnpj_cpf).toBe(CNPJ_ZERO)
    expect(r.document!.receiver.cnpj_cpf).toBe(CNPJ_ZERO_2)
  })

  it('valores monetários continuam numéricos após a correção', () => {
    const d = new ParserNFe().parse(nfeXml(), 'nfe.xml').document!
    expect(d.total_value).toBeCloseTo(100, 2)
    expect(d.items[0]!.gross_value).toBeCloseTo(100, 2)
    expect(d.items[0]!.rtc.vIBS).toBeCloseTo(0.1, 2)
    expect(d.items[0]!.rtc.vCBS).toBeCloseTo(0.9, 2)
    expect(d.totals.vIBS).toBeCloseTo(0.1, 2)
  })
})

describe('Fluxo ponta a ponta com CNPJ iniciado em zero', () => {
  it('detecta o CNPJ raiz, classifica direção e soma créditos/débitos', () => {
    const docs = [
      new ParserNFe().parse(nfeXml(), 'a.xml').document!,
      new ParserNFSe().parse(nfseXml, 'b.xml').document!,
    ]

    const detection = detectMainCnpjRoot(docs)
    expect(detection.cnpjRoot).toBe('01234567')
    expect(detection.frequency).toBe(2)

    const enriched = docs.map((d) => enrichDocument(d, detection.cnpjRoot!))
    expect(enriched.every((d) => d.direction === 'OUTBOUND')).toBe(true)

    const apuracao = calculateApuracao(enriched)
    expect(apuracao.totalDebitos).toBeCloseTo(1.0, 2) // 0,10 IBS + 0,90 CBS da NF-e
    expect(apuracao.totalDocumentos).toBe(2)
  })
})
