import { describe, it, expect } from 'vitest'
import { montarPromptSistema, montarMensagens } from '@/application/ia/MontadorPrompt'
import { lerConhecimento } from '../helpers'

describe('MontadorPrompt', () => {
  const base = {
    promptMestre: lerConhecimento('Prompt-Mestre-RTC.md'),
    grupamentos: lerConhecimento('Grupamentos-CFOP.md'),
    classificacaoJson: lerConhecimento('classificacao_tributaria.json'),
  }

  it('insere a matriz e a tabela completas no lugar dos marcadores', () => {
    const prompt = montarPromptSistema(base)
    expect(prompt).not.toContain('{{GRUPAMENTOS_CFOP}}')
    expect(prompt).not.toContain('{{CLASSIFICACAO_TRIBUTARIA}}')
    expect(prompt).toContain('Grupo=>**Venda de Produção**')
    expect(prompt).toContain('"Código da Classificação Tributária":"000001"')
    // as 138 classificações vão inteiras
    expect((prompt.match(/"Código da Classificação Tributária"/g) ?? []).length).toBe(138)
  })

  it('monta a mensagem do lote no formato da seção 8', () => {
    const [sistema, usuario] = montarMensagens('S', [{ id: 'P1', cfop: '5101', ncm: '1', cstAtual: '000', cClassTribAtual: '000001', descricoesExemplo: ['a'], tiposDocumento: ['NFE'], direcoes: ['SAIDA'], qtdItens: 2, valorTotal: 3, enquadramentos: [], sinalizacoes: ['cfop_fora_matriz'] }])
    expect(sistema).toEqual({ role: 'system', content: 'S' })
    const json = JSON.parse(usuario!.content.slice(usuario!.content.indexOf('{')))
    expect(json.pares[0]).toMatchObject({ id: 'P1', cst_atual: '000', cclasstrib_atual: '000001', sinalizacoes: ['cfop_fora_matriz'], grupos_matriz_humana: [] })
  })
})
