/**
 * @file AglutinacaoService.ts
 * @description Aglutina os itens da aba Itens Analítico em PARES ÚNICOS
 * CFOP + NCM + CST + cClassTrib, que são a base do julgamento da IA (decisão D06).
 *
 * Para cada par, guarda o que a IA precisa para julgar a essência: até 3 descrições de
 * exemplo, os tipos de documento, as direções, a quantidade de itens e o valor total.
 * Também consulta a matriz humana e marca as sinalizações:
 *   - duplicidade_matriz → CFOP em mais de um Grupo Mestre (revisão humana obrigatória);
 *   - cfop_fora_matriz   → CFOP ausente da matriz (revisão humana obrigatória);
 *   - sem_classificacao  → item sem CST e sem cClassTrib (a IA propõe do zero).
 */

import type { FiscalDocument } from '@/domain/models/FiscalDocument'
import type { MatrizHumana } from '@/domain/models/Matriz'
import type { DirecaoPar, ParUnico, Sinalizacao } from '@/domain/models/RevisaoIA'

const MAX_DESCRICOES = 3

function direcaoPar(direcao: FiscalDocument['direction']): DirecaoPar {
  if (direcao === 'INBOUND') return 'ENTRADA'
  if (direcao === 'OUTBOUND') return 'SAIDA'
  return 'INDEFINIDA'
}

/** Chave de aglutinação (exposta para testes e para conferência na planilha). */
export function chavePar(cfop: string, ncm: string, cst: string, cClassTrib: string): string {
  return [cfop, ncm, cst, cClassTrib].map((v) => v.trim()).join('|')
}

/** Gera os pares únicos, ordenados por valor total (os mais relevantes primeiro). */
export function aglutinarPares(documentos: FiscalDocument[], matriz: MatrizHumana): ParUnico[] {
  const mapa = new Map<string, Omit<ParUnico, 'id' | 'enquadramentos' | 'sinalizacoes'>>()

  for (const doc of documentos) {
    for (const item of doc.items) {
      // Na NFS-e o parser herdado preenche `cfop` com o cTribNac (código de
      // tributação nacional), que NÃO é CFOP. Tratá-lo como CFOP criaria pares
      // falsos "fora da matriz". Para NFS-e o CFOP fica vazio e a IA julga
      // pela essência do serviço (sinalização cfop_fora_matriz).
      const cfop = doc.document_type === 'NFSE' ? '' : (item.cfop ?? '').replace(/\D/g, '')
      const ncm = (item.ncm ?? '').replace(/\D/g, '')
      const cst = (item.rtc.cst ?? '').trim()
      const cClassTrib = (item.rtc.c_class_trib ?? '').trim()
      const chave = chavePar(cfop, ncm, cst, cClassTrib)

      let par = mapa.get(chave)
      if (!par) {
        par = {
          cfop, ncm, cstAtual: cst, cClassTribAtual: cClassTrib,
          descricoesExemplo: [], tiposDocumento: [], direcoes: [],
          qtdItens: 0, valorTotal: 0,
        }
        mapa.set(chave, par)
      }
      par.qtdItens++
      par.valorTotal = Math.round((par.valorTotal + (item.net_value || 0)) * 100) / 100
      const descricao = (item.description ?? '').trim()
      if (descricao && par.descricoesExemplo.length < MAX_DESCRICOES && !par.descricoesExemplo.includes(descricao)) {
        par.descricoesExemplo.push(descricao)
      }
      if (!par.tiposDocumento.includes(doc.document_type)) par.tiposDocumento.push(doc.document_type)
      const direcao = direcaoPar(doc.direction)
      if (!par.direcoes.includes(direcao)) par.direcoes.push(direcao)
    }
  }

  const ordenados = [...mapa.values()].sort((a, b) => b.valorTotal - a.valorTotal || a.cfop.localeCompare(b.cfop))
  const largura = Math.max(3, String(ordenados.length).length)

  return ordenados.map((par, i) => {
    const enquadramentos = par.cfop ? matriz.porCfop.get(par.cfop) ?? [] : []
    const sinalizacoes: Sinalizacao[] = []
    if (enquadramentos.length === 0) sinalizacoes.push('cfop_fora_matriz')
    else if (new Set(enquadramentos.map((e) => e.grupo)).size > 1) sinalizacoes.push('duplicidade_matriz')
    if (!par.cstAtual && !par.cClassTribAtual) sinalizacoes.push('sem_classificacao')
    return { id: `P${String(i + 1).padStart(largura, '0')}`, ...par, enquadramentos, sinalizacoes }
  })
}

/** Divide os pares em lotes do tamanho pedido. */
export function dividirEmLotes<T>(itens: T[], tamanho: number): T[][] {
  const t = Math.max(1, Math.floor(tamanho))
  const lotes: T[][] = []
  for (let i = 0; i < itens.length; i += t) lotes.push(itens.slice(i, i + t))
  return lotes
}
