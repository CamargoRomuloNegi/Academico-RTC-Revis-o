/**
 * @file ExportService.ts
 * @description Módulo 5: monta as planilhas e gera os arquivos .xlsx, .xls, .csv e .txt,
 * tudo no navegador.
 *
 * PADRÃO DO PROFESSOR
 *   As abas "Documentos" (uma linha por documento, totalizada) e "Itens Analítico" (uma linha
 *   por item, com o cabeçalho repetido para filtros e tabelas dinâmicas) reproduzem
 *   exatamente as colunas do modelo apuracao-rtc do comercial-assistida-xml. Os campos
 *   escolhidos pelo usuário entram como colunas adicionais, à direita.
 *
 * FORMATOS
 *   xlsx → Excel atual (até 1.048.576 linhas por aba).
 *   xls  → Excel 97-2003 (até 65.536 linhas por aba). Útil para sistemas antigos.
 *   csv  → separador ";" e decimal ",", com BOM UTF-8 (abre certo no Excel em português).
 *   txt  → separador "|" (no estilo dos arquivos SPED), decimal ",".
 *   Em csv e txt, cada aba vira um arquivo. Com mais de uma aba, os arquivos saem num .zip.
 */

import JSZip from 'jszip'
import type { FiscalDocument } from '@/domain/models/FiscalDocument'
import type { CampoCatalogo } from '@/domain/models/Campos'
import { extrairCampos } from '@/infrastructure/xml/ExtratorPorCaminho'
import { formatCnpjCpf } from '@/lib/utils'

export type FormatoExportacao = 'xlsx' | 'xls' | 'csv' | 'txt'

export const FORMATOS: { id: FormatoExportacao; nome: string; descricao: string }[] = [
  { id: 'xlsx', nome: 'Excel (.xlsx)', descricao: 'Recomendado. Uma aba por visão.' },
  { id: 'xls', nome: 'Excel 97-2003 (.xls)', descricao: 'Compatibilidade com sistemas antigos (até 65.536 linhas por aba).' },
  { id: 'csv', nome: 'CSV (.csv)', descricao: 'Separador ";" e decimal ",". Um arquivo por aba.' },
  { id: 'txt', nome: 'Texto (.txt)', descricao: 'Separador "|" no estilo SPED. Um arquivo por aba.' },
]

/** Uma aba da planilha: nome e linhas (cada linha é um objeto coluna → valor). */
export interface Planilha {
  nome: string
  linhas: Record<string, unknown>[]
  /** Largura sugerida das colunas (caracteres), na ordem das colunas. */
  larguras?: number[]
}

const LIMITE_LINHAS_XLS = 65_535 // 65.536 menos a linha de cabeçalho
const LIMITE_LINHAS_XLSX = 1_048_575

// ---------------------------------------------------------------------------
// FORMATAÇÃO
// ---------------------------------------------------------------------------

/** Data e hora em pt-BR, no fuso de Brasília (resultado estável em qualquer máquina). */
export function formatarData(iso: string): string {
  if (!iso) return ''
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return iso
  return data.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

// ---------------------------------------------------------------------------
// ABAS DO PADRÃO (Documentos + Itens Analítico) COM CAMPOS ADICIONAIS
// ---------------------------------------------------------------------------

/** Cabeçalho de coluna de um campo adicional (o rótulo, que pode ser comum a vários tipos). */
function colunaExtra(campo: CampoCatalogo): string {
  return campo.rotulo
}

function linhaDocumento(doc: FiscalDocument): Record<string, unknown> {
  const vIBS = doc.totals.vIBS ?? 0
  const vCBS = doc.totals.vCBS ?? 0
  return {
    'Chave de Acesso': doc.access_key,
    'Tipo': doc.document_type,
    'Direção': doc.direction ?? 'NÃO ENRIQUECIDO',
    'Finalidade': doc.purpose,
    'Data Emissão': formatarData(doc.issue_date),
    'Emitente CNPJ': formatCnpjCpf(doc.issuer.cnpj_cpf),
    'Emitente Nome': doc.issuer.name,
    'Destinatário CNPJ': formatCnpjCpf(doc.receiver.cnpj_cpf),
    'Destinatário Nome': doc.receiver.name,
    'Regime': doc.tax_regime,
    'Valor Total (R$)': doc.total_value,
    'Status': doc.status,
    '[RTC] Base IBS/CBS': doc.totals.vBCIBSCBS ?? 0,
    '[RTC] Total IBS': vIBS,
    '[RTC] Total CBS': vCBS,
    '[RTC] Saldo': Math.round((vIBS + vCBS) * 100) / 100,
  }
}

function cabecalhoItem(doc: FiscalDocument): Record<string, unknown> {
  return {
    'Chave de Acesso': doc.access_key,
    'Tipo Doc': doc.document_type,
    'Direção': doc.direction ?? '',
    'Data Emissão': formatarData(doc.issue_date),
    'Emitente CNPJ': formatCnpjCpf(doc.issuer.cnpj_cpf),
    'Emitente Nome': doc.issuer.name,
    'Destinatário CNPJ': formatCnpjCpf(doc.receiver.cnpj_cpf),
    'Destinatário Nome': doc.receiver.name,
    'Regime': doc.tax_regime,
  }
}

function linhaItem(item: FiscalDocument['items'][number]): Record<string, unknown> {
  return {
    'Nº Item': item.item_number,
    'Descrição': item.description,
    'CFOP': item.cfop,
    'NCM': item.ncm,
    'Valor Bruto (R$)': item.gross_value,
    'Desconto (R$)': item.discount_value,
    'Valor Líquido (R$)': item.net_value,
    'Impacto RTC': item.rtc_impact ?? 'NÃO CALCULADO',
    '[RTC] CST': item.rtc.cst ?? '',
    '[RTC] cClassTrib': item.rtc.c_class_trib ?? '',
    '[RTC] Base Cálc (R$)': item.rtc.vBC ?? 0,
    '[RTC] Alíq IBS UF (%)': item.rtc.pIBSUF ?? 0,
    '[RTC] Valor IBS UF': item.rtc.vIBSUF ?? 0,
    '[RTC] Alíq IBS Mun (%)': item.rtc.pIBSMun ?? 0,
    '[RTC] Valor IBS Mun': item.rtc.vIBSMun ?? 0,
    '[RTC] Valor IBS Total': item.rtc.vIBS ?? 0,
    '[RTC] Alíq CBS (%)': item.rtc.pCBS ?? 0,
    '[RTC] Valor CBS': item.rtc.vCBS ?? 0,
    'ICMS CST': item.taxes_current.icms_cst ?? '',
    'ICMS Valor': item.taxes_current.icms_value ?? 0,
    'PIS CST': item.taxes_current.pis_cst ?? '',
    'PIS Valor': item.taxes_current.pis_value ?? 0,
    'COFINS CST': item.taxes_current.cofins_cst ?? '',
    'COFINS Valor': item.taxes_current.cofins_value ?? 0,
    'ISS Base': item.taxes_current.iss_base ?? 0,
    'ISS Alíq (%)': item.taxes_current.iss_rate ?? 0,
    'ISS Valor': item.taxes_current.iss_value ?? 0,
  }
}

/**
 * Monta as abas Documentos e Itens Analítico.
 * Os campos adicionais de documento entram nas duas abas; os de item, só na aba de itens.
 */
export function montarPlanilhasExtracao(documentos: FiscalDocument[], camposExtras: CampoCatalogo[] = []): Planilha[] {
  const extrasDoc = camposExtras.filter((c) => c.nivel === 'documento')
  const colunasDoc = [...new Set(extrasDoc.map(colunaExtra))]
  const colunasItem = [...new Set(camposExtras.filter((c) => c.nivel === 'item').map(colunaExtra))]

  const abaDocumentos: Record<string, unknown>[] = []
  const abaItens: Record<string, unknown>[] = []

  for (const doc of documentos) {
    const tipo = doc.document_type === 'UNKNOWN' ? null : doc.document_type
    const extraido = tipo && camposExtras.length > 0
      ? extrairCampos(doc.raw_xml, tipo, camposExtras, doc.items.length)
      : { documento: {}, itens: [] as Record<string, string>[] }

    // Valores adicionais de documento, por rótulo de coluna
    const valoresDoc: Record<string, string> = Object.fromEntries(colunasDoc.map((c) => [c, '']))
    for (const campo of extrasDoc) {
      const valor = extraido.documento[campo.id]
      if (valor !== undefined && valor !== '') valoresDoc[colunaExtra(campo)] = valor
    }

    abaDocumentos.push({ ...linhaDocumento(doc), ...valoresDoc })

    const cabecalho = cabecalhoItem(doc)
    doc.items.forEach((item, i) => {
      const valoresItem: Record<string, string> = Object.fromEntries(colunasItem.map((c) => [c, '']))
      for (const campo of camposExtras.filter((c) => c.nivel === 'item' && c.tipo === tipo)) {
        valoresItem[colunaExtra(campo)] = extraido.itens[i]?.[campo.id] ?? ''
      }
      abaItens.push({ ...cabecalho, ...linhaItem(item), ...valoresDoc, ...valoresItem })
    })
  }

  return [
    { nome: 'Documentos', linhas: abaDocumentos },
    { nome: 'Itens Analítico', linhas: abaItens },
  ]
}

/** Aba "Sobre" com os metadados da exportação e os créditos (rastreabilidade). */
export function abaSobre(titulo: string, informacoes: [string, string | number][]): Planilha {
  const linhas: [string, string | number][] = [
    [titulo, ''],
    ['Gerado em', formatarData(new Date().toISOString())],
    ...informacoes,
    ['', ''],
    ['Planejamento e decisões', 'Prof. Camargo'],
    ['Desenvolvimento', 'Em colaboração com Claude (Anthropic)'],
    ['Privacidade', 'Os XMLs foram processados no navegador; nenhum arquivo foi gravado em servidor.'],
  ]
  return { nome: 'Sobre', linhas: linhas.map(([campo, valor]) => ({ Campo: campo, Valor: valor })), larguras: [28, 90] }
}

// ---------------------------------------------------------------------------
// GERAÇÃO DOS ARQUIVOS
// ---------------------------------------------------------------------------

/** Colunas na ordem de aparição (a primeira linha pode não ter todas). */
function colunas(linhas: Record<string, unknown>[]): string[] {
  const vistas = new Set<string>()
  for (const linha of linhas) for (const c of Object.keys(linha)) vistas.add(c)
  return [...vistas]
}

/** Valor de célula para texto delimitado: decimal com vírgula e aspas quando preciso. */
function celulaTexto(valor: unknown, separador: string): string {
  if (valor === null || valor === undefined) return ''
  let texto = typeof valor === 'number' ? String(valor).replace('.', ',') : String(valor)
  if (typeof valor === 'boolean') texto = valor ? 'SIM' : 'NÃO'
  if (texto.includes(separador) || texto.includes('"') || /[\r\n]/.test(texto)) {
    texto = `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

/** Converte uma aba em texto delimitado (CSV ou TXT). */
export function planilhaParaTexto(planilha: Planilha, separador: ';' | '|'): string {
  const cols = colunas(planilha.linhas)
  const linhas = [
    cols.map((c) => celulaTexto(c, separador)).join(separador),
    ...planilha.linhas.map((l) => cols.map((c) => celulaTexto(l[c], separador)).join(separador)),
  ]
  return linhas.join('\r\n')
}

/** Nome de arquivo seguro a partir do nome da aba. */
function nomeArquivoAba(nome: string): string {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').toLowerCase()
}

/** Verifica se o volume cabe no formato escolhido. Retorna a mensagem de erro, se houver. */
export function validarVolume(planilhas: Planilha[], formato: FormatoExportacao): string | null {
  const limite = formato === 'xls' ? LIMITE_LINHAS_XLS : formato === 'xlsx' ? LIMITE_LINHAS_XLSX : Infinity
  const excedida = planilhas.find((p) => p.linhas.length > limite)
  if (!excedida) return null
  return `A aba "${excedida.nome}" tem ${excedida.linhas.length.toLocaleString('pt-BR')} linhas, acima do limite do formato ${formato.toUpperCase()} (${limite.toLocaleString('pt-BR')}). Use ${formato === 'xls' ? 'XLSX' : 'CSV ou TXT'}.`
}

/** Arquivo pronto para download. */
export interface ArquivoGerado {
  nome: string
  conteudo: Blob
}

/**
 * Gera o arquivo no formato pedido.
 * @param nomeBase nome sem extensão, ex.: "extracao-2026-11-22"
 */
export async function gerarArquivo(planilhas: Planilha[], formato: FormatoExportacao, nomeBase: string): Promise<ArquivoGerado> {
  const erro = validarVolume(planilhas, formato)
  if (erro) throw new Error(erro)

  if (formato === 'xlsx' || formato === 'xls') {
    const XLSX = await import('@e965/xlsx')
    const livro = XLSX.utils.book_new()
    for (const planilha of planilhas) {
      const aba = XLSX.utils.json_to_sheet(planilha.linhas, { header: colunas(planilha.linhas) })
      const cols = colunas(planilha.linhas)
      aba['!cols'] = cols.map((c, i) => ({ wch: planilha.larguras?.[i] ?? Math.min(Math.max(c.length + 2, 12), 48) }))
      XLSX.utils.book_append_sheet(livro, aba, planilha.nome.slice(0, 31))
    }
    const bookType = formato === 'xlsx' ? 'xlsx' : 'biff8'
    const dados = XLSX.write(livro, { bookType, type: 'array', compression: formato === 'xlsx' }) as ArrayBuffer
    const mime = formato === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.ms-excel'
    return { nome: `${nomeBase}.${formato}`, conteudo: new Blob([dados], { type: mime }) }
  }

  const separador = formato === 'csv' ? ';' : '|'
  const mime = formato === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8'
  const textos = planilhas.map((p) => ({ nome: `${nomeBase}-${nomeArquivoAba(p.nome)}.${formato}`, texto: '﻿' + planilhaParaTexto(p, separador) }))

  if (textos.length === 1) {
    const unico = textos[0] as { nome: string; texto: string }
    return { nome: `${nomeBase}.${formato}`, conteudo: new Blob([unico.texto], { type: mime }) }
  }
  const zip = new JSZip()
  for (const t of textos) zip.file(t.nome, t.texto)
  return { nome: `${nomeBase}-${formato}.zip`, conteudo: await zip.generateAsync({ type: 'blob' }) }
}

/** Dispara o download no navegador. */
export function baixar(arquivo: ArquivoGerado): void {
  const url = URL.createObjectURL(arquivo.conteudo)
  const a = document.createElement('a')
  a.href = url
  a.download = arquivo.nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Data de hoje no formato AAAA-MM-DD (fuso de Brasília), para nomes de arquivo. */
export function hojeIso(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}
