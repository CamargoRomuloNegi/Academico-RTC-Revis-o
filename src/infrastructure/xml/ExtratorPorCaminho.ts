/**
 * @file ExtratorPorCaminho.ts
 * @description Extração genérica de valores de um XML fiscal por caminho
 * (ver a convenção em src/domain/models/Campos.ts).
 *
 * POR QUE EXISTE
 *   Os parsers herdados do comercial-assistida-xml mapeiam um conjunto fixo de campos,
 *   que forma o padrão Documentos + Itens Analítico. Este extrator complementa os parsers:
 *   ele lê QUALQUER campo escolhido pelo usuário, inclusive campos descobertos no XSD,
 *   sem exigir uma nova versão do código.
 *
 * DECISÕES
 *   - O conteúdo é lido sempre como texto (parseTagValue: false), o que preserva os zeros
 *     à esquerda de CNPJ, CEP e chave de acesso.
 *   - Os prefixos de namespace são removidos, porque o XSD e o XML podem usar prefixos
 *     diferentes.
 *   - Quando um caminho de documento encontra elementos repetidos (ex.: várias duplicatas),
 *     os valores são unidos com " | ", e a célula mostra todos.
 */

import { XMLParser } from 'fast-xml-parser'
import type { CampoCatalogo, TipoDocumento } from '@/domain/models/Campos'

type No = Record<string, unknown>

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
})

/** Separador usado quando um campo de documento tem várias ocorrências. */
export const SEPARADOR_MULTIPLOS = ' | '

/** Elemento repetitivo de item, por tipo de documento (só NF-e e NFC-e têm itens). */
const NO_ITEM: Partial<Record<TipoDocumento, string>> = { NFE: 'det', NFCE: 'det' }

/** Documento já interpretado, pronto para várias extrações sem novo parse. */
export interface DocumentoNavegavel {
  raiz: string
  no: No
}

/**
 * Interpreta o XML e remove o invólucro de protocolo (nfeProc, cteProc...).
 * Retorna null se o XML não puder ser lido.
 */
export function prepararDocumento(xml: string): DocumentoNavegavel | null {
  let parsed: No
  try {
    parsed = parser.parse(xml) as No
  } catch {
    return null
  }
  const chaves = Object.keys(parsed).filter((k) => !k.startsWith('?'))
  const primeira = chaves[0]
  if (!primeira) return null
  let raiz = primeira
  let no = parsed[raiz] as No

  // Invólucros de protocolo: nfeProc > NFe, cteProc > CTe, NFSe (sem invólucro)
  if (/Proc$/i.test(raiz) && no && typeof no === 'object') {
    const interno = Object.keys(no).find((k) => !k.startsWith('@') && /^(NFe|CTe|CTeOS|NFSe)$/.test(k))
    if (interno) {
      raiz = interno
      no = no[interno] as No
    }
  }
  if (!no || typeof no !== 'object') return null
  return { raiz, no }
}

/** Indica se o campo é de item para o tipo de documento informado. */
export function ehCampoDeItem(tipo: TipoDocumento, caminho: string): boolean {
  const noItem = NO_ITEM[tipo]
  return noItem !== undefined && caminho.split('/').includes(noItem)
}

/** Converte um nó qualquer em texto (elemento simples, com atributos ou atributo). */
function paraTexto(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null
  if (typeof valor === 'string') return valor
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor)
  if (typeof valor === 'object' && '#text' in (valor as No)) {
    return paraTexto((valor as No)['#text'])
  }
  return null // elemento composto: não há valor textual direto
}

/** Percorre os segmentos a partir de um nó e devolve todos os nós alcançados. */
function percorrer(no: unknown, segmentos: string[]): unknown[] {
  if (segmentos.length === 0) return Array.isArray(no) ? no : [no]
  if (Array.isArray(no)) return no.flatMap((n) => percorrer(n, segmentos))
  if (!no || typeof no !== 'object') return []
  const [seg, ...resto] = segmentos as [string, ...string[]]
  const filho = (no as No)[seg]
  if (filho === undefined) return []
  return percorrer(filho, resto)
}

function textos(nos: unknown[]): string[] {
  return nos.map(paraTexto).filter((v): v is string => v !== null && v !== '')
}

/**
 * Valor de um campo de DOCUMENTO. Retorna '' quando o campo não existe no XML.
 * O primeiro segmento do caminho deve ser a raiz do documento (NFe, CTe, NFSe).
 */
export function valorDocumento(doc: DocumentoNavegavel, caminho: string): string {
  const [raiz, ...resto] = caminho.split('/')
  if (raiz !== doc.raiz) return ''
  return textos(percorrer(doc.no, resto)).join(SEPARADOR_MULTIPLOS)
}

/**
 * Valores de um campo de ITEM, um por item, na ordem dos itens no XML.
 * O caminho é dividido no nó repetitivo (det): a parte anterior localiza os itens
 * e a posterior é lida dentro de cada um.
 */
export function valoresPorItem(doc: DocumentoNavegavel, tipo: TipoDocumento, caminho: string): string[] {
  const noItem = NO_ITEM[tipo]
  const segmentos = caminho.split('/')
  const pos = noItem ? segmentos.indexOf(noItem) : -1
  if (pos < 0 || segmentos[0] !== doc.raiz) return []
  const itens = percorrer(doc.no, segmentos.slice(1, pos + 1))
  const resto = segmentos.slice(pos + 1)
  return itens.map((item) => textos(percorrer(item, resto)).join(SEPARADOR_MULTIPLOS))
}

/** Valores extraídos de um documento para os campos selecionados. */
export interface ExtracaoCampos {
  /** Valores de documento: id do campo → valor. */
  documento: Record<string, string>
  /** Valores de item: um registro por item (id do campo → valor). */
  itens: Record<string, string>[]
}

/**
 * Extrai, de um XML, todos os campos selecionados que se aplicam ao seu tipo.
 * Campos de outros tipos de documento são ignorados (a célula fica vazia).
 */
export function extrairCampos(
  xml: string,
  tipo: TipoDocumento,
  campos: CampoCatalogo[],
  quantidadeItens: number,
): ExtracaoCampos {
  const resultado: ExtracaoCampos = {
    documento: {},
    itens: Array.from({ length: quantidadeItens }, () => ({})),
  }
  const aplicaveis = campos.filter((c) => c.tipo === tipo)
  if (aplicaveis.length === 0) return resultado

  const doc = prepararDocumento(xml)
  if (!doc) return resultado

  for (const campo of aplicaveis) {
    if (ehCampoDeItem(tipo, campo.caminho)) {
      const valores = valoresPorItem(doc, tipo, campo.caminho)
      resultado.itens.forEach((linha, i) => {
        linha[campo.id] = valores[i] ?? ''
      })
    } else {
      resultado.documento[campo.id] = valorDocumento(doc, campo.caminho)
    }
  }
  return resultado
}
