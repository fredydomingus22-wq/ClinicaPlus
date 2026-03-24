import json
from dataclasses import dataclass
from datetime import datetime, date, timezone, timedelta
from typing import List, Optional, Dict, Any
from .pool import conn

LUANDA = timezone(timedelta(hours=1))

@dataclass
class Medico:
    id: str
    nome: str
    especialidade: str
    preco: int
    ativo: bool
    clinicaId: str

@dataclass
class Especialidade:
    id: str
    nome: str
    clinicaId: str

@dataclass
class Paciente:
    id: str
    nome: str
    telefone: str
    clinicaId: str
    perfilWa: Optional[Dict[str, Any]] = None

@dataclass
class Agendamento:
    id: str
    dataHora: datetime
    estado: str
    canal: str
    medicoNome: str
    medicoEsp: str
    pacienteNome: str
    clinicaId: str

@dataclass
class SlotDisponivel:
    dataHora: datetime
    medicoId: str
    medicoNome: str
    preco: int

@dataclass
class Conversa:
    id: str
    clinicaId: str
    instanciaId: str
    numeroWhatsapp: str
    estado: str
    contexto: Dict[str, Any]
    pushName: Optional[str]
    ultimaMensagemEm: datetime

class ClinicaDB:
    async def obter_conversa(self, clinicaId: str, instanciaId: str, numero: str) -> Optional[Conversa]:
        async with conn() as c:
            row = await c.fetchrow(
                'SELECT * FROM wa_conversas WHERE "clinicaId" = $1 AND "instanciaId" = $2 AND "numeroWhatsapp" = $3',
                clinicaId, instanciaId, numero
            )
            if row:
                return Conversa(
                    id=row["id"], clinicaId=row["clinicaId"], instanciaId=row["instanciaId"],
                    numeroWhatsapp=row["numeroWhatsapp"], estado=row["estado"],
                    contexto=json.loads(row["contexto"]) if isinstance(row["contexto"], str) else row["contexto"],
                    pushName=row["pushName"], ultimaMensagemEm=row["ultimaMensagemEm"]
                )

        return None

    async def actualizar_conversa(self, clinicaId: str, instanciaId: str, numero: str, estado_obj: Any, pushName: Optional[str] = None):
        from dataclasses import asdict
        # estado_obj is DialogueState
        contexto_json = json.dumps(asdict(estado_obj))
        async with conn() as c:
            # Upsert logic for wa_conversas
            await c.execute(
                """INSERT INTO wa_conversas (id, "clinicaId", "instanciaId", "numeroWhatsapp", estado, contexto, "pushName", "ultimaMensagemEm", "expiraEm")
                   VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW(), NOW() + interval '24 hours')
                   ON CONFLICT ("instanciaId", "numeroWhatsapp") DO UPDATE 
                   SET estado = $4, contexto = $5, "pushName" = COALESCE($6, wa_conversas."pushName"), "ultimaMensagemEm" = NOW(), "expiraEm" = NOW() + interval '24 hours'""",
                clinicaId, instanciaId, numero, estado_obj.ultimaAccao or "AGUARDA_INPUT", contexto_json, pushName
            )


    async def especialidades_activas(self, clinicaId: str) -> List[str]:
        async with conn() as c:
            rows = await c.fetch(
                'SELECT DISTINCT especialidade FROM medicos WHERE "clinicaId" = $1 AND ativo = true',
                clinicaId
            )
            return [r["especialidade"] for r in rows]


    async def todos_medicos_activos(self, clinicaId: str) -> List[Dict[str, Any]]:
        async with conn() as c:
            rows = await c.fetch(
                'SELECT id, nome, especialidade, preco FROM medicos WHERE "clinicaId" = $1 AND ativo = true',
                clinicaId
            )
            return [dict(r) for r in rows]


    async def medicos_por_especialidade(self, clinicaId: str, esp_nome: str) -> List[Medico]:
        async with conn() as c:
            rows = await c.fetch(
                'SELECT * FROM medicos WHERE "clinicaId" = $1 AND especialidade = $2 AND ativo = true',
                clinicaId, esp_nome
            )
            return [Medico(id=r["id"], nome=r["nome"], especialidade=r["especialidade"], 
                          preco=r["preco"], ativo=r["ativo"], clinicaId=r["clinicaId"]) for r in rows]


    async def paciente_por_telefone(self, clinicaId: str, tel: str) -> Optional[Paciente]:
        async with conn() as c:
            row = await c.fetchrow(
                'SELECT * FROM pacientes WHERE "clinicaId" = $1 AND telefone = $2',
                clinicaId, tel
            )
            if row:
                return Paciente(id=row["id"], nome=row["nome"], telefone=row["telefone"], 
                                clinicaId=row["clinicaId"], perfilWa=row.get("perfilWa"))


        return None

    async def historico_agendamentos_paciente(self, clinicaId: str, pacId: str, limite: int = 3) -> List[Agendamento]:
        async with conn() as c:
            rows = await c.fetch(
                f"""SELECT a.*, m.nome as medico_nome, m.especialidade as medico_esp, p.nome as paciente_nome
                   FROM agendamentos a
                   JOIN medicos m ON a."medicoId" = m.id
                   JOIN pacientes p ON a."pacienteId" = p.id
                   WHERE a."clinicaId" = $1 AND a."pacienteId" = $2
                   ORDER BY a."dataHora" DESC LIMIT $3""",
                clinicaId, pacId, limite
            )

            return [Agendamento(id=r["id"], dataHora=r["dataHora"], estado=r["estado"], 
                               canal=r.get("canal", "PRESENCIAL"), medicoNome=r["medico_nome"], 
                               medicoEsp=r["medico_esp"], pacienteNome=r["paciente_nome"],
                               clinicaId=r["clinicaId"]) for r in rows]


    async def stats_no_show_paciente(self, clinicaId: str, pacId: str) -> Dict[str, Any]:
        async with conn() as c:
            row = await c.fetchrow(
                """SELECT COUNT(*) as total, 
                   COUNT(*) FILTER (WHERE estado = 'FALTOU') as no_shows,
                   COUNT(*) FILTER (WHERE estado = 'CANCELADO') as cancelamentos
                   FROM agendamentos WHERE "clinicaId" = $1 AND "pacienteId" = $2""",
                clinicaId, pacId
            )

            if row:
                total = row["total"]
                no_shows = row["no_shows"]
                taxa = (no_shows / total) if total > 0 else 0.0
                return {
                    "total": total,
                    "no_shows": no_shows,
                    "cancelamentos": row["cancelamentos"],
                    "taxa_no_show": taxa
                }
        return {"total": 0, "no_shows": 0, "cancelamentos": 0, "taxa_no_show": 0.0}

    async def obter_agendamentos_para_lembrete(self, horas_futuro: int = 48) -> List[Dict[str, Any]]:
        """
        Fetches appointments occurring within the next N hours that haven't been confirmed yet.
        Returns data joined with patient info (phone, name) and instance info.
        """
        async with conn() as c:
            # Join agendamentos with patients and instances (or clinicas to get instance name)
            # Need to know which Evolution API instance to use
            rows = await c.fetch(
                """SELECT a.id, a."dataHora", a."clinicaId", p.nome as paciente_nome, p.telefone, 
                          m.nome as medico_nome, i."evolutionName" as instancia_nome
                   FROM agendamentos a
                   JOIN pacientes p ON a."pacienteId" = p.id
                   JOIN medicos m ON a."medicoId" = m.id
                   JOIN clinicas c_inf ON a."clinicaId" = c_inf.id
                   JOIN wa_instancias i ON c_inf.id = i."clinicaId"
                   WHERE a."dataHora" BETWEEN NOW() AND NOW() + interval '$1 hours'
                   AND a.estado = 'AGENDADO'
                   AND a."confirmadoWa" = false""",
                str(horas_futuro)
            )
            return [dict(r) for r in rows]



    async def slots_por_regra(self, clinicaId: str, medId: str, data_alvo: date, limite: int = 5, periodo_ini: int = None, periodo_fim: int = None) -> List[SlotDisponivel]:
        # This is a simplified version of the complex slot logic.
        # It assumes a 'slots_disponiveis' view or table exists as per standard TOD architecture.
        # If not, it should check agendamentos and doctor schedule.
        async with conn() as c:
            query = """SELECT s.*, m.nome as medico_nome, m.preco
                       FROM slots_disponiveis s
                       JOIN medicos m ON s."medicoId" = m.id
                       WHERE s."clinicaId" = $1 AND s."medicoId" = $2 
                       AND s."dataHora"::date = $3
                       AND s."estaLivre" = true"""
            params = [clinicaId, medId, data_alvo]
            
            if periodo_ini is not None:
                query += ' AND EXTRACT(HOUR FROM s."dataHora") >= $4'
                params.append(periodo_ini)
            if periodo_fim is not None:
                query += f' AND EXTRACT(HOUR FROM s."dataHora") < ${len(params)+1}'
                params.append(periodo_fim)
                
            query += f' ORDER BY s."dataHora" ASC LIMIT ${len(params)+1}'
            params.append(limite)

            
            rows = await c.fetch(query, *params)
            return [SlotDisponivel(dataHora=r["dataHora"], medicoId=r["medicoId"], 
                                 medicoNome=r["medico_nome"], preco=r["preco"]) for r in rows]


    async def nome_clinica(self, clinicaId: str) -> str:
        async with conn() as c:
            val = await c.fetchval("SELECT nome FROM clinicas WHERE id = $1", clinicaId)
            return val or "Clínica"

    async def marcar_mensagem_para_retry(self, conversaId: str):
        # Implementation depends on how retry queue is structured
        pass

class WaFormatter:
    @staticmethod
    def slots_como_poll(slots: List[SlotDisponivel]) -> Dict[str, Any]:
        if not slots:
            return {"pergunta": "Não encontrei horários livres.", "opcoes": []}
        
        opcoes = []
        for s in slots:
            dt = s.dataHora.astimezone(LUANDA)
            # Format: Terça, 25 Março às 09:00
            label = dt.strftime("%H:%M") 
            # We add some localized day name if needed, but for the poll, keep it succinct
            opcoes.append(label)
            
        return {
            "pergunta": "Escolhe o horário:",
            "opcoes": opcoes[:12]
        }

    @staticmethod
    def confirmacao_agendamento(ag: Agendamento) -> str:
        dt = ag.dataHora.astimezone(LUANDA)
        data_str = dt.strftime("%d/%m")
        hora_str = dt.strftime("%H:%M")
        return (f"✅ *Consulta Confirmada!*\n\n"
                f"📍 *Clínica:* {ag.clinicaId}\n"
                f"👨‍⚕️ *Médico:* {ag.medicoNome}\n"
                f"📅 *Data:* {data_str} às {hora_str}\n\n"
                f"Pedimos que chegue 15 min antes. Até lá!")
