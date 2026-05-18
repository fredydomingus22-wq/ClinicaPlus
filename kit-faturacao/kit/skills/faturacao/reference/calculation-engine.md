# Motor de Cálculo Fiscal (Angola 2026)

O sistema deve calcular impostos de forma determinística e precisa para garantir a aceitação dos ficheiros SAF-T e a submissão via API Real-time.

## Regimes e Taxas

### 1. Regime Geral (14%)
- **Taxa**: 14% de IVA em todos os itens.
- **Retenção na Fonte**: Aplicável conforme o serviço (ex: 6.5% para serviços prestados por empresas, variando conforme a natureza).
- **Cálculo**:
  `Valor IVA = Arredondar(Base Tributável * 0.14)`
  `Total Linha = Base Tributável + Valor IVA`

### 2. Regime Simplificado (7%)
- **Taxa**: 7% de imposto sobre o recebimento. Na factura, o IVA costuma ser zero ou mencisado como "Simplificado".
- **Nota**: De acordo com o Decreto 71/25, deve-se aplicar a regra específica de isenção/liquidação no momento do pagamento.

### 3. Regime de EXUSA (Isento)
- **Taxa**: 0%.
- **Motivo de Isenção**: Obrigatório mencionar o Artigo 21.º do CIVA.

## Regras de Arredondamento
- **Rigor**: O arredondamento deve ser feito **por linha** e depois somado, ou no total conforme a configuração do software (recomenda-se por linha para evitar erros de acumulação no SAF-T).
- **Dígitos**: 2 casas decimais para cálculos, mas armazenamento em valor absoluto (Inteiros/Kwanza) se possível, ou Float com 2 casas.

## Retenção na Fonte
- 1. `Item.total = (precoUnit * quantidade) - desconto`
- Se o cliente for uma entidade com contabilidade organizada, pode haver retenção de 6.5%.
- O valor da retenção **subtrai** ao valor total a pagar pelo cliente, mas não altera o IVA liquidado.
