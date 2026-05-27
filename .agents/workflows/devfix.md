---
description: Mitiga NCs do DevReview, aplica correções e re-executa o review.
---

# Workflow: /devfix

Este workflow fecha o ciclo de qualidade corrigindo automaticamente o que foi detectado pelo DevReview.

## Passos

1. **Leitura do Report**:
   O Antigravity lê `devreview-agent/outputs/review_results.json`.

2. **Plano de Mitigação**:
   O Antigravity cria um plano usando a skill [Mitigation Planner](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/devreview-agent/skills/mitigation-planner.md) e pede aprovação.

3. **Execução**:
   Com aprovação, o Antigravity aplica as correções usando o [Fix Executor](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/devreview-agent/skills/fix-executor.md).

4. **Relatório de Correção**:
   Gera um resumo em `devfix-agent/outputs/fix_report.json`.
   // turbo

   ```powershell
   python c:\Users\LENOVO\Documents\Projectos\ClinicaPlus\devreview-agent\scripts\report_generator.py --results c:\Users\LENOVO\Documents\Projectos\ClinicaPlus\devreview-agent\outputs\review_results.json --output c:\Users\LENOVO\Documents\Projectos\ClinicaPlus\devreview-agent\outputs\
   ```

5. **Ciclo de Re-Review**:
   // turbo
   Chama automaticamente: `/devreview`

6. **Resultado Final**:
   Apresenta a comparação do Score Antigo vs Novo.
