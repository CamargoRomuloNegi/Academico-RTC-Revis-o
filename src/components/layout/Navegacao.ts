/**
 * Mapa das etapas da aplicação (usado pela barra lateral e pela tela inicial).
 * Para acrescentar um módulo: crie a página em src/app/<rota>/page.tsx e inclua-a aqui.
 */
import { BookOpen, Bot, Database, Download, FileUp, Home, Info, ListChecks, Settings2 } from 'lucide-react'

export const ETAPAS = [
  { href: '/', rotulo: 'Início', descricao: 'Visão geral', icone: Home, modulo: '' },
  { href: '/catalogo', rotulo: 'Catálogo XSD', descricao: 'Esquemas oficiais', icone: Database, modulo: 'Módulo 1' },
  { href: '/campos', rotulo: 'Campos', descricao: 'O que extrair', icone: ListChecks, modulo: 'Módulo 2' },
  { href: '/extracao', rotulo: 'Leitura e processamento', descricao: 'XML ou .zip', icone: FileUp, modulo: 'Módulos 3 e 4' },
  { href: '/exportacao', rotulo: 'Exportação', descricao: 'xlsx, xls, csv, txt', icone: Download, modulo: 'Módulo 5' },
  { href: '/ia/configuracao', rotulo: 'Configurar IA', descricao: 'Chaves e modelos', icone: Settings2, modulo: 'Módulo 6' },
  { href: '/ia/revisao', rotulo: 'Revisão por IA', descricao: 'Matriz de decisão', icone: Bot, modulo: 'Módulo 6' },
] as const

export const LINKS_APOIO = [
  { href: '/ajuda', rotulo: 'Passo a passo', icone: BookOpen },
  { href: '/sobre', rotulo: 'Sobre e créditos', icone: Info },
] as const
