/**
 * @file PacotesXsd.ts
 * @description Orientação sobre os pacotes de XSD oficiais (módulo 1).
 *
 * Os XSD não vêm embarcados: eles mudam a cada Nota Técnica, e quem mantém as versões
 * são os portais oficiais. A aplicação explica onde obter cada pacote e lê, na própria
 * sessão, o .zip que o usuário enviar. Para fixar uma versão de referência no projeto,
 * siga o procedimento de docs/MANUTENCAO.md ("Atualizar o catálogo de campos").
 *
 * ATENÇÃO DE MANUTENÇÃO: confira nomes e versões nos portais a cada nova NT. Os textos
 * abaixo descrevem o que procurar, sem fixar um número de pacote que logo fica obsoleto.
 */

import type { TipoDocumento } from '@/domain/models/Campos'

export interface PacoteXsd {
  documento: string
  tipos: TipoDocumento[]
  raiz: string
  arquivoPrincipal: string
  portal: string
  urlPortal: string
  oQueProcurar: string
  reforma: string
}

export const PACOTES_XSD: PacoteXsd[] = [
  {
    documento: 'NF-e (modelo 55) e NFC-e (modelo 65)',
    tipos: ['NFE', 'NFCE'],
    raiz: 'NFe',
    arquivoPrincipal: 'nfe_v4.00.xsd',
    portal: 'Portal Nacional da NF-e',
    urlPortal: 'https://www.nfe.fazenda.gov.br/portal/principal.aspx',
    oQueProcurar: 'Documentos → Esquemas XML: o Pacote de Liberação (PL) mais recente do leiaute 4.00. NF-e e NFC-e usam o mesmo pacote.',
    reforma: 'O pacote deve trazer os grupos IBSCBS, IS e os totais IBSCBSTot/ISTot (NT 2025.002 e atualizações).',
  },
  {
    documento: 'CT-e (modelo 57)',
    tipos: ['CTE'],
    raiz: 'CTe',
    arquivoPrincipal: 'cte_v4.00.xsd',
    portal: 'Portal Nacional do CT-e',
    urlPortal: 'https://www.cte.fazenda.gov.br/portal/principal.aspx',
    oQueProcurar: 'Documentos → Esquemas XML: o pacote mais recente do leiaute 4.00.',
    reforma: 'O pacote deve trazer o grupo imp/IBSCBS (NT de Reforma Tributária do CT-e).',
  },
  {
    documento: 'NFS-e Nacional (SNNFSe)',
    tipos: ['NFSE'],
    raiz: 'NFSe',
    arquivoPrincipal: 'NFSe_v1.01.xsd (ou a versão vigente)',
    portal: 'Portal da NFS-e Nacional (gov.br/nfse)',
    urlPortal: 'https://www.gov.br/nfse/pt-br',
    oQueProcurar: 'Biblioteca → Documentação técnica: o arquivo "NFSe-ESQUEMAS_XSD" da versão vigente.',
    reforma: 'O pacote deve trazer o grupo IBSCBS da DPS e o totCIBS da NFS-e.',
  },
]

/** Converte a raiz encontrada no XSD nos tipos de documento do extrator. */
export function tiposPorRaiz(raiz: string): TipoDocumento[] {
  switch (raiz) {
    case 'NFe': return ['NFE', 'NFCE']
    case 'CTe': return ['CTE']
    case 'NFSe': return ['NFSE']
    default: return []
  }
}
