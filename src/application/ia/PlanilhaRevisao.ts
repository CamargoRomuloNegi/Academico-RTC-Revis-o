/**
 * @file PlanilhaRevisao.ts
 * @description Monta o "trabalho novo" do módulo 6, linha a linha (decisão D07):
 *   julgamento humano (matriz do professor) | classificação existente | revisão da IA
 *   | justificativa | modelo que julgou.
 *
 * ABAS
 *   Revisão IA          → uma linha por par único (a peça principal).
 *   Comparativo Modelos → desempenho de cada modelo (o laboratório dos alunos).
 *   Chamadas IA         → cada chamada feita, com status, tempo e tokens.
 *   Sobre               → metadados, versão do prompt, créditos e aviso de responsabilidade.
 */

import type { LinhaRevisao, RegistroChamada } from '@/domain/models/RevisaoIA'
import { abaSobre, formatarData, type Planilha } from '@/application/services/ExportService'

export const DISCLAIMER =
  "Parecer gerado por IA ('um estagiário de alto nível, mas ainda um estagiário'). Confirme as informações sensíveis. A responsabilidade técnica é do profissional contábil."

const ROTULO_SINALIZACAO: Record<string, string> = {
  duplicidade_matriz: 'CFOP em mais de um grupo (limitação da matriz)',
  cfop_fora_matriz: 'CFOP fora da matriz',
  sem_classificacao: 'Sem CST/cClassTrib no XML',
}

function simNao(v: boolean | undefined): string {
  return v === undefined ? '' : v ? 'SIM' : 'NÃO'
}

/** Aba principal: uma linha por par. */
export function abaRevisao(linhas: LinhaRevisao[]): Planilha {
  return {
    nome: 'Revisão IA',
    linhas: linhas.map(({ par, resultado: r, validacao, modeloJulgador, tentativas, julgadoEm, revisaoHumanaObrigatoria, erro }) => {
      const mantida = r ? r.cst_proposto === par.cstAtual && r.cclasstrib_proposto === par.cClassTribAtual : undefined
      return {
        'Par': par.id,
        'CFOP': par.cfop,
        'NCM': par.ncm,
        'Descrições (exemplo)': par.descricoesExemplo.join(' / '),
        'Tipo Doc': par.tiposDocumento.join(', '),
        'Direção': par.direcoes.join(', '),
        'Qtd Itens': par.qtdItens,
        'Valor Total (R$)': par.valorTotal,
        // Julgamento humano (matriz do professor)
        '[Humano] Grupo': par.enquadramentos.map((e) => e.grupo).join(' / '),
        '[Humano] Subgrupo': par.enquadramentos.map((e) => e.subgrupo).join(' / '),
        '[Humano] Essência': par.enquadramentos.map((e) => e.essencia).join(' / '),
        'Sinalizações': par.sinalizacoes
          .map((s) => (s === 'cfop_fora_matriz' && !par.cfop ? 'Sem CFOP (NFS-e): julgar pela essência do serviço' : ROTULO_SINALIZACAO[s] ?? s))
          .join('; '),
        // Classificação existente (XML)
        '[XML] CST': par.cstAtual,
        '[XML] cClassTrib': par.cClassTribAtual,
        // Revisão da IA
        '[IA] Grupo': r?.grupo_ia ?? '',
        '[IA] Concorda com o grupo humano': simNao(r?.concorda_com_grupo_humano),
        '[IA] Parecer': r?.parecer ?? '',
        '[IA] CST proposto': r?.cst_proposto ?? '',
        '[IA] cClassTrib proposto': r?.cclasstrib_proposto ?? '',
        '[IA] Descrição do cClassTrib (tabela oficial)': validacao?.descricaoCClassTrib ?? '',
        'Classificação mantida': simNao(mantida),
        '[IA] Justificativa': r?.justificativa ?? '',
        '[IA] Fundamentação legal': r?.fundamentacao_legal ?? '',
        '[IA] Matriz passo a passo': r?.matriz_passo_a_passo ?? '',
        '[IA] Análise jurídica': r?.analise_juridica ?? '',
        '[IA] Análise contábil': r?.analise_contabil ?? '',
        '[IA] Análise fiscal RTC': r?.analise_fiscal_rtc ?? '',
        '[IA] Análise operacional': r?.analise_operacional ?? '',
        '[IA] Red flags': r?.red_flags ?? '',
        '[IA] Dúvidas': r?.duvidas ?? '',
        '[IA] Documentação recomendada': r?.documentacao_recomendada ?? '',
        '[IA] Confiança': r?.confianca ?? '',
        'Validação (código)': validacao ? (validacao.ok ? 'OK' : `FALHOU: ${validacao.problemas.join(' ')}`) : '',
        'Revisão humana obrigatória': simNao(revisaoHumanaObrigatoria),
        // Rastreabilidade
        'Modelo que julgou': modeloJulgador ?? '',
        'Vagas tentadas': tentativas.join(' → '),
        'Julgado em': julgadoEm ? formatarData(julgadoEm) : '',
        'Erro': erro ?? '',
        'Aviso': DISCLAIMER,
      }
    }),
  }
}

/** Indicadores por modelo: o que cada um julgou, concordou, divergiu e errou. */
export function abaComparativo(linhas: LinhaRevisao[], chamadas: RegistroChamada[]): Planilha {
  const modelos = new Map<string, { julgados: number; mantidas: number; divergencias: number; propostas: number; validacaoFalhou: number; confiancaBaixa: number }>()
  for (const l of linhas) {
    if (!l.modeloJulgador || !l.resultado) continue
    const m = modelos.get(l.modeloJulgador) ?? { julgados: 0, mantidas: 0, divergencias: 0, propostas: 0, validacaoFalhou: 0, confiancaBaixa: 0 }
    m.julgados++
    if (l.resultado.parecer === 'CONCORDA') m.mantidas++
    if (l.resultado.parecer === 'DIVERGE') m.divergencias++
    if (l.resultado.parecer === 'PROPOSTA_INICIAL') m.propostas++
    if (l.validacao && !l.validacao.ok) m.validacaoFalhou++
    if (l.resultado.confianca === 'BAIXA') m.confiancaBaixa++
    modelos.set(l.modeloJulgador, m)
  }
  const porModeloChamadas = new Map<string, RegistroChamada[]>()
  for (const c of chamadas) {
    const chave = `${c.provedor}::${c.modelo}`
    porModeloChamadas.set(chave, [...(porModeloChamadas.get(chave) ?? []), c])
  }
  const todos = new Set([...modelos.keys(), ...porModeloChamadas.keys()])
  return {
    nome: 'Comparativo Modelos',
    linhas: [...todos].map((modelo) => {
      const m = modelos.get(modelo) ?? { julgados: 0, mantidas: 0, divergencias: 0, propostas: 0, validacaoFalhou: 0, confiancaBaixa: 0 }
      const cs = (porModeloChamadas.get(modelo) ?? []).filter((c) => c.status !== 'PULADA')
      const ok = cs.filter((c) => c.status === 'OK' || c.status === 'PARCIAL')
      const tempoMedio = ok.length ? Math.round(ok.reduce((s, c) => s + c.duracaoMs, 0) / ok.length / 100) / 10 : 0
      return {
        'Modelo': modelo,
        'Chamadas': cs.length,
        'Chamadas com falha': cs.filter((c) => c.status === 'FALHA').length,
        'Pares julgados': m.julgados,
        'Concorda (mantém)': m.mantidas,
        'Diverge (propõe outro)': m.divergencias,
        'Proposta inicial': m.propostas,
        'Validação falhou': m.validacaoFalhou,
        'Confiança baixa': m.confiancaBaixa,
        'Tempo médio por chamada (s)': tempoMedio,
        'Tokens de entrada': cs.reduce((s, c) => s + (c.tokensEntrada ?? 0), 0),
        'Tokens de saída': cs.reduce((s, c) => s + (c.tokensSaida ?? 0), 0),
      }
    }),
  }
}

export function abaChamadas(chamadas: RegistroChamada[]): Planilha {
  return {
    nome: 'Chamadas IA',
    linhas: chamadas.map((c) => ({
      'Lote': c.lote,
      'Vaga': c.vaga,
      'Provedor': c.provedor,
      'Modelo': c.modelo,
      'Início': formatarData(c.inicio),
      'Duração (s)': Math.round(c.duracaoMs / 100) / 10,
      'Status': c.status,
      'Pares enviados': c.paresEnviados,
      'Pares válidos': c.paresValidos,
      'Tokens de entrada': c.tokensEntrada ?? '',
      'Tokens de saída': c.tokensSaida ?? '',
      'Mensagem': c.mensagem ?? '',
    })),
  }
}

/** Todas as abas do trabalho de revisão. */
export function montarPlanilhasRevisao(
  linhas: LinhaRevisao[],
  chamadas: RegistroChamada[],
  meta: { cnpjRaiz: string | null; documentos: number; itens: number; versaoPrompt: string; paresPorLote: number },
): Planilha[] {
  const julgados = linhas.filter((l) => l.resultado).length
  return [
    abaRevisao(linhas),
    abaComparativo(linhas, chamadas),
    abaChamadas(chamadas),
    abaSobre('Revisão de CST/cClassTrib por IA · Extrator XML RTC', [
      ['CNPJ raiz analisado', meta.cnpjRaiz ?? 'não identificado'],
      ['Documentos', meta.documentos],
      ['Itens', meta.itens],
      ['Pares únicos (CFOP + NCM + CST + cClassTrib)', linhas.length],
      ['Pares julgados', julgados],
      ['Pares sem julgamento', linhas.length - julgados],
      ['Pares por chamada', meta.paresPorLote],
      ['Prompt', meta.versaoPrompt],
      ['Matriz de decisão', 'Grupamentos-CFOP, autoria do Prof. Camargo'],
      ['Aviso', DISCLAIMER],
    ]),
  ]
}
