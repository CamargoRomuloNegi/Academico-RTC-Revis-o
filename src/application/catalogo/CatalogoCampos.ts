/**
 * @file CatalogoCampos.ts
 * @description Catálogo embarcado de campos extraíveis (módulo 2: mapeamento de campos).
 *
 * ORIGEM
 *   Os caminhos foram conferidos nos XMLs reais anonimizados (tests/fixtures) e no
 *   SPEC_XML_MAPPING_v2 do projeto comercial-assistida-xml. Os campos do Imposto Seletivo
 *   (IS) seguem a NT 2025.002 da NF-e e devem ser confirmados no XSD vigente (módulo 1).
 *
 * PARA ACRESCENTAR UM CAMPO
 *   Inclua uma linha na lista do tipo de documento, com o caminho completo a partir da
 *   raiz (NFe, CTe ou NFSe). O nível (documento ou item) é deduzido do caminho.
 *   Campos raros podem ser incluídos pelo usuário direto do XSD, sem mudar o código.
 *
 * Os campos do padrão do professor (abas Documentos e Itens Analítico) já saem sempre.
 * Este catálogo lista campos ADICIONAIS para enriquecer a extração.
 */

import type { CampoCatalogo, TemaCampo, TipoDocumento } from '@/domain/models/Campos'
import { ehCampoDeItem } from '@/infrastructure/xml/ExtratorPorCaminho'

type Definicao = [rotulo: string, caminho: string, tema: TemaCampo, descricao?: string]

/** Cria o identificador estável de um campo. */
export function idCampo(tipo: TipoDocumento, caminho: string): string {
  return `${tipo}:${caminho}`
}

function montar(tipo: TipoDocumento, definicoes: Definicao[]): CampoCatalogo[] {
  return definicoes.map(([rotulo, caminho, tema, descricao]) => ({
    id: idCampo(tipo, caminho),
    rotulo,
    tipo,
    caminho,
    nivel: ehCampoDeItem(tipo, caminho) ? 'item' : 'documento',
    tema,
    descricao,
    origem: 'catalogo',
  }))
}

// ---------------------------------------------------------------------------
// NF-e (55) e NFC-e (65): mesmo leiaute 4.00
// ---------------------------------------------------------------------------

const BASE_NFE: Definicao[] = [
  ['Natureza da Operação', 'NFe/infNFe/ide/natOp', 'Identificação', 'Descrição livre da natureza da operação informada pelo emitente.'],
  ['Número', 'NFe/infNFe/ide/nNF', 'Identificação'],
  ['Série', 'NFe/infNFe/ide/serie', 'Identificação'],
  ['Modelo', 'NFe/infNFe/ide/mod', 'Identificação', '55 = NF-e; 65 = NFC-e.'],
  ['Tipo de Operação', 'NFe/infNFe/ide/tpNF', 'Identificação', '0 = entrada; 1 = saída (do ponto de vista do emitente).'],
  ['Destino da Operação', 'NFe/infNFe/ide/idDest', 'Identificação', '1 = interna; 2 = interestadual; 3 = exterior.'],
  ['Consumidor Final', 'NFe/infNFe/ide/indFinal', 'Identificação', '0 = normal; 1 = consumidor final.'],
  ['Presença do Comprador', 'NFe/infNFe/ide/indPres', 'Identificação'],
  ['Município do Fato Gerador', 'NFe/infNFe/ide/cMunFG', 'Identificação', 'Código IBGE do município de ocorrência do fato gerador.'],
  ['Emitente IE', 'NFe/infNFe/emit/IE', 'Participantes'],
  ['Emitente UF', 'NFe/infNFe/emit/enderEmit/UF', 'Participantes'],
  ['Emitente Município', 'NFe/infNFe/emit/enderEmit/xMun', 'Participantes'],
  ['Emitente CRT', 'NFe/infNFe/emit/CRT', 'Participantes', '1 = Simples Nacional; 2 = Simples (excesso de sublimite); 3 = Regime Normal; 4 = MEI.'],
  ['Destinatário CPF', 'NFe/infNFe/dest/CPF', 'Participantes'],
  ['Destinatário IE', 'NFe/infNFe/dest/IE', 'Participantes'],
  ['Destinatário UF', 'NFe/infNFe/dest/enderDest/UF', 'Participantes'],
  ['Destinatário Município', 'NFe/infNFe/dest/enderDest/xMun', 'Participantes'],
  ['Indicador IE Destinatário', 'NFe/infNFe/dest/indIEDest', 'Participantes'],
  ['Valor Total dos Produtos', 'NFe/infNFe/total/ICMSTot/vProd', 'Valores'],
  ['Valor do Frete', 'NFe/infNFe/total/ICMSTot/vFrete', 'Valores'],
  ['Valor do Seguro', 'NFe/infNFe/total/ICMSTot/vSeg', 'Valores'],
  ['Outras Despesas', 'NFe/infNFe/total/ICMSTot/vOutro', 'Valores'],
  ['Valor Total da NF (com IBS/CBS/IS)', 'NFe/infNFe/total/vNFTot', 'Valores', 'Total da nota somando os tributos da Reforma (grupo de totais da NT 2025.002).'],
  ['Modalidade do Frete', 'NFe/infNFe/transp/modFrete', 'Valores'],
  ['Forma de Pagamento', 'NFe/infNFe/pag/detPag/tPag', 'Valores'],
  ['Item · Código do Produto', 'NFe/infNFe/det/prod/cProd', 'Item'],
  ['Item · CEST', 'NFe/infNFe/det/prod/CEST', 'Item'],
  ['Item · Unidade', 'NFe/infNFe/det/prod/uCom', 'Item'],
  ['Item · Quantidade', 'NFe/infNFe/det/prod/qCom', 'Item'],
  ['Item · Valor Unitário', 'NFe/infNFe/det/prod/vUnCom', 'Item'],
  ['Item · Valor Total do Item (vItem)', 'NFe/infNFe/det/vItem', 'Item', 'Valor total do item com os tributos da Reforma (NT 2025.002).'],
  ['[RTC] Totais · Base IBS/CBS', 'NFe/infNFe/total/IBSCBSTot/vBCIBSCBS', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Totais · IBS UF', 'NFe/infNFe/total/IBSCBSTot/gIBS/gIBSUF/vIBSUF', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Totais · IBS Município', 'NFe/infNFe/total/IBSCBSTot/gIBS/gIBSMun/vIBSMun', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Totais · IBS Crédito Presumido', 'NFe/infNFe/total/IBSCBSTot/gIBS/vCredPres', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Totais · CBS Crédito Presumido', 'NFe/infNFe/total/IBSCBSTot/gCBS/vCredPres', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Totais · IBS UF Diferido', 'NFe/infNFe/total/IBSCBSTot/gIBS/gIBSUF/vDif', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Totais · CBS Diferida', 'NFe/infNFe/total/IBSCBSTot/gCBS/vDif', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Totais · IBS UF Devolvido', 'NFe/infNFe/total/IBSCBSTot/gIBS/gIBSUF/vDevTrib', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Totais · CBS Devolvida', 'NFe/infNFe/total/IBSCBSTot/gCBS/vDevTrib', 'Reforma Tributária (IBS/CBS)'],
  ['[IS] Item · CST IS', 'NFe/infNFe/det/imposto/IS/CSTIS', 'Imposto Seletivo (IS)', 'Grupo do Imposto Seletivo (NT 2025.002). Confirme no XSD vigente.'],
  ['[IS] Item · cClassTrib IS', 'NFe/infNFe/det/imposto/IS/cClassTribIS', 'Imposto Seletivo (IS)'],
  ['[IS] Item · Base IS', 'NFe/infNFe/det/imposto/IS/vBCIS', 'Imposto Seletivo (IS)'],
  ['[IS] Item · Alíquota IS', 'NFe/infNFe/det/imposto/IS/pIS', 'Imposto Seletivo (IS)'],
  ['[IS] Item · Valor IS', 'NFe/infNFe/det/imposto/IS/vIS', 'Imposto Seletivo (IS)'],
  ['[IS] Totais · Valor IS', 'NFe/infNFe/total/ISTot/vIS', 'Imposto Seletivo (IS)'],
  ['Item · IPI CST', 'NFe/infNFe/det/imposto/IPI/IPITrib/CST', 'Tributos atuais'],
  ['Item · IPI Valor', 'NFe/infNFe/det/imposto/IPI/IPITrib/vIPI', 'Tributos atuais'],
  ['Totais · ICMS ST', 'NFe/infNFe/total/ICMSTot/vST', 'Tributos atuais'],
  ['Totais · IPI', 'NFe/infNFe/total/ICMSTot/vIPI', 'Tributos atuais'],
  ['Informações Complementares', 'NFe/infNFe/infAdic/infCpl', 'Informações adicionais'],
  ['Informações ao Fisco', 'NFe/infNFe/infAdic/infAdFisco', 'Informações adicionais'],
  ['Item · Informações Adicionais', 'NFe/infNFe/det/infAdProd', 'Informações adicionais'],
]

// ---------------------------------------------------------------------------
// CT-e (57): tributos no nível do documento (infCte/imp)
// ---------------------------------------------------------------------------

const BASE_CTE: Definicao[] = [
  ['Natureza da Operação', 'CTe/infCte/ide/natOp', 'Identificação'],
  ['Número', 'CTe/infCte/ide/nCT', 'Identificação'],
  ['Série', 'CTe/infCte/ide/serie', 'Identificação'],
  ['Modal', 'CTe/infCte/ide/modal', 'Identificação', '01 = rodoviário; 02 = aéreo; 03 = aquaviário; 04 = ferroviário; 05 = dutoviário; 06 = multimodal.'],
  ['Tipo de Serviço', 'CTe/infCte/ide/tpServ', 'Identificação'],
  ['UF Início', 'CTe/infCte/ide/UFIni', 'Identificação'],
  ['UF Fim', 'CTe/infCte/ide/UFFim', 'Identificação'],
  ['Município Início', 'CTe/infCte/ide/xMunIni', 'Identificação'],
  ['Município Fim', 'CTe/infCte/ide/xMunFim', 'Identificação'],
  ['Tomador do Serviço', 'CTe/infCte/ide/toma3/toma', 'Participantes', '0 = remetente; 1 = expedidor; 2 = recebedor; 3 = destinatário.'],
  ['Remetente CNPJ', 'CTe/infCte/rem/CNPJ', 'Participantes'],
  ['Remetente Nome', 'CTe/infCte/rem/xNome', 'Participantes'],
  ['Expedidor CNPJ', 'CTe/infCte/exped/CNPJ', 'Participantes'],
  ['Recebedor CNPJ', 'CTe/infCte/receb/CNPJ', 'Participantes'],
  ['Emitente CRT', 'CTe/infCte/emit/CRT', 'Participantes'],
  ['Valor a Receber', 'CTe/infCte/vPrest/vRec', 'Valores'],
  ['Valor da Carga', 'CTe/infCte/infCTeNorm/infCarga/vCarga', 'Valores'],
  ['Produto Predominante', 'CTe/infCte/infCTeNorm/infCarga/proPred', 'Valores'],
  ['Valor Total do DF-e (vTotDFe)', 'CTe/infCte/imp/vTotDFe', 'Valores', 'Total do documento com os tributos da Reforma.'],
  ['[RTC] IBS UF Alíquota', 'CTe/infCte/imp/IBSCBS/gIBSCBS/gIBSUF/pIBSUF', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] IBS Município Alíquota', 'CTe/infCte/imp/IBSCBS/gIBSCBS/gIBSMun/pIBSMun', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] CBS Alíquota', 'CTe/infCte/imp/IBSCBS/gIBSCBS/gCBS/pCBS', 'Reforma Tributária (IBS/CBS)'],
  ['Observações', 'CTe/infCte/compl/xObs', 'Informações adicionais'],
]

// ---------------------------------------------------------------------------
// NFS-e Nacional (SNNFSe / DPS)
// ---------------------------------------------------------------------------

const BASE_NFSE: Definicao[] = [
  ['Número NFS-e', 'NFSe/infNFSe/nNFSe', 'Identificação'],
  ['Número DPS', 'NFSe/infNFSe/DPS/infDPS/nDPS', 'Identificação'],
  ['Competência', 'NFSe/infNFSe/DPS/infDPS/dCompet', 'Identificação'],
  ['Código Tributação Nacional', 'NFSe/infNFSe/DPS/infDPS/serv/cServ/cTribNac', 'Identificação', 'Item da lista de serviços (LC 116/2003) no padrão nacional.'],
  ['Descrição Tributação Nacional', 'NFSe/infNFSe/xTribNac', 'Identificação'],
  ['Código NBS', 'NFSe/infNFSe/DPS/infDPS/serv/cServ/cNBS', 'Identificação', 'Nomenclatura Brasileira de Serviços, usada pela Reforma.'],
  ['Descrição do Serviço', 'NFSe/infNFSe/DPS/infDPS/serv/cServ/xDescServ', 'Identificação'],
  ['Local da Prestação', 'NFSe/infNFSe/xLocPrestacao', 'Identificação'],
  ['Local de Incidência (ISS)', 'NFSe/infNFSe/xLocIncid', 'Identificação'],
  ['Opção Simples Nacional', 'NFSe/infNFSe/DPS/infDPS/prest/regTrib/opSimpNac', 'Participantes', '1 = não optante; 2 = MEI; 3 = ME/EPP.'],
  ['Valor do Serviço', 'NFSe/infNFSe/DPS/infDPS/valores/vServPrest/vServ', 'Valores'],
  ['Valor Líquido', 'NFSe/infNFSe/valores/vLiq', 'Valores'],
  ['[RTC] Indicador da Operação (cIndOp)', 'NFSe/infNFSe/DPS/infDPS/IBSCBS/cIndOp', 'Reforma Tributária (IBS/CBS)', 'Código indicador da operação de fornecimento (tabela da Reforma).'],
  ['[RTC] Finalidade (finNFSe)', 'NFSe/infNFSe/DPS/infDPS/IBSCBS/finNFSe', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Destinatário (indDest)', 'NFSe/infNFSe/DPS/infDPS/IBSCBS/indDest', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Localidade de Incidência', 'NFSe/infNFSe/IBSCBS/xLocalidadeIncid', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Alíquota Efetiva IBS UF', 'NFSe/infNFSe/IBSCBS/valores/uf/pAliqEfetUF', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Alíquota Efetiva IBS Município', 'NFSe/infNFSe/IBSCBS/valores/mun/pAliqEfetMun', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Alíquota Efetiva CBS', 'NFSe/infNFSe/IBSCBS/valores/fed/pAliqEfetCBS', 'Reforma Tributária (IBS/CBS)'],
  ['[RTC] Total da NFS-e com IBS/CBS', 'NFSe/infNFSe/IBSCBS/totCIBS/vTotNF', 'Reforma Tributária (IBS/CBS)'],
  ['ISS Retido (tpRetISSQN)', 'NFSe/infNFSe/DPS/infDPS/valores/trib/tribMun/tpRetISSQN', 'Tributos atuais'],
  ['IRRF Retido', 'NFSe/infNFSe/DPS/infDPS/valores/trib/tribFed/vRetIRRF', 'Tributos atuais'],
  ['Informações Complementares', 'NFSe/infNFSe/DPS/infDPS/serv/infoCompl/xInfComp', 'Informações adicionais'],
]

/** Catálogo completo, na ordem de exibição. */
export const CATALOGO_CAMPOS: CampoCatalogo[] = [
  ...montar('NFE', BASE_NFE),
  ...montar('NFCE', BASE_NFE),
  ...montar('CTE', BASE_CTE),
  ...montar('NFSE', BASE_NFSE),
]

/** Conjuntos prontos de campos, para começar rápido (escolha didática). */
export interface PresetCampos {
  id: string
  nome: string
  descricao: string
  filtro: (c: CampoCatalogo) => boolean
}

export const PRESETS: PresetCampos[] = [
  {
    id: 'padrao',
    nome: 'Somente o padrão',
    descricao: 'Abas Documentos e Itens Analítico do modelo do professor, sem colunas extras.',
    filtro: () => false,
  },
  {
    id: 'identificacao',
    nome: 'Identificação da operação',
    descricao: 'Natureza da operação, número, série, destino e informações complementares.',
    filtro: (c) => c.tema === 'Identificação' || c.tema === 'Informações adicionais',
  },
  {
    id: 'reforma',
    nome: 'Reforma Tributária completa',
    descricao: 'Todos os campos de IBS, CBS e Imposto Seletivo além do padrão.',
    filtro: (c) => c.tema === 'Reforma Tributária (IBS/CBS)' || c.tema === 'Imposto Seletivo (IS)',
  },
  {
    id: 'tudo',
    nome: 'Catálogo inteiro',
    descricao: 'Todos os campos do catálogo (planilha larga).',
    filtro: () => true,
  },
]
