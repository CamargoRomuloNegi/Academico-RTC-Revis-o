'use client'
/**
 * Módulos 3 e 4 · Leitura e processamento: recebe .xml/.zip, identifica e interpreta os
 * documentos, detecta a empresa analisada (CNPJ raiz) e mostra o resultado.
 */
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Trash2 } from 'lucide-react'
import { useExtratorStore } from '@/application/store/useExtratorStore'
import { lerArquivos } from '@/infrastructure/arquivos/LeitorArquivos'
import { enriquecer, processarArquivos, type ProgressoProcessamento } from '@/application/services/ProcessamentoService'
import { formatarData } from '@/application/services/ExportService'
import { formatBRL, formatCnpjCpf } from '@/lib/utils'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Cartao } from '@/components/ui/Cartao'
import { Aviso } from '@/components/ui/Aviso'
import { Selo } from '@/components/ui/Selo'
import { Estatistica } from '@/components/ui/Estatistica'
import { BarraProgresso } from '@/components/ui/BarraProgresso'
import { ZonaArquivos } from '@/components/ui/ZonaArquivos'

const COR_NIVEL = { INFO: 'neutro', WARN: 'alerta', ERROR: 'erro', FATAL: 'erro' } as const

export default function PaginaExtracao() {
  const documentos = useExtratorStore((s) => s.documentos)
  const logs = useExtratorStore((s) => s.logs)
  const cnpjRaiz = useExtratorStore((s) => s.cnpjRaiz)
  const automatico = useExtratorStore((s) => s.cnpjAutomatico)
  const definirDocumentos = useExtratorStore((s) => s.definirDocumentos)
  const acrescentarLogs = useExtratorStore((s) => s.acrescentarLogs)
  const limpar = useExtratorStore((s) => s.limparExtracao)

  const [etapa, setEtapa] = useState<'parado' | 'lendo' | 'processando'>('parado')
  const [progresso, setProgresso] = useState<ProgressoProcessamento | null>(null)
  const [resumo, setResumo] = useState<string | null>(null)
  const [cnpjManual, setCnpjManual] = useState('')
  const [nivelLog, setNivelLog] = useState<'todos' | 'problemas'>('problemas')

  async function receber(arquivos: File[]) {
    setResumo(null)
    setEtapa('lendo')
    try {
      const lidos = await lerArquivos(arquivos, ['.xml'])
      setEtapa('processando')
      const chaves = new Set(documentos.map((d) => d.access_key))
      const r = await processarArquivos(lidos.arquivos, setProgresso, chaves)
      const todos = [...documentos, ...r.documentos]
      const enr = enriquecer(todos, automatico ? null : cnpjRaiz)
      definirDocumentos(enr.documentos, enr.cnpjRaiz, enr.automatico)
      acrescentarLogs([
        ...lidos.ignorados.map((i) => ({ timestamp: new Date().toISOString(), level: 'WARN' as const, category: 'PARSE' as const, source: i.nome, message: i.motivo })),
        ...r.logs,
      ])
      setResumo(`${r.documentos.length} documento(s) novo(s) de ${lidos.arquivos.length} XML(s). ${r.falhas} com erro, ${r.duplicados} repetido(s) e ${lidos.ignorados.length} arquivo(s) ignorado(s).`)
    } finally {
      setEtapa('parado')
      setProgresso(null)
    }
  }

  function aplicarCnpj(valor: string | null) {
    const enr = enriquecer(documentos, valor)
    definirDocumentos(enr.documentos, enr.cnpjRaiz, enr.automatico)
  }

  const porTipo = documentos.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.document_type]: (acc[d.document_type] ?? 0) + 1 }), {})
  const itens = documentos.reduce((s, d) => s + d.items.length, 0)
  const entradas = documentos.filter((d) => d.direction === 'INBOUND').length
  const saidas = documentos.filter((d) => d.direction === 'OUTBOUND').length
  const comRtc = documentos.filter((d) => d.items.some((i) => i.rtc.cst || i.rtc.c_class_trib)).length
  const logsVisiveis = nivelLog === 'todos' ? logs : logs.filter((l) => l.level !== 'INFO')

  return (
    <>
      <CabecalhoPagina
        etapa="Módulos 3 e 4"
        titulo="Leitura e processamento"
        descricao={
          <>
            Envie os XMLs de <strong>um cliente</strong>, avulsos ou em .zip (inclusive .zip dentro de .zip). O navegador identifica cada
            documento pela estrutura do XML, lê os campos e, a partir do CNPJ mais frequente, define o que é <strong>entrada</strong> e o que é{' '}
            <strong>saída</strong> da empresa analisada.
          </>
        }
        acoes={documentos.length > 0 && <button className="botao botao-perigo" onClick={limpar}><Trash2 size={14} /> Limpar sessão</button>}
      />

      <Cartao className="mb-5">
        <ZonaArquivos aceitar=".xml,.zip" titulo={etapa === 'parado' ? 'Arraste os XMLs ou o .zip aqui' : etapa === 'lendo' ? 'Lendo arquivos…' : 'Processando…'} dica="NF-e (55), NFC-e (65), CT-e (57) e NFS-e Nacional. Você pode enviar mais arquivos depois: eles se somam ao lote." desabilitado={etapa !== 'parado'} aoEscolher={receber} />
        {progresso && <div className="mt-4"><BarraProgresso atual={progresso.processados} total={progresso.total} texto={`${progresso.processados} de ${progresso.total} · ${progresso.arquivoAtual}`} /></div>}
        {etapa === 'lendo' && <p className="mt-3 flex items-center gap-2 text-[0.8rem] text-[var(--color-text-muted)]"><Loader2 size={14} className="girando" /> Descompactando…</p>}
        {resumo && <div className="mt-4"><Aviso tipo="sucesso">{resumo}</Aviso></div>}
      </Cartao>

      {documentos.length > 0 && (
        <>
          <div className="mb-5 grid gap-3 md:grid-cols-5">
            <Estatistica rotulo="Documentos" valor={documentos.length} detalhe={Object.entries(porTipo).map(([t, n]) => `${t} ${n}`).join(' · ')} />
            <Estatistica rotulo="Itens" valor={itens} detalhe="linhas da aba Itens Analítico" />
            <Estatistica rotulo="Entradas" valor={entradas} detalhe="empresa = destinatário" />
            <Estatistica rotulo="Saídas" valor={saidas} detalhe="empresa = emitente" />
            <Estatistica rotulo="Com CST/cClassTrib" valor={comRtc} detalhe="documentos com grupo da Reforma" />
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_360px]">
            <Cartao titulo="Prévia dos documentos" descricao="Os 15 primeiros. A planilha completa sai na etapa Exportação.">
              <div className="max-h-[420px] overflow-auto">
                <table className="tabela">
                  <thead><tr><th>Tipo</th><th>Data</th><th>Emitente</th><th>Destinatário</th><th>Direção</th><th className="text-right">Valor</th></tr></thead>
                  <tbody>
                    {documentos.slice(0, 15).map((d) => (
                      <tr key={d.access_key}>
                        <td><Selo cor="primario">{d.document_type}</Selo></td>
                        <td className="font-data whitespace-nowrap text-[0.75rem]">{formatarData(d.issue_date)}</td>
                        <td className="max-w-[200px] truncate" title={d.issuer.name}>{d.issuer.name}<span className="font-data block text-[0.7rem] text-[var(--color-text-muted)]">{formatCnpjCpf(d.issuer.cnpj_cpf)}</span></td>
                        <td className="max-w-[200px] truncate" title={d.receiver.name}>{d.receiver.name}<span className="font-data block text-[0.7rem] text-[var(--color-text-muted)]">{formatCnpjCpf(d.receiver.cnpj_cpf)}</span></td>
                        <td><Selo cor={d.direction === 'INBOUND' ? 'sucesso' : d.direction === 'OUTBOUND' ? 'alerta' : 'neutro'}>{d.direction === 'INBOUND' ? 'Entrada' : d.direction === 'OUTBOUND' ? 'Saída' : 'Indefinida'}</Selo></td>
                        <td className="font-data text-right">{formatBRL(d.total_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Cartao>

            <Cartao titulo="Empresa analisada" descricao="Define entradas e saídas. A detecção automática escolhe o CNPJ raiz (8 primeiros dígitos) mais frequente no lote.">
              <p className="font-data text-[1.1rem]">{cnpjRaiz ?? 'não identificado'}</p>
              <p className="mb-3 text-[0.75rem] text-[var(--color-text-muted)]">{automatico ? 'Detectado automaticamente' : 'Informado manualmente'}</p>
              <div className="flex gap-2">
                <input className="entrada font-data" placeholder="CNPJ ou raiz (8 dígitos)" value={cnpjManual} onChange={(e) => setCnpjManual(e.target.value)} />
                <button className="botao botao-secundario" disabled={cnpjManual.replace(/\D/g, '').length < 8} onClick={() => aplicarCnpj(cnpjManual)}>Aplicar</button>
              </div>
              {!automatico && <button className="botao botao-fantasma botao-pequeno mt-2" onClick={() => aplicarCnpj(null)}>Voltar à detecção automática</button>}
            </Cartao>
          </div>

          <Cartao
            titulo={`Log de processamento (${logsVisiveis.length})`}
            descricao="Cada arquivo deixa um registro. Avisos e erros explicam o que foi ignorado e por quê."
            acoes={
              <select className="entrada w-auto" value={nivelLog} onChange={(e) => setNivelLog(e.target.value as 'todos' | 'problemas')}>
                <option value="problemas">Só avisos e erros</option>
                <option value="todos">Tudo</option>
              </select>
            }
            className="mb-5"
          >
            <div className="max-h-[280px] overflow-auto">
              {logsVisiveis.length === 0 ? <p className="text-[0.8rem] text-[var(--color-text-muted)]">Nenhum aviso ou erro.</p> : (
                <table className="tabela">
                  <tbody>
                    {logsVisiveis.slice(-500).map((l, i) => (
                      <tr key={`${l.timestamp}-${i}`}>
                        <td><Selo cor={COR_NIVEL[l.level]}>{l.level}</Selo></td>
                        <td className="font-data max-w-[260px] truncate text-[0.72rem]" title={l.source}>{l.source}</td>
                        <td className="text-[0.78rem]">{l.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Cartao>

          <div className="flex justify-end">
            <Link href="/exportacao" className="botao botao-primario">Ir para a exportação <ArrowRight size={14} /></Link>
          </div>
        </>
      )}
    </>
  )
}
