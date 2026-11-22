/**
 * @file LeitorArquivos.ts
 * @description Leitura dos arquivos enviados pelo usuário (.xml avulso ou .zip), sempre
 * em memória e no navegador (módulo 3).
 *
 * Reaproveita a abordagem do UploadZone do comercial-assistida-xml (JSZip), separada da
 * tela para poder ser testada e reutilizada também na leitura dos pacotes de XSD.
 */

import JSZip from 'jszip'

/** Um arquivo de texto lido de um .xml avulso ou de dentro de um .zip. */
export interface ArquivoTexto {
  nome: string
  /** Nome do .zip de origem, quando o arquivo veio de um. */
  origem?: string
  conteudo: string
}

/** Resultado da leitura de um arquivo enviado. */
export interface ResultadoLeitura {
  arquivos: ArquivoTexto[]
  ignorados: { nome: string; motivo: string }[]
}

/** Nome do arquivo sem as pastas internas do .zip. */
function nomeBase(caminho: string): string {
  return caminho.split('/').pop() ?? caminho
}

/**
 * Extrai de um .zip todos os arquivos com as extensões pedidas, inclusive em subpastas
 * e em .zip aninhados (comum quando o contador recebe "zip de zips").
 */
export async function lerZip(
  dados: Blob | ArrayBuffer | Uint8Array,
  nomeZip: string,
  extensoes: string[],
  profundidade = 0,
): Promise<ResultadoLeitura> {
  const resultado: ResultadoLeitura = { arquivos: [], ignorados: [] }
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(dados)
  } catch {
    resultado.ignorados.push({ nome: nomeZip, motivo: 'Arquivo .zip corrompido ou protegido por senha.' })
    return resultado
  }

  for (const entrada of Object.values(zip.files)) {
    if (entrada.dir) continue
    const nome = entrada.name.toLowerCase()
    if (nome.startsWith('__macosx/')) continue
    if (extensoes.some((ext) => nome.endsWith(ext))) {
      resultado.arquivos.push({ nome: nomeBase(entrada.name), origem: nomeZip, conteudo: await entrada.async('string') })
    } else if (nome.endsWith('.zip') && profundidade < 2) {
      const interno = await lerZip(await entrada.async('uint8array'), nomeBase(entrada.name), extensoes, profundidade + 1)
      resultado.arquivos.push(...interno.arquivos)
      resultado.ignorados.push(...interno.ignorados)
    } else {
      resultado.ignorados.push({ nome: nomeBase(entrada.name), motivo: 'Extensão não suportada.' })
    }
  }
  return resultado
}

/** Lê uma lista de arquivos do navegador (.xml e .zip) aceitando as extensões pedidas. */
export async function lerArquivos(arquivos: File[], extensoes: string[] = ['.xml']): Promise<ResultadoLeitura> {
  const total: ResultadoLeitura = { arquivos: [], ignorados: [] }
  for (const arquivo of arquivos) {
    const nome = arquivo.name.toLowerCase()
    if (nome.endsWith('.zip')) {
      const r = await lerZip(arquivo, arquivo.name, extensoes)
      total.arquivos.push(...r.arquivos)
      total.ignorados.push(...r.ignorados)
    } else if (extensoes.some((ext) => nome.endsWith(ext))) {
      total.arquivos.push({ nome: arquivo.name, conteudo: await arquivo.text() })
    } else {
      total.ignorados.push({ nome: arquivo.name, motivo: `Formato não suportado (use ${extensoes.join(', ')} ou .zip).` })
    }
  }
  return total
}
