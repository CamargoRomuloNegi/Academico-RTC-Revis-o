/**
 * @file ServicoRevisao.ts
 * @description Liga as peças do módulo 6 para as telas: carrega a base de conhecimento,
 * mantém o controle de cota da sessão e executa o orquestrador com o cliente HTTP real.
 */

import type { IdProvedor, ParametrosExecucao } from '@/domain/models/RevisaoIA'
import { enviarChat } from '@/infrastructure/ia/ClienteIA'
import { ControleDeCota } from './ControleDeCota'
import { executarRevisao, type EntradaRevisao, type ResultadoRevisao } from './OrquestradorRevisao'
import { montarMensagensRelatorio, type IndicadoresResumo } from '@/application/resumo/ResumoExecutivo'

/** Caminhos públicos dos arquivos padrão (pasta public/conhecimento). */
export const ARQUIVOS_CONHECIMENTO = {
  promptMestre: '/conhecimento/Prompt-Mestre-RTC.md',
  grupamentos: '/conhecimento/Grupamentos-CFOP.md',
  classificacaoJson: '/conhecimento/classificacao_tributaria.json',
  cfopJson: '/conhecimento/cfop_oficial.json',
} as const

/** Baixa os quatro arquivos padrão da base de conhecimento. */
export async function carregarConhecimentoPadrao(): Promise<{ promptMestre: string; grupamentos: string; classificacaoJson: string; cfopJson: string }> {
  const ler = async (url: string) => {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) throw new Error(`Não foi possível carregar ${url} (HTTP ${r.status}).`)
    return r.text()
  }
  const [promptMestre, grupamentos, classificacaoJson, cfopJson] = await Promise.all([
    ler(ARQUIVOS_CONHECIMENTO.promptMestre),
    ler(ARQUIVOS_CONHECIMENTO.grupamentos),
    ler(ARQUIVOS_CONHECIMENTO.classificacaoJson),
    ler(ARQUIVOS_CONHECIMENTO.cfopJson),
  ])
  return { promptMestre, grupamentos, classificacaoJson, cfopJson }
}

/**
 * Controle de cota único na sessão: a contagem diária continua valendo entre uma execução
 * e outra (ex.: ao reprocessar os pares que falharam).
 */
let controleSessao: ControleDeCota | null = null
let cotasConfiguradas = ''

function controleDaSessao(p: ParametrosExecucao): ControleDeCota {
  const assinatura = `${p.cotaDiariaOpenRouter}/${p.cotaDiariaGemini}`
  if (!controleSessao || assinatura !== cotasConfiguradas) {
    const anterior = controleSessao
    controleSessao = new ControleDeCota({ openrouter: p.cotaDiariaOpenRouter, gemini: p.cotaDiariaGemini })
    // Ao mudar os tetos, o que já foi usado na sessão continua contando.
    if (anterior) {
      for (const provedor of ['openrouter', 'gemini'] as IdProvedor[]) {
        for (let i = 0; i < anterior.usadasHoje(provedor); i++) controleSessao.registrar(`historico-${provedor}`, provedor)
      }
    }
    cotasConfiguradas = assinatura
  }
  return controleSessao
}

export function usoDaSessao(p: ParametrosExecucao): Record<IdProvedor, number> {
  const c = controleDaSessao(p)
  return { openrouter: c.usadasHoje('openrouter'), gemini: c.usadasHoje('gemini') }
}

/** Executa a revisão com o cliente HTTP real. */
export function revisar(entrada: Omit<EntradaRevisao, 'controle'>): Promise<ResultadoRevisao> {
  return executarRevisao(
    { ...entrada, controle: controleDaSessao(entrada.parametros) },
    {
      chamar: (vaga, mensagens, parametros, signal) =>
        enviarChat({
          provedor: vaga.provedor,
          modelo: vaga.modelo,
          mensagens,
          temperatura: parametros.temperatura,
          timeoutMs: parametros.tempoLimiteSegundos * 1000,
          modo: parametros.modoConexao,
          signal,
        }),
    },
  )
}

/**
 * Gera o relatório executivo com o Gemini (D28): tenta o modelo principal e, se falhar,
 * o de reserva. Conta na cota diária do Gemini da sessão.
 */
export async function gerarRelatorioExecutivo(
  indicadores: IndicadoresResumo,
  p: ParametrosExecucao,
  signal?: AbortSignal,
): Promise<{ texto: string; modelo: string }> {
  const controle = controleDaSessao(p)
  const modelos = [...new Set([p.modeloResumo, p.modeloResumoReserva].filter(Boolean))]
  const falhas: string[] = []
  for (const modelo of modelos) {
    if (!(await controle.reservar('relatorio-gemini', 5, 'gemini', signal))) {
      throw new Error('Cota diária do Gemini nesta sessão esgotada (ajuste em Configurar IA).')
    }
    try {
      const r = await enviarChat({
        provedor: 'gemini',
        modelo,
        mensagens: montarMensagensRelatorio(indicadores),
        temperatura: 0.3,
        timeoutMs: p.tempoLimiteSegundos * 1000,
        modo: p.modoConexao,
        signal,
      })
      return { texto: r.texto.replace(/^```(?:markdown)?\s*|```\s*$/g, '').trim(), modelo: `gemini::${modelo}` }
    } catch (e) {
      falhas.push(`${modelo}: ${e instanceof Error ? e.message : String(e)}`)
      if (signal?.aborted) break
    }
  }
  throw new Error(`Não foi possível gerar o relatório. ${falhas.join(' | ')}`)
}
