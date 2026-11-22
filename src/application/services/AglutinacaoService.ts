/**
 * @file AglutinacaoService.ts
 * @description Aglutina os itens da aba Itens Analítico em PARES ÚNICOS
 * CFOP + CST + cClassTrib, que são a base do julgamento da IA (decisão D21).
 *
 * ESCOPO (D23)
 *   Só entram itens de documentos cujo EMITENTE está nos regimes do escopo (padrão:
 *   Regime Normal, Simples com excesso de sublimite e não identificado). Simples Nacional
 *   e MEI ficam fora, porque o emitente não destaca IBS/CBS como um contribuinte comum.
 *   O que ficou fora é contado em EscopoRevisao, para o resumo executivo.
 *
 * O QUE CADA PAR GUARDA
 *   Para a IA: até 3 descrições de exemplo, os tipos de documento, a quantidade de itens,
 *   o valor total e a descrição oficial do CFOP.
 *   Só para o humano: os NCMs de maior valor (o NCM não vai à IA, D22).
 *   A direção (entrada/saída) não é usada (D24).
 *
 * SINALIZAÇÕES
 *   - duplicidade_matriz   → CFOP em mais de um Grupo Mestre (revisão humana obrigatória);
 *   - cfop_fora_matriz     → CFOP ausente da matriz ou par sem CFOP (revisão humana obrigatória);
 *   - cfop_inexistente     → CFOP que não consta na tabela oficial;
 *   - sem_classificacao    → item sem CST e sem cClassTrib (a IA propõe do zero);
 *   - reducao_literalidade → cClassTrib de redução: elegibilidade depende do profissional.
 */

import type { FiscalDocument, TaxRegime } from '@/domain/models/FiscalDocument'
import type { MatrizHumana, TabelaCfop, TabelaClassificacao } from '@/domain/models/Matriz'
import { REGIMES_NO_ESCOPO_PADRAO, type EscopoRevisao, type ParUnico, type Sinalizacao } from '@/domain/models/RevisaoIA'
import { ehCClassTribDeReducao } from '@/application/matriz/LeitorMatriz'

const MAX_DESCRICOES = 3
const MAX_NCMS = 5

export interface OpcoesAglutinacao {
  /** Regimes do emitente que entram na revisão. Padrão: REGIMES_NO_ESCOPO_PADRAO. */
  regimesNoEscopo?: TaxRegime[]
  /** Tabela oficial de CFOP: descrição e sinalização de CFOP inexistente. */
  tabelaCfop?: TabelaCfop | null
  /** Tabela oficial de cClassTrib: sinalização de cClassTrib de redução. */
  tabelaClassificacao?: TabelaClassificacao | null
}

export interface ResultadoAglutinacao {
  pares: ParUnico[]
  escopo: EscopoRevisao
}

/** Chave de aglutinação (exposta para testes e para conferência na planilha). */
export function chavePar(cfop: string, cst: string, cClassTrib: string): string {
  return [cfop, cst, cClassTrib].map((v) => v.trim()).join('|')
}

/** CFOP do item como entra na revisão. Na NFS-e, o parser guarda o cTribNac, que NÃO é CFOP. */
export function cfopDoItem(doc: FiscalDocument, item: FiscalDocument['items'][number]): string {
  return doc.document_type === 'NFSE' ? '' : (item.cfop ?? '').replace(/\D/g, '')
}

type Acumulador = Omit<ParUnico, 'id' | 'enquadramentos' | 'sinalizacoes' | 'descricaoCfop' | 'ncms' | 'qtdNcms'> & {
  valorPorNcm: Map<string, number>
}

/** Gera os pares únicos do escopo, ordenados por valor total (os mais relevantes primeiro). */
export function aglutinarPares(documentos: FiscalDocument[], matriz: MatrizHumana, opcoes: OpcoesAglutinacao = {}): ResultadoAglutinacao {
  const regimes = opcoes.regimesNoEscopo ?? REGIMES_NO_ESCOPO_PADRAO
  const mapa = new Map<string, Acumulador>()
  const escopo: EscopoRevisao = {
    regimesNoEscopo: regimes, itensNoEscopo: 0, valorNoEscopo: 0, itensForaDoEscopo: 0, valorForaDoEscopo: 0, porRegime: {},
  }

  for (const doc of documentos) {
    const regime = doc.tax_regime ?? 'UNKNOWN'
    const noEscopo = regimes.includes(regime)
    const r = (escopo.porRegime[regime] ??= { documentos: 0, itens: 0, valor: 0 })
    r.documentos++

    for (const item of doc.items) {
      const valor = item.net_value || 0
      r.itens++
      r.valor = arred(r.valor + valor)
      if (!noEscopo) {
        escopo.itensForaDoEscopo++
        escopo.valorForaDoEscopo = arred(escopo.valorForaDoEscopo + valor)
        continue
      }
      escopo.itensNoEscopo++
      escopo.valorNoEscopo = arred(escopo.valorNoEscopo + valor)

      const cfop = cfopDoItem(doc, item)
      const cst = (item.rtc.cst ?? '').trim()
      const cClassTrib = (item.rtc.c_class_trib ?? '').trim()
      const chave = chavePar(cfop, cst, cClassTrib)

      let par = mapa.get(chave)
      if (!par) {
        par = {
          cfop, cstAtual: cst, cClassTribAtual: cClassTrib,
          descricoesExemplo: [], tiposDocumento: [], qtdItens: 0, valorTotal: 0, valorPorNcm: new Map(),
        }
        mapa.set(chave, par)
      }
      par.qtdItens++
      par.valorTotal = arred(par.valorTotal + valor)
      const descricao = (item.description ?? '').trim()
      if (descricao && par.descricoesExemplo.length < MAX_DESCRICOES && !par.descricoesExemplo.includes(descricao)) {
        par.descricoesExemplo.push(descricao)
      }
      if (!par.tiposDocumento.includes(doc.document_type)) par.tiposDocumento.push(doc.document_type)
      const ncm = (item.ncm ?? '').replace(/\D/g, '')
      if (ncm) par.valorPorNcm.set(ncm, (par.valorPorNcm.get(ncm) ?? 0) + valor)
    }
  }

  const ordenados = [...mapa.values()].sort((a, b) => b.valorTotal - a.valorTotal || a.cfop.localeCompare(b.cfop))
  const largura = Math.max(3, String(ordenados.length).length)

  const pares = ordenados.map(({ valorPorNcm, ...par }, i): ParUnico => {
    const enquadramentos = par.cfop ? matriz.porCfop.get(par.cfop) ?? [] : []
    const oficial = par.cfop ? opcoes.tabelaCfop?.porCfop.get(par.cfop) : undefined
    const sinalizacoes: Sinalizacao[] = []
    if (enquadramentos.length === 0) sinalizacoes.push('cfop_fora_matriz')
    else if (new Set(enquadramentos.map((e) => e.grupo)).size > 1) sinalizacoes.push('duplicidade_matriz')
    if (par.cfop && opcoes.tabelaCfop && !oficial) sinalizacoes.push('cfop_inexistente')
    if (!par.cstAtual && !par.cClassTribAtual) sinalizacoes.push('sem_classificacao')
    if (ehCClassTribDeReducao(opcoes.tabelaClassificacao, par.cClassTribAtual)) sinalizacoes.push('reducao_literalidade')
    const ncms = [...valorPorNcm.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)
    return {
      id: `P${String(i + 1).padStart(largura, '0')}`,
      ...par,
      descricaoCfop: oficial?.descricao ?? '',
      ncms: ncms.slice(0, MAX_NCMS),
      qtdNcms: ncms.length,
      enquadramentos,
      sinalizacoes,
    }
  })

  return { pares, escopo }
}

/** Divide os pares em lotes do tamanho pedido. */
export function dividirEmLotes<T>(itens: T[], tamanho: number): T[][] {
  const t = Math.max(1, Math.floor(tamanho))
  const lotes: T[][] = []
  for (let i = 0; i < itens.length; i += t) lotes.push(itens.slice(i, i + t))
  return lotes
}

function arred(v: number): number {
  return Math.round(v * 100) / 100
}
