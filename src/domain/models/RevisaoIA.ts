/**
 * @file RevisaoIA.ts
 * @description Tipos do módulo 6: pares únicos, configuração dos modelos, resultado
 * do julgamento da IA e registro das chamadas.
 */

import type { EnquadramentoCfop, GrupoMestre } from './Matriz'

// ---------------------------------------------------------------------------
// PARES ÚNICOS (entrada da IA)
// ---------------------------------------------------------------------------

/** Situações que a aplicação sinaliza à IA e à planilha final. */
export type Sinalizacao = 'duplicidade_matriz' | 'cfop_fora_matriz' | 'sem_classificacao'

export type DirecaoPar = 'ENTRADA' | 'SAIDA' | 'INDEFINIDA'

/** Combinação única CFOP + NCM + CST + cClassTrib, base do julgamento. */
export interface ParUnico {
  /** Identificador curto e estável dentro do lote (P001, P002...). */
  id: string
  cfop: string
  ncm: string
  cstAtual: string
  cClassTribAtual: string
  descricoesExemplo: string[]
  tiposDocumento: string[]
  direcoes: DirecaoPar[]
  qtdItens: number
  valorTotal: number
  /** Enquadramentos que a matriz humana atribui ao CFOP (0, 1 ou mais). */
  enquadramentos: EnquadramentoCfop[]
  sinalizacoes: Sinalizacao[]
}

// ---------------------------------------------------------------------------
// PROVEDORES E MODELOS
// ---------------------------------------------------------------------------

export type IdProvedor = 'openrouter' | 'gemini'

export const NOMES_PROVEDORES: Record<IdProvedor, string> = {
  openrouter: 'OpenRouter',
  gemini: 'Google Gemini',
}

/** Um modelo disponível para escolha (vindo da listagem do provedor). */
export interface ModeloDisponivel {
  provedor: IdProvedor
  id: string
  nome: string
  contexto?: number
  gratuito: boolean
}

/** Uma vaga de modelo configurada pelo usuário (5 do OpenRouter + 1 Gemini de fallback). */
export interface VagaModelo {
  /** Posição na fila: 1 a 5 = OpenRouter (rodízio); 6 = Gemini (fallback). */
  posicao: number
  provedor: IdProvedor
  modelo: string
  /** Limite de requisições por minuto desta vaga. */
  rpm: number
  ativo: boolean
}

/** Parâmetros de execução da revisão, ajustáveis na tela. */
export interface ParametrosExecucao {
  paresPorLote: number
  /** Teto diário de requisições aos modelos :free do OpenRouter (cota da conta, compartilhada). */
  cotaDiariaOpenRouter: number
  /** Teto diário de requisições ao Gemini. */
  cotaDiariaGemini: number
  tempoLimiteSegundos: number
  temperatura: number
  /** 'direto': o navegador chama o provedor. 'servidor': passa pela rota /api/ia da Vercel. */
  modoConexao: 'direto' | 'servidor'
}

export const PARAMETROS_PADRAO: ParametrosExecucao = {
  paresPorLote: 10,
  cotaDiariaOpenRouter: 50,
  cotaDiariaGemini: 200,
  tempoLimiteSegundos: 180,
  temperatura: 0.1,
  modoConexao: 'direto',
}

// ---------------------------------------------------------------------------
// RESULTADO DA IA
// ---------------------------------------------------------------------------

export type Parecer = 'CONCORDA' | 'DIVERGE' | 'PROPOSTA_INICIAL'
export type Confianca = 'ALTA' | 'MEDIA' | 'BAIXA'

/** Resultado de um par, exatamente nos campos que o Prompt Mestre exige. */
export interface ResultadoIA {
  id: string
  analise_juridica: string
  analise_contabil: string
  analise_fiscal_rtc: string
  analise_operacional: string
  matriz_passo_a_passo: string
  grupo_ia: GrupoMestre
  concorda_com_grupo_humano: boolean
  parecer: Parecer
  cst_proposto: string
  cclasstrib_proposto: string
  justificativa: string
  fundamentacao_legal: string
  red_flags: string
  duvidas: string
  documentacao_recomendada: string
  confianca: Confianca
  revisao_humana_obrigatoria: boolean
}

/** Resultado da validação semântica feita pelo código sobre a proposta da IA. */
export interface ValidacaoSemantica {
  ok: boolean
  /** Descrição oficial do cClassTrib proposto (quando existe na tabela). */
  descricaoCClassTrib?: string
  problemas: string[]
}

/** Linha final da planilha de revisão: par + julgamento + rastreabilidade. */
export interface LinhaRevisao {
  par: ParUnico
  resultado?: ResultadoIA
  validacao?: ValidacaoSemantica
  /** Modelo que efetivamente julgou a linha (provedor::modelo). */
  modeloJulgador?: string
  provedor?: IdProvedor
  /** Posições das vagas tentadas, na ordem (mostra o fallback em ação). */
  tentativas: string[]
  julgadoEm?: string
  /** Revisão humana obrigatória final (regra do código OU indicação da IA). */
  revisaoHumanaObrigatoria: boolean
  /** Mensagem quando nenhum modelo conseguiu julgar o par. */
  erro?: string
}

/** Registro de cada chamada feita a um modelo (aba "Chamadas IA"). */
export interface RegistroChamada {
  lote: number
  vaga: number
  provedor: IdProvedor
  modelo: string
  inicio: string
  duracaoMs: number
  status: 'OK' | 'PARCIAL' | 'FALHA' | 'PULADA'
  paresEnviados: number
  paresValidos: number
  tokensEntrada?: number
  tokensSaida?: number
  mensagem?: string
}
