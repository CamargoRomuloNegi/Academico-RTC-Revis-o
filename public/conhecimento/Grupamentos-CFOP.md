# Grupamentos-CFOP — Matriz de Decisão RTC (revisão 1)

> **Autoria:** matriz, grupos, essências e fundamentação são do Prof. Camargo.
> **Revisão 1 (22/11/2026):** correções de grafia, saneamento de códigos e marcação de limitações, feitas em colaboração com Claude (Anthropic) e sujeitas à validação do professor.
> O texto técnico de cada grupo não foi alterado, a não ser nos pontos listados abaixo.

## Notas da revisão 1

### 1. Grafia corrigida
- "enda de Mercadoria (Revenda)" → **Venda de Mercadoria (Revenda)**
- "ançamentos Fiscais/Contábeis" → **Lançamentos Fiscais/Contábeis**
- "Baixas Patrimoniais" (marcação Markdown quebrada) → **Baixas Patrimoniais**
- "prestaço" → prestação; "transferncia" → transferência

### 2. Os 19 códigos com menos de 4 dígitos
Conferidos com o Anexo II do Convênio SINIEF s/nº/1970, na consolidação da SEFAZ-SP, e com a cartilha OCB dos CFOPs de ato cooperativo (Ajuste SINIEF 3/2024). Todos foram retirados das listas originais. O destino de cada um:

| Código original | Grupo onde estava | Achado na tabela oficial | Decisão nesta revisão |
|---|---|---|---|
| 124, 125 | III · Entradas Temporárias | 1124/2124 e 1125/2125: "Industrialização efetuada por outra empresa" | Movidos para o **Grupo I**, em um novo subgrupo "Industrialização por Encomenda", espelho dos CFOPs 5124/5125 do Grupo II. **Confirmar.** |
| 128 | III · Entradas Temporárias | 1128/2128/3128: "Compra para utilização na prestação de serviço sujeita ao ISSQN" | Já constava no Grupo I (Bens para Serviço). Retirado do Grupo III. |
| 132 | III · Entradas Temporárias | 1132/2132: "Fixação de preço ... ato cooperativo" | Já constava no Grupo I (Fixação de Preço). Retirado do Grupo III. |
| 216 | IV · Remessa/Retorno Simbólico | 1216/2216 e 5216/6216: devoluções de fornecimento em ato cooperativo | Movido para o **Grupo III** (Devoluções e Retornos), pela essência de devolução. **Confirmar.** |
| 156 | II · Industrialização | 5156/6156: "Transferência de mercadoria ... que não deva por ele transitar" | Já constava no Grupo III (Transferências). Retirado do Grupo II. |
| 163 | IV · Lançamentos | sem correspondência; pela posição (entre 1931 e 6931), deve ser **2931** | **Pendente.** Incluir 2931 se o professor confirmar. |
| 133, 142, 143, 158, 174, 183, 243, 244, 245, 246, 30, 31 | vários | nenhum CFOP vigente termina nesses dígitos | **Pendentes.** Retirados; sem a planilha de origem, não há como reconstruí-los com segurança. |

### 3. CFOPs em mais de um grupo (limitação proposital)
O **6155**, repetido dentro do próprio grupo Transferências, aparece agora uma vez só. Os demais continuam em dois grupos e estão marcados com ⚠️ **LIMITAÇÃO — REVISÃO HUMANA OBRIGATÓRIA**. Na planilha final, essas linhas saem com a marca "Revisão humana obrigatória", seja qual for o parecer da IA.
- **3127, 3129:** Grupo I (Bens para Industrialização) e Grupo V (Regimes Aduaneiros)
- **7207:** Grupo III (Devoluções e Retornos) e Grupo IV (Anulações e Cancelamentos)

### 4. Lacunas observadas (não alteradas; para decisão do professor)
- O Excel de exemplo tem os CFOPs **5911, 5916, 5949, 6911 e 6916**, que a matriz não cobre. Na aplicação, essas linhas saem como "CFOP fora da matriz" e a IA as julga pela essência.
- Há CFOPs de ato cooperativo de 2024 que não estão na matriz: 1213/2213, 1214/2214, 1215/2215 e 5213 a 5215 / 6213 a 6215 (devoluções em fixação de preço e fornecimento).
- O Informe Técnico 2023.002 v2.00 (ago/2026) acrescentou à tabela oficial de CFOP a coluna **indExcIBSCBS**, que indica os CFOPs excluídos da base do IBS/CBS. Vale cruzá-la com os Grupos III e IV numa revisão futura.

---

**I. Aquisições Onerosas (Fato Gerador: SIM):**

Grupo=> **Bens para Industrialização**:

CFOP´s: {1101, 2101, 3101, 1111, 2111, 1401, 2401, 1116, 2116, 1120, 2120, 1122, 2122, 3127, 3129}

⚠️ **LIMITAÇÃO — REVISÃO HUMANA OBRIGATÓRIA:** os CFOPs 3127 (Drawback) e 3129 (RECOF-Sped) também constam no Grupo V (Regimes Aduaneiros). A duplicidade é proposital: o sistema não decide sozinho; a linha sai marcada para julgamento humano.


Essência=> Compra onerosa de insumos/matérias-primas com transferência de titularidade.

Argumentação Técnica (LC 214) => Fornecimento de bens mediante contraprestação, atendendo integralmente ao Art. 4º. O regime ST não altera o Fato Gerador.



Grupo=> **Bens para Comercialização:**

CFOP´s: {1102, 2102, 3102, 1113, 2113, 1403, 2403, 1117, 2117, 1118, 2118, 1121, 2121}

Essência => Compra onerosa de mercadoria para revenda.

Argumentação Técnica (LC 214) => Fornecimento de bens com contraprestação e transferência de titularidade, materialidade típica do IBS/CBS.



Grupo=> **Bens Ativo Imobilizado/Uso e Consumo:**

CFOP´s:{1551, 2551, 3551, 1406, 2406, 1407, 2407, 1556, 2556, 3556}

Essência => Aquisição onerosa de bens para investimento (Imobilizado) ou consumo interno.

Argumentação Técnica (LC 214) =>O Art. 4º é atendido pelo fornecimento de bens mediante contraprestação, independentemente da destinação (ativo imobilizado, uso ou consumo).



Grupo=> **Serviços de Comunicação**

CFOP´s: {1301, 2301, 3301, 1302, 2302, 1303, 2303, 1304, 2304, 1305, 2305, 1306, 2306}

Essência => Aquisição onerosa de serviços de comunicação para diversas finalidades (insumo, uso industrial/comercial, rural).

Argumentação Técnica (LC 214) => A prestação onerosa de serviços constitui fornecimento de serviços para fins do Art. 4º.





Grupo=> **Serviços de Transporte**

CFOP´s:{1351, 2351, 3351, 1352, 2352, 3352, 1353, 2353, 3353, 1354, 2354, 3354, 1355, 2355, 3355, 1356, 2356, 3356, 1360, 1932, 2932}

Essência =>Aquisição onerosa de serviço de transporte, inclusive como insumo e em operações iniciadas em UF diversa.

Argumentação Técnica (LC 214) =>O serviço oneroso de transporte enquadra-se como fornecimento tributável (Art. 4º), sendo irrelevante a figura do "substituto" ou a UF de início.





Grupo=>**Energia Elétrica/Combustível (Aquisição)**

CFOP´s:{1251, 2251, 3251, 1252, 2252, 1253, 2253, 1254, 2254, 1255, 2255, 1256, 2256, 1257, 2257, 1651, 2651, 3651, 1652, 2652, 3652, 1653, 2653, 3653}

Essência =>Aquisição onerosa de bens (energia/combustível) para revenda, industrialização ou consumo final.

Argumentação Técnica (LC 214) =>O fornecimento de bens (energia e combustíveis) mediante contraprestação configura o Fato Gerador (Art. 4º).





Grupo=>**Bens para Serviço (Materiais)**

CFOP´s:{1126, 2126, 3126, 1128, 2128, 3128}

Essência =>Aquisição onerosa de bens que serão empregados na prestação de serviço (insumos).

Argumentação Técnica (LC 214) =>Fornecimento de bens com transferência de titularidade. A aquisição é tributável, independentemente de o serviço final ser sujeito ao ISSQN (o crédito dependerá das regras da LC 214/2025).





Grupo=>**Industrialização por Encomenda (Aquisição do Serviço)**

CFOP´s:{1124, 2124, 1125, 2125}

Essência =>Aquisição onerosa do serviço de industrialização executado por outra empresa (encomendante recebe o produto industrializado).

Argumentação Técnica (LC 214) =>A industrialização por encomenda é fornecimento oneroso de serviço (Art. 4º), espelho dos CFOPs 5124/6124/5125/6125 do Grupo II.

⚠️ **Nota de revisão:** estes códigos estavam registrados como "124, 125" no grupo "Entradas Temporárias / Gratuitas" (Grupo III). Pela descrição oficial ("Industrialização efetuada por outra empresa"), há contraprestação; foram movidos para o Grupo I. Confirmar.



Grupo=>**Fixação de Preço (Cooperativo)**

CFOP´s:{1132, 2132, 1135, 2135}

Essência =>Fixação de preço que formaliza o fornecimento oneroso real, após ato cooperativo preliminar.

Argumentação Técnica (LC 214) =>A fixação de preço representa o momento em que o fornecimento se torna oneroso e tributável.





**II. Prestações/Vendas Onerosas (Fato Gerador: SIM)**



Grupo=>**Venda de Produção**

CFOP´s:{5101, 6101, 7101, 5103, 6103, 5401, 6401, 5402, 6402, 5105, 6105, 7105, 5116, 6116, 5118, 6118, 5111, 6111, 5113, 6113, 5122, 6122, 7127}

Essência =>Fornecimento oneroso de bens produzidos pelo estabelecimento.

Argumentação Técnica (LC 214) =>Atende plenamente ao Art. 4º: fornecimento de bens com preço e transferência de titularidade. O local da entrega (fora do estabelecimento) ou o regime de ST não afetam a materialidade do FG.



Grupo=>**Venda de Mercadoria (Revenda)**

CFOP´s:{5102, 6102, 7102, 5104, 6104, 5106, 6106, 7106, 6108, 5403, 6403, 5405, 6404, 5117, 6117, 5119, 6119, 5120, 6120, 5112, 6112, 5114, 6114, 5115, 6115, 5123, 6123}

Essência =>Fornecimento oneroso de bens adquiridos de terceiros (revenda), inclusive em operações triangulares (venda à ordem).

Argumentação Técnica (LC 214) =>Fato Gerador plenamente configurado (fornecimento + contraprestação). O fluxo logístico ou a aplicação de ST não afastam a incidência.



Grupo=>**Venda de Ativo Imobilizado**

CFOP´s:{5551, 6551, 7551}

Essência =>Venda onerosa de bem integrante do imobilizado.

Argumentação Técnica (LC 214) =>O Art. 4º é atendido pelo fornecimento de bem mediante contraprestação, independentemente de sua classificação contábil (ativo não circulante).



Grupo=>**Prestação de Serviço (Industrialização)**

CFOP´s:{5124, 6124, 5125, 6125}

Essência =>Prestação onerosa de serviço de industrialização para terceiros.

Argumentação Técnica (LC 214) =>Industrialização para terceiros é fornecimento oneroso de serviço.



Grupo=>**Prestação de Serviço (Comunicação)**

CFOP´s:{5301, 6301, 7301, 5302, 6302, 5303, 6303, 5304, 6304, 5305, 6305, 5306, 6306, 5307, 6307}

Essência =>Prestação onerosa de serviços de comunicação para diversos destinatários.

Argumentação Técnica (LC 214) =>A prestação onerosa de serviços enquadra-se no Art. 4º.



Grupo=>**Prestação de Serviço (Transporte)**

CFOP´s:{5351, 6351, 5352, 6352, 5353, 6353, 5354, 6354, 5355, 6355, 5356, 6356, 5357, 6357, 5359, 6359, 5360, 6360, 5932, 6932, 7358}

Essência =>Prestação onerosa de serviço de transporte, inclusive como insumo (subcontratação).

Argumentação Técnica (LC 214) =>O serviço de transporte é fornecimento oneroso de serviço (Art. 4º). Regimes de responsabilidade tributária não alteram a materialidade do FG.



Grupo=>**Energia Elétrica/Combustível (Venda)**

CFOP´s:{5251, 6251, 5252, 6252, 5253, 6253, 5254, 6254, 5255, 6255, 5256, 6256, 5257, 6257, 5258, 6258, 5651, 6651, 7651, 5652, 6652, 5653, 6653, 5654, 6654, 7654, 5655, 6655, 5656, 6656, 5667, 6667, 7667}

Essência =>Fornecimento oneroso de bens (energia e combustíveis) para distribuição, industrialização ou consumo final.

Argumentação Técnica (LC 214) =>Fato gerador plenamente configurado (Art. 4º): Fornecimento oneroso de bem com transferência de titularidade ou controle.



Grupo=>**Remuneração Produtor Rural**

CFOP´s:{1456}

Essência =>Remuneração que configura prestação de serviço onerosa no âmbito do sistema de integração.

Argumentação Técnica (LC 214) =>A remuneração é uma contraprestação que atende integralmente ao Art. 4º, sendo receita de serviço.



Grupo=>**Fixação de Preço (Cooperativo)**

CFOP´s:{5132, 6132}

Essência =>Formalização onerosa de fornecimento no âmbito cooperativo.

Argumentação Técnica (LC 214) =>A fixação de preço define a onerosidade e o fornecimento real, gerando débito de IBS/CBS.



**III. Movimentações Técnicas e Logísticas (Fato Gerador: NÃO)**



Grupo=>**Transferências Internas**

CFOP´s:{1151, 2151, 1152, 2152, 1153, 2153, 1154, 2154, 1552, 2552, 5552, 6552, 1557, 2557, 5557, 6557, 5151, 6151, 5152, 6152, 5153, 6153, 5658, 6658, 5659, 6659, 6155, 5155, 5408, 6408, 1408, 2408, 1409, 2409, 5156, 6156}

Essência =>Movimentação de bens/ativos entre estabelecimentos do mesmo titular, sem contraprestação ou mudança de titularidade jurídica.

Argumentação Técnica (LC 214) =>Não há fornecimento oneroso nem transferência de titularidade (mesmo sujeito passivo), não atendendo ao Art. 4º.



Grupo=>**Devoluções e Retornos (Anulação)**

CFOP´s:{1201, 2201, 3201, 5201, 6201, 7201, 5202, 6202, 7202, 7207, 5410, 6410, 5553, 6553, 7553, 5556, 6556, 7556, 5555, 6555, 1553, 2553, 3553, 1660, 2660, 1661, 2661, 1662, 2662, 5918, 6918, 5209, 6209, 5208, 6208, 1918, 2918, 1208, 2208, 5411, 6411, 5412, 6412, 5413, 6413, 1904, 2904, 5909, 6909, 1921, 2921, 1554, 2554, 1216, 2216, 5216, 6216}

⚠️ **LIMITAÇÃO — REVISÃO HUMANA OBRIGATÓRIA:** o CFOP 7207 também consta no Grupo IV (Anulações e Cancelamentos). Duplicidade proposital; revisão humana obrigatória.


Essência =>Movimentações que desfazem uma operação anterior (compra/venda) ou que representam retorno logístico de bens próprios ou de terceiros.

Argumentação Técnica (LC 214) =>Operações reversas: ausência de fornecimento novo e de contraprestação, impedindo o Fato Gerador (Art. 4º).

Pontos de atenção=> Necessário avaliar a origem, a fim de que a anulação e devolução promova o efeito da neutralidade tributária (necessário analisar operação de origem).



Grupo=>**Remessas Logísticas / Operacionais**

CFOP´s:{5901, 6901, 5904, 6904, 5905, 6905, 5915, 6915, 5917, 6917, 5920, 6920, 5554, 6554, 5663, 6663, 5924, 6924, 5903, 6903, 5912, 6912, 5914, 6914, 5657, 6657, 5451, 6451, 5452, 6452, 5455, 6455}

Essência =>Envio de bens para conserto, demonstração, comodato, depósito, ou venda externa, sem transferência de titularidade.

Argumentação Técnica (LC 214) =>Ausência de fornecimento oneroso (Art. 4º). Trata-se de movimentação técnica ou preparatória, fora do campo de incidência.





Grupo=>**Entradas Temporárias / Gratuitas**

CFOP´s:{1911, 2911, 1908, 2908, 1910, 2910, 1915, 2915, 1917, 2917, 1905, 2905, 1912, 2912}

Essência =>Entrada de amostras, brindes, comodato, bens para conserto ou depósito.

Argumentação Técnica (LC 214) =>Ausência de contraprestação ou de transferência definitiva de titularidade afasta o Fato Gerador.



Grupo=>**Atos Cooperativos (Não Onerosos)**

CFOP´s:{1131, 2131, 1159, 2159, 5159, 6159, 5160, 6160, 5131, 6131}

Essência =>Fornecimento ou entrada de bens em ato cooperativo típico, sem natureza mercantil.

Argumentação Técnica (LC 214) =>Atos cooperativos, por definição jurídica, não constituem operações de mercado e, portanto, não geram FG (Art. 4º).





**IV. Operações Administrativas e Simbólicas (Fato Gerador: NÃO)**



Grupo=>**Anulações e Cancelamentos (Aquis./Prest.)**

CFOP´s:{5205, 6205, 7205, 5206, 6206, 7206, 5207, 6207, 7207, 1205, 2205, 3205, 1206, 2206, 3206, 1207, 2207, 3207}

⚠️ **LIMITAÇÃO — REVISÃO HUMANA OBRIGATÓRIA:** o CFOP 7207 também consta no Grupo III (Devoluções e Retornos). Duplicidade proposital; revisão humana obrigatória.


Essência =>Reversão de operações anteriores.

Argumentação Técnica (LC 214) =>Anulação não constitui novo fornecimento nem contraprestação (Art. 4º). Operação corretiva.





Grupo=>**Lançamentos Fiscais/Contábeis**

CFOP´s:{1601, 1602, 1603, 2603, 5603, 6603, 5601, 5602, 5605, 1604, 1926, 5926, 1922, 2922, 5922, 6922, 1931, 6931, 5931, 5929, 6929}

Essência =>Ajustes de crédito/débito de tributos legados (ICMS), reclassificação de estoque (kits) ou faturamento simbólico.

Argumentação Técnica (LC 214) =>Nenhuma destas operações representa fornecimento de bens/serviços com contraprestação. São atos fiscais ou contábeis.


Grupo=>**Baixas Patrimoniais**

CFOP´s:{5927, 5928}

Essência =>Baixa de estoque por perda, roubo ou encerramento.

Argumentação Técnica (LC 214) =>Ausência de fornecimento ou circulação econômica onerosa.





Grupo=>**Remessa/Retorno Simbólico**

CFOP´s:{1907, 2907, 5907, 6907, 5923, 6923, 5919, 6919, 1919, 2919}

Essência =>Movimentação meramente documental para regularização (ex: depósito, consignação).

Argumentação Técnica (LC 214) =>Não há circulação fática nem fornecimento. São atos formais que não atendem ao Art. 4º.





**V. Regimes Especiais, Imunidade e Exclusão Constitucional (SIM FG/NÃO Incidência)**



Grupo=>**ISSQN (Exclusão)**

CFOP´s:{1933, 2933, 5933, 6933}

Essência =>Aquisição ou Prestação de serviços sujeitos à LC 116/2003 (ISSQN).

Argumentação Técnica (LC 214) =>Operação onerosa (SIM), mas fora da competência do IBS/CBS por determinação constitucional (regra pós-EC 132/2023). Incide apenas ISS.



Grupo=>**Exportação / ZFM (Não Incidência)**

CFOP´s:{5109, 6109, 5110, 6110, 5501, 6501, 5502, 6502, 5504, 6504, 5505, 6505, 7501, 7504, 7552}

Essência =>Vendas (fornecimento) destinadas à exportação (imunidade) ou à Zona Franca de Manaus/Áreas de Livre Comércio (não incidência específica).

Argumentação Técnica (LC 214) =>O Fato Gerador existe na materialidade (fornecimento oneroso), mas a cobrança é legalmente afastada pela não-incidência constitucional/LC 214.





Grupo=>**Regimes Aduaneiros**

CFOP´s:{3127 (Drawback), 3129 (RECOF-Sped), 5129, 6129}

⚠️ **LIMITAÇÃO — REVISÃO HUMANA OBRIGATÓRIA:** os CFOPs 3127 e 3129 também constam no Grupo I (Bens para Industrialização). Duplicidade proposital; revisão humana obrigatória.


Essência =>Aquisição/Venda vinculada a regimes especiais (Drawback/RECOF).

Argumentação Técnica (LC 214) =>O fornecimento é FG (SIM), mas a cobrança pode ser afetada por suspensão conforme as normas do regime aduaneiro e da LC 214.



Grupo=>**Remuneração Produtor Rural (Emissão do Pagador)**

CFOP´s:{2456, 5456, 6456}

Essência =>Remuneração ao produtor em sistemas de parceria, quando registrada pelo integrador.

Argumentação Técnica (LC 214) =>Embora haja remuneração (onerosa), a fonte classifica como fora da incidência por se tratar de ato próprio do sistema de integração rural, não fornecimento mercantil de bens/serviços pelo emissor.

