from langchain_core.tools import tool

def build_tools_for_tenant(tenant_id: str, db) -> list:
    """
    Constrói ferramentas específicas para um tenant.
    O tenant_id é injetado via closure e NUNCA exposto ao LLM nos parâmetros da tool.
    """
    
    @tool
    async def get_available_slots(specialty: str, date_iso: str) -> str:
        """Busca horários disponíveis para uma especialidade e data."""
        try:
            # tenant_id injetado do outer scope
            # db.slots_disponiveis(...) é apenas um exemplo de chamada
            # Na real DB layer pode ser necessário converter specialty e date_iso.
            return f"Horários disponíveis consultados com sucesso (mock db call para specialty={specialty}, data={date_iso})"
        except Exception as e:
            return "Não consegui completar a operação. Por favor contacta a recepção."
        
    @tool
    async def book_appointment(patient_id: str, doctor_id: str, datetime_iso: str) -> str:
        """Agenda uma consulta para o paciente."""
        try:
            # tenant_id injetado do outer scope
            return f"Consulta agendada com sucesso (mock db call para o paciente {patient_id})"
        except Exception as e:
            return "Não consegui completar a operação. Por favor contacta a recepção."
        
    @tool
    async def cancel_appointment(appointment_reference: str, reason: str) -> str:
        """Cancela uma consulta existente."""
        try:
            # tenant_id injetado do outer scope
            return f"Consulta cancelada (mock db call para a referência {appointment_reference})"
        except Exception as e:
            return "Não consegui completar a operação. Por favor contacta a recepção."

    return [get_available_slots, book_appointment, cancel_appointment]
