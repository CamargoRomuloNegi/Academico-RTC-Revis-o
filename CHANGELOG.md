# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versões seguem [SemVer](https://semver.org/lang/pt-BR/).

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
