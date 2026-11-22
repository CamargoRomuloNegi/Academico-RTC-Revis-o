'use client'
/**
 * Tela inicial: explica o fluxo em etapas e mostra o que já foi feito na sessão.
 */
import Link from 'next/link'
import { ArrowRight, Lock } from 'lucide-react'
import { useExtratorStore } from '@/application/store/useExtratorStore'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Aviso } from '@/components/ui/Aviso'
import { ETAPAS } from '@/components/layout/Navegacao'

const EXPLICACAO: Record<string, string> = {
  '/catalogo': 'Entenda os esquemas oficiais (XSD) e, se quiser, carregue um pacote para descobrir todos os campos disponíveis.',
  '/campos': 'Escolha os campos extras que entram na planilha, além do padrão Documentos + Itens Analítico.',
  '/extracao': 'Envie os XMLs (avulsos ou em .zip). O navegador identifica o tipo, lê os dados e classifica entradas e saídas.',
  '/exportacao': 'Baixe os dados brutos em Excel, CSV ou TXT.',
  '/ia/configuracao': 'Carregue o arquivo de chaves e escolha 5 modelos gratuitos do OpenRouter e o Gemini de reserva.',
  '/ia/revisao': 'A IA julga cada par CFOP + CST + cClassTrib pela matriz de decisão e concorda ou propõe outra classificação.',
  '/resumo': 'Painel com a amostra, as principais operações e o nível de conformidade por valor, e o relatório executivo gerado pelo Gemini.',
}

export default function Inicio() {
  const documentos = useExtratorStore((s) => s.documentos.length)
  const campos = useExtratorStore((s) => s.camposSelecionados.length)
  const vagas = useExtratorStore((s) => s.vagas.filter((v) => v.ativo && v.modelo).length)
  const relatorio = useExtratorStore((s) => Boolean(s.relatorio))
  const julgados = useExtratorStore((s) => s.linhasRevisao.filter((l) => l.resultado).length)

  const situacao: Record<string, string | null> = {
    '/campos': campos ? `${campos} campo(s) extra(s)` : null,
    '/extracao': documentos ? `${documentos} documento(s) carregado(s)` : null,
    '/ia/configuracao': vagas ? `${vagas} modelo(s) configurado(s)` : null,
    '/ia/revisao': julgados ? `${julgados} par(es) julgado(s)` : null,
    '/resumo': relatorio ? 'relatório gerado' : null,
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Extrator XML RTC"
        descricao={
          <>
            Uma automação construída em etapas: extrair os dados brutos dos XMLs fiscais (NF-e 55, NFC-e 65, CT-e 57 e NFS-e Nacional),
            escolher os campos, exportar e, por fim, aplicar a <strong>matriz de decisão RTC</strong> com modelos de IA externos para revisar
            CST e cClassTrib à luz da Reforma Tributária do Consumo (LC 214/2025).
          </>
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {ETAPAS.filter((e) => e.href !== '/').map((e, i) => {
          const Icone = e.icone
          return (
            <Link key={e.href} href={e.href} className="cartao group flex flex-col p-5 transition-colors hover:border-[var(--color-primary-soft)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-light)]">
                  <Icone size={17} color="var(--color-primary)" />
                </span>
                <span className="micro-label">Etapa {i + 1} · {e.modulo}</span>
              </div>
              <p className="font-semibold">{e.rotulo}</p>
              <p className="mt-1 flex-1 text-[0.82rem] leading-relaxed text-[var(--color-text-secondary)]">{EXPLICACAO[e.href]}</p>
              <div className="mt-3 flex items-center justify-between text-[0.78rem]">
                <span className="text-[var(--color-valid)]">{situacao[e.href] ?? ''}</span>
                <ArrowRight size={15} className="text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Aviso tipo="info" titulo="Sem banco de dados e sem persistência">
          Tudo acontece na memória desta aba do navegador. Ao recarregar a página, a sessão recomeça do zero. Para guardar a escolha de
          campos, use &quot;Exportar perfil&quot; na etapa Campos.
        </Aviso>
        <Aviso tipo="alerta" titulo="A IA é uma estagiária de alto nível">
          A revisão por IA é um apoio ao julgamento profissional. Confirme as informações sensíveis: a responsabilidade técnica é do
          profissional contábil.
        </Aviso>
      </div>

      <p className="mt-6 flex items-center gap-2 text-[0.76rem] text-[var(--color-text-muted)]">
        <Lock size={13} /> Os XMLs não saem do seu computador. Só os pares únicos (CFOP, NCM, CST, cClassTrib e descrições de exemplo) são
        enviados ao modelo de IA que você escolher, na etapa de revisão.
      </p>
    </>
  )
}
