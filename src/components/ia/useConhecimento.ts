'use client'
/**
 * Garante que a base de conhecimento (Prompt Mestre, Grupamentos-CFOP, tabela de
 * classificação e tabela oficial de CFOP) esteja carregada na sessão e devolve as
 * versões já interpretadas.
 */
import { useEffect, useMemo, useState } from 'react'
import { useExtratorStore } from '@/application/store/useExtratorStore'
import { carregarConhecimentoPadrao } from '@/application/ia/ServicoRevisao'
import { lerMatrizHumana, lerTabelaCfop, lerTabelaClassificacao } from '@/application/matriz/LeitorMatriz'
import type { MatrizHumana, TabelaCfop, TabelaClassificacao } from '@/domain/models/Matriz'

const PADRAO = 'padrão do projeto'

interface Interpretado {
  matriz: MatrizHumana | null
  tabela: TabelaClassificacao | null
  tabelaCfop: TabelaCfop | null
  erroTabela: string | null
  erroCfop: string | null
}

export function useConhecimento() {
  const conhecimento = useExtratorStore((s) => s.conhecimento)
  const definir = useExtratorStore((s) => s.definirConhecimento)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (conhecimento) return
    carregarConhecimentoPadrao()
      .then((c) => definir({ ...c, origem: { promptMestre: PADRAO, grupamentos: PADRAO, classificacaoJson: PADRAO, cfopJson: PADRAO } }))
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : String(e)))
  }, [conhecimento, definir])

  const interpretado = useMemo((): Interpretado => {
    if (!conhecimento) return { matriz: null, tabela: null, tabelaCfop: null, erroTabela: null, erroCfop: null }
    const r: Interpretado = { matriz: lerMatrizHumana(conhecimento.grupamentos), tabela: null, tabelaCfop: null, erroTabela: null, erroCfop: null }
    try {
      r.tabela = lerTabelaClassificacao(conhecimento.classificacaoJson)
    } catch (e) {
      r.erroTabela = e instanceof Error ? e.message : String(e)
    }
    try {
      r.tabelaCfop = lerTabelaCfop(conhecimento.cfopJson)
    } catch (e) {
      r.erroCfop = e instanceof Error ? e.message : String(e)
    }
    return r
  }, [conhecimento])

  return { conhecimento, erro, ...interpretado }
}
