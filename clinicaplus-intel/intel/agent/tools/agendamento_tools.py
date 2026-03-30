from langchain_core.tools import tool
from db_layer import db
from datetime import datetime, timezone, timedelta
import json
import os
import httpx

LUANDA_TZ = timezone(timedelta(hours=1))

@tool
async def buscar_slots(
    clinica_id:  str,
    medico_id:   str,
    data_inicio: str = None,   # YYYY-MM-DD, default: hoje
    data_fim:    str = None,   # YYYY-MM-DD, opcional
    periodo:     str = "qualquer",  # "manha" | "tarde" | "qualquer"
) -> str:
    """
    Retorna slots de consulta disponíveis para um médico.
    Chamar após o paciente escolher médico ou quando quer saber disponibilidade.
    """
    try:
        from datetime import date
        agora = datetime.now(LUANDA_TZ)
        d_ini = date.fromisoformat(data_inicio) if data_inicio else agora.date()

        p_ini = {"manha": 7, "tarde": 13, "qualquer": None}.get(periodo)
        p_fim = {"manha": 12, "tarde": 18, "qualquer": None}.get(periodo)

        slots = await db.slots_por_regra(
            clinica_id, medico_id, d_ini,
            periodo_ini=p_ini, periodo_fim=p_fim, limite=6,
        )

        _DIAS  = ["segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado","domingo"]
        _MESES = ["","janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"]

        def fmt(dt):
            lt = dt.astimezone(LUANDA_TZ)
            return f"{_DIAS[lt.weekday()]}, {lt.day} de {_MESES[lt.month]} às {lt.strftime('%H:%M')}"

        resultado = [
            {"data_hora": s.dataHora.isoformat(), "medico": s.medicoNome, "label": fmt(s.dataHora)}
            for s in slots
        ]
        return json.dumps({"slots": resultado, "total": len(resultado)}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"erro": str(e)}, ensure_ascii=False)


@tool
async def ver_consultas_paciente(clinica_id: str, paciente_id: str) -> str:
    """
    Retorna as próximas consultas agendadas do paciente.
    Chamar quando pergunta sobre as suas consultas ou quer cancelar/remarcar.
    """
    try:
        consultas = await db.proximos_agendamentos_paciente(clinica_id, paciente_id, limite=5)
        _DIAS  = ["segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado","domingo"]
        _MESES = ["","janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"]

        def fmt(dt):
            lt = dt.astimezone(LUANDA_TZ)
            return f"{_DIAS[lt.weekday()]}, {lt.day} de {_MESES[lt.month]} às {lt.strftime('%H:%M')}"

        resultado = [
            {"id": c.id, "data_hora": c.dataHora.isoformat(), "medico": c.medicoNome,
             "especialidade": c.medicoEsp, "estado": c.estado, "label": fmt(c.dataHora)}
            for c in consultas
        ]
        return json.dumps({"consultas": resultado}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"erro": str(e)}, ensure_ascii=False)


@tool
async def criar_agendamento(
    clinica_id:  str,
    paciente_id: str,
    medico_id:   str,
    data_hora:   str,  # ISO 8601
    notas:       str = "",
) -> str:
    """
    Cria nova consulta. SÓ chamar após confirmação EXPLÍCITA do paciente.
    Nunca chamar sem o paciente ter confirmado data, hora e médico.
    """
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{os.environ.get('TS_API_URL', 'http://localhost:3001')}/api/agendamentos",
                json={"medicoId": medico_id, "pacienteId": paciente_id,
                      "dataHora": data_hora, "canal": "WHATSAPP", "notasTriagem": notas},
                headers={"x-api-key": os.environ.get("TS_API_INTERNAL_KEY", "")},
                timeout=10.0,
            )
            r.raise_for_status()
            ag = r.json()["data"]
        return json.dumps({"sucesso": True, "agendamento_id": ag["id"]}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"erro": str(e)}, ensure_ascii=False)


@tool
async def cancelar_consulta(agendamento_id: str, motivo: str = "") -> str:
    """
    Cancela consulta existente. SÓ chamar após confirmação explícita do paciente.
    """
    try:
        async with httpx.AsyncClient() as client:
            r = await client.patch(
                f"{os.environ.get('TS_API_URL', 'http://localhost:3001')}/api/agendamentos/{agendamento_id}/estado",
                json={"estado": "CANCELADO", "motivo": motivo or "Cancelado via WhatsApp"},
                headers={"x-api-key": os.environ.get("TS_API_INTERNAL_KEY", "")},
                timeout=10.0,
            )
            r.raise_for_status()
        return json.dumps({"sucesso": True}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"erro": str(e)}, ensure_ascii=False)

BOOKING_TOOLS = [buscar_slots, criar_agendamento, cancelar_consulta, ver_consultas_paciente]
