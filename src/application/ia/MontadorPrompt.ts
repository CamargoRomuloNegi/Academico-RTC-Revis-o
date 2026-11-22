/**
 * @file MontadorPrompt.ts
 * @description Monta as mensagens enviadas à IA a partir do Prompt Mestre do professor.
 *
 *   Mensagem de sistema = modelo do prompt, com {{GRUPAMENTOS_CFOP}} trocado pelo .md
 *                         completo e {{CLASSIFICACAO_TRIBUTARIA}} trocado pelo JSON
 *                         completo (minificado: o mesmo conteúdo, sem espaços de
 *                         indentação, o que economiza cerca de 15% de tokens).
 *   Mensagem do usuário = um lote de pares únicos, em JSON.
 */

import type { ParUnico } from '@/domain/models/RevisaoIA'
import type { MensagemChat } from '@/infrastructure/ia/ClienteIA'
import { MARCADOR_CLASSIFICACAO, MARCADOR_GRUPAMENTOS, extrairModeloPrompt } from '@/application/matriz/LeitorMatriz'

export interface BaseConhecimento {
  promptMestre: string
  grupamentos: string
  classificacaoJson: string
}

/** Gera o texto do prompt de sistema (o mesmo para todos os lotes de uma execução). */
export function montarPromptSistema(base: BaseConhecimento): string {
  const modelo = extrairModeloPrompt(base.promptMestre)
  let classificacao = base.classificacaoJson
  try {
    classificacao = JSON.stringify(JSON.parse(base.classificacaoJson))
  } catch {
    // mantém o texto original; a validação da tabela avisa o usuário em outra etapa
  }
  const comGrupamentos = modelo.includes(MARCADOR_GRUPAMENTOS)
    ? modelo.split(MARCADOR_GRUPAMENTOS).join(base.grupamentos.trim())
    : `${modelo}\n\n## Grupamentos-CFOP (matriz humana)\n${base.grupamentos.trim()}`
  return comGrupamentos.includes(MARCADOR_CLASSIFICACAO)
    ? comGrupamentos.split(MARCADOR_CLASSIFICACAO).join(classificacao)
    : `${comGrupamentos}\n\n## Tabela de classificação tributária\n${classificacao}`
}

/**
 * Representação de um par no formato de entrada do Prompt Mestre (seção 8).
 * Não enviados de propósito: NCM (D22) e direção da operação (D24).
 */
export function parParaEntrada(par: ParUnico): Record<string, unknown> {
  return {
    id: par.id,
    cfop: par.cfop,
    descricao_oficial_cfop: par.descricaoCfop,
    descricoes_exemplo: par.descricoesExemplo,
    tipos_documento: par.tiposDocumento,
    cst_atual: par.cstAtual,
    cclasstrib_atual: par.cClassTribAtual,
    grupos_matriz_humana: par.enquadramentos.map((e) => ({ grupo: e.grupo, subgrupo: e.subgrupo, essencia: e.essencia })),
    sinalizacoes: par.sinalizacoes,
    qtd_itens: par.qtdItens,
    valor_total: par.valorTotal,
  }
}

/** Mensagens completas de um lote. */
export function montarMensagens(promptSistema: string, lote: ParUnico[]): MensagemChat[] {
  const entrada = { pares: lote.map(parParaEntrada) }
  return [
    { role: 'system', content: promptSistema },
    {
      role: 'user',
      content:
        `Julgue os ${lote.length} pares abaixo seguindo estritamente a Matriz de Decisão e responda somente com o JSON da seção 9.\n\n` +
        JSON.stringify(entrada),
    },
  ]
}

/** Estimativa grosseira de tokens (≈ 4 caracteres por token), só para orientar a escolha de modelo. */
export function estimarTokens(texto: string): number {
  return Math.ceil(texto.length / 4)
}
