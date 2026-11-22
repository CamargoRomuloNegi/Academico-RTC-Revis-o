/**
 * @file Campos.ts
 * @description Tipos do catálogo de campos e da seleção feita pelo usuário (módulos 1 e 2).
 *
 * CONVENÇÃO DE CAMINHOS
 *   Todo campo é identificado por um caminho "absoluto" a partir do elemento raiz do
 *   documento fiscal, sem o invólucro de protocolo (nfeProc, cteProc) e sem prefixo
 *   de namespace. É a mesma notação que o leitor de XSD produz, por isso um campo
 *   descoberto no XSD pode ser extraído sem tradução. Exemplos:
 *     NF-e  →  NFe/infNFe/ide/natOp
 *     NF-e  →  NFe/infNFe/det/imposto/IBSCBS/cClassTrib   (nível item)
 *     CT-e  →  CTe/infCte/imp/IBSCBS/CST
 *     NFS-e →  NFSe/infNFSe/DPS/infDPS/serv/cServ/cTribNac
 *
 *   Atributos usam "@": NFe/infNFe/@Id
 *
 *   NÍVEL DO CAMPO
 *     Na NF-e e na NFC-e, todo caminho que passa por "det" é de ITEM e gera um valor
 *     por linha da aba Itens Analítico. Os demais são de DOCUMENTO. CT-e e NFS-e
 *     não têm itens repetitivos: os campos são de documento e se repetem nas linhas
 *     de item daquele documento.
 */

import type { DocumentType } from './FiscalDocument'

/** Tipos de documento suportados pelo extrator (exclui UNKNOWN). */
export type TipoDocumento = Exclude<DocumentType, 'UNKNOWN'>

/** Nível em que o campo é lido: um valor por documento ou um por item. */
export type NivelCampo = 'documento' | 'item'

/** Agrupamento temático usado na tela de seleção de campos. */
export type TemaCampo =
  | 'Identificação'
  | 'Participantes'
  | 'Valores'
  | 'Item'
  | 'Reforma Tributária (IBS/CBS)'
  | 'Imposto Seletivo (IS)'
  | 'Tributos atuais'
  | 'Informações adicionais'
  | 'XSD (personalizado)'

/** Um campo extraível. Pode vir do catálogo embarcado ou do XSD carregado pelo usuário. */
export interface CampoCatalogo {
  /** Identificador estável (tipo + caminho). */
  id: string
  /** Rótulo que vira cabeçalho da coluna exportada. */
  rotulo: string
  tipo: TipoDocumento
  caminho: string
  nivel: NivelCampo
  tema: TemaCampo
  /** Explicação didática do campo (do catálogo ou da documentação do XSD). */
  descricao?: string
  /** Origem do campo, para rastreabilidade. */
  origem: 'catalogo' | 'xsd'
}

/** Perfil de seleção exportável e importável (substitui a persistência). */
export interface PerfilSelecao {
  formato: 'extrator-xml-rtc/perfil-campos'
  versao: 1
  nome: string
  criadoEm: string
  campos: CampoCatalogo[]
}
