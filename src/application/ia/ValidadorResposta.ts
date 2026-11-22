/**
 * @file ValidadorResposta.ts
 * @description Valida a resposta da IA em duas camadas (ver o Prompt Mestre, "Como a
 * aplicação usa este arquivo").
 *
 *   ESTRUTURAL: o texto precisa conter um JSON com a lista "resultados", e cada resultado
 *     precisa ter os campos obrigatórios com valores válidos. Pares que faltarem ou vierem
 *     incompletos voltam para a fila e seguem para o próximo modelo (fallback).
 *
 *   SEMÂNTICA: o cClassTrib proposto precisa existir na tabela oficial, e seus 3 primeiros
 *     dígitos precisam ser o CST proposto. Uma falha aqui NÃO descarta a resposta: a linha
 *     sai marcada, com revisão humana obrigatória. Isso permite comparar a qualidade dos
 *     modelos, que é um dos objetivos didáticos.
 */

import { COLUNA_DESCRICAO_CCLASSTRIB, GRUPOS_MESTRES, type GrupoMestre, type TabelaClassificacao } from '@/domain/models/Matriz'
import type { Confianca, Parecer, ResultadoIA, ValidacaoSemantica } from '@/domain/models/RevisaoIA'

const PARECERES: Parecer[] = ['CONCORDA', 'DIVERGE', 'PROPOSTA_INICIAL']
const CONFIANCAS: Confianca[] = ['ALTA', 'MEDIA', 'BAIXA']

/** Retira cercas de código e texto ao redor, e devolve o trecho JSON mais externo. */
export function extrairJson(texto: string): unknown {
  const semCercas = texto.replace(/```(?:json)?/gi, '').trim()
  const tentativas = [semCercas]
  const inicio = semCercas.indexOf('{')
  const fim = semCercas.lastIndexOf('}')
  if (inicio >= 0 && fim > inicio) tentativas.push(semCercas.slice(inicio, fim + 1))
  const inicioLista = semCercas.indexOf('[')
  const fimLista = semCercas.lastIndexOf(']')
  if (inicioLista >= 0 && fimLista > inicioLista) tentativas.push(semCercas.slice(inicioLista, fimLista + 1))
  for (const t of tentativas) {
    try {
      return JSON.parse(t)
    } catch {
      // tenta o próximo recorte
    }
  }
  throw new Error('A resposta do modelo não contém um JSON legível.')
}

function textoCampo(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  if (Array.isArray(valor)) return valor.map(textoCampo).filter(Boolean).join('; ')
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor).trim()
}

function booleano(valor: unknown): boolean | null {
  if (typeof valor === 'boolean') return valor
  if (typeof valor === 'string') {
    const v = valor.trim().toLowerCase()
    if (['true', 'sim', 'yes', 's'].includes(v)) return true
    if (['false', 'nao', 'não', 'no', 'n'].includes(v)) return false
  }
  return null
}

function normalizarGrupo(valor: unknown): GrupoMestre | null {
  const v = textoCampo(valor).toUpperCase().replace(/^GRUPO\s*/, '').trim()
  return (GRUPOS_MESTRES as readonly string[]).includes(v) ? (v as GrupoMestre) : null
}

function normalizarEnum<T extends string>(valor: unknown, opcoes: T[]): T | null {
  const v = textoCampo(valor).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_')
  return opcoes.find((o) => o === v) ?? null
}

/** Normaliza um código numérico com zeros à esquerda (o modelo às vezes devolve 1 em vez de "000001"). */
function codigo(valor: unknown, digitos: number): string {
  const v = textoCampo(valor).replace(/\D/g, '')
  return v ? v.padStart(digitos, '0') : ''
}

export interface ResultadoValidacao {
  validos: ResultadoIA[]
  /** id → motivo, para os pares que voltam à fila. */
  invalidos: Map<string, string>
}

/**
 * Valida a resposta estrutural para um lote.
 * @param idsEsperados ids enviados no lote (respostas para outros ids são ignoradas)
 */
export function validarResposta(texto: string, idsEsperados: string[]): ResultadoValidacao {
  const invalidos = new Map<string, string>()
  let dados: unknown
  try {
    dados = extrairJson(texto)
  } catch (erro) {
    for (const id of idsEsperados) invalidos.set(id, erro instanceof Error ? erro.message : 'JSON ilegível.')
    return { validos: [], invalidos }
  }

  const lista = Array.isArray(dados)
    ? dados
    : Array.isArray((dados as Record<string, unknown>)?.resultados)
      ? ((dados as Record<string, unknown>).resultados as unknown[])
      : []

  const esperados = new Set(idsEsperados)
  const validos: ResultadoIA[] = []
  for (const bruto of lista) {
    if (!bruto || typeof bruto !== 'object') continue
    const r = bruto as Record<string, unknown>
    const id = textoCampo(r.id)
    if (!esperados.has(id) || validos.some((v) => v.id === id)) continue

    const grupo = normalizarGrupo(r.grupo_ia)
    const parecer = normalizarEnum(r.parecer, PARECERES)
    const confianca = normalizarEnum(r.confianca, CONFIANCAS)
    const cst = codigo(r.cst_proposto, 3)
    const cClassTrib = codigo(r.cclasstrib_proposto, 6)
    const justificativa = textoCampo(r.justificativa)

    const faltas: string[] = []
    if (!grupo) faltas.push('grupo_ia')
    if (!parecer) faltas.push('parecer')
    if (!confianca) faltas.push('confianca')
    if (cst.length !== 3) faltas.push('cst_proposto')
    if (cClassTrib.length !== 6) faltas.push('cclasstrib_proposto')
    if (!justificativa) faltas.push('justificativa')
    if (faltas.length > 0) {
      invalidos.set(id, `Campos ausentes ou inválidos: ${faltas.join(', ')}.`)
      continue
    }

    validos.push({
      id,
      analise_juridica: textoCampo(r.analise_juridica),
      analise_contabil: textoCampo(r.analise_contabil),
      analise_fiscal_rtc: textoCampo(r.analise_fiscal_rtc),
      analise_operacional: textoCampo(r.analise_operacional),
      matriz_passo_a_passo: textoCampo(r.matriz_passo_a_passo),
      grupo_ia: grupo as GrupoMestre,
      concorda_com_grupo_humano: booleano(r.concorda_com_grupo_humano) ?? false,
      parecer: parecer as Parecer,
      cst_proposto: cst,
      cclasstrib_proposto: cClassTrib,
      justificativa,
      fundamentacao_legal: textoCampo(r.fundamentacao_legal),
      red_flags: textoCampo(r.red_flags),
      duvidas: textoCampo(r.duvidas),
      documentacao_recomendada: textoCampo(r.documentacao_recomendada),
      confianca: confianca as Confianca,
      revisao_humana_obrigatoria: booleano(r.revisao_humana_obrigatoria) ?? false,
    })
  }

  for (const id of idsEsperados) {
    if (!validos.some((v) => v.id === id) && !invalidos.has(id)) invalidos.set(id, 'O modelo não devolveu resultado para este par.')
  }
  return { validos, invalidos }
}

/** Validação semântica de uma proposta contra a tabela oficial. */
export function validarSemantica(resultado: ResultadoIA, tabela: TabelaClassificacao): ValidacaoSemantica {
  const problemas: string[] = []
  const registro = tabela.porCClassTrib.get(resultado.cclasstrib_proposto)
  if (!registro) {
    problemas.push(`cClassTrib ${resultado.cclasstrib_proposto} não existe na tabela oficial.`)
  }
  if (!resultado.cclasstrib_proposto.startsWith(resultado.cst_proposto)) {
    problemas.push(`O cClassTrib ${resultado.cclasstrib_proposto} não pertence ao CST ${resultado.cst_proposto}.`)
  }
  return {
    ok: problemas.length === 0,
    descricaoCClassTrib: registro?.[COLUNA_DESCRICAO_CCLASSTRIB],
    problemas,
  }
}
