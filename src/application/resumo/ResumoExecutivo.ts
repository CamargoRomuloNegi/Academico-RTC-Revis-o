/**
 * @file ResumoExecutivo.ts
 * @description Etapa final (decisão D26): consolida a amostra, a empresa, as principais
 * operações, o nível de conformidade e os pontos de atenção; monta as abas do Excel e as
 * mensagens do relatório executivo gerado pela IA (Gemini, D28).
 *
 * CONFORMIDADE (D27): medida POR VALOR (R$), com a quantidade de pares ao lado, por ser
 * a medida mais relevante para o saneamento dos erros.
 *
 *   Conforme       → a IA concorda com o CST/cClassTrib do XML e a validação do código passou.
 *   Divergente     → a IA propõe outra classificação, ou concorda com um código que a
 *                    validação reprovou (cClassTrib inexistente ou de outro CST).
 *   Sem classificação → o XML não trouxe CST/cClassTrib (a IA propôs do zero).
 *   Não julgado    → nenhum modelo conseguiu julgar (ou a revisão ainda não foi feita).
 *
 *   Índice de conformidade = valor conforme ÷ (valor conforme + valor divergente).
 *   Ele mede a qualidade do que JÁ ESTAVA classificado; o que estava sem classificação
 *   aparece à parte, porque é ausência de informação, não erro de classificação.
 *
 * Todas as funções são puras (sem rede): a chamada ao Gemini fica em ServicoRevisao.
 */

import type { FiscalDocument } from '@/domain/models/FiscalDocument'
import type { TabelaCfop } from '@/domain/models/Matriz'
import { ROTULO_REGIME, type EscopoRevisao, type LinhaRevisao, type ParUnico } from '@/domain/models/RevisaoIA'
import type { MensagemChat } from '@/infrastructure/ia/ClienteIA'
import type { Planilha } from '@/application/services/ExportService'
import { extractCnpjRoot, formatCnpjCpf } from '@/lib/utils'

export type SituacaoConformidade = 'conforme' | 'divergente' | 'semClassificacao' | 'naoJulgado'

export const ROTULO_SITUACAO: Record<SituacaoConformidade, string> = {
  conforme: 'Conforme',
  divergente: 'Divergente',
  semClassificacao: 'Sem classificação',
  naoJulgado: 'Não julgado',
}

export interface Fatia { pares: number; valor: number }

export interface OperacaoPrincipal {
  cfop: string
  descricao: string
  grupos: string
  pares: number
  itens: number
  valor: number
  participacao: number
}

export interface PontoDeAtencao {
  tipo: 'Divergência' | 'Sem classificação' | 'CFOP inexistente' | 'Redução (literalidade)' | 'Validação falhou' | 'Não julgado'
  par: string
  cfop: string
  classificacaoAtual: string
  proposta: string
  valor: number
  detalhe: string
}

export interface IndicadoresResumo {
  empresa: { cnpjRaiz: string | null; razaoSocial: string; regime: string }
  amostra: { inicio: string; fim: string; documentos: number; itens: number; valorTotal: number; porTipo: Record<string, number> }
  escopo: EscopoRevisao
  pares: number
  revisao: { realizada: boolean; julgados: number; revisaoHumanaPares: number; revisaoHumanaValor: number }
  conformidade: Record<SituacaoConformidade, Fatia> & { indicePorValor: number | null; indicePorPares: number | null }
  principaisOperacoes: OperacaoPrincipal[]
  porGrupo: { grupo: string; valor: number; pares: number }[]
  pontos: PontoDeAtencao[]
  modelos: { modelo: string; pares: number }[]
}

const arred = (v: number) => Math.round(v * 100) / 100

/** Situação de conformidade de um par, a partir da linha de revisão (se houver). */
export function situacaoDoPar(par: ParUnico, linha?: LinhaRevisao): SituacaoConformidade {
  if (par.sinalizacoes.includes('sem_classificacao')) return 'semClassificacao'
  const r = linha?.resultado
  if (!r) return 'naoJulgado'
  if (r.parecer === 'CONCORDA' && (linha?.validacao?.ok ?? true)) return 'conforme'
  return 'divergente'
}

function empresaAnalisada(documentos: FiscalDocument[], cnpjRaiz: string | null): IndicadoresResumo['empresa'] {
  if (!cnpjRaiz) return { cnpjRaiz: null, razaoSocial: 'não identificada', regime: '' }
  const nomes = new Map<string, number>()
  const regimes = new Map<string, number>()
  for (const d of documentos) {
    if (extractCnpjRoot(d.issuer.cnpj_cpf) === cnpjRaiz) {
      if (d.issuer.name) nomes.set(d.issuer.name, (nomes.get(d.issuer.name) ?? 0) + 1)
      regimes.set(d.tax_regime, (regimes.get(d.tax_regime) ?? 0) + 1)
    } else if (extractCnpjRoot(d.receiver.cnpj_cpf) === cnpjRaiz && d.receiver.name) {
      nomes.set(d.receiver.name, (nomes.get(d.receiver.name) ?? 0) + 1)
    }
  }
  const maisFrequente = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  const regime = maisFrequente(regimes)
  return {
    cnpjRaiz,
    razaoSocial: maisFrequente(nomes) || 'não identificada',
    regime: regime ? ROTULO_REGIME[regime as keyof typeof ROTULO_REGIME] ?? regime : 'sem documentos emitidos pela empresa',
  }
}

export interface EntradaResumo {
  documentos: FiscalDocument[]
  cnpjRaiz: string | null
  escopo: EscopoRevisao
  pares: ParUnico[]
  linhas: LinhaRevisao[]
  tabelaCfop?: TabelaCfop | null
}

export function calcularIndicadores({ documentos, cnpjRaiz, escopo, pares, linhas, tabelaCfop }: EntradaResumo): IndicadoresResumo {
  const porId = new Map(linhas.map((l) => [l.par.id, l]))

  // Amostra
  const datas = documentos.map((d) => d.issue_date).filter(Boolean).sort()
  const porTipo: Record<string, number> = {}
  let itens = 0
  let valorTotal = 0
  for (const d of documentos) {
    porTipo[d.document_type] = (porTipo[d.document_type] ?? 0) + 1
    itens += d.items.length
    for (const i of d.items) valorTotal += i.net_value || 0
  }

  // Conformidade, revisão humana, modelos, grupos e operações
  const conf: Record<SituacaoConformidade, Fatia> = {
    conforme: { pares: 0, valor: 0 }, divergente: { pares: 0, valor: 0 }, semClassificacao: { pares: 0, valor: 0 }, naoJulgado: { pares: 0, valor: 0 },
  }
  let julgados = 0, rhPares = 0, rhValor = 0
  const modelos = new Map<string, number>()
  const grupos = new Map<string, { valor: number; pares: number }>()
  const operacoes = new Map<string, OperacaoPrincipal>()
  const pontos: PontoDeAtencao[] = []
  const valorEscopo = pares.reduce((s, p) => s + p.valorTotal, 0)

  for (const par of pares) {
    const linha = porId.get(par.id)
    const sit = situacaoDoPar(par, linha)
    conf[sit].pares++
    conf[sit].valor = arred(conf[sit].valor + par.valorTotal)
    if (linha?.resultado) {
      julgados++
      if (linha.modeloJulgador) modelos.set(linha.modeloJulgador, (modelos.get(linha.modeloJulgador) ?? 0) + 1)
    }
    if (linha?.revisaoHumanaObrigatoria) { rhPares++; rhValor = arred(rhValor + par.valorTotal) }

    const grupo = par.enquadramentos.length === 0 ? 'Fora da matriz' : new Set(par.enquadramentos.map((e) => e.grupo)).size > 1 ? 'Mais de um grupo' : `Grupo ${par.enquadramentos[0]!.grupo}`
    const g = grupos.get(grupo) ?? { valor: 0, pares: 0 }
    g.valor = arred(g.valor + par.valorTotal); g.pares++
    grupos.set(grupo, g)

    const chaveOp = par.cfop || '(sem CFOP)'
    const op = operacoes.get(chaveOp) ?? {
      cfop: chaveOp,
      descricao: par.descricaoCfop || tabelaCfop?.porCfop.get(par.cfop)?.descricao || (par.cfop ? '' : 'Serviços (NFS-e)'),
      grupos: [...new Set(par.enquadramentos.map((e) => `${e.grupo} · ${e.subgrupo}`))].join(' / ') || 'fora da matriz',
      pares: 0, itens: 0, valor: 0, participacao: 0,
    }
    op.pares++; op.itens += par.qtdItens; op.valor = arred(op.valor + par.valorTotal)
    operacoes.set(chaveOp, op)

    // Pontos de atenção (determinísticos)
    const atual = [par.cstAtual, par.cClassTribAtual].filter(Boolean).join(' / ') || '(sem classificação)'
    const r = linha?.resultado
    const proposta = r ? `${r.cst_proposto} / ${r.cclasstrib_proposto}` : ''
    const base = { par: par.id, cfop: par.cfop || '(sem CFOP)', classificacaoAtual: atual, proposta, valor: par.valorTotal }
    const corte = (t?: string) => (t ?? '').replace(/\s+/g, ' ').slice(0, 280)
    if (sit === 'divergente') pontos.push({ tipo: linha?.validacao && !linha.validacao.ok && r?.parecer === 'CONCORDA' ? 'Validação falhou' : 'Divergência', ...base, detalhe: corte(linha?.validacao && !linha.validacao.ok ? linha.validacao.problemas.join(' ') : r?.justificativa) })
    if (sit === 'semClassificacao') pontos.push({ tipo: 'Sem classificação', ...base, detalhe: corte(r?.justificativa) || 'O XML não trouxe CST/cClassTrib.' })
    if (par.sinalizacoes.includes('cfop_inexistente')) pontos.push({ tipo: 'CFOP inexistente', ...base, detalhe: 'O CFOP não consta na tabela oficial.' })
    if (par.sinalizacoes.includes('reducao_literalidade')) pontos.push({ tipo: 'Redução (literalidade)', ...base, detalhe: 'Redução de alíquota: conferir a correspondência literal do produto e do uso.' })
    if (sit === 'naoJulgado' && linha?.erro) pontos.push({ tipo: 'Não julgado', ...base, detalhe: corte(linha.erro) })
  }

  const principais = [...operacoes.values()].sort((a, b) => b.valor - a.valor).slice(0, 10)
  for (const op of principais) op.participacao = valorEscopo > 0 ? op.valor / valorEscopo : 0
  const ordemTipo: Record<PontoDeAtencao['tipo'], number> = { 'Divergência': 0, 'Validação falhou': 1, 'CFOP inexistente': 2, 'Sem classificação': 3, 'Redução (literalidade)': 4, 'Não julgado': 5 }
  pontos.sort((a, b) => b.valor - a.valor || ordemTipo[a.tipo] - ordemTipo[b.tipo])

  const classificado = conf.conforme.valor + conf.divergente.valor
  const classificadoPares = conf.conforme.pares + conf.divergente.pares
  return {
    empresa: empresaAnalisada(documentos, cnpjRaiz),
    amostra: { inicio: datas[0] ?? '', fim: datas[datas.length - 1] ?? '', documentos: documentos.length, itens, valorTotal: arred(valorTotal), porTipo },
    escopo,
    pares: pares.length,
    revisao: { realizada: julgados > 0, julgados, revisaoHumanaPares: rhPares, revisaoHumanaValor: rhValor },
    conformidade: {
      ...conf,
      indicePorValor: classificado > 0 ? conf.conforme.valor / classificado : null,
      indicePorPares: classificadoPares > 0 ? conf.conforme.pares / classificadoPares : null,
    },
    principaisOperacoes: principais,
    porGrupo: [...grupos.entries()].map(([grupo, g]) => ({ grupo, ...g })).sort((a, b) => b.valor - a.valor),
    pontos,
    modelos: [...modelos.entries()].map(([modelo, n]) => ({ modelo, pares: n })).sort((a, b) => b.pares - a.pares),
  }
}

// ---------------------------------------------------------------------------
// RELATÓRIO EXECUTIVO (IA)
// ---------------------------------------------------------------------------

const PROMPT_RELATORIO = `Você é um auditor tributário sênior especializado na Reforma Tributária do Consumo (LC 214/2025, IBS/CBS).
Recebe os indicadores CONSOLIDADOS de uma revisão de classificação tributária (CST e cClassTrib) feita por modelos de IA a partir de XMLs fiscais e de uma matriz de decisão humana de CFOP.

Escreva um RELATÓRIO EXECUTIVO em português do Brasil, em Markdown, com estas seções:
## Contexto da amostra
## Principais operações
## Nível de conformidade
## Pontos prioritários de análise
## Recomendações
## Limitações desta análise

Regras:
- Use SOMENTE os números recebidos. Não invente valores, CFOPs, empresas ou artigos de lei.
- A conformidade é medida por VALOR (R$). Cite também a quantidade de pares.
- Em "Pontos prioritários", liste de 5 a 10 itens numerados, do maior para o menor impacto financeiro, dizendo o que o contador deve verificar.
- Reduções de alíquota exigem literalidade: nunca afirme que um produto tem direito a redução; diga que a elegibilidade depende da análise literal do produto e do uso pelo profissional.
- Optantes do Simples Nacional e MEI ficaram fora do escopo da revisão; mencione o volume que ficou fora.
- Tom formal, técnico e objetivo, para um gestor ou contador. No máximo 700 palavras.
- Termine lembrando que o parecer foi gerado com apoio de IA e que a responsabilidade técnica é do profissional contábil.`

/** Indicadores em formato compacto para a IA (sem dados pessoais além da razão social). */
export function indicadoresParaIA(ind: IndicadoresResumo): Record<string, unknown> {
  const pct = (v: number | null) => (v === null ? null : Math.round(v * 1000) / 10)
  return {
    empresa: ind.empresa,
    amostra: ind.amostra,
    escopo: {
      regimes_revisados: ind.escopo.regimesNoEscopo.map((r) => ROTULO_REGIME[r]),
      itens_no_escopo: ind.escopo.itensNoEscopo, valor_no_escopo: ind.escopo.valorNoEscopo,
      itens_fora: ind.escopo.itensForaDoEscopo, valor_fora: ind.escopo.valorForaDoEscopo,
    },
    pares_unicos: ind.pares,
    revisao: ind.revisao,
    conformidade: {
      indice_por_valor_pct: pct(ind.conformidade.indicePorValor),
      indice_por_pares_pct: pct(ind.conformidade.indicePorPares),
      conforme: ind.conformidade.conforme, divergente: ind.conformidade.divergente,
      sem_classificacao: ind.conformidade.semClassificacao, nao_julgado: ind.conformidade.naoJulgado,
    },
    principais_operacoes: ind.principaisOperacoes.map((o) => ({ cfop: o.cfop, descricao: o.descricao, matriz: o.grupos, valor: o.valor, participacao_pct: pct(o.participacao) })),
    distribuicao_matriz: ind.porGrupo,
    pontos_de_atencao: ind.pontos.slice(0, 25),
  }
}

export function montarMensagensRelatorio(ind: IndicadoresResumo): MensagemChat[] {
  return [
    { role: 'system', content: PROMPT_RELATORIO },
    { role: 'user', content: `Indicadores consolidados (JSON):\n${JSON.stringify(indicadoresParaIA(ind))}` },
  ]
}

// ---------------------------------------------------------------------------
// ABAS DO EXCEL
// ---------------------------------------------------------------------------

/** Abas "Resumo Executivo", "Principais Operações" e "Pontos de Atenção". */
export function planilhasResumo(ind: IndicadoresResumo, relatorio?: { texto: string; modelo: string } | null): Planilha[] {
  const pct = (v: number | null) => (v === null ? 'n/d' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`)
  const c = ind.conformidade
  const linhas: [string, string | number][] = [
    ['EMPRESA', ''],
    ['CNPJ raiz', ind.empresa.cnpjRaiz ? formatCnpjCpf(ind.empresa.cnpjRaiz.padEnd(14, '0')).slice(0, 10) : 'não identificado'],
    ['Razão social', ind.empresa.razaoSocial],
    ['Regime (documentos emitidos)', ind.empresa.regime],
    ['AMOSTRA', ''],
    ['Período', ind.amostra.inicio ? `${ind.amostra.inicio.slice(0, 10)} a ${ind.amostra.fim.slice(0, 10)}` : ''],
    ['Documentos', ind.amostra.documentos],
    ...Object.entries(ind.amostra.porTipo).map(([t, n]): [string, number] => [`  ${t}`, n]),
    ['Itens', ind.amostra.itens],
    ['Valor total dos itens (R$)', ind.amostra.valorTotal],
    ['ESCOPO DA REVISÃO (regime do emitente)', ''],
    ['Regimes revisados', ind.escopo.regimesNoEscopo.map((r) => ROTULO_REGIME[r]).join('; ')],
    ['Itens no escopo', ind.escopo.itensNoEscopo],
    ['Valor no escopo (R$)', ind.escopo.valorNoEscopo],
    ['Itens fora do escopo', ind.escopo.itensForaDoEscopo],
    ['Valor fora do escopo (R$)', ind.escopo.valorForaDoEscopo],
    ['Pares únicos (CFOP + CST + cClassTrib)', ind.pares],
    ['CONFORMIDADE (por valor)', ''],
    ['Índice de conformidade por valor', pct(c.indicePorValor)],
    ['Índice de conformidade por pares', pct(c.indicePorPares)],
    ...(['conforme', 'divergente', 'semClassificacao', 'naoJulgado'] as SituacaoConformidade[]).flatMap((k): [string, string | number][] => [
      [`${ROTULO_SITUACAO[k]} · valor (R$)`, c[k].valor],
      [`${ROTULO_SITUACAO[k]} · pares`, c[k].pares],
    ]),
    ['Revisão humana obrigatória · pares', ind.revisao.revisaoHumanaPares],
    ['Revisão humana obrigatória · valor (R$)', ind.revisao.revisaoHumanaValor],
    ['MODELOS QUE JULGARAM', ''],
    ...ind.modelos.map((m): [string, number] => [m.modelo, m.pares]),
    ['RELATÓRIO EXECUTIVO', relatorio ? `Gerado por ${relatorio.modelo}` : 'não gerado'],
    ...(relatorio ? relatorio.texto.split('\n').filter((l) => l.trim()).map((l): [string, string] => ['', l]) : []),
  ]
  return [
    { nome: 'Resumo Executivo', linhas: linhas.map(([Indicador, Valor]) => ({ Indicador, Valor })), larguras: [44, 110] },
    {
      nome: 'Principais Operações',
      linhas: ind.principaisOperacoes.map((o) => ({
        'CFOP': o.cfop, 'Descrição oficial': o.descricao, 'Matriz (grupo · subgrupo)': o.grupos,
        'Pares': o.pares, 'Itens': o.itens, 'Valor (R$)': o.valor, 'Participação': pct(o.participacao),
      })),
      larguras: [10, 60, 50, 8, 8, 16, 12],
    },
    {
      nome: 'Pontos de Atenção',
      linhas: ind.pontos.map((p) => ({
        'Tipo': p.tipo, 'Par': p.par, 'CFOP': p.cfop, 'Classificação atual': p.classificacaoAtual, 'Proposta da IA': p.proposta, 'Valor (R$)': p.valor, 'Detalhe': p.detalhe,
      })),
      larguras: [22, 8, 10, 20, 20, 16, 100],
    },
  ]
}
