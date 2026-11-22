import { describe, it, expect } from 'vitest'
import * as XLSX from '@e965/xlsx'
import JSZip from 'jszip'
import { documentosDe } from '../helpers'
import { montarPlanilhasExtracao, planilhaParaTexto, gerarArquivo, validarVolume, formatarData } from '@/application/services/ExportService'
import { CATALOGO_CAMPOS } from '@/application/catalogo/CatalogoCampos'

const COLUNAS_DOCUMENTOS = ['Chave de Acesso', 'Tipo', 'Direção', 'Finalidade', 'Data Emissão', 'Emitente CNPJ', 'Emitente Nome', 'Destinatário CNPJ', 'Destinatário Nome', 'Regime', 'Valor Total (R$)', 'Status', '[RTC] Base IBS/CBS', '[RTC] Total IBS', '[RTC] Total CBS', '[RTC] Saldo']
const COLUNAS_ITENS = ['Chave de Acesso', 'Tipo Doc', 'Direção', 'Data Emissão', 'Emitente CNPJ', 'Emitente Nome', 'Destinatário CNPJ', 'Destinatário Nome', 'Regime', 'Nº Item', 'Descrição', 'CFOP', 'NCM', 'Valor Bruto (R$)', 'Desconto (R$)', 'Valor Líquido (R$)', 'Impacto RTC', '[RTC] CST', '[RTC] cClassTrib', '[RTC] Base Cálc (R$)', '[RTC] Alíq IBS UF (%)', '[RTC] Valor IBS UF', '[RTC] Alíq IBS Mun (%)', '[RTC] Valor IBS Mun', '[RTC] Valor IBS Total', '[RTC] Alíq CBS (%)', '[RTC] Valor CBS', 'ICMS CST', 'ICMS Valor', 'PIS CST', 'PIS Valor', 'COFINS CST', 'COFINS Valor', 'ISS Base', 'ISS Alíq (%)', 'ISS Valor']

describe('ExportService', () => {
  it('reproduz exatamente as colunas do padrão do professor', async () => {
    const docs = await documentosDe(['nfe/nfe_rpa_com_ibs.xml', 'cte/cte_rpa_com_ibs.xml'])
    const [documentos, itens] = montarPlanilhasExtracao(docs)
    expect(Object.keys(documentos!.linhas[0]!)).toEqual(COLUNAS_DOCUMENTOS)
    expect(Object.keys(itens!.linhas[0]!)).toEqual(COLUNAS_ITENS)
    expect(documentos!.nome).toBe('Documentos')
    expect(itens!.nome).toBe('Itens Analítico')
  })

  it('acrescenta campos adicionais à direita (documento nas duas abas; item só nos itens)', async () => {
    const docs = await documentosDe(['nfe/nfe_exportacao_multi_item.xml'])
    const extras = CATALOGO_CAMPOS.filter((c) => c.tipo === 'NFE' && ['NFe/infNFe/ide/natOp', 'NFe/infNFe/det/prod/cProd'].includes(c.caminho))
    const [documentos, itens] = montarPlanilhasExtracao(docs, extras)
    expect(documentos!.linhas[0]!['Natureza da Operação']).not.toBe('')
    expect(documentos!.linhas[0]).not.toHaveProperty('Item · Código do Produto')
    const codigos = itens!.linhas.map((l) => l['Item · Código do Produto'])
    expect(codigos.every((c) => typeof c === 'string' && c !== '')).toBe(true)
    expect(itens!.linhas[0]!['Natureza da Operação']).toBe(documentos!.linhas[0]!['Natureza da Operação'])
  })

  it('gera texto com ";" e decimal com vírgula, protegendo aspas e separadores', () => {
    const texto = planilhaParaTexto({ nome: 'x', linhas: [{ A: 1.5, B: 'a;b', C: 'diz "oi"' }] }, ';')
    expect(texto.split('\r\n')).toEqual(['A;B;C', '1,5;"a;b";"diz ""oi"""'])
  })

  it('gera xlsx legível com as duas abas', async () => {
    const docs = await documentosDe(['nfe/nfe_rpa_com_ibs.xml'])
    const arquivo = await gerarArquivo(montarPlanilhasExtracao(docs), 'xlsx', 'teste')
    expect(arquivo.nome).toBe('teste.xlsx')
    const livro = XLSX.read(new Uint8Array(await arquivo.conteudo.arrayBuffer()), { type: 'array' })
    expect(livro.SheetNames).toEqual(['Documentos', 'Itens Analítico'])
  })

  it('gera xls (Excel 97-2003)', async () => {
    const arquivo = await gerarArquivo([{ nome: 'A', linhas: [{ x: 1 }] }], 'xls', 'teste')
    const livro = XLSX.read(new Uint8Array(await arquivo.conteudo.arrayBuffer()), { type: 'array' })
    expect(arquivo.nome).toBe('teste.xls')
    expect(livro.SheetNames).toEqual(['A'])
  })

  it('em csv/txt gera um .zip quando há mais de uma aba', async () => {
    const arquivo = await gerarArquivo([{ nome: 'Documentos', linhas: [{ a: 1 }] }, { nome: 'Itens Analítico', linhas: [{ b: 2 }] }], 'txt', 'base')
    expect(arquivo.nome).toBe('base-txt.zip')
    const zip = await JSZip.loadAsync(await arquivo.conteudo.arrayBuffer())
    expect(Object.keys(zip.files).sort()).toEqual(['base-documentos.txt', 'base-itens-analitico.txt'])
  })

  it('bloqueia volume acima do limite do .xls', () => {
    const linhas = Array.from({ length: 65_536 }, () => ({ a: 1 }))
    expect(validarVolume([{ nome: 'Itens', linhas }], 'xls')).toMatch(/limite/)
    expect(validarVolume([{ nome: 'Itens', linhas }], 'xlsx')).toBeNull()
  })

  it('formata datas no fuso de Brasília', () => {
    expect(formatarData('2026-02-06T11:33:00-03:00')).toBe('06/02/2026, 11:33')
  })
})
