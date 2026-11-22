/**
 * Configuração do Next.js com cabeçalhos de segurança.
 *
 * Content-Security-Policy (CSP): além de bloquear iframes e conteúdo de terceiros, limita
 * as conexões do navegador à própria aplicação e aos dois provedores de IA. Se algum
 * script malicioso fosse injetado, ele não conseguiria enviar as chaves a outro endereço.
 * Ao acrescentar um provedor (ex.: NVIDIA), inclua o domínio em connect-src.
 */
import type { NextConfig } from 'next'

const desenvolvimento = process.env.NODE_ENV !== 'production'

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${desenvolvimento ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://openrouter.ai https://generativelanguage.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  // O lint roda em "npm run verificar"; não bloqueia o build na Vercel.
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ]
  },
}

export default nextConfig
