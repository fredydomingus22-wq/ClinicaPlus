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
                    ultimaMensagemEm=row["ultimaMensagemEm"]
                )
        return None

    async def actualizar_conversa(self, clinicaId: str, instanciaId: str, numero: str, estado_obj: Any, pushName: Optional[str] = None) -> None:
        from dataclasses import asdict
        contexto_json = json.dumps(asdict(estado_obj))
        async with conn() as c:
            await c.execute(
                """INSERT INTO wa_conversas (id, "clinicaId", "instanciaId", "numeroWhatsapp", estado, contexto, "ultimaMensagemEm", "expiraEm", "criadoEm")
                   VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW() + interval '24 hours', NOW())
                   ON CONFLICT ("instanciaId", "numeroWhatsapp") DO UPDATE 
                   SET estado = $4, contexto = $5, "ultimaMensagemEm" = NOW(), "expiraEm" = NOW() + interval '24 hours'""",
                clinicaId, instanciaId, numero, estado_obj.ultimaAccao or "AGUARDA_INPUT", contexto_json
            )

    async def especialidades_activas(self, clinicaId: str) -> List[str]:
        async with conn() as c:
            rows = await c.fetch(
                'SELECT DISTINCT e.nome FROM especialidades e '
                'JOIN medicos m ON m."especialidadeId" = e.id '
                'WHERE m."clinicaId" = $1 AND m.ativo = true',
                clinicaId
            )
            return [str(r["nome"]) for r in rows]
        return []

    async def todos_medicos_activos(self, clinicaId: str) -> List[Dict[str, Any]]:
        async with conn() as c:
            rows = await c.fetch(
                'SELECT m.id, m.nome, e.nome as especialidade, m.preco FROM medicos m '
                'JOIN especialidades e ON m."especialidadeId" = e.id '
                'WHERE m."clinicaId" = $1 AND m.ativo = true',
                clinicaId
            )
            return [dict(r) for r in rows]
        return []

    async def medicos_por_especialidade(self, clinicaId: str, esp_nome: str) -> List[Medico]:
        async with conn() as c:
            rows = await c.fetch(
                'SELECT m.* FROM medicos m '
                'JOIN especialidades e ON m."especialidadeId" = e.id '
                'WHERE m."clinicaId" = $1 AND e.nome = $2 AND m.ativo = true',
                clinicaId, esp_nome
            )
            return [Medico(id=r["id"], nome=r["nome"], especialidade=esp_nome, 
                          preco=r["preco"], ativo=r["ativo"], clinicaId=r["clinicaId"]) for r in rows]
        return []

    async def paciente_por_telefone(self, clinicaId: str, tel: str) -> Optional[Paciente]:
        async with conn() as c:
            row = await c.fetchrow(
                'SELECT * FROM pacientes WHERE "clinicaId" = $1 AND (telefone = $2 OR "telefoneSecundario" = $2)',
                clinicaId, tel
            )
            if row:
                return Paciente(id=row["id"], nome=row["nome"], telefone=row["telefone"], clinicaId=row["clinicaId"])
        return None

    async def agendamentos_ativos_paciente(self, clinicaId: str, pacId: str) -> List[Agendamento]:
        async with conn() as c:
            rows = await c.fetch(
                """SELECT a.id, a."dataHora", a.estado, a.canal, m.nome as medico_nome, e.nome as medico_esp, p.nome as paciente_nome, a."clinicaId"
                   FROM agendamentos a
                   JOIN medicos m ON a."medicoId" = m.id
                   JOIN especialidades e ON m."especialidadeId" = e.id
                   JOIN pacientes p ON a."pacienteId" = p.id
                   WHERE a."clinicaId" = $1 AND a."pacienteId" = $2 
                   AND a.estado IN ('PENDENTE', 'CONFIRMADO', 'EM_ESPERA')
                   AND a."dataHora" >= NOW()
                   ORDER BY a."dataHora" ASC""",
                clinicaId, pacId
            )
            return [Agendamento(id=r["id"], dataHora=r["dataHora"], estado=r["estado"], 
                               canal=r.get("canal", "PRESENCIAL"), medicoNome=r["medico_nome"], 
                               medicoEsp=r["medico_esp"], pacienteNome=r["paciente_nome"],
                               clinicaId=r["clinicaId"]) for r in rows]
        return []

    async def stats_no_show_paciente(self, clinicaId: str, pacId: str) -> Dict[str, Any]:
        async with conn() as c:
            total = await c.fetchval('SELECT COUNT(*) FROM agendamentos WHERE "clinicaId" = $1 AND "pacienteId" = $2', clinicaId, pacId)
            faltas = await c.fetchval('SELECT COUNT(*) FROM agendamentos WHERE "clinicaId" = $1 AND "pacienteId" = $2 AND estado = \'NAO_COMPARECEU\'', clinicaId, pacId)
            return {"total": total or 0, "faltas": faltas or 0}
        return {"total": 0, "faltas": 0}

    async def obter_lembretes_pendentes(self, horas_futuro: int = 48) -> List[Dict[str, Any]]:
        async with conn() as c:
            rows = await c.fetch(
                """SELECT a.id, a."clinicaId", a."dataHora", p.nome as paciente_nome, p.telefone, m.nome as medico_nome, i."evolutionName" as instancia_nome, i.id as instancia_id
                   FROM agendamentos a
                   JOIN pacientes p ON a."pacienteId" = p.id
                   JOIN medicos m ON a."medicoId" = m.id
                   JOIN wa_instancias i ON a."clinicaId" = i."clinicaId"
                   WHERE a.estado = 'PENDENTE'
                   AND a."dataHora" > NOW() 
                   AND a."dataHora" <= NOW() + ($1 || ' hours')::interval
                   AND a."confirmadoWa" = false""",
                str(horas_futuro)
            )
            return [dict(r) for r in rows]
        return []

    async def slots_por_regra(self, clinicaId: str, medId: str, data_alvo: date, limite: int = 5) -> List[SlotDisponivel]:
        async with conn() as c:
            query = """
                SELECT m.id as medico_id, m.nome as medico_nome, m.preco
                FROM medicos m
                WHERE m."clinicaId" = $1 AND (m.id = $2 OR $2 IS NULL)
                AND m.ativo = true
                LIMIT $3
            """
            params = [clinicaId, medId, limite]
            rows = await c.fetch(query, *params)
            # Mocking slots for testing
            slots = []
            for r in rows:
                slots.append(SlotDisponivel(
                    dataHora=datetime.combine(data_alvo, datetime.min.time()).replace(hour=10),
                    medicoId=r["medico_id"],
                    medicoNome=r["medico_nome"],
                    preco=r["preco"]
                ))
            return slots
        return []

    async def nome_clinica(self, clinicaId: str) -> str:
        async with conn() as c:
            val = await c.fetchval('SELECT nome FROM clinicas WHERE id = $1', clinicaId)
            return str(val) if val else "Clínica"
        return "Clínica"

    async def is_ia_ativo(self, clinica_id: str, instancia_id: str) -> bool:
        async with conn() as c:
            query = """
                SELECT ativo FROM wa_automacoes 
                WHERE "clinicaId" = $1 AND "waInstanciaId" = $2 AND tipo = 'IA_ASSISTANT'
            """
            row = await c.fetchrow(query, clinica_id, instancia_id)
            if row and "ativo" in row:
                return bool(row["ativo"])
        return False

    async def resolver_ids_por_instancia(self, evolution_name: str) -> Optional[Dict[str, str]]:
        async with conn() as c:
            row = await c.fetchrow(
                'SELECT id, "clinicaId" FROM wa_instancias WHERE "evolutionName" = $1',
                evolution_name
            )
            if row:
                return {"instanciaId": str(row["id"]), "clinicaId": str(row["clinicaId"])}
        return None

db = ClinicaDB()

class WaFormatter:
    @staticmethod
    def slots_como_poll(slots: List[SlotDisponivel]) -> Dict[str, Any]:
        if not slots:
            return {"pergunta": "Não encontrei horários livres.", "opcoes": []}
        opcoes = []
        for s in slots:
            dt = s.dataHora.astimezone(LUANDA)
            opcoes.append(dt.strftime("%H:%M"))
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
                f"👨‍⚕️ *Médico:* {ag.medicoNome}\n"
                f"📅 *Data:* {data_str} às {hora_str}\n\n"
                f"Pedimos que chegue 15 min antes. Até lá!")
