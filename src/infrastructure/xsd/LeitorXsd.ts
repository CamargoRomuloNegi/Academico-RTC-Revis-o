/**
 * @file LeitorXsd.ts
 * @description Leitor de esquemas XSD (módulo 1): transforma um pacote de XSD oficial em um
 * DICIONÁRIO DE CAMPOS, com caminho, tipo, obrigatoriedade, ocorrência e documentação.
 *
 * O QUE ELE FAZ
 *   1. Reúne as definições globais de todos os arquivos do pacote (xs:include/xs:import
 *      são resolvidos por nome, já que todos os arquivos chegam juntos).
 *   2. Encontra as raízes de documento (NFe, CTe, CTeOS, NFSe, DPS).
 *   3. Expande a árvore de elementos recursivamente, seguindo tipos nomeados, sequências,
 *      escolhas (choice), extensões e referências.
 *
 * O QUE ELE NÃO FAZ (limitações conscientes, documentadas no ADR-0004)
 *   - Não valida XMLs contra o XSD. O dicionário serve para ESCOLHER campos.
 *   - Não expande a assinatura digital (ds:Signature), que não tem interesse fiscal.
 *   - Recursões de tipo são cortadas na primeira repetição, e a profundidade é limitada.
 *
 * Os caminhos produzidos seguem a convenção de src/domain/models/Campos.ts e podem ser
 * usados direto pelo ExtratorPorCaminho.
 */

import { XMLParser } from 'fast-xml-parser'

type No = Record<string, unknown>

/** Uma entrada do dicionário gerado a partir do XSD. */
export interface EntradaDicionario {
  caminho: string
  nome: string
  documentacao: string
  tipo: string
  minOcorrencias: string
  maxOcorrencias: string
  /** true = elemento simples (tem valor); false = grupo (contém outros elementos). */
  folha: boolean
  atributo: boolean
  enumeracoes: string[]
}

/** Dicionário de um pacote de XSD. */
export interface DicionarioXsd {
  raiz: string
  arquivos: string[]
  /** Versão declarada no atributo version do xs:schema principal, quando existe. */
  versao: string
  entradas: EntradaDicionario[]
  avisos: string[]
}

const NOS_REPETIVEIS = new Set([
  'element', 'complexType', 'simpleType', 'sequence', 'choice', 'all', 'group',
  'attribute', 'attributeGroup', 'include', 'import', 'documentation', 'enumeration',
])

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (nome) => NOS_REPETIVEIS.has(nome),
})

/** Raízes de documento fiscal reconhecidas, em ordem de preferência. */
export const RAIZES_CONHECIDAS = ['NFe', 'CTe', 'CTeOS', 'NFSe', 'DPS'] as const

const PROFUNDIDADE_MAXIMA = 24

/** Remove o prefixo de namespace ("tns:TNFe" vira "TNFe"). */
function semPrefixo(nome: string): string {
  const i = nome.indexOf(':')
  return i >= 0 ? nome.slice(i + 1) : nome
}

function lista(valor: unknown): No[] {
  if (valor === undefined || valor === null) return []
  return (Array.isArray(valor) ? valor : [valor]) as No[]
}

function texto(valor: unknown): string {
  if (typeof valor === 'string') return valor
  if (valor && typeof valor === 'object' && '#text' in (valor as No)) return String((valor as No)['#text'])
  return ''
}

/** Lê o primeiro xs:annotation/xs:documentation, normalizando espaços. */
function documentacaoDe(no: No): string {
  const anotacao = lista(no.annotation)[0]
  if (!anotacao) return ''
  const docs = lista(anotacao.documentation).map(texto).filter(Boolean)
  return docs.join(' ').replace(/\s+/g, ' ').trim()
}

/** Índice das definições globais de todos os arquivos. */
interface Indice {
  elementos: Map<string, No>
  tiposComplexos: Map<string, No>
  tiposSimples: Map<string, No>
  grupos: Map<string, No>
  gruposAtributos: Map<string, No>
}

function indexar(esquemas: No[]): Indice {
  const indice: Indice = {
    elementos: new Map(),
    tiposComplexos: new Map(),
    tiposSimples: new Map(),
    grupos: new Map(),
    gruposAtributos: new Map(),
  }
  for (const schema of esquemas) {
    const registrar = (mapa: Map<string, No>, nos: unknown) => {
      for (const n of lista(nos)) {
        const nome = n['@name']
        if (typeof nome === 'string' && !mapa.has(nome)) mapa.set(nome, n)
      }
    }
    registrar(indice.elementos, schema.element)
    registrar(indice.tiposComplexos, schema.complexType)
    registrar(indice.tiposSimples, schema.simpleType)
    registrar(indice.grupos, schema.group)
    registrar(indice.gruposAtributos, schema.attributeGroup)
  }
  return indice
}

/** Descreve um tipo simples: nome base e enumerações (até 30, para caber na tela). */
function descreverSimples(no: No | undefined, indice: Indice, visitados = new Set<string>()): { base: string; enumeracoes: string[] } {
  if (!no) return { base: '', enumeracoes: [] }
  const restricao = lista(no.restriction)[0]
  if (!restricao) return { base: '', enumeracoes: [] }
  const base = semPrefixo(String(restricao['@base'] ?? ''))
  const enumeracoes = lista(restricao.enumeration)
    .map((e) => String(e['@value'] ?? ''))
    .filter(Boolean)
    .slice(0, 30)
  if (enumeracoes.length === 0 && indice.tiposSimples.has(base) && !visitados.has(base)) {
    visitados.add(base)
    const herdado = descreverSimples(indice.tiposSimples.get(base), indice, visitados)
    return { base, enumeracoes: herdado.enumeracoes }
  }
  return { base, enumeracoes }
}

/** Um tipo complexo com simpleContent (ou misto) também carrega valor textual. */
function temValorTextual(tipo: No): boolean {
  return lista(tipo.simpleContent).length > 0 || tipo['@mixed'] === 'true'
}

class Expansor {
  readonly entradas: EntradaDicionario[] = []
  readonly avisos: string[] = []
  private readonly caminhosVistos = new Set<string>()

  constructor(private readonly indice: Indice) {}

  /** Expande um xs:element (global, local ou por referência). */
  elemento(no: No, caminhoPai: string, pilhaTipos: string[], ocorrencia?: { min: string; max: string }): void {
    let def = no
    const ref = no['@ref']
    if (typeof ref === 'string') {
      const alvo = this.indice.elementos.get(semPrefixo(ref))
      if (!alvo) {
        // Referência a outro namespace (ex.: ds:Signature): registrada como grupo, sem expansão.
        this.registrar(caminhoPai, semPrefixo(ref), '', 'externo', no, false, false, [])
        return
      }
      def = alvo
    }
    const nome = String(def['@name'] ?? '')
    if (!nome) return
    const caminho = caminhoPai ? `${caminhoPai}/${nome}` : nome
    const min = String(no['@minOccurs'] ?? ocorrencia?.min ?? '1')
    const max = String(no['@maxOccurs'] ?? ocorrencia?.max ?? '1')
    const doc = documentacaoDe(no) || documentacaoDe(def)

    if (caminho.split('/').length > PROFUNDIDADE_MAXIMA) {
      this.avisos.push(`Profundidade máxima atingida em ${caminho}; ramo não expandido.`)
      return
    }

    // Tipo nomeado
    const tipoNome = typeof def['@type'] === 'string' ? semPrefixo(def['@type']) : ''
    const complexoInline = lista(def.complexType)[0]
    const simplesInline = lista(def.simpleType)[0]

    if (complexoInline) {
      this.registrarComOcorrencia(caminho, nome, doc, '(grupo)', min, max, temValorTextual(complexoInline))
      this.complexo(complexoInline, caminho, pilhaTipos)
      return
    }
    if (tipoNome && this.indice.tiposComplexos.has(tipoNome)) {
      if (pilhaTipos.includes(tipoNome)) {
        this.avisos.push(`Recursão do tipo ${tipoNome} em ${caminho}; ramo cortado.`)
        this.registrarComOcorrencia(caminho, nome, doc, tipoNome, min, max, false)
        return
      }
      const tipo = this.indice.tiposComplexos.get(tipoNome) as No
      this.registrarComOcorrencia(caminho, nome, doc || documentacaoDe(tipo), tipoNome, min, max, temValorTextual(tipo))
      this.complexo(tipo, caminho, [...pilhaTipos, tipoNome])
      return
    }
    // Elemento simples
    const simples = simplesInline ?? (tipoNome ? this.indice.tiposSimples.get(tipoNome) : undefined)
    const descricao = descreverSimples(simples, this.indice)
    const tipoExibido = tipoNome || descricao.base || 'string'
    this.registrarComOcorrencia(caminho, nome, doc || (simples ? documentacaoDe(simples) : ''), tipoExibido, min, max, true, descricao.enumeracoes)
  }

  /** Expande o conteúdo de um xs:complexType. */
  private complexo(tipo: No, caminho: string, pilhaTipos: string[]): void {
    this.atributos(tipo, caminho)
    this.particulas(tipo, caminho, pilhaTipos)

    // complexContent: herda os elementos do tipo base e acrescenta os da extensão.
    for (const conteudo of lista(tipo.complexContent)) {
      for (const derivacao of [...lista(conteudo.extension), ...lista(conteudo.restriction)]) {
        const base = semPrefixo(String(derivacao['@base'] ?? ''))
        const tipoBase = this.indice.tiposComplexos.get(base)
        if (tipoBase && !pilhaTipos.includes(base)) this.complexo(tipoBase, caminho, [...pilhaTipos, base])
        this.atributos(derivacao, caminho)
        this.particulas(derivacao, caminho, pilhaTipos)
      }
    }
    // simpleContent: valor textual com atributos; só os atributos interessam aqui.
    for (const conteudo of lista(tipo.simpleContent)) {
      for (const derivacao of [...lista(conteudo.extension), ...lista(conteudo.restriction)]) {
        this.atributos(derivacao, caminho)
      }
    }
  }

  /** Percorre sequence/choice/all/group, inclusive aninhados. */
  private particulas(no: No, caminho: string, pilhaTipos: string[], herdada?: { min: string; max: string }): void {
    for (const el of lista(no.element)) this.elemento(el, caminho, pilhaTipos, herdada)
    for (const chave of ['sequence', 'choice', 'all'] as const) {
      for (const grupo of lista(no[chave])) {
        // Elementos dentro de uma choice são opcionais entre si (min 0).
        const ocorrencia = chave === 'choice'
          ? { min: '0', max: String(grupo['@maxOccurs'] ?? '1') }
          : grupo['@maxOccurs'] !== undefined
            ? { min: String(grupo['@minOccurs'] ?? '1'), max: String(grupo['@maxOccurs']) }
            : herdada
        this.particulas(grupo, caminho, pilhaTipos, ocorrencia)
      }
    }
    for (const g of lista(no.group)) {
      const ref = typeof g['@ref'] === 'string' ? semPrefixo(g['@ref']) : ''
      const alvo = ref ? this.indice.grupos.get(ref) : undefined
      if (alvo && !pilhaTipos.includes(`grupo:${ref}`)) {
        this.particulas(alvo, caminho, [...pilhaTipos, `grupo:${ref}`], herdada)
      }
    }
  }

  private atributos(no: No, caminho: string): void {
    for (const at of lista(no.attribute)) {
      const nome = String(at['@name'] ?? (typeof at['@ref'] === 'string' ? semPrefixo(at['@ref']) : ''))
      if (!nome) continue
      const tipoNome = typeof at['@type'] === 'string' ? semPrefixo(at['@type']) : ''
      const simples = lista(at.simpleType)[0] ?? (tipoNome ? this.indice.tiposSimples.get(tipoNome) : undefined)
      const descricao = descreverSimples(simples, this.indice)
      const min = at['@use'] === 'required' ? '1' : '0'
      this.registrar(caminho, `@${nome}`, documentacaoDe(at), tipoNome || descricao.base || 'string', { '@minOccurs': min, '@maxOccurs': '1' }, true, true, descricao.enumeracoes)
    }
    for (const g of lista(no.attributeGroup)) {
      const ref = typeof g['@ref'] === 'string' ? semPrefixo(g['@ref']) : ''
      const alvo = ref ? this.indice.gruposAtributos.get(ref) : undefined
      if (alvo) this.atributos(alvo, caminho)
    }
  }

  private registrarComOcorrencia(caminho: string, nome: string, doc: string, tipo: string, min: string, max: string, folha: boolean, enumeracoes: string[] = []): void {
    if (this.caminhosVistos.has(caminho)) return
    this.caminhosVistos.add(caminho)
    this.entradas.push({ caminho, nome, documentacao: doc, tipo, minOcorrencias: min, maxOcorrencias: max, folha, atributo: false, enumeracoes })
  }

  private registrar(caminhoPai: string, nome: string, doc: string, tipo: string, no: No, folha: boolean, atributo: boolean, enumeracoes: string[]): void {
    const caminho = caminhoPai ? `${caminhoPai}/${nome}` : nome
    if (this.caminhosVistos.has(caminho)) return
    this.caminhosVistos.add(caminho)
    this.entradas.push({
      caminho, nome, documentacao: doc, tipo,
      minOcorrencias: String(no['@minOccurs'] ?? '1'),
      maxOcorrencias: String(no['@maxOccurs'] ?? '1'),
      folha, atributo, enumeracoes,
    })
  }
}

/**
 * Lê um pacote de XSD e gera um dicionário para cada raiz de documento encontrada.
 *
 * @param arquivos mapa nome do arquivo → conteúdo (somente .xsd)
 */
export function lerPacoteXsd(arquivos: Map<string, string>): DicionarioXsd[] {
  const esquemas: { nome: string; schema: No }[] = []
  const avisosGerais: string[] = []

  for (const [nome, conteudo] of arquivos) {
    try {
      const parsed = parser.parse(conteudo) as No
      const schema = parsed.schema as No | undefined
      if (schema) esquemas.push({ nome, schema })
      else avisosGerais.push(`${nome}: não é um xs:schema; ignorado.`)
    } catch (erro) {
      avisosGerais.push(`${nome}: não foi possível ler (${erro instanceof Error ? erro.message : String(erro)}).`)
    }
  }

  const indice = indexar(esquemas.map((e) => e.schema))
  const raizes = RAIZES_CONHECIDAS.filter((r) => indice.elementos.has(r))
  // DPS só é raiz quando não há NFSe (a DPS fica dentro da NFS-e).
  const raizesUteis = raizes.includes('NFSe') ? raizes.filter((r) => r !== 'DPS') : raizes

  return raizesUteis.map((raiz) => {
    const expansor = new Expansor(indice)
    expansor.elemento(indice.elementos.get(raiz) as No, '', [])
    const principal = esquemas.find((e) => lista(e.schema.element).some((el) => el['@name'] === raiz))
    return {
      raiz,
      arquivos: esquemas.map((e) => e.nome),
      versao: String(principal?.schema['@version'] ?? ''),
      entradas: expansor.entradas,
      avisos: [...avisosGerais, ...expansor.avisos],
    }
  })
}

/** Diferença entre duas versões de dicionário (atualização de XSD). */
export interface DiferencaDicionarios {
  adicionados: EntradaDicionario[]
  removidos: EntradaDicionario[]
  alterados: { antes: EntradaDicionario; depois: EntradaDicionario }[]
}

export function compararDicionarios(antigo: DicionarioXsd, novo: DicionarioXsd): DiferencaDicionarios {
  const mapaAntigo = new Map(antigo.entradas.map((e) => [e.caminho, e]))
  const mapaNovo = new Map(novo.entradas.map((e) => [e.caminho, e]))
  const adicionados = novo.entradas.filter((e) => !mapaAntigo.has(e.caminho))
  const removidos = antigo.entradas.filter((e) => !mapaNovo.has(e.caminho))
  const alterados = novo.entradas
    .filter((e) => {
      const a = mapaAntigo.get(e.caminho)
      return a !== undefined && (a.tipo !== e.tipo || a.minOcorrencias !== e.minOcorrencias || a.maxOcorrencias !== e.maxOcorrencias)
    })
    .map((depois) => ({ antes: mapaAntigo.get(depois.caminho) as EntradaDicionario, depois }))
  return { adicionados, removidos, alterados }
}
