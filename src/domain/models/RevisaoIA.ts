/**
 * @file RevisaoIA.ts
 * @description Tipos do módulo 6: pares únicos, configuração dos modelos, resultado
 * do julgamento da IA e registro das chamadas.
 */

import type { EnquadramentoCfop, GrupoMestre } from './Matriz'
import type { TaxRegime } from './FiscalDocument'

// ---------------------------------------------------------------------------
// PARES ÚNICOS (entrada da IA)
// ---------------------------------------------------------------------------

/**
 * Situações que a aplicação sinaliza à IA e à planilha final.
 *   - duplicidade_matriz   → CFOP em mais de um Grupo Mestre (limitação proposital, D10);
 *   - cfop_fora_matriz     → CFOP ausente da matriz, ou par sem CFOP (NFS-e) (D09);
 *   - cfop_inexistente     → CFOP que não consta na tabela oficial (D29);
 *   - sem_classificacao    → item sem CST e sem cClassTrib (a IA propõe do zero, D08);
 *   - reducao_literalidade → cClassTrib de redução de alíquota: a elegibilidade depende da
 *                            análise literal do produto pelo profissional (D22).
 */
export type Sinalizacao =
  | 'duplicidade_matriz'
  | 'cfop_fora_matriz'
  | 'cfop_inexistente'
  | 'sem_classificacao'
  | 'reducao_literalidade'

/**
 * Combinação única CFOP + CST + cClassTrib, base do julgamento (decisão D21).
 *
 * O NCM NÃO faz parte da chave nem é enviado à IA (D22). Os NCMs do par são guardados
 * só para conferência humana na planilha. A direção (entrada/saída) também não entra
 * na análise (D24): o próprio CFOP já carrega o sentido da operação.
 */
export interface ParUnico {
  /** Identificador curto e estável dentro do lote (P001, P002...). */
  id: string
  cfop: string
  /** Descrição oficial do CFOP (tabela oficial), quando existe. */
  descricaoCfop: string
  cstAtual: string
  cClassTribAtual: string
  descricoesExemplo: string[]
  tiposDocumento: string[]
  /** NCMs de maior valor do par (até 5), só para conferência humana. */
  ncms: string[]
  qtdNcms: number
  qtdItens: number
  valorTotal: number
  /** Enquadramentos que a matriz humana atribui ao CFOP (0, 1 ou mais). */
  enquadramentos: EnquadramentoCfop[]
  sinalizacoes: Sinalizacao[]
}

/** Quanto da amostra ficou dentro e fora do escopo da revisão (decisão D23). */
export interface EscopoRevisao {
  regimesNoEscopo: TaxRegime[]
  itensNoEscopo: number
  valorNoEscopo: number
  itensForaDoEscopo: number
  valorForaDoEscopo: number
  /** Documentos, itens e valor por regime do emitente. */
  porRegime: Partial<Record<TaxRegime, { documentos: number; itens: number; valor: number }>>
}

/** Regimes revisados por padrão: Regime Normal, Simples com excesso de sublimite e não identificado. */
export const REGIMES_NO_ESCOPO_PADRAO: TaxRegime[] = ['RPA', 'SIMPLES_EXCESSO', 'UNKNOWN']

export const ROTULO_REGIME: Record<TaxRegime, string> = {
  RPA: 'Regime Normal (CRT 3)',
  SIMPLES_EXCESSO: 'Simples com excesso de sublimite (CRT 2)',
  SIMPLES_NACIONAL: 'Simples Nacional (CRT 1)',
  MEI: 'MEI (CRT 4)',
  UNKNOWN: 'Não identificado',
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
  /** Vagas do OpenRouter trabalhando ao mesmo tempo, cada uma com o seu lote (D25). */
  emParalelo: boolean
  /** Regimes do emitente que entram na revisão (D23). */
  regimesNoEscopo: TaxRegime[]
  /** Modelo Gemini do relatório executivo e o de reserva (D28). */
  modeloResumo: string
  modeloResumoReserva: string
}

export const PARAMETROS_PADRAO: ParametrosExecucao = {
  paresPorLote: 10,
  cotaDiariaOpenRouter: 50,
  cotaDiariaGemini: 200,
  tempoLimiteSegundos: 180,
  temperatura: 0.1,
  modoConexao: 'direto',
  emParalelo: true,
  regimesNoEscopo: REGIMES_NO_ESCOPO_PADRAO,
  modeloResumo: 'gemini-2.5-pro',
  modeloResumoReserva: 'gemini-2.5-flash',
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
