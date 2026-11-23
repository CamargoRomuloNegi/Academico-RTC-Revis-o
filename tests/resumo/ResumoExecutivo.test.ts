import { describe, it, expect } from 'vitest'
import { calcularIndicadores, montarMensagensRelatorio, planilhasResumo, situacaoDoPar } from '@/application/resumo/ResumoExecutivo'
import type { EscopoRevisao, LinhaRevisao, ParUnico } from '@/domain/models/RevisaoIA'
import type { FiscalDocument } from '@/domain/models/FiscalDocument'
import { resultadoValido } from '../helpers'
import type { ResultadoIA } from '@/domain/models/RevisaoIA'

function par(id: string, valor: number, extra: Partial<ParUnico> = {}): ParUnico {
  return {
    id, cfop: '5101', descricaoCfop: 'Venda de produção', cstAtual: '000', cClassTribAtual: '000001', descricoesExemplo: ['x'], tiposDocumento: ['NFE'],
    ncms: [], qtdNcms: 0, qtdItens: 1, valorTotal: valor, enquadramentos: [{ grupo: 'II', subgrupo: 'Venda de Produção', essencia: 'e' }], sinalizacoes: [], ...extra,
  }
}
function linha(p: ParUnico, r?: Partial<ResultadoIA>, validacaoOk = true): LinhaRevisao {
  return {
    par: p, tentativas: ['Vaga 1'], revisaoHumanaObrigatoria: false,
    ...(r ? { resultado: resultadoValido(p.id, r) as unknown as ResultadoIA, validacao: { ok: validacaoOk, problemas: validacaoOk ? [] : ['cClassTrib inexistente'] }, modeloJulgador: 'openrouter::m1:free' } : { erro: 'Nenhum modelo conseguiu julgar o par.' }),
  }
}

const escopo: EscopoRevisao = { regimesNoEscopo: ['RPA'], itensNoEscopo: 4, valorNoEscopo: 1000, itensForaDoEscopo: 1, valorForaDoEscopo: 50, porRegime: {} }
const doc = {
  access_key: '1', document_type: 'NFE', version: '4.00', issue_date: '2026-02-01T10:00:00-03:00', purpose: 'NORMAL', tax_regime: 'RPA',
  issuer: { cnpj_cpf: '12345678000190', name: 'Mineração Exemplo Ltda' }, receiver: { cnpj_cpf: '99999999000199', name: 'Cliente' },
  total_value: 1050, totals: {}, status: 'VALID', source_filename: 'x.xml', raw_xml: '', items: [],
} as unknown as FiscalDocument

describe('ResumoExecutivo', () => {
  const pConforme = par('P1', 600)
  const pDiverge = par('P2', 300, { cfop: '6101' })
  const pSem = par('P3', 80, { cstAtual: '', cClassTribAtual: '', sinalizacoes: ['sem_classificacao'] })
  const pNaoJulgado = par('P4', 20)
  const pares = [pConforme, pDiverge, pSem, pNaoJulgado]
  const linhas = [
    linha(pConforme, { parecer: 'CONCORDA' }),
    linha(pDiverge, { parecer: 'DIVERGE', cst_proposto: '410', cclasstrib_proposto: '410999' }),
    linha(pSem, { parecer: 'PROPOSTA_INICIAL' }),
    linha(pNaoJulgado),
  ]

  it('classifica a situação de cada par (concordância com validação reprovada conta como divergência)', () => {
    expect(situacaoDoPar(pConforme, linhas[0])).toBe('conforme')
    expect(situacaoDoPar(pConforme, linha(pConforme, { parecer: 'CONCORDA' }, false))).toBe('divergente')
    expect(situacaoDoPar(pSem, linhas[2])).toBe('semClassificacao')
    expect(situacaoDoPar(pNaoJulgado, linhas[3])).toBe('naoJulgado')
  })

  it('mede a conformidade por valor (D27) e por pares', () => {
    const ind = calcularIndicadores({ documentos: [doc], cnpjRaiz: '12345678', escopo, pares, linhas })
    expect(ind.conformidade.conforme).toEqual({ pares: 1, valor: 600 })
    expect(ind.conformidade.divergente).toEqual({ pares: 1, valor: 300 })
    expect(ind.conformidade.indicePorValor).toBeCloseTo(600 / 900)
    expect(ind.conformidade.indicePorPares).toBeCloseTo(0.5)
    expect(ind.empresa.razaoSocial).toBe('Mineração Exemplo Ltda')
    expect(ind.principaisOperacoes[0]).toMatchObject({ cfop: '5101', valor: 700 })
    expect(ind.pontos[0]).toMatchObject({ tipo: 'Divergência', par: 'P2', proposta: '410 / 410999' })
    expect(ind.pontos.map((p) => p.tipo)).toEqual(expect.arrayContaining(['Divergência', 'Sem classificação', 'Não julgado']))
  })

  it('sem revisão, o índice fica indefinido e tudo aparece como não julgado', () => {
    const ind = calcularIndicadores({ documentos: [doc], cnpjRaiz: '12345678', escopo, pares, linhas: [] })
    expect(ind.revisao.realizada).toBe(false)
    expect(ind.conformidade.indicePorValor).toBeNull()
    expect(ind.conformidade.naoJulgado.valor).toBe(920)
  })

  it('monta as abas do Excel e as mensagens do relatório', () => {
    const ind = calcularIndicadores({ documentos: [doc], cnpjRaiz: '12345678', escopo, pares, linhas })
    const abas = planilhasResumo(ind, { texto: '## Contexto\nTexto', modelo: 'gemini::gemini-3.8-flash' })
    expect(abas.map((a) => a.nome)).toEqual(['Resumo Executivo', 'Principais Operações', 'Pontos de Atenção'])
    expect(abas[0]!.linhas.some((l) => l.Valor === '66,7%')).toBe(true)
    const [sistema, usuario] = montarMensagensRelatorio(ind)
    expect(sistema!.content).toMatch(/literal/i)
    expect(usuario!.content).toContain('"indice_por_valor_pct":66.7')
  })
})
