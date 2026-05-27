---
description: Exexuta uma analise copleta da UI
---

# Workflow: /uiaudit

Este workflow automatiza a auditoria de componentes de UI e layout.

## Passos

1. **Alvo de Auditoria**:
   O usuário especifica o diretório ou componente frontend.

2. **Auditoria Visual**:
   O Antigravity usa as skills em `ui-audit-agent/skills/` para auditar layout, tokens e responsividade.

3. **Geração de Report**:
   // turbo

   ```powershell
   python c:\Users\LENOVO\Documents\Projectos\ClinicaPlus\ui-audit-agent\scripts\ui_report_generator.py --results c:\Users\LENOVO\Documents\Projectos\ClinicaPlus\ui-audit-agent\outputs\ui_audit_results.json --output c:\Users\LENOVO\Documents\Projectos\ClinicaPlus\ui-audit-agent\outputs\
   ```

4. **Mitigação Automática**:
   Se forem encontrados problemas de tokens (ex: cores hardcoded), o Antigravity sugere:
   `Deseja acionar o /devfix para corrigir as inconsistências de tokens?`

5. **Ciclo de Re-Auditoria**:
   O sistema re-executa o `/uiaudit` após o `/devfix` para validar as melhorias visuais.
