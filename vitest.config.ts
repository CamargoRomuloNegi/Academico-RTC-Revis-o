/**
 * Configuração dos testes unitários (Vitest).
 * Os testes cobrem as camadas puras (domínio, parsers, serviços e IA);
 * as telas são verificadas manualmente seguindo docs/PASSO_A_PASSO.md.
 */
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
