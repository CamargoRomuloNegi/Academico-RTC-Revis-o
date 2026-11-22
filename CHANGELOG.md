# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versões seguem [SemVer](https://semver.org/lang/pt-BR/).

## [1.1.0] — 22/11/2026

Rodada 2, após o primeiro uso real com uma massa de 486 pares (decisões D21 a D31).

### Mudado

- **Corte da revisão:** pares por CFOP + CST + cClassTrib (antes também por NCM). Os NCMs de maior valor ficam na planilha só para conferência humana (D21).
- **NCM e direção fora da IA:** os pares não levam mais NCM nem direção da operação (D22, D24).
- **Chamadas em paralelo:** as vagas ativas do OpenRouter julgam lotes ao mesmo tempo, com reserva atômica de cota (D25). Opção "Vagas em paralelo" na configuração.
- **Regime do emitente:** CRT 2 (Simples com excesso de sublimite) e CRT 4 (MEI) agora são distinguidos do CRT 1.
- **Prompt Mestre v1.1:** regra da literalidade nas reduções, novas sinalizações e descrição oficial do CFOP na entrada.
- O trabalho de revisão exportado começa pelas abas do resumo executivo e traz a descrição oficial do CFOP.

### Incluído

- **Escopo por regime do emitente** (D23): Regime Normal, excesso de sublimite e não identificado por padrão; Simples Nacional e MEI fora. Contagem do que ficou fora, por regime.
- **Tabela oficial de CFOP** (fonte: Siscomex) como 4º arquivo da base de conhecimento, substituível por JSON ou pela planilha .xlsx (D29).
- Sinalizações `cfop_inexistente` e `reducao_literalidade`; revisão humana obrigatória também quando a IA propõe um cClassTrib de redução (D22).
- **Módulo 7, Resumo executivo** (D26 a D28): painel com empresa, amostra, conformidade por valor, principais operações, valor por grupo da matriz e pontos de atenção; impressão em PDF; abas no Excel; relatório executivo redigido pelo Gemini (modelo principal e reserva configuráveis).
- Documentação: SDD completa (`docs/sdd/`), seção para IA (`docs/ia/PROMPT_DE_REPRODUCAO.md`), ADR-0007 e ADR-0008.
- 181 testes automatizados (eram 162).

## [1.0.0] — 22/11/2026

Primeira versão, construída na sessão inicial de desenvolvimento. Planejamento e decisões do Prof. Camargo; desenvolvimento em colaboração com Claude (Anthropic).

### Incluído

- **Módulo 1, Catálogo XSD:** orientação de onde obter os esquemas oficiais (NF-e/NFC-e, CT-e, NFS-e Nacional), leitor de pacotes XSD (.zip ou .xsd) que gera o dicionário de campos, busca e comparação entre versões.
- **Módulo 2, Campos:** catálogo embarcado de campos extras, pontos de partida prontos, inclusão de campos do XSD e perfis exportáveis em JSON.
- **Módulos 3 e 4, Leitura e processamento:** XMLs soltos e .zip (até dois níveis), detecção do tipo, parsers de NF-e, NFC-e, CT-e e NFS-e Nacional, remoção de duplicatas, detecção da empresa analisada e da direção, registro de avisos e erros.
- **Módulo 5, Exportação:** abas Documentos e Itens Analítico no padrão do professor, em xlsx, xls, csv ou txt, com aba Sobre.
- **Módulo 6, Revisão por IA:** arquivo de segredos só em memória, modos direto e via servidor, 5 vagas do OpenRouter escolhidas a partir da lista ao vivo, Gemini como fallback, controle de cota por minuto e por dia, aglutinação em pares únicos CFOP + NCM + CST + cClassTrib, validação estrutural e semântica das respostas, reprocessamento dos não julgados e trabalho de revisão em Excel (Revisão IA, Comparativo Modelos, Chamadas IA, Sobre).
- Base de conhecimento: `Grupamentos-CFOP.md` (rev1), `Prompt-Mestre-RTC.md` (automação v1) e `classificacao_tributaria.json`.
- Rota `/api/ia` sem estado, com lista fechada de provedores e caminhos.
- Cabeçalhos de segurança (CSP e outros).
- 162 testes automatizados (Vitest).
- Documentação: README, Passo a passo (também na tela /ajuda), Manutenção, Segurança, Registro de Decisões e ADRs 0001 a 0006.
