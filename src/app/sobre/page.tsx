/**
 * Sobre e créditos: autoria, colaboração, origem dos módulos e princípios do projeto.
 */
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Cartao } from '@/components/ui/Cartao'

const ORIGENS = [
  ['Parsers NF-e, NFC-e, CT-e e NFS-e, detecção de tipo, CNPJ raiz e direção', 'comercial-assistida-xml (Prof. Camargo)'],
  ['Padrão de planilha Documentos + Itens Analítico', 'comercial-assistida-xml (Prof. Camargo)'],
  ['Identidade visual (design tokens, tipografia)', 'comercial-assistida-xml (Prof. Camargo)'],
  ['Cliente de IA compatível com OpenAI, retentativa, redator de segredos, chaves só em memória', 'ITSA-Agente (Prof. Camargo), portado de Python para TypeScript'],
  ['Prompt Mestre, matriz de decisão e Grupamentos-CFOP', 'Prof. Camargo (adaptados para automação em lote)'],
  ['Escopo por regime do emitente, corte CFOP + CST + cClassTrib, regra da literalidade nas reduções e resumo executivo por valor', 'Decisões do Prof. Camargo na rodada 2 (v1.1)'],
  ['Tabela oficial de CFOP', 'Portal Siscomex (gov.br); o CONFAZ é o detentor oficial do CFOP'],
  ['Leitor de XSD, extrator por caminho, aglutinação, orquestrador com rodízio, paralelismo e fallback, controle de cota, painel executivo, exportação xls/csv/txt', 'Novos neste projeto'],
]

export default function PaginaSobre() {
  return (
    <>
      <CabecalhoPagina
        titulo="Sobre e créditos"
        descricao="Ferramenta acadêmica para mostrar, em etapas, como se constrói uma automação com IA aplicada à Reforma Tributária do Consumo."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <Cartao titulo="Autoria">
          <p className="text-[0.88rem] leading-relaxed text-[var(--color-text-secondary)]">
            <strong className="text-[var(--color-text-primary)]">Planejamento, decisões e metodologia:</strong> Prof. Camargo, autor da matriz de
            decisão RTC, do Prompt Mestre e dos projetos de origem.
          </p>
          <p className="mt-3 text-[0.88rem] leading-relaxed text-[var(--color-text-secondary)]">
            <strong className="text-[var(--color-text-primary)]">Desenvolvimento em colaboração direta com Claude (Anthropic):</strong> análise de
            viabilidade, arquitetura, código, testes e documentação, sempre a partir das decisões do professor.
          </p>
        </Cartao>
        <Cartao titulo="Princípios">
          <ul className="list-disc space-y-1.5 pl-5 text-[0.85rem] text-[var(--color-text-secondary)]">
            <li>Sem banco de dados e sem persistência: tudo vive na memória da aba.</li>
            <li>XMLs processados no navegador; só os pares únicos (sem NCM e sem dados de pessoas) vão para a IA escolhida.</li>
            <li>Reduções de alíquota exigem literalidade: a ferramenta sinaliza, o profissional decide.</li>
            <li>Chaves de API só em memória, nunca gravadas nem exibidas.</li>
            <li>Módulos independentes, para crescer sem quebrar o que já existe.</li>
            <li>A IA apoia, mas não substitui, o julgamento profissional.</li>
          </ul>
        </Cartao>
      </div>
      <Cartao titulo="De onde vem cada parte" className="mt-5">
        <table className="tabela">
          <thead><tr><th>Parte</th><th>Origem</th></tr></thead>
          <tbody>{ORIGENS.map(([parte, origem]) => <tr key={parte}><td>{parte}</td><td className="text-[var(--color-text-secondary)]">{origem}</td></tr>)}</tbody>
        </table>
      </Cartao>
    </>
  )
}
