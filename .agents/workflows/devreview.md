---
description: Executa uma análise completa de Code Review (Segurança, Performance, Qualidade)
---

# Workflow: /devreview

Este workflow automatiza o processo de revisão de código usando o DevReview Agent.

## Passos

1. **Identificação de Alvo**:
   O usuário especifica o diretório ou o Antigravity sugere o projeto atual.

2. **Análise Nativa**:
   O Antigravity usa as skills em `devreview-agent/skills/` para analisar o código sem necessidade de APIs externas.

3. **Consolidação de Dados**:
   O Antigravity gera o ficheiro `review_results.json` em `devreview-agent/outputs/`.

4. **Geração de Relatório**:
   // turbo

   ```powershell
   python c:\Users\LENOVO\Documents\Projectos\ClinicaPlus\devreview-agent\scripts\report_generator.py --results c:\Users\LENOVO\Documents\Projectos\ClinicaPlus\devreview-agent\outputs\review_results.json --output c:\Users\LENOVO\Documents\Projectos\ClinicaPlus\devreview-agent\outputs\
   ```

5. **Exibição de Resultados**:
   O score e quick wins são apresentados diretamente no chat.
