/**
 * @file LeitorMatriz.ts
 * @description Interpreta a base de conhecimento do módulo 6:
 *   - Grupamentos-CFOP.md (matriz humana do Prof. Camargo) → consulta CFOP → grupo;
 *   - classificacao_tributaria.json (tabela oficial) → validação de CST/cClassTrib;
 *   - Prompt-Mestre-RTC.md → texto do prompt de sistema.
 *
 * NOTA DIDÁTICA
 *   O Prompt Mestre pede à IA que leia os arquivos "por inteiro, sem REGEX". Isso vale para
 *   a IA, que recebe os arquivos completos. Aqui, o CÓDIGO usa expressões regulares só
 *   para localizar a estrutura (títulos, subgrupos e listas de CFOP) e montar a consulta
 *   determinística que representa o julgamento humano. Nenhum conteúdo é resumido.
 *
 * FORMATO ESPERADO DO .md (o mesmo do arquivo do professor)
 *   **I. Aquisições Onerosas (Fato Gerador: SIM):**          ← Grupo Mestre
 *   Grupo=> **Bens para Industrialização**:                   ← subgrupo
 *   CFOP´s: {1101, 2101, ...}                                 ← lista de CFOPs
 *   Essência=> ...                                            ← essência
 *   Argumentação Técnica (LC 214) => ...                      ← fundamentação
 */

import {
  COLUNA_CCLASSTRIB,
  type EnquadramentoCfop,
  type GrupoMestre,
  type MatrizHumana,
  type RegistroClassificacao,
  type SubgrupoMatriz,
  type TabelaClassificacao,
} from '@/domain/models/Matriz'

const RE_GRUPO_MESTRE = /^\s*\*\*\s*(I|II|III|IV|V)\.\s*(.+?)\s*:?\s*\*\*\s*:?\s*$/
const RE_SUBGRUPO = /Grupo\s*=>\s*\*\*\s*(.+?)\s*:?\s*\*\*/
const RE_CFOPS = /CFOP\s*[´'`]?\s*s\s*:\s*\{([^}]*)\}/i
const RE_ESSENCIA = /^\s*Ess[eê]ncia\s*=>\s*(.+)$/i
const RE_ARGUMENTACAO = /^\s*Argumenta[cç][aã]o\s+T[eé]cnica[^=]*=>\s*(.+)$/i

/** Lê o Grupamentos-CFOP.md e devolve a matriz indexada por CFOP. */
export function lerMatrizHumana(markdown: string): MatrizHumana {
  const subgrupos: SubgrupoMatriz[] = []
  let grupoAtual: { grupo: GrupoMestre; titulo: string } | null = null
  let atual: SubgrupoMatriz | null = null

  for (const linha of markdown.split(/\r?\n/)) {
    const mestre = RE_GRUPO_MESTRE.exec(linha)
    if (mestre) {
      grupoAtual = { grupo: mestre[1] as GrupoMestre, titulo: (mestre[2] ?? '').replace(/\*+/g, '').trim() }
      atual = null
      continue
    }
    if (!grupoAtual) continue

    const sub = RE_SUBGRUPO.exec(linha)
    if (sub) {
      atual = {
        grupo: grupoAtual.grupo,
        tituloGrupo: grupoAtual.titulo,
        subgrupo: (sub[1] ?? '').trim(),
        cfops: [],
        essencia: '',
        argumentacao: '',
      }
      subgrupos.push(atual)
      continue
    }
    if (!atual) continue

    const cfops = RE_CFOPS.exec(linha)
    if (cfops) {
      // Só códigos de 4 dígitos; anotações como "3127 (Drawback)" são toleradas.
      atual.cfops = [...new Set((cfops[1] ?? '').match(/\b\d{4}\b/g) ?? [])]
      continue
    }
    const essencia = RE_ESSENCIA.exec(linha)
    if (essencia) { atual.essencia = (essencia[1] ?? '').trim(); continue }
    const arg = RE_ARGUMENTACAO.exec(linha)
    if (arg) atual.argumentacao = (arg[1] ?? '').trim()
  }

  const porCfop = new Map<string, EnquadramentoCfop[]>()
  for (const s of subgrupos) {
    for (const cfop of s.cfops) {
      const lista = porCfop.get(cfop) ?? []
      if (!lista.some((e) => e.grupo === s.grupo && e.subgrupo === s.subgrupo)) {
        lista.push({ grupo: s.grupo, subgrupo: s.subgrupo, essencia: s.essencia })
      }
      porCfop.set(cfop, lista)
    }
  }
  return { subgrupos, porCfop }
}

/** CFOPs que aparecem em mais de um Grupo Mestre (limitação proposital da matriz). */
export function cfopsEmMaisDeUmGrupo(matriz: MatrizHumana): string[] {
  return [...matriz.porCfop.entries()]
    .filter(([, lista]) => new Set(lista.map((e) => e.grupo)).size > 1)
    .map(([cfop]) => cfop)
    .sort()
}

/** Lê o JSON oficial de classificação tributária. Lança erro com mensagem clara se inválido. */
export function lerTabelaClassificacao(json: string): TabelaClassificacao {
  let dados: unknown
  try {
    dados = JSON.parse(json)
  } catch {
    throw new Error('O arquivo de classificação tributária não é um JSON válido.')
  }
  if (!Array.isArray(dados) || dados.length === 0) {
    throw new Error('O arquivo de classificação tributária deve ser uma lista de registros.')
  }
  const registros = dados.filter((r): r is RegistroClassificacao => typeof r === 'object' && r !== null)
  const porCClassTrib = new Map<string, RegistroClassificacao>()
  for (const r of registros) {
    const codigo = String(r[COLUNA_CCLASSTRIB] ?? '').trim()
    if (codigo) porCClassTrib.set(codigo, r)
  }
  if (porCClassTrib.size === 0) {
    throw new Error(`Nenhum registro com a coluna "${COLUNA_CCLASSTRIB}" foi encontrado.`)
  }
  return { registros, porCClassTrib }
}

export const MARCADOR_INICIO_PROMPT = '=== INÍCIO DO PROMPT DE SISTEMA ==='
export const MARCADOR_FIM_PROMPT = '=== FIM DO PROMPT DE SISTEMA ==='
export const MARCADOR_GRUPAMENTOS = '{{GRUPAMENTOS_CFOP}}'
export const MARCADOR_CLASSIFICACAO = '{{CLASSIFICACAO_TRIBUTARIA}}'

/** Localiza um marcador escrito sozinho em uma linha (menções no meio do texto são ignoradas). */
function posicaoDaLinha(texto: string, marcador: string): { inicio: number; fim: number } | null {
  const escapado = marcador.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp(`^\\s*${escapado}\\s*$`, 'm').exec(texto)
  return m ? { inicio: m.index, fim: m.index + m[0].length } : null
}

/**
 * Extrai o modelo do prompt de sistema do arquivo Prompt-Mestre-RTC.md: o trecho entre as
 * linhas "=== INÍCIO DO PROMPT DE SISTEMA ===" e "=== FIM DO PROMPT DE SISTEMA ===".
 * Se os marcadores não existirem, o arquivo inteiro é usado como prompt.
 */
export function extrairModeloPrompt(markdown: string): string {
  const inicio = posicaoDaLinha(markdown, MARCADOR_INICIO_PROMPT)
  const fim = posicaoDaLinha(markdown, MARCADOR_FIM_PROMPT)
  if (!inicio || !fim || fim.inicio <= inicio.fim) return markdown.trim()
  return markdown.slice(inicio.fim, fim.inicio).trim()
}
