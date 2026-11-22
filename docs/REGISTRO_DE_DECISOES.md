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
| D06 | Base da IA | Itens aglutinados por **CFOP + NCM + CST + cClassTrib**, sem duplicatas (190 pares no exemplo de 468 itens). |
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

## Pendências com o professor

- P01: confirmar as movimentações da revisão 1 (124/125 para o Grupo I e 216 para o Grupo III).
- P02: o "163" seria o CFOP 2931? E qual era a origem dos 12 códigos sem correspondência (133, 142, 143, 158, 174, 183, 243–246, 30, 31)?
- P03: incluir na matriz os CFOPs 5911, 5916, 5949, 6911 e 6916 e os CFOPs cooperativos de 2024 (1213–1215, 5213–5215 e espelhos)?
- P04: tamanho do lote por chamada (proposta: cerca de 10 pares) e o que fazer quando todos os 6 modelos falharem (proposta: a linha sai "não julgada" e pode ser reprocessada). **Implementado assim, com o lote ajustável na tela; aguarda confirmação.**
