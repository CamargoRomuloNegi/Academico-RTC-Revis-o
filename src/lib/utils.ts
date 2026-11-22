/**
 * @file utils.ts
 * @description Utilitários compartilhados entre camadas.
 * Funções puras — sem efeitos colaterais, sem dependências externas.
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Combina classes CSS com suporte a condicionais e resolve conflitos Tailwind */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Normaliza um CNPJ/CPF para somente dígitos.
 *
 * Defesa contra zeros à esquerda perdidos por conversão numérica em alguma etapa
 * anterior (ex.: CNPJ 01234567000189 virando 1234567000189): um valor com 12 ou 13
 * dígitos só pode ser um CNPJ, então é completado com zeros até 14 dígitos.
 * (CPF tem 11 dígitos e CNPJ 14, portanto 12–13 não é ambíguo.)
 */
function normalizeCnpjCpfDigits(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 12 || digits.length === 13) return digits.padStart(14, '0')
  return digits
}

/**
 * Extrai o CNPJ raiz (primeiros 8 dígitos) de um CNPJ formatado ou não.
 * Para CPF (11 dígitos), retorna o CPF completo como raiz.
 * Retorna null para entradas inválidas.
 */
export function extractCnpjRoot(cnpjCpf: string): string | null {
  const digits = normalizeCnpjCpfDigits(cnpjCpf)
  if (digits.length === 14) return digits.slice(0, 8) // CNPJ raiz
  if (digits.length === 11) return digits              // CPF (usa integral como raiz)
  return null
}

/**
 * Formata um CNPJ (14 dígitos) para exibição: XX.XXX.XXX/XXXX-XX
 * Formata um CPF (11 dígitos) para: XXX.XXX.XXX-XX
 * Retorna o valor original se não reconhecido.
 */
export function formatCnpjCpf(value: string): string {
  const digits = normalizeCnpjCpfDigits(value)
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return value
}

/**
 * Converte um valor para número seguro.
 * Retorna 0 para undefined, null, NaN ou strings não numéricas.
 */
export function toNumber(value: unknown): number {
  if (value === undefined || value === null) return 0
  const n = Number(value)
  return isNaN(n) ? 0 : n
}

/**
 * Formata valor monetário para exibição em pt-BR.
 * Ex: 1234.5 → "R$ 1.234,50"
 */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Formata percentual para exibição.
 * Ex: 9.75 → "9,75%"
 */
export function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`
}

/**
 * Trunca string longa para exibição em tabelas.
 * Ex: truncate("Ventilador Industrial Trifásico", 20) → "Ventilador Industria..."
 */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}...`
}
