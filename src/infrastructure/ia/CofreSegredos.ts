/**
 * @file CofreSegredos.ts
 * @description Guarda as chaves de API SOMENTE NA MEMÓRIA da aba do navegador (decisão D14).
 *
 * REGRAS (portadas do ADR-0007 do ITSA-Agente)
 *   - Nada vai para localStorage, sessionStorage, cookie, URL ou servidor.
 *   - As chaves ficam neste módulo, fora do estado da interface; a tela só recebe a versão
 *     mascarada (ex.: "sk-or-…a1b2").
 *   - Fechar ou recarregar a aba apaga tudo. O botão "Limpar chaves" faz o mesmo na hora.
 *   - Toda chave carregada é registrada no Redator, para nunca aparecer em logs.
 *
 * ARQUIVO PADRÃO DE SEGREDOS (public/modelos/segredos-ia.modelo.json)
 *   { "openrouter_api_key": "sk-or-v1-...", "gemini_api_key": "AIza..." }
 *   Também é aceito o formato .env:  OPENROUTER_API_KEY=...  e  GEMINI_API_KEY=...
 */

import type { IdProvedor } from '@/domain/models/RevisaoIA'
import { esquecerSegredos, mascararChave, registrarSegredo } from './Redator'

const chaves: Partial<Record<IdProvedor, string>> = {}

/** Nomes aceitos no arquivo, por provedor (JSON ou .env, sem diferenciar maiúsculas). */
const NOMES_ACEITOS: Record<IdProvedor, string[]> = {
  openrouter: ['openrouter_api_key', 'openrouter', 'openrouter_key'],
  gemini: ['gemini_api_key', 'gemini', 'gemini_key', 'google_api_key'],
}

const PREFIXOS_ESPERADOS: Record<IdProvedor, string> = {
  openrouter: 'sk-or-',
  gemini: 'AIza',
}

export interface ResultadoArquivoSegredos {
  chaves: Partial<Record<IdProvedor, string>>
  avisos: string[]
}

/** Interpreta o conteúdo do arquivo padrão de segredos. Não guarda nada. */
export function interpretarArquivoSegredos(conteudo: string): ResultadoArquivoSegredos {
  const pares = new Map<string, string>()
  const texto = conteudo.replace(/^﻿/, '').trim()

  if (texto.startsWith('{')) {
    let dados: unknown
    try {
      dados = JSON.parse(texto)
    } catch {
      return { chaves: {}, avisos: ['O arquivo parece JSON, mas não pôde ser lido. Confira vírgulas e aspas.'] }
    }
    if (dados && typeof dados === 'object') {
      for (const [k, v] of Object.entries(dados as Record<string, unknown>)) {
        if (typeof v === 'string') pares.set(k.toLowerCase(), v.trim())
      }
    }
  } else {
    for (const linha of texto.split(/\r?\n/)) {
      const limpa = linha.trim()
      if (!limpa || limpa.startsWith('#')) continue
      const i = limpa.indexOf('=')
      if (i <= 0) continue
      const nome = limpa.slice(0, i).trim().toLowerCase()
      const valor = limpa.slice(i + 1).trim().replace(/^["']|["']$/g, '')
      pares.set(nome, valor)
    }
  }

  const resultado: ResultadoArquivoSegredos = { chaves: {}, avisos: [] }
  for (const provedor of Object.keys(NOMES_ACEITOS) as IdProvedor[]) {
    const nome = NOMES_ACEITOS[provedor].find((n) => pares.get(n))
    const valor = nome ? pares.get(nome) : undefined
    if (!valor || valor.includes('...') || valor.toLowerCase().includes('cole_aqui')) continue
    if (!valor.startsWith(PREFIXOS_ESPERADOS[provedor])) {
      resultado.avisos.push(`A chave de ${provedor} não começa com "${PREFIXOS_ESPERADOS[provedor]}". Confira se é a chave certa.`)
    }
    resultado.chaves[provedor] = valor
  }
  if (Object.keys(resultado.chaves).length === 0) {
    resultado.avisos.push('Nenhuma chave foi encontrada no arquivo. Use o modelo disponível na tela.')
  }
  return resultado
}

/** Guarda as chaves na memória (substitui apenas as informadas). */
export function guardarChaves(novas: Partial<Record<IdProvedor, string>>): void {
  for (const [provedor, chave] of Object.entries(novas) as [IdProvedor, string][]) {
    chaves[provedor] = chave
    registrarSegredo(chave)
  }
}

/** Devolve a chave de um provedor (uso exclusivo da camada de transporte). */
export function obterChave(provedor: IdProvedor): string | undefined {
  return chaves[provedor]
}

/** Versão segura para exibição: provedor → chave mascarada. */
export function resumoChaves(): Partial<Record<IdProvedor, string>> {
  const resumo: Partial<Record<IdProvedor, string>> = {}
  for (const [provedor, chave] of Object.entries(chaves) as [IdProvedor, string][]) {
    if (chave) resumo[provedor] = mascararChave(chave)
  }
  return resumo
}

/** Apaga todas as chaves da memória. */
export function limparChaves(): void {
  for (const provedor of Object.keys(chaves) as IdProvedor[]) delete chaves[provedor]
  esquecerSegredos()
}
