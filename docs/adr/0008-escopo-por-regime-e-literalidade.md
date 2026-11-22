# ADR-0008: Escopo por regime do emitente, corte sem NCM e literalidade nas reduções

**Situação:** aceito · **Data:** 22/11/2026 · **Relacionado:** D21, D22, D23, D24, D29

## Contexto

No primeiro uso real, uma massa de testes gerou 486 pares (corte CFOP + NCM + CST + cClassTrib) e a revisão ficou lenta. O professor observou que:

- a matriz decide pelo CFOP, e o NCM só multiplica pares com o mesmo julgamento;
- optantes do Simples Nacional e MEI não destacam IBS/CBS como um contribuinte comum, enquanto o Simples com excesso de sublimite (CRT 2) destaca como um RPA;
- a coincidência de NCM não autoriza redução de alíquota: a norma exige literalidade quanto ao produto e ao uso;
- a direção (entrada/saída) diz respeito ao crédito, não à classificação, e confundia a IA.

## Decisão

1. **Corte:** pares por CFOP + CST + cClassTrib. Os NCMs de maior valor ficam no par só para conferência humana na planilha.
2. **Regime do emitente:** o parser distingue CRT 1 (Simples), 2 (excesso de sublimite), 3 (Regime Normal) e 4 (MEI); na NFS-e Nacional, `opSimpNac`. O escopo padrão é Regime Normal, excesso de sublimite e não identificado. A extração continua completa; o escopo vale para a revisão e o resumo, e o que ficou fora é contado por regime.
3. **NCM e direção fora da IA:** `parParaEntrada` não envia esses campos, e o Prompt Mestre v1.1 os retira da entrada.
4. **Literalidade:** quando o cClassTrib (do XML ou proposto) é de redução de alíquota na tabela oficial (coluna "Redução de Alíquota" = Sim), o par recebe a sinalização `reducao_literalidade` e revisão humana obrigatória. A IA é instruída a não confirmar nem negar a redução pelo produto.
5. **Tabela oficial de CFOP** como 4º arquivo da base: descrição oficial na entrada da IA e nas planilhas, e sinalização `cfop_inexistente`. A matriz do professor continua sendo a âncora e não pretende cobrir todos os CFOPs.

## Consequências

- Muito menos pares e chamadas: na massa do professor, a estimativa é cair de 486 para perto de uma centena.
- A ferramenta não automatiza a análise de reduções; ela as evidencia para o profissional. É uma escolha metodológica, registrada como nota acadêmica no Passo a passo.
- Mudar o escopo de regimes muda os pares e seus identificadores; por isso a revisão em andamento é reiniciada quando o escopo muda.
