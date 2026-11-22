'use client'
/**
 * Garante que a base de conhecimento (Prompt Mestre, Grupamentos-CFOP e tabela de
 * classificação) esteja carregada na sessão e devolve as versões já interpretadas.
 */
import { useEffect, useMemo, useState } from 'react'
import { useExtratorStore } from '@/application/store/useExtratorStore'
import { carregarConhecimentoPadrao } from '@/application/ia/ServicoRevisao'
import { lerMatrizHumana, lerTabelaClassificacao } from '@/application/matriz/LeitorMatriz'
import type { MatrizHumana, TabelaClassificacao } from '@/domain/models/Matriz'

export function useConhecimento() {
  const conhecimento = useExtratorStore((s) => s.conhecimento)
  const definir = useExtratorStore((s) => s.definirConhecimento)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (conhecimento) return
    carregarConhecimentoPadrao()
      .then((c) => definir({ ...c, origem: { promptMestre: 'padrão do projeto', grupamentos: 'padrão do projeto', classificacaoJson: 'padrão do projeto' } }))
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : String(e)))
  }, [conhecimento, definir])

  const interpretado = useMemo((): { matriz: MatrizHumana | null; tabela: TabelaClassificacao | null; erroTabela: string | null } => {
    if (!conhecimento) return { matriz: null, tabela: null, erroTabela: null }
    const matriz = lerMatrizHumana(conhecimento.grupamentos)
    try {
      return { matriz, tabela: lerTabelaClassificacao(conhecimento.classificacaoJson), erroTabela: null }
    } catch (e) {
      return { matriz, tabela: null, erroTabela: e instanceof Error ? e.message : String(e) }
    }
  }, [conhecimento])

  return { conhecimento, erro, ...interpretado }
}
