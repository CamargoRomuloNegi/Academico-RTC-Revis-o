'use client'
/**
 * Pares únicos da sessão (CFOP + CST + cClassTrib), já filtrados pelo escopo de regime,
 * com a base de conhecimento interpretada. Usado pela Revisão e pelo Resumo executivo,
 * para que as duas telas enxerguem exatamente os mesmos pares (e os mesmos ids).
 */
import { useMemo } from 'react'
import { useExtratorStore } from '@/application/store/useExtratorStore'
import { aglutinarPares } from '@/application/services/AglutinacaoService'
import { useConhecimento } from './useConhecimento'

export function useAglutinacao() {
  const documentos = useExtratorStore((s) => s.documentos)
  const regimes = useExtratorStore((s) => s.parametros.regimesNoEscopo)
  const base = useConhecimento()
  const { matriz, tabela, tabelaCfop } = base
  const resultado = useMemo(
    () => (matriz ? aglutinarPares(documentos, matriz, { regimesNoEscopo: regimes, tabelaCfop, tabelaClassificacao: tabela }) : null),
    [documentos, matriz, regimes, tabelaCfop, tabela],
  )
  return { ...base, pares: resultado?.pares ?? [], escopo: resultado?.escopo ?? null }
}
