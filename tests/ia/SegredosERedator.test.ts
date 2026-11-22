import { describe, it, expect, afterEach } from 'vitest'
import { interpretarArquivoSegredos, guardarChaves, obterChave, resumoChaves, limparChaves } from '@/infrastructure/ia/CofreSegredos'
import { redigir, mascararChave } from '@/infrastructure/ia/Redator'

const OR = 'sk-or-v1-0123456789abcdef0123456789abcdef'
const GM = 'AIzaSyA0123456789abcdefghijklmnopqrstu'

afterEach(() => limparChaves())

describe('Arquivo padrão de segredos', () => {
  it('aceita JSON', () => {
    const r = interpretarArquivoSegredos(JSON.stringify({ openrouter_api_key: OR, gemini_api_key: GM }))
    expect(r.chaves).toEqual({ openrouter: OR, gemini: GM })
    expect(r.avisos).toEqual([])
  })

  it('aceita formato .env, com comentários e aspas', () => {
    const r = interpretarArquivoSegredos(`# chaves\nOPENROUTER_API_KEY="${OR}"\nGEMINI_API_KEY=${GM}\n`)
    expect(r.chaves).toEqual({ openrouter: OR, gemini: GM })
  })

  it('ignora o modelo não preenchido e avisa', () => {
    const r = interpretarArquivoSegredos(JSON.stringify({ openrouter_api_key: 'sk-or-v1-...', gemini_api_key: 'COLE_AQUI' }))
    expect(r.chaves).toEqual({})
    expect(r.avisos[0]).toMatch(/Nenhuma chave/)
  })

  it('avisa quando o prefixo não confere', () => {
    const r = interpretarArquivoSegredos(JSON.stringify({ openrouter_api_key: 'abc123456789' }))
    expect(r.avisos[0]).toMatch(/não começa/)
  })

  it('JSON quebrado vira aviso, não exceção', () => {
    expect(interpretarArquivoSegredos('{ "a": ').avisos[0]).toMatch(/JSON/)
  })
})

describe('Cofre em memória', () => {
  it('guarda, mascara e limpa', () => {
    guardarChaves({ openrouter: OR })
    expect(obterChave('openrouter')).toBe(OR)
    expect(resumoChaves().openrouter).toBe(mascararChave(OR))
    expect(resumoChaves().openrouter).not.toContain('0123456789abcdef0123')
    limparChaves()
    expect(obterChave('openrouter')).toBeUndefined()
  })
})

describe('Redator', () => {
  it('mascara chaves por padrão e por registro', () => {
    expect(redigir(`erro com ${OR} e ${GM}`)).toBe('erro com *** e ***')
    expect(redigir('Authorization: Bearer abcdefghijkl')).not.toContain('abcdefghijkl')
    guardarChaves({ gemini: 'chave-sem-padrao-123' })
    expect(redigir('valor chave-sem-padrao-123')).toBe('valor ***')
  })
})
