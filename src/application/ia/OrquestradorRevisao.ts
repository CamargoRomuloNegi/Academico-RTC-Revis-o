/**
 * @file OrquestradorRevisao.ts
 * @description Coração do módulo 6: distribui os pares únicos entre os modelos, respeita
 * as cotas, aplica o fallback e monta as linhas da planilha de revisão.
 *
 * ESTRATÉGIA (decisões D11 a D13)
 *   - Os pares são divididos em lotes (padrão: 10 por chamada).
 *   - RODÍZIO: o lote 1 vai para a vaga 1, o lote 2 para a vaga 2, e assim até a vaga 5,
 *     voltando à 1. Assim a planilha mostra os 5 modelos do OpenRouter lado a lado.
 *   - FALLBACK: se a vaga falhar (erro, limite, cota esgotada ou resposta inválida), os
 *     pares pendentes do lote seguem para as outras vagas do OpenRouter e, por fim, para a
 *     vaga 6 (Gemini).
 *   - Cada linha registra o modelo que efetivamente julgou e as vagas tentadas.
 *
 * O orquestrador não conhece HTTP: recebe a função de chamada por injeção de dependência,
 * o que permite testá-lo com um provedor simulado (tests/ia/OrquestradorRevisao.test.ts).
 */

import type { TabelaClassificacao } from '@/domain/models/Matriz'
import type {
  IdProvedor,
  LinhaRevisao,
  ParUnico,
  ParametrosExecucao,
  RegistroChamada,
  VagaModelo,
} from '@/domain/models/RevisaoIA'
import type { MensagemChat, RespostaChat } from '@/infrastructure/ia/ClienteIA'
import { ErroProvedor } from '@/infrastructure/ia/ClienteIA'
import { dividirEmLotes } from '@/application/services/AglutinacaoService'
import { ControleDeCota, relogioPadrao, type Relogio } from './ControleDeCota'
import { montarMensagens } from './MontadorPrompt'
import { validarResposta, validarSemantica } from './ValidadorResposta'

/** Rótulo legível de uma vaga, usado na planilha. */
export function rotuloVaga(vaga: VagaModelo): string {
  return `Vaga ${vaga.posicao} · ${vaga.provedor}::${vaga.modelo}`
}

export interface ProgressoRevisao {
  loteAtual: number
  totalLotes: number
  paresJulgados: number
  totalPares: number
  mensagem: string
}

export interface DependenciasRevisao {
  chamar: (vaga: VagaModelo, mensagens: MensagemChat[], parametros: ParametrosExecucao, signal?: AbortSignal) => Promise<RespostaChat>
  relogio?: Relogio
}

export interface EntradaRevisao {
  pares: ParUnico[]
  vagas: VagaModelo[]
  parametros: ParametrosExecucao
  promptSistema: string
  tabela: TabelaClassificacao
  signal?: AbortSignal
  aoProgredir?: (p: ProgressoRevisao) => void
  /** Linha concluída (para a tela mostrar o resultado em tempo real). */
  aoConcluirLinha?: (linha: LinhaRevisao) => void
  /** Uso de cota já consumido em execuções anteriores da mesma sessão. */
  controle?: ControleDeCota
}

export interface ResultadoRevisao {
  linhas: LinhaRevisao[]
  chamadas: RegistroChamada[]
  interrompida: boolean
}

/** Regra final de revisão humana obrigatória (código + IA). */
function exigeRevisaoHumana(linha: LinhaRevisao): boolean {
  const s = linha.par.sinalizacoes
  if (s.includes('duplicidade_matriz') || s.includes('cfop_fora_matriz')) return true
  if (!linha.resultado) return true
  if (linha.validacao && !linha.validacao.ok) return true
  return linha.resultado.revisao_humana_obrigatoria || linha.resultado.confianca === 'BAIXA'
}

/** Monta a ordem de vagas para um lote: a vaga do rodízio, as demais do OpenRouter e o Gemini. */
export function cadeiaDoLote(indiceLote: number, vagas: VagaModelo[]): VagaModelo[] {
  const ativas = vagas.filter((v) => v.ativo && v.modelo.trim())
  const rodizio = ativas.filter((v) => v.provedor === 'openrouter').sort((a, b) => a.posicao - b.posicao)
  const reservas = ativas.filter((v) => v.provedor !== 'openrouter').sort((a, b) => a.posicao - b.posicao)
  if (rodizio.length === 0) return reservas
  const inicio = indiceLote % rodizio.length
  return [...rodizio.slice(inicio), ...rodizio.slice(0, inicio), ...reservas]
}

export async function executarRevisao(entrada: EntradaRevisao, deps: DependenciasRevisao): Promise<ResultadoRevisao> {
  const { pares, vagas, parametros, promptSistema, tabela, signal } = entrada
  const relogio = deps.relogio ?? relogioPadrao
  const controle = entrada.controle ?? new ControleDeCota(
    { openrouter: parametros.cotaDiariaOpenRouter, gemini: parametros.cotaDiariaGemini },
    relogio,
  )
  const lotes = dividirEmLotes(pares, parametros.paresPorLote)
  const linhas = new Map<string, LinhaRevisao>(pares.map((p) => [p.id, { par: p, tentativas: [], revisaoHumanaObrigatoria: true }]))
  const chamadas: RegistroChamada[] = []
  let julgados = 0

  const progresso = (loteAtual: number, mensagem: string) =>
    entrada.aoProgredir?.({ loteAtual, totalLotes: lotes.length, paresJulgados: julgados, totalPares: pares.length, mensagem })

  for (let l = 0; l < lotes.length; l++) {
    if (signal?.aborted) break
    let pendentes = [...(lotes[l] as ParUnico[])]
    const motivos = new Map<string, string>()

    for (const vaga of cadeiaDoLote(l, vagas)) {
      if (pendentes.length === 0 || signal?.aborted) break
      const rotulo = rotuloVaga(vaga)
      const provedor: IdProvedor = vaga.provedor
      for (const p of pendentes) linhas.get(p.id)?.tentativas.push(`Vaga ${vaga.posicao}`)

      if (controle.restanteHoje(provedor) <= 0) {
        chamadas.push({ lote: l + 1, vaga: vaga.posicao, provedor, modelo: vaga.modelo, inicio: new Date(relogio.agora()).toISOString(), duracaoMs: 0, status: 'PULADA', paresEnviados: pendentes.length, paresValidos: 0, mensagem: 'Cota diária da sessão esgotada para este provedor.' })
        continue
      }

      progresso(l + 1, `Lote ${l + 1}/${lotes.length}: aguardando a vez de ${rotulo}`)
      await controle.aguardarVez(`vaga-${vaga.posicao}`, vaga.rpm, signal)
      if (signal?.aborted) break
      controle.registrar(`vaga-${vaga.posicao}`, provedor)

      progresso(l + 1, `Lote ${l + 1}/${lotes.length}: ${pendentes.length} pares em julgamento por ${rotulo}`)
      const inicio = relogio.agora()
      const registro: RegistroChamada = { lote: l + 1, vaga: vaga.posicao, provedor, modelo: vaga.modelo, inicio: new Date(inicio).toISOString(), duracaoMs: 0, status: 'FALHA', paresEnviados: pendentes.length, paresValidos: 0 }
      try {
        const resposta = await deps.chamar(vaga, montarMensagens(promptSistema, pendentes), parametros, signal)
        registro.duracaoMs = relogio.agora() - inicio
        registro.tokensEntrada = resposta.tokensEntrada
        registro.tokensSaida = resposta.tokensSaida

        const { validos, invalidos } = validarResposta(resposta.texto, pendentes.map((p) => p.id))
        const agora = new Date(relogio.agora()).toISOString()
        for (const resultado of validos) {
          const linha = linhas.get(resultado.id) as LinhaRevisao
          linha.resultado = resultado
          linha.validacao = validarSemantica(resultado, tabela)
          linha.modeloJulgador = `${vaga.provedor}::${vaga.modelo}`
          linha.provedor = vaga.provedor
          linha.julgadoEm = agora
          linha.erro = undefined
          linha.revisaoHumanaObrigatoria = exigeRevisaoHumana(linha)
          julgados++
          entrada.aoConcluirLinha?.(linha)
        }
        for (const [id, motivo] of invalidos) motivos.set(id, `${rotulo}: ${motivo}`)
        pendentes = pendentes.filter((p) => invalidos.has(p.id))
        registro.paresValidos = validos.length
        registro.status = invalidos.size === 0 ? 'OK' : validos.length > 0 ? 'PARCIAL' : 'FALHA'
        if (invalidos.size > 0) registro.mensagem = `${invalidos.size} par(es) inválido(s); seguem para o próximo modelo.${resposta.motivoFim === 'length' ? ' A resposta foi cortada por limite de tamanho: reduza os pares por lote.' : ''}`
      } catch (erro) {
        registro.duracaoMs = relogio.agora() - inicio
        const mensagem = erro instanceof Error ? erro.message : String(erro)
        registro.mensagem = mensagem
        if (erro instanceof ErroProvedor && erro.codigo === 'cancelado') {
          chamadas.push(registro)
          break
        }
        for (const p of pendentes) motivos.set(p.id, `${rotulo}: ${mensagem}`)
      }
      chamadas.push(registro)
    }

    for (const p of pendentes) {
      const linha = linhas.get(p.id) as LinhaRevisao
      linha.erro = signal?.aborted
        ? 'Execução interrompida pelo usuário antes do julgamento.'
        : `Nenhum modelo conseguiu julgar o par. Último motivo: ${motivos.get(p.id) ?? 'desconhecido'}`
      linha.revisaoHumanaObrigatoria = true
      entrada.aoConcluirLinha?.(linha)
    }
    progresso(l + 1, `Lote ${l + 1}/${lotes.length} concluído.`)
  }

  // Pares de lotes não iniciados (interrupção)
  for (const linha of linhas.values()) {
    if (!linha.resultado && !linha.erro) linha.erro = 'Execução interrompida pelo usuário antes do julgamento.'
  }

  return { linhas: [...linhas.values()], chamadas, interrompida: Boolean(signal?.aborted) }
}
