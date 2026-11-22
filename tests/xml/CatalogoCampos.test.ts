import { describe, it, expect } from 'vitest'
import { CATALOGO_CAMPOS, PRESETS } from '@/application/catalogo/CatalogoCampos'

const RAIZ = { NFE: 'NFe/', NFCE: 'NFe/', CTE: 'CTe/', NFSE: 'NFSe/' } as const

describe('CatalogoCampos', () => {
  it('não repete campos (id = tipo + caminho)', () => {
    const ids = CATALOGO_CAMPOS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todo caminho começa pela raiz do documento e não tem barras soltas nem espaços', () => {
    for (const c of CATALOGO_CAMPOS) {
      expect(c.caminho.startsWith(RAIZ[c.tipo]), c.id).toBe(true)
      expect(c.caminho, c.id).not.toMatch(/\/\/|\/$|\s/)
    }
  })

  it('campos de item da NF-e/NFC-e passam por det', () => {
    for (const c of CATALOGO_CAMPOS.filter((x) => x.tipo === 'NFE' || x.tipo === 'NFCE')) {
      expect(c.nivel === 'item', c.id).toBe(c.caminho.split('/').includes('det'))
    }
  })

  it('os presets têm ids únicos e o padrão não acrescenta colunas', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length)
    expect(CATALOGO_CAMPOS.filter(PRESETS.find((p) => p.id === 'padrao')!.filtro)).toHaveLength(0)
    expect(CATALOGO_CAMPOS.filter(PRESETS.find((p) => p.id === 'reforma')!.filtro).length).toBeGreaterThan(0)
  })
})
