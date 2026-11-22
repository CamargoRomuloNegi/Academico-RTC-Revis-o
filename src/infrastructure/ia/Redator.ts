/**
 * @file Redator.ts
 * @description Higiene de segredos: mascara chaves de API em qualquer texto que vá para a
 * tela, para o log de chamadas ou para a planilha.
 *
 * Portado do ITSA-Agente (itsa_agente/security.py, ADR-0007), com os padrões dos provedores
 * deste projeto: OpenRouter (sk-or-v1-...) e Google Gemini (AIza...).
 * É a última linha de defesa: o código já evita exibir chaves.
 */

const MASCARA = '***'

const PADROES: RegExp[] = [
  /\bsk-or(?:-v\d+)?-[A-Za-z0-9_-]{8,}/g, // OpenRouter
  /\bAIza[0-9A-Za-z_-]{20,}/g, // Google (Gemini)
  /\bnvapi-[A-Za-z0-9_-]{8,}/g, // NVIDIA (caso o aluno acrescente o provedor)
  /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi,
  /("?(?:api[_-]?key|authorization|x-goog-api-key|x-chave-ia)"?\s*[:=]\s*"?)[^",\s}]+/gi,
]

const segredosRegistrados = new Set<string>()

/** Registra um segredo concreto para ser mascarado onde quer que apareça. */
export function registrarSegredo(segredo: string | undefined | null): void {
  if (segredo && segredo.length >= 8) segredosRegistrados.add(segredo)
}

/** Esquece todos os segredos registrados (ao limpar as chaves da sessão). */
export function esquecerSegredos(): void {
  segredosRegistrados.clear()
}

/** Aplica a redação em um texto. */
export function redigir(texto: string): string {
  let saida = texto
  for (const segredo of segredosRegistrados) saida = saida.split(segredo).join(MASCARA)
  for (const padrao of PADROES) {
    saida = saida.replace(padrao, (_m, prefixo?: string) => (typeof prefixo === 'string' ? `${prefixo}${MASCARA}` : MASCARA))
  }
  return saida
}

/** Mostra só o início e o fim de uma chave, para o usuário conferir qual carregou. */
export function mascararChave(chave: string): string {
  if (chave.length <= 10) return MASCARA
  return `${chave.slice(0, 6)}…${chave.slice(-4)}`
}
