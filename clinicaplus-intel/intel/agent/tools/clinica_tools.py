from langchain_core.tools import tool
from db_layer import db
from datetime import datetime, timezone, timedelta
import json
import os
import httpx

LUANDA_TZ = timezone(timedelta(hours=1))

@tool
async def buscar_especialidades(clinica_id: str) -> str:
    """
    Retorna as especialidades médicas disponíveis na clínica.
    Chamar quando o paciente não especifica especialidade.
    """
    try:
        especialidades = await db.especialidades_activas(clinica_id)
        return json.dumps({"especialidades": especialidades}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"erro": str(e)}, ensure_ascii=False)


@tool
async def buscar_medicos(clinica_id: str, especialidade: str = None, nome: str = None) -> str:
    """
    Retorna médicos disponíveis. Filtrar por especialidade e/ou nome.
    Chamar quando paciente menciona médico específico ou especialidade.
    """
    try:
        if especialidade:
            medicos = await db.medicos_por_especialidade(clinica_id, especialidade)
        else:
            medicos = await db.todos_medicos_activos(clinica_id)

        if nome:
            nome_lower = nome.lower()
            medicos = [m for m in medicos if nome_lower in m.nome.lower()]

        resultado = [
            {"id": m.id, "nome": m.nome, "especialidade": m.especialidade, "preco_kz": m.preco}
            for m in medicos
        ]
        return json.dumps({"medicos": resultado, "total": len(resultado)}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"erro": str(e)}, ensure_ascii=False)


# Ferramentas agrupadas por agente
INFO_TOOLS = [buscar_especialidades, buscar_medicos]
