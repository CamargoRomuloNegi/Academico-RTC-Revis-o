/**
 * @file ProcessamentoService.ts
 * @description Pipeline do módulo 4: XMLs lidos → detecção do tipo → parser → enriquecimento.
 *
 * FLUXO
 *   1. DocumentDetector identifica NF-e, NFC-e, CT-e ou NFS-e Nacional (e rejeita ABRASF).
 *   2. ParserFactory aplica o parser herdado do comercial-assistida-xml.
 *   3. Documentos repetidos (mesma chave de acesso) são descartados, com aviso no log.
 *   4. O CNPJ raiz da empresa analisada é detectado por frequência (ou informado pelo
 *      usuário), e cada documento recebe a direção e o impacto RTC por item.
 *
 * DESEMPENHO
 *   O processamento roda no navegador. A cada lote de arquivos o laço devolve o controle
 *   à tela (yield), para a barra de progresso andar e a interface não congelar. O professor
 *   testou volumes de até 100 MB sem estouro. Para volumes maiores, ver ADR-0002 (Web Worker).
 */

import type { FiscalDocument, ProcessingLog } from '@/domain/models/FiscalDocument'
import type { ArquivoTexto } from '@/infrastructure/arquivos/LeitorArquivos'
import { detectDocumentType } from '@/infrastructure/parsers/DocumentDetector'
import { parseDocument } from '@/infrastructure/parsers/ParserFactory'
import { detectMainCnpjRoot, enrichDocument } from './TaxAnalyzerService'

export interface ProgressoProcessamento {
  processados: number
  total: number
  arquivoAtual: string
}

export interface ResultadoProcessamento {
  documentos: FiscalDocument[]
  logs: ProcessingLog[]
  falhas: number
  duplicados: number
}

const ARQUIVOS_POR_PAUSA = 25

const pausa = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function log(level: ProcessingLog['level'], source: string, message: string): ProcessingLog {
  return { timestamp: new Date().toISOString(), level, category: 'PARSE', source, message }
}

/** Interpreta um conjunto de XMLs. Não lança exceções: falhas vão para o log. */
export async function processarArquivos(
  arquivos: ArquivoTexto[],
  aoProgredir?: (p: ProgressoProcessamento) => void,
  chavesJaCarregadas: Set<string> = new Set(),
): Promise<ResultadoProcessamento> {
  const documentos: FiscalDocument[] = []
  const logs: ProcessingLog[] = []
  const chaves = new Set(chavesJaCarregadas)
  let falhas = 0
  let duplicados = 0

  for (let i = 0; i < arquivos.length; i++) {
    const arquivo = arquivos[i] as ArquivoTexto
    const fonte = arquivo.origem ? `${arquivo.origem} › ${arquivo.nome}` : arquivo.nome
    try {
      const deteccao = detectDocumentType(arquivo.conteudo, fonte)
      logs.push(...deteccao.logs)
      if (deteccao.type === 'UNKNOWN') {
        falhas++
      } else {
        const resultado = parseDocument(arquivo.conteudo, deteccao.type, fonte)
        logs.push(...resultado.logs)
        if (resultado.success && resultado.document) {
          const chave = resultado.document.access_key
          if (chaves.has(chave)) {
            duplicados++
            logs.push(log('WARN', fonte, `Documento repetido (chave ${chave}); mantida a primeira ocorrência.`))
          } else {
            chaves.add(chave)
            documentos.push(resultado.document)
          }
        } else {
          falhas++
        }
      }
    } catch (erro) {
      falhas++
      logs.push(log('ERROR', fonte, `Falha inesperada: ${erro instanceof Error ? erro.message : String(erro)}`))
    }

    if ((i + 1) % ARQUIVOS_POR_PAUSA === 0 || i === arquivos.length - 1) {
      aoProgredir?.({ processados: i + 1, total: arquivos.length, arquivoAtual: fonte })
      await pausa()
    }
  }
  return { documentos, logs, falhas, duplicados }
}

/** Resultado do enriquecimento: documentos com direção e o CNPJ raiz usado. */
export interface ResultadoEnriquecimento {
  documentos: FiscalDocument[]
  cnpjRaiz: string | null
  automatico: boolean
}

/**
 * Aplica direção (entrada/saída) e impacto RTC a todos os documentos.
 * Se o usuário não informou o CNPJ raiz, ele é detectado por frequência.
 */
export function enriquecer(documentos: FiscalDocument[], cnpjRaizInformado?: string | null): ResultadoEnriquecimento {
  const informado = cnpjRaizInformado?.replace(/\D/g, '').slice(0, 8) || null
  const cnpjRaiz = informado ?? detectMainCnpjRoot(documentos).cnpjRoot
  if (!cnpjRaiz) return { documentos, cnpjRaiz: null, automatico: true }
  return {
    documentos: documentos.map((d) => enrichDocument(d, cnpjRaiz)),
    cnpjRaiz,
    automatico: !informado,
  }
}
