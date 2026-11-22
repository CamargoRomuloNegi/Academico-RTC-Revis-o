# Registro de Decisões — Extrator XML RTC

> As decisões e o planejamento são do Prof. Camargo. Este registro é mantido em colaboração com Claude (Anthropic) e serve de base para a documentação da fase de construção.
> Última atualização: 22/11/2026

## Decisões fechadas

| # | Tema | Decisão |
|---|---|---|
| D01 | Hospedagem | Vercel, pensada para alunos não técnicos. |
| D02 | Processamento | Os XMLs são lidos e processados **no navegador**, sem banco de dados e sem persistência. O Web Worker ficou como evolução (ADR-0002). |
| D03 | Volume | Análise por cliente. Lotes típicos de até 10 MB; o professor já testou até 100 MB. |
| D04 | Documentos | NF-e (55), NFC-e (65), CT-e (57) e NFS-e Nacional. ABRASF continua fora do escopo. |
| D05 | Saída da extração | O padrão do professor: aba **Documentos** (resumo totalizado) e aba **Itens Analítico**. |
| D06 | Base da IA | ~~Itens aglutinados por CFOP + NCM + CST + cClassTrib~~ (190 pares no exemplo de 468 itens). **Substituída por D21 na v1.1.** |
| D07 | Papel da IA | Julgar cada par pela matriz do professor: concordar com o CST/cClassTrib existente ou propor outro, com fundamentação. |
| D08 | Itens sem classificação | A IA propõe do zero (parecer "PROPOSTA_INICIAL"). |
| D09 | CFOP fora da matriz | A linha sai marcada "cfop_fora_matriz", a IA julga pela essência e a revisão humana é obrigatória. |
| D10 | CFOP em mais de um grupo | Limitação proposital: a linha sai marcada e a revisão humana é obrigatória. |
| D11 | Modelos | 5 modelos `:free` do OpenRouter, escolhidos um a um pelo usuário na tela de configuração (lista buscada ao vivo), e o **Gemini** (API gratuita) como 6º, de fallback. Tudo parametrizável no momento da execução. |
| D12 | Controle de cota | O código instrumenta as chamadas de cada modelo (requisições por minuto e por dia) para não estourar o limite. |
| D13 | Rastreabilidade | O Excel final mostra **qual modelo julgou** cada linha, para o aluno comparar os modelos. |
| D14 | Secrets | O usuário envia um arquivo padrão, que fica só em memória: nada de localStorage, cookie ou URL. As variáveis da Vercel ficam como alternativa. |
| D15 | LGPD | Não se aplica tratamento adicional: os dados são do cliente, sob responsabilidade do contador. Sem anonimização. |
| D16 | Autenticação | Fora do escopo agora. O Clerk fica como evolução no roadmap. |
| D17 | Entrega | Repositório novo, entregue em .zip completo e funcional. |
| D18 | Documentação | README e ADRs voltados à manutenção, um `PASSO_A_PASSO.md` escrito a cada etapa e créditos explícitos: planejamento e decisões do professor, desenvolvimento em colaboração com Claude. |
| D19 | Prompt | Versão para automação: `Prompt-Mestre-RTC_automacao_v1.md`, com saída em JSON validada pelo código. |
| D20 | Matriz | `Grupamentos-CFOP_rev1.md`: grafia corrigida, códigos curtos saneados e limitações marcadas. |

## Ajustes da construção (v1.0.0)

- NFS-e: o código de tributação nacional (cTribNac) não é tratado como CFOP na aglutinação. O par sai com CFOP vazio, é julgado pela essência do serviço e fica marcado para revisão humana.
- Os detalhes técnicos de cada decisão estão nos ADRs (`docs/adr/`).

## Decisões da rodada 2 (22/11/2026, após o primeiro uso real) — implementadas na v1.1

| # | Tema | Decisão |
|---|---|---|
| D21 | Corte da revisão | Os pares passam a ser **CFOP + CST + cClassTrib**. O NCM sai do corte. Substitui D06. |
| D22 | NCM e reduções | O NCM **não** é enviado à IA. A ferramenta não confirma nem nega redução de alíquota por produto: a norma exige literalidade quanto ao produto e ao uso, e a coincidência de NCM não basta. Pares com cClassTrib de redução saem marcados para revisão humana. O tema fica como nota acadêmica do professor, não como função da ferramenta. |
| D23 | Escopo por regime | A revisão considera o regime do **emitente**: entram o Regime Normal (CRT 3) e o Simples com excesso de sublimite (CRT 2), que destaca os tributos como um contribuinte comum. Ficam fora o Simples Nacional (CRT 1) e o MEI (CRT 4). Na NFS-e Nacional, vale o mesmo critério pela opção do Simples. A extração continua completa, com a coluna de regime. |
| D24 | Direção | Entrada, saída, neutro e desconhecido **não** entram na análise da IA: dizem respeito ao crédito, não à classificação, e o CFOP já carrega o sentido da operação. A direção fica só como dado descritivo da extração. |
| D25 | Paralelismo | As vagas do OpenRouter passam a trabalhar ao mesmo tempo, cada uma com o seu lote, respeitando as cotas por minuto e por dia. |
| D26 | Resumo executivo | Nova etapa final: painel na tela (imprimível em PDF) e aba "Resumo Executivo" no Excel, com amostra, empresa, principais operações, nível de conformidade e relatório executivo com os pontos prioritários. |
| D27 | Conformidade | Medida **por valor (R$)**, com a quantidade de pares ao lado, por ser mais relevante para o saneamento dos erros. |
| D28 | Modelo do resumo | O relatório executivo é gerado pelo **Gemini** (via API do Google), com modelo próprio configurável (sugestão: Pro, com Flash de reserva). |
| D29 | Tabela oficial de CFOP | A tabela do Siscomex (`cfop.xlsx`) entra como 4º arquivo da base de conhecimento, substituível: descrição oficial nas planilhas e na tela, apoio à IA nos CFOPs fora da matriz e sinalização de CFOP inexistente. A matriz do professor continua sendo a âncora de decisão e não pretende cobrir todos os CFOPs. |
| D30 | Documentação para IA | A documentação ganha uma seção para IA (prompt de reprodução do projeto) e um conjunto SDD: especificação, funções, decisões, arquitetura e fluxos. |
| D31 | Descrições de produto | As descrições de exemplo dos itens continuam indo para a IA, para que ela entenda a essência da operação, com a regra da literalidade (D22) valendo também para elas. |

## Ajustes da construção (v1.1.0)

- Documentos com regime **não identificado** (sem CRT ou com valor desconhecido) entram no escopo por padrão, para não passarem sem análise. O usuário pode retirá-los na tela.
- Na NFS-e Nacional, o campo `opSimpNac` não distingue o excesso de sublimite: optante ME/EPP fica como Simples Nacional (fora do escopo padrão) e não optante como Regime Normal.
- Mudar o escopo de regimes reinicia a revisão, porque os pares e seus identificadores mudam.
- O relatório executivo envia ao Gemini a razão social e o CNPJ raiz da empresa analisada, além dos números consolidados.

## Pendências com o professor

- P01: confirmar as movimentações da revisão 1 (124/125 para o Grupo I e 216 para o Grupo III).
- P02: o "163" seria o CFOP 2931? E qual era a origem dos 12 códigos sem correspondência (133, 142, 143, 158, 174, 183, 243–246, 30, 31)?
- ~~P03~~ **Encerrada em 22/11/2026:** o professor decidiu não se prender ao escopo de CFOPs; a tabela oficial entra como instrumento de base para os alunos ponderarem sobre os CFOPs fora da matriz. (Texto original: incluir na matriz os CFOPs 5911, 5916, 5949, 6911 e 6916 e os CFOPs cooperativos de 2024 (1213–1215, 5213–5215 e espelhos)?)
- ~~P04~~ **Encerrada em 22/11/2026:** implementada como proposta. (Texto original: tamanho do lote por chamada (proposta: cerca de 10 pares) e o que fazer quando todos os 6 modelos falharem (proposta: a linha sai "não julgada" e pode ser reprocessada).)
- ~~P05~~ **Encerrada em 22/11/2026:** a tabela é usada como está. (Texto original: a tabela do Siscomex tem vigência mais recente em 06/2021, um CFOP repetido (2652) e algumas descrições iguais em códigos distintos (ex.: 5213, 5214 e 5215). O próprio arquivo avisa que o CONFAZ é a fonte oficial. Confirmar se usamos esta tabela como está ou se ela deve ser conferida com o Ajuste SINIEF vigente.)
