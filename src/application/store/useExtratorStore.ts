/**
 * @file useExtratorStore.ts
 * @description Estado global da sessão (Zustand), SEM persistência (decisão D02).
 *
 * Tudo vive na memória da aba: recarregar a página limpa os documentos, a seleção de
 * campos, os dicionários de XSD e os resultados da IA. Para levar uma seleção de campos
 * para outra sessão, use "Exportar perfil" (arquivo JSON) na tela de Campos.
 *
 * As CHAVES DE API não ficam aqui: elas ficam no CofreSegredos, e este estado guarda só a
 * versão mascarada para exibição.
 */

import { create } from 'zustand'
import type { FiscalDocument, ProcessingLog } from '@/domain/models/FiscalDocument'
import type { CampoCatalogo } from '@/domain/models/Campos'
import type { DicionarioXsd } from '@/infrastructure/xsd/LeitorXsd'
import {
  PARAMETROS_PADRAO,
  type IdProvedor,
  type LinhaRevisao,
  type ModeloDisponivel,
  type ParametrosExecucao,
  type RegistroChamada,
  type VagaModelo,
} from '@/domain/models/RevisaoIA'
import type { ProgressoRevisao } from '@/application/ia/OrquestradorRevisao'

/** Arquivos da base de conhecimento (padrão do projeto ou enviados pelo usuário). */
export interface Conhecimento {
  promptMestre: string
  grupamentos: string
  classificacaoJson: string
  origem: Record<'promptMestre' | 'grupamentos' | 'classificacaoJson', string>
}

/** Vagas iniciais: 5 do OpenRouter (rodízio) e 1 do Gemini (fallback). */
export const VAGAS_INICIAIS: VagaModelo[] = [
  ...[1, 2, 3, 4, 5].map((posicao) => ({ posicao, provedor: 'openrouter' as const, modelo: '', rpm: 20, ativo: true })),
  { posicao: 6, provedor: 'gemini', modelo: 'gemini-2.5-flash', rpm: 10, ativo: true },
]

interface EstadoExtrator {
  // --- Extração (módulos 3 e 4) ---
  documentos: FiscalDocument[]
  logs: ProcessingLog[]
  cnpjRaiz: string | null
  cnpjAutomatico: boolean
  definirDocumentos: (documentos: FiscalDocument[], cnpjRaiz: string | null, automatico: boolean) => void
  acrescentarLogs: (logs: ProcessingLog[]) => void
  limparExtracao: () => void

  // --- Catálogo e campos (módulos 1 e 2) ---
  camposSelecionados: CampoCatalogo[]
  alternarCampo: (campo: CampoCatalogo) => void
  definirCampos: (campos: CampoCatalogo[]) => void
  dicionarios: DicionarioXsd[]
  /** Versão anterior de cada raiz, guardada ao enviar um pacote novo (para comparar). */
  dicionariosAnteriores: DicionarioXsd[]
  carregarDicionarios: (novos: DicionarioXsd[]) => void

  // --- Base de conhecimento (módulo 6) ---
  conhecimento: Conhecimento | null
  definirConhecimento: (c: Conhecimento) => void

  // --- Configuração da IA (módulo 6) ---
  chavesMascaradas: Partial<Record<IdProvedor, string>>
  chavesServidor: Partial<Record<IdProvedor, boolean>>
  definirChavesMascaradas: (c: Partial<Record<IdProvedor, string>>) => void
  definirChavesServidor: (c: Partial<Record<IdProvedor, boolean>>) => void
  modelosOpenRouter: ModeloDisponivel[]
  modelosGemini: ModeloDisponivel[]
  definirModelos: (provedor: IdProvedor, modelos: ModeloDisponivel[]) => void
  vagas: VagaModelo[]
  atualizarVaga: (posicao: number, mudanca: Partial<VagaModelo>) => void
  parametros: ParametrosExecucao
  atualizarParametros: (mudanca: Partial<ParametrosExecucao>) => void

  // --- Revisão (módulo 6) ---
  linhasRevisao: LinhaRevisao[]
  chamadas: RegistroChamada[]
  progresso: ProgressoRevisao | null
  emExecucao: boolean
  /** Uso de cota acumulado na sessão (requisições por provedor). */
  usoSessao: Partial<Record<IdProvedor, number>>
  iniciarRevisao: () => void
  registrarLinha: (linha: LinhaRevisao) => void
  definirProgresso: (p: ProgressoRevisao) => void
  concluirRevisao: (linhas: LinhaRevisao[], chamadas: RegistroChamada[], uso: Partial<Record<IdProvedor, number>>) => void
  limparRevisao: () => void
}

export const useExtratorStore = create<EstadoExtrator>((set) => ({
  documentos: [],
  logs: [],
  cnpjRaiz: null,
  cnpjAutomatico: true,
  definirDocumentos: (documentos, cnpjRaiz, automatico) => set({ documentos, cnpjRaiz, cnpjAutomatico: automatico, linhasRevisao: [], chamadas: [] }),
  acrescentarLogs: (logs) => set((s) => ({ logs: [...s.logs, ...logs].slice(-5000) })),
  limparExtracao: () => set({ documentos: [], logs: [], cnpjRaiz: null, cnpjAutomatico: true, linhasRevisao: [], chamadas: [] }),

  camposSelecionados: [],
  alternarCampo: (campo) =>
    set((s) => ({
      camposSelecionados: s.camposSelecionados.some((c) => c.id === campo.id)
        ? s.camposSelecionados.filter((c) => c.id !== campo.id)
        : [...s.camposSelecionados, campo],
    })),
  definirCampos: (campos) => set({ camposSelecionados: [...new Map(campos.map((c) => [c.id, c])).values()] }),
  dicionarios: [],
  dicionariosAnteriores: [],
  carregarDicionarios: (novos) =>
    set((s) => {
      const raizes = new Set(novos.map((d) => d.raiz))
      return {
        dicionariosAnteriores: [...s.dicionariosAnteriores.filter((d) => !raizes.has(d.raiz)), ...s.dicionarios.filter((d) => raizes.has(d.raiz))],
        dicionarios: [...s.dicionarios.filter((d) => !raizes.has(d.raiz)), ...novos],
      }
    }),

  conhecimento: null,
  definirConhecimento: (conhecimento) => set({ conhecimento }),

  chavesMascaradas: {},
  chavesServidor: {},
  definirChavesMascaradas: (chavesMascaradas) => set({ chavesMascaradas }),
  definirChavesServidor: (chavesServidor) => set({ chavesServidor }),
  modelosOpenRouter: [],
  modelosGemini: [],
  definirModelos: (provedor, modelos) => set(provedor === 'openrouter' ? { modelosOpenRouter: modelos } : { modelosGemini: modelos }),
  vagas: VAGAS_INICIAIS,
  atualizarVaga: (posicao, mudanca) => set((s) => ({ vagas: s.vagas.map((v) => (v.posicao === posicao ? { ...v, ...mudanca } : v)) })),
  parametros: PARAMETROS_PADRAO,
  atualizarParametros: (mudanca) => set((s) => ({ parametros: { ...s.parametros, ...mudanca } })),

  linhasRevisao: [],
  chamadas: [],
  progresso: null,
  emExecucao: false,
  usoSessao: {},
  iniciarRevisao: () => set({ emExecucao: true, progresso: null }),
  registrarLinha: (linha) =>
    set((s) => {
      const existe = s.linhasRevisao.findIndex((l) => l.par.id === linha.par.id)
      const linhas = [...s.linhasRevisao]
      if (existe >= 0) linhas[existe] = { ...linha }
      else linhas.push({ ...linha })
      return { linhasRevisao: linhas }
    }),
  definirProgresso: (progresso) => set({ progresso }),
  concluirRevisao: (linhas, chamadas, uso) =>
    set((s) => {
      const porId = new Map(s.linhasRevisao.map((l) => [l.par.id, l]))
      for (const l of linhas) porId.set(l.par.id, l)
      return { linhasRevisao: [...porId.values()].sort((a, b) => a.par.id.localeCompare(b.par.id)), chamadas: [...s.chamadas, ...chamadas], emExecucao: false, usoSessao: uso }
    }),
  limparRevisao: () => set({ linhasRevisao: [], chamadas: [], progresso: null }),
}))
