/**
 * Utilitários compartilhados pelos testes: leitura de fixtures e da base de conhecimento.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { FiscalDocument } from '@/domain/models/FiscalDocument'
import { processarArquivos, enriquecer } from '@/application/services/ProcessamentoService'

export function lerFixture(caminho: string): string {
  return readFileSync(resolve(__dirname, 'fixtures', caminho), 'utf-8')
}

export function lerConhecimento(arquivo: string): string {
  return readFileSync(resolve(__dirname, '..', 'public', 'conhecimento', arquivo), 'utf-8')
}

/** Processa fixtures pelo pipeline real (detecção → parser → enriquecimento). */
export async function documentosDe(caminhos: string[], cnpjRaiz?: string): Promise<FiscalDocument[]> {
  const arquivos = caminhos.map((c) => ({ nome: c, conteudo: lerFixture(c) }))
  const { documentos } = await processarArquivos(arquivos)
  return enriquecer(documentos, cnpjRaiz).documentos
}

/** Um resultado de IA completo e válido, no formato da seção 9 do Prompt Mestre. */
export function resultadoValido(id: string, extra: Record<string, unknown> = {}) {
  return {
    id, analise_juridica: 'j', analise_contabil: 'c', analise_fiscal_rtc: 'f', analise_operacional: 'o',
    matriz_passo_a_passo: 'P1 SIM → P2 SIM → P3 NÃO → Grupo II', grupo_ia: 'II', concorda_com_grupo_humano: true,
    parecer: 'CONCORDA', cst_proposto: '000', cclasstrib_proposto: '000001', justificativa: 'Venda onerosa.',
    fundamentacao_legal: 'Art. 4º LC 214/2025', red_flags: '', duvidas: '', documentacao_recomendada: '',
    confianca: 'ALTA', revisao_humana_obrigatoria: false, ...extra,
  }
}
