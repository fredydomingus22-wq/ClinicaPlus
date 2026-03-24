# Reference: Policy — Regras de Decisão

## Acções disponíveis

| Acção | Quando | Resposta |
|-------|--------|----------|
| SOLICITAR_SLOT | Falta slot obrigatório | Poll |
| MOSTRAR_OPCOES | Listar opções disponíveis | Poll |
| CONFIRMAR | Todos os slots preenchidos | Poll (✅/❌) |
| CRIAR_AGENDAMENTO | Paciente confirmou | Chamar TS API + texto |
| URGENCIA | urgente detectado | Poll de slots de hoje |
| ALTERNATIVAS | Sem slots para o pedido | Poll de alternativas |
| SUGERIR_HISTORICO | 1º turno + histórico disponível | Texto + Poll |
| ENCAMINHAR_HUMANO | 4+ erros ou AJUDA solicitada | Texto |
| RESET | Reset solicitado | Texto (boas-vindas) |

## Prioridades (ordem decrescente)

```python
# 1. Urgência — máxima prioridade
if "URGENCIA_DETECTADA" in accoes:
    esp = estado.especialidade or "Clínica Geral"
    return PolicyDecision(accao="URGENCIA", dados_extra={"especialidade": esp})

# 2. Encaminhar humano
if "AJUDA_SOLICITADA" in accoes or estado.erros >= 4:
    return PolicyDecision(accao="ENCAMINHAR_HUMANO")

# 3. Reset
if "RESET_SOLICITADO" in accoes:
    return PolicyDecision(accao="RESET")

# 4. Confirmação pendente
if estado.ultimaAccao == "AGUARDA_CONFIRMACAO":
    if "CONFIRMACAO:AFIRMACAO" in accoes:
        return PolicyDecision(accao="CRIAR_AGENDAMENTO")
    if "CONFIRMACAO:NEGACAO" in accoes:
        return PolicyDecision(accao="ALTERNATIVAS", ...)

# 5. Sugestão de histórico (1º turno)
if estado.turno == 1 and historico.get("ultimaMarcacao"):
    if medico_ainda_disponivel(historico["ultimaMarcacao"]["medicoId"], slots):
        return PolicyDecision(accao="SUGERIR_HISTORICO", ...)

# 6. Próximo slot em falta
proximo = estado.proximo_slot_em_falta()

if proximo == "especialidade":
    return MOSTRAR_OPCOES(especialidades[:8], comprimido=estado.erros>=2)

if proximo == "data":
    proximas_vagas = proximas_datas_unicas(medicoId, slots, n=3)
    return MOSTRAR_OPCOES(proximas_vagas) if proximas_vagas else SOLICITAR_SLOT("data")

if proximo == "slotHorario":
    slots_filtrados = filtrar_slots(estado, todos_slots)
    if not slots_filtrados:
        return ALTERNATIVAS(calcular_alternativas(estado, todos_slots))
    if len(slots_filtrados) == 1:
        return CONFIRMAR(slot=slots_filtrados[0])  # saltar escolha
    return MOSTRAR_OPCOES(slots_filtrados[:5], comprimido=estado.erros>=2)

# 7. Todos os slots preenchidos
if estado.esta_completo():
    return CONFIRMAR(resumo_completo)
```

## Regras de salto de etapas

| Input do paciente | Slots extraídos | Etapas saltadas |
|------------------|-----------------|-----------------|
| "quero cardio amanhã cedo" | esp + data + período | ESPECIALIDADE |
| "quero dr carlos para quinta" | médico + esp (inferida) + data | ESPECIALIDADE + MÉDICO |
| "quero cardio amanhã de manhã com dr paulo" | esp + médico + data + período | ESPECIALIDADE + MÉDICO |
| "Cardiologia" (resposta a Poll) | esp | ESPECIALIDADE |
| "Dr. Carlos Mendes" (resposta a Poll) | médico + esp (inferida) | ESPECIALIDADE + MÉDICO |

## Regra de médico único

Se uma especialidade tem apenas 1 médico activo → saltar etapa de escolha de médico automaticamente:
```python
if proximo == "data" and not estado.medicoId:
    medicos_esp = filtrar_medicos_por_esp(estado.especialidade, todos_medicos)
    if len(medicos_esp) == 1:
        estado.medicoId   = medicos_esp[0].id
        estado.medicoNome = medicos_esp[0].nome
        accoes.append("SLOT_MEDICO_PREENCHIDO_AUTO")
```

## Cálculo de alternativas

Quando não há slots para o pedido original, gerar até 3 alternativas ordenadas por relevância:

1. **Mesmo médico, data diferente** (relevância 0.9) — mais próxima disponível
2. **Mesma especialidade, médico diferente** (relevância 0.75) — mais próxima
3. **Mesma data, qualquer disponibilidade** (relevância 0.6) — filtrado por período se definido

## Compressão de opções

Se `estado.erros >= 2`, reduzir opções a máximo 3 (em vez de 5-8) para simplificar:
```python
n = 3 if estado.erros >= 2 else 5
slots_a_mostrar = slots_filtrados[:n]
```

## Mensagem de encaminhamento humano

Activar quando `estado.erros >= 4` (4 turnos sem progresso):
```
"Percebo que precisas de mais ajuda. 😊
Podes ligar directamente para a clínica ou escrever *oi* para recomeçar."
```

Também activar imediatamente se o paciente escrever "ajuda", "humano", "atendente".
