/**
 * @file Matriz.ts
 * @description Tipos da base de conhecimento usada no módulo 6 (IA):
 *   - a matriz humana (Grupamentos-CFOP, autoria do Prof. Camargo);
 *   - a tabela oficial de classificação tributária (CST × cClassTrib).
 */

/** Os 5 Grupos Mestres RTC da matriz de decisão. */
export type GrupoMestre = 'I' | 'II' | 'III' | 'IV' | 'V'

export const GRUPOS_MESTRES: readonly GrupoMestre[] = ['I', 'II', 'III', 'IV', 'V'] as const

/** Um subgrupo da matriz humana ("Grupo=>**Venda de Produção**"). */
export interface SubgrupoMatriz {
  grupo: GrupoMestre
  /** Título do Grupo Mestre, ex.: "Prestações/Vendas Onerosas (Fato Gerador: SIM)". */
  tituloGrupo: string
  subgrupo: string
  cfops: string[]
  essencia: string
  argumentacao: string
}

/** Enquadramento de um CFOP na matriz (pode haver mais de um: limitação proposital). */
export interface EnquadramentoCfop {
  grupo: GrupoMestre
  subgrupo: string
  essencia: string
}

/** Matriz já interpretada, pronta para consulta por CFOP. */
export interface MatrizHumana {
  subgrupos: SubgrupoMatriz[]
  porCfop: Map<string, EnquadramentoCfop[]>
}

/** Um registro da tabela oficial (chaves exatamente como no JSON oficial). */
export type RegistroClassificacao = Record<string, string>

/** Tabela oficial indexada por cClassTrib. */
export interface TabelaClassificacao {
  registros: RegistroClassificacao[]
  porCClassTrib: Map<string, RegistroClassificacao>
}

/** Nomes das colunas do JSON oficial usadas pelo código. */
export const COLUNA_CST = 'Código da Situação Tributária'
export const COLUNA_CCLASSTRIB = 'Código da Classificação Tributária'
export const COLUNA_DESCRICAO_CCLASSTRIB = 'Descrição do Código da Classificação Tributária'

// ---------------------------------------------------------------------------
// TABELA OFICIAL DE CFOP (decisão D29)
// ---------------------------------------------------------------------------

/**
 * Um CFOP da tabela oficial (fonte padrão: planilha publicada no portal do Siscomex,
 * que reproduz o Convênio s/nº de 1970 / Ajuste SINIEF; o CONFAZ é o detentor oficial).
 */
export interface RegistroCfop {
  cfop: string
  descricao: string
  grupo: string
  inicioVigencia: string
}

export interface TabelaCfop {
  registros: RegistroCfop[]
  porCfop: Map<string, RegistroCfop>
}
