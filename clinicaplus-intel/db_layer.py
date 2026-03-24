"""
ClinicaPlus — Camada de Acesso à DB em Python
Queries directas ao PostgreSQL (Supabase) com formatação de resposta para WhatsApp.

Arquitectura:
    NLU → DST → Policy → [DB Layer] → Formatter → WhatsApp

Regras de segurança absolutas (herdadas do TypeScript):
    1. clinicaId SEMPRE obrigatório em todas as queries — zero excepções
    2. Parâmetros SEMPRE via $N (parameterized) — zero string interpolation
    3. Reads via asyncpg (connection pool)
    4. Writes roteados para o TypeScript API (nunca directo do Python para writes)
       — excepção: criação de conversa WA (tabela wa_conversas)
"""

import os
import asyncio
import asyncpg
from datetime import datetime, timedelta, timezone, date
from typing import Optional, Any
from dataclasses import dataclass, field
from contextlib import asynccontextmanager

LUANDA_TZ = timezone(timedelta(hours=1))

# ── Pool singleton ─────────────────────────────────────────────────────────────

_pool: Optional[asyncpg.Pool] = None

async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=os.environ["DATABASE_URL"],
            min_size=2,
            max_size=10,
            command_timeout=10.0,
            statement_cache_size=0,   # Supabase PgBouncer não suporta named statements
        )
    return _pool


@asynccontextmanager
async def conn():
    pool = await get_pool()
    async with pool.acquire() as c:
        yield c


# ── Tipos de resposta ──────────────────────────────────────────────────────────

@dataclass
class Medico:
    id:           str
    nome:         str
    especialidade:str
    preco:        int           # Kwanza (inteiro)
    ativo:        bool
    clinicaId:    str

@dataclass
class Paciente:
    id:           str
    nome:         str
    telefone:     Optional[str]
    dataNascimento: Optional[date]
    alergias:     Optional[str]
    clinicaId:    str
    origem:       str           # DIRECTO | WHATSAPP | PORTAL

@dataclass
class Agendamento:
    id:           str
    dataHora:     datetime
    estado:       str           # PENDENTE | CONFIRMADO | EM_PROGRESSO | CONCLUIDO | CANCELADO | NAO_COMPARECEU
    canal:        str           # PRESENCIAL | WHATSAPP | PORTAL
    medicoNome:   str
    medicoEsp:    str
    pacienteNome: str
    clinicaId:    str

@dataclass
class SlotDisponivel:
    dataHora:     datetime
    medicoId:     str
    medicoNome:   str
    preco:        int

@dataclass
class Receita:
    id:           str
    criadoEm:     datetime
    medicoNome:   str
    medicamentos: list          # [{ nome, dosagem, frequencia }]


# ── Queries ────────────────────────────────────────────────────────────────────

class ClinicaDB:
    """
    Todas as queries da clínica.
    clinicaId é o primeiro parâmetro em TODOS os métodos — sem excepção.
    """

    # ── Médicos ────────────────────────────────────────────────────────────────

    async def medicos_por_especialidade(
        self,
        clinicaId: str,
        especialidade: str,
    ) -> list[Medico]:
        """
        Retorna médicos activos de uma especialidade.
        Índice usado: @@index([clinicaId, especialidade])
        """
        async with conn() as c:
            rows = await c.fetch("""
                SELECT id, nome, especialidade, preco, ativo, clinica_id
                FROM medicos
                WHERE clinica_id = $1
                  AND especialidade = $2
                  AND ativo = true
                ORDER BY nome
            """, clinicaId, especialidade)

        return [Medico(
            id=r["id"], nome=r["nome"], especialidade=r["especialidade"],
            preco=r["preco"], ativo=r["ativo"], clinicaId=r["clinica_id"],
        ) for r in rows]


    async def medico_por_id(
        self,
        clinicaId: str,
        medicoId:  str,
    ) -> Optional[Medico]:
        """
        Busca um médico validando que pertence à clínica (prevenção de IDOR).
        """
        async with conn() as c:
            r = await c.fetchrow("""
                SELECT id, nome, especialidade, preco, ativo, clinica_id
                FROM medicos
                WHERE clinica_id = $1 AND id = $2
            """, clinicaId, medicoId)

        if not r: return None
        return Medico(
            id=r["id"], nome=r["nome"], especialidade=r["especialidade"],
            preco=r["preco"], ativo=r["ativo"], clinicaId=r["clinica_id"],
        )


    async def especialidades_activas(self, clinicaId: str) -> list[str]:
        """
        Lista de especialidades com pelo menos 1 médico activo.
        Usada para montar a Poll inicial.
        """
        async with conn() as c:
            rows = await c.fetch("""
                SELECT DISTINCT especialidade
                FROM medicos
                WHERE clinica_id = $1 AND ativo = true
                ORDER BY especialidade
            """, clinicaId)
        return [r["especialidade"] for r in rows]


    # ── Slots disponíveis ──────────────────────────────────────────────────────

    async def slots_disponiveis(
        self,
        clinicaId:    str,
        medicoId:     str,
        data_inicio:  Optional[date] = None,
        data_fim:     Optional[date] = None,
        hora_inicio:  Optional[int]  = None,  # ex: 7
        hora_fim:     Optional[int]  = None,  # ex: 12
        limite:       int = 5,
    ) -> list[SlotDisponivel]:
        """
        Slots livres de um médico com filtros opcionais de data e período.

        Lógica de slot livre:
            - slot existe na grelha de horários do médico (HorarioMedico)
            - não existe agendamento com estado != CANCELADO nesse slot
        
        Índice usado: @@index([clinicaId, medicoId, dataHora]) — slot conflict check
        """
        agora  = datetime.now(LUANDA_TZ)
        d_ini  = datetime(
            data_inicio.year, data_inicio.month, data_inicio.day,
            hora_inicio or 0, 0, 0, tzinfo=LUANDA_TZ,
        ) if data_inicio else agora

        d_fim_dt = None
        if data_fim:
            d_fim_dt = datetime(
                data_fim.year, data_fim.month, data_fim.day,
                hora_fim or 23, 59, 59, tzinfo=LUANDA_TZ,
            )

        async with conn() as c:
            # Query: slots da grelha que não têm agendamento activo
            # Assume tabela horarios_medico { id, medico_id, clinica_id, data_hora, duracao_min }
            # Se não tiveres esta tabela ainda, ver nota abaixo*
            rows = await c.fetch("""
                SELECT
                    hm.data_hora,
                    m.id       AS medico_id,
                    m.nome     AS medico_nome,
                    m.preco    AS preco
                FROM horarios_medico hm
                JOIN medicos m ON m.id = hm.medico_id
                WHERE hm.clinica_id   = $1
                  AND hm.medico_id    = $2
                  AND hm.data_hora   >= $3
                  AND ($4::timestamptz IS NULL OR hm.data_hora <= $4)
                  AND ($5::int IS NULL OR EXTRACT(HOUR FROM hm.data_hora AT TIME ZONE 'Africa/Luanda') >= $5)
                  AND ($6::int IS NULL OR EXTRACT(HOUR FROM hm.data_hora AT TIME ZONE 'Africa/Luanda') <  $6)
                  AND NOT EXISTS (
                      SELECT 1 FROM agendamentos a
                      WHERE a.clinica_id = $1
                        AND a.medico_id  = $2
                        AND a.data_hora  = hm.data_hora
                        AND a.estado NOT IN ('CANCELADO')
                  )
                ORDER BY hm.data_hora
                LIMIT $7
            """, clinicaId, medicoId, d_ini, d_fim_dt, hora_inicio, hora_fim, limite)

        return [SlotDisponivel(
            dataHora=r["data_hora"],
            medicoId=r["medico_id"],
            medicoNome=r["medico_nome"],
            preco=r["preco"],
        ) for r in rows]

    # *NOTA: se não tiveres tabela horarios_medico ainda, alternativa simples:
    # gerar slots a partir de regras (08:00-18:00, de 30 em 30 min)
    # e excluir os que têm agendamento — ver slots_por_regra() abaixo

    async def slots_por_regra(
        self,
        clinicaId:   str,
        medicoId:    str,
        data:        date,
        hora_ini:    int = 8,
        hora_fim:    int = 18,
        intervalo:   int = 30,   # minutos
        limite:      int = 5,
        periodo_ini: Optional[int] = None,
        periodo_fim: Optional[int] = None,
    ) -> list[SlotDisponivel]:
        """
        Gera slots de forma programática (sem tabela de horários) e
        exclui os ocupados via query.
        Útil enquanto não há tabela horarios_medico.
        """
        # Gerar todos os slots do dia
        slots_candidatos = []
        base = datetime(data.year, data.month, data.day, hora_ini, 0, tzinfo=LUANDA_TZ)
        fim  = datetime(data.year, data.month, data.day, hora_fim, 0, tzinfo=LUANDA_TZ)
        agora = datetime.now(LUANDA_TZ)

        while base < fim:
            if base > agora:  # só slots futuros
                h = base.hour
                if (periodo_ini is None or h >= periodo_ini) and \
                   (periodo_fim is None or h <  periodo_fim):
                    slots_candidatos.append(base)
            base += timedelta(minutes=intervalo)

        if not slots_candidatos:
            return []

        # Buscar slots ocupados na DB
        async with conn() as c:
            ocupados = await c.fetch("""
                SELECT data_hora FROM agendamentos
                WHERE clinica_id = $1
                  AND medico_id  = $2
                  AND data_hora  = ANY($3::timestamptz[])
                  AND estado NOT IN ('CANCELADO')
            """, clinicaId, medicoId, slots_candidatos)

        ocupados_set = {r["data_hora"] for r in ocupados}

        # Médico
        medico = await self.medico_por_id(clinicaId, medicoId)
        if not medico:
            return []

        livres = [
            SlotDisponivel(
                dataHora=s,
                medicoId=medicoId,
                medicoNome=medico.nome,
                preco=medico.preco,
            )
            for s in slots_candidatos
            if s not in ocupados_set
        ]
        return livres[:limite]


    # ── Pacientes ──────────────────────────────────────────────────────────────

    async def paciente_por_telefone(
        self,
        clinicaId: str,
        telefone:  str,           # "+244923456789"
    ) -> Optional[Paciente]:
        """
        Busca paciente pelo número de WhatsApp.
        Usado para identificar quem está a conversar.
        """
        async with conn() as c:
            r = await c.fetchrow("""
                SELECT id, nome, telefone, data_nascimento, alergias, clinica_id, origem
                FROM pacientes
                WHERE clinica_id = $1 AND telefone = $2
                LIMIT 1
            """, clinicaId, telefone)

        if not r: return None
        return Paciente(
            id=r["id"], nome=r["nome"], telefone=r["telefone"],
            dataNascimento=r["data_nascimento"], alergias=r["alergias"],
            clinicaId=r["clinica_id"], origem=r["origem"] or "DIRECTO",
        )


    async def paciente_por_id(
        self,
        clinicaId:  str,
        pacienteId: str,
    ) -> Optional[Paciente]:
        async with conn() as c:
            r = await c.fetchrow("""
                SELECT id, nome, telefone, data_nascimento, alergias, clinica_id, origem
                FROM pacientes
                WHERE clinica_id = $1 AND id = $2
            """, clinicaId, pacienteId)

        if not r: return None
        return Paciente(
            id=r["id"], nome=r["nome"], telefone=r["telefone"],
            dataNascimento=r["data_nascimento"], alergias=r["alergias"],
            clinicaId=r["clinica_id"], origem=r["origem"] or "DIRECTO",
        )


    # ── Agendamentos ───────────────────────────────────────────────────────────

    async def proximos_agendamentos_paciente(
        self,
        clinicaId:  str,
        pacienteId: str,
        limite:     int = 3,
    ) -> list[Agendamento]:
        """
        Próximas consultas do paciente (estado activo, data futura).
        Índice: @@index([clinicaId, pacienteId])
        """
        agora = datetime.now(LUANDA_TZ)
        async with conn() as c:
            rows = await c.fetch("""
                SELECT
                    a.id, a.data_hora, a.estado, a.canal,
                    m.nome AS medico_nome, m.especialidade AS medico_esp,
                    p.nome AS paciente_nome
                FROM agendamentos a
                JOIN medicos  m ON m.id = a.medico_id
                JOIN pacientes p ON p.id = a.paciente_id
                WHERE a.clinica_id  = $1
                  AND a.paciente_id = $2
                  AND a.data_hora  >= $3
                  AND a.estado NOT IN ('CANCELADO', 'NAO_COMPARECEU')
                ORDER BY a.data_hora
                LIMIT $4
            """, clinicaId, pacienteId, agora, limite)

        return [Agendamento(
            id=r["id"], dataHora=r["data_hora"], estado=r["estado"],
            canal=r["canal"] or "PRESENCIAL",
            medicoNome=r["medico_nome"], medicoEsp=r["medico_esp"],
            pacienteNome=r["paciente_nome"], clinicaId=clinicaId,
        ) for r in rows]


    async def historico_agendamentos_paciente(
        self,
        clinicaId:  str,
        pacienteId: str,
        limite:     int = 5,
    ) -> list[Agendamento]:
        """Consultas passadas do paciente (para o perfil e no-show predictor)."""
        agora = datetime.now(LUANDA_TZ)
        async with conn() as c:
            rows = await c.fetch("""
                SELECT
                    a.id, a.data_hora, a.estado, a.canal,
                    m.nome AS medico_nome, m.especialidade AS medico_esp,
                    p.nome AS paciente_nome
                FROM agendamentos a
                JOIN medicos   m ON m.id = a.medico_id
                JOIN pacientes p ON p.id = a.paciente_id
                WHERE a.clinica_id  = $1
                  AND a.paciente_id = $2
                  AND a.data_hora   < $3
                ORDER BY a.data_hora DESC
                LIMIT $4
            """, clinicaId, pacienteId, agora, limite)

        return [Agendamento(
            id=r["id"], dataHora=r["data_hora"], estado=r["estado"],
            canal=r["canal"] or "PRESENCIAL",
            medicoNome=r["medico_nome"], medicoEsp=r["medico_esp"],
            pacienteNome=r["paciente_nome"], clinicaId=clinicaId,
        ) for r in rows]


    async def agendamento_por_id(
        self,
        clinicaId:     str,
        agendamentoId: str,
    ) -> Optional[Agendamento]:
        """Busca um agendamento validando clinicaId (IDOR prevention)."""
        async with conn() as c:
            r = await c.fetchrow("""
                SELECT
                    a.id, a.data_hora, a.estado, a.canal,
                    m.nome AS medico_nome, m.especialidade AS medico_esp,
                    p.nome AS paciente_nome
                FROM agendamentos a
                JOIN medicos   m ON m.id = a.medico_id
                JOIN pacientes p ON p.id = a.paciente_id
                WHERE a.clinica_id = $1 AND a.id = $2
            """, clinicaId, agendamentoId)

        if not r: return None
        return Agendamento(
            id=r["id"], dataHora=r["data_hora"], estado=r["estado"],
            canal=r["canal"] or "PRESENCIAL",
            medicoNome=r["medico_nome"], medicoEsp=r["medico_esp"],
            pacienteNome=r["paciente_nome"], clinicaId=clinicaId,
        )


    async def stats_no_show_paciente(
        self,
        clinicaId:  str,
        pacienteId: str,
    ) -> dict:
        """
        Calcula taxa de no-show do paciente para o predictor.
        Query única — evitar N+1.
        """
        async with conn() as c:
            r = await c.fetchrow("""
                SELECT
                    COUNT(*) FILTER (WHERE estado IN ('CONCLUIDO','NAO_COMPARECEU')) AS total,
                    COUNT(*) FILTER (WHERE estado = 'NAO_COMPARECEU')               AS no_shows,
                    COUNT(*) FILTER (WHERE estado = 'CANCELADO')                    AS cancelamentos,
                    MAX(data_hora) FILTER (WHERE estado = 'CONCLUIDO')              AS ultima_concluida
                FROM agendamentos
                WHERE clinica_id  = $1 AND paciente_id = $2
            """, clinicaId, pacienteId)

        total = r["total"] or 0
        return {
            "total":         total,
            "no_shows":      r["no_shows"] or 0,
            "cancelamentos": r["cancelamentos"] or 0,
            "taxa_no_show":  round((r["no_shows"] or 0) / max(total, 1), 3),
            "ultima_concluida": r["ultima_concluida"],
        }


    # ── Receitas ───────────────────────────────────────────────────────────────

    async def receitas_recentes_paciente(
        self,
        clinicaId:  str,
        pacienteId: str,
        limite:     int = 3,
    ) -> list[Receita]:
        """
        Receitas activas (não expiradas) do paciente.
        Índice: @@index([clinicaId, pacienteId])
        """
        async with conn() as c:
            rows = await c.fetch("""
                SELECT
                    r.id, r.criado_em,
                    m.nome AS medico_nome,
                    r.medicamentos
                FROM receitas r
                JOIN medicos m ON m.id = r.medico_id
                WHERE r.clinica_id  = $1
                  AND r.paciente_id = $2
                ORDER BY r.criado_em DESC
                LIMIT $3
            """, clinicaId, pacienteId, limite)

        result = []
        for row in rows:
            import json as _json
            meds = _json.loads(row["medicamentos"]) if isinstance(row["medicamentos"], str) else (row["medicamentos"] or [])
            result.append(Receita(
                id=row["id"],
                criadoEm=row["criado_em"],
                medicoNome=row["medico_nome"],
                medicamentos=meds,
            ))
        return result


# ── Singleton ──────────────────────────────────────────────────────────────────
db = ClinicaDB()


# ── Formatter: de dados DB → texto WhatsApp ────────────────────────────────────

DIAS_PT   = ["segunda-feira","terça-feira","quarta-feira","quinta-feira",
             "sexta-feira","sábado","domingo"]
MESES_PT  = ["","janeiro","fevereiro","março","abril","maio","junho",
             "julho","agosto","setembro","outubro","novembro","dezembro"]

def fmt_dt(dt: datetime) -> str:
    """'terça-feira, 24 de março às 09:00'"""
    lt = dt.astimezone(LUANDA_TZ)
    return f"{DIAS_PT[lt.weekday()]}, {lt.day} de {MESES_PT[lt.month]} às {lt.strftime('%H:%M')}"

def fmt_kz(valor: int) -> str:
    """'3.500 Kz'"""
    return f"{valor:,.0f} Kz".replace(",",".")

def fmt_estado(estado: str) -> str:
    return {
        "PENDENTE":       "⏳ Pendente",
        "CONFIRMADO":     "✅ Confirmado",
        "EM_PROGRESSO":   "🔄 Em progresso",
        "CONCLUIDO":      "✔️  Concluído",
        "CANCELADO":      "❌ Cancelado",
        "NAO_COMPARECEU": "⚠️  Não compareceu",
    }.get(estado, estado)


class WaFormatter:
    """
    Converte dados da DB em mensagens WhatsApp estruturadas.
    Cada método retorna uma string pronta a enviar via evolutionApi.enviarTexto()
    ou uma lista de opções pronta para evolutionApi.enviarPoll().
    """

    @staticmethod
    def medicos_como_poll(medicos: list[Medico]) -> dict:
        """
        Retorna estrutura para enviarPoll().
        { pergunta: str, opcoes: list[str] }
        """
        opcoes = [f"{m.nome}  —  {fmt_kz(m.preco)}" for m in medicos]
        return {
            "pergunta": "Escolhe o médico:",
            "opcoes":   opcoes,
        }

    @staticmethod
    def slots_como_poll(slots: list[SlotDisponivel]) -> dict:
        """Slots disponíveis como Poll de horários."""
        opcoes = [fmt_dt(s.dataHora) for s in slots]
        return {
            "pergunta": "Escolhe o horário:",
            "opcoes":   opcoes,
        }

    @staticmethod
    def proximas_consultas(agendamentos: list[Agendamento], nome: str) -> str:
        if not agendamentos:
            return (
                f"Olá, {nome.split()[0]}! 👋\n\n"
                "Não tens consultas marcadas. Escreve *marcar* para agendar uma."
            )

        linhas = [f"As tuas próximas consultas, {nome.split()[0]}:\n"]
        for i, ag in enumerate(agendamentos, 1):
            linhas.append(
                f"*{i}.* {fmt_dt(ag.dataHora)}\n"
                f"   👨‍⚕️ {ag.medicoNome}  ({ag.medicoEsp})\n"
                f"   {fmt_estado(ag.estado)}"
            )
        linhas.append("\nEscreve *marcar* para agendar outra consulta.")
        return "\n".join(linhas)

    @staticmethod
    def confirmacao_agendamento(ag: Agendamento) -> str:
        return (
            "✅ *Consulta marcada com sucesso!*\n\n"
            f"📅 {fmt_dt(ag.dataHora)}\n"
            f"👨‍⚕️ {ag.medicoNome}\n"
            f"🏥 {ag.medicoEsp}\n\n"
            "Receberás um lembrete 24h antes. Até lá! 🙏"
        )

    @staticmethod
    def sem_slots(medicoNome: str, alternativas: list[SlotDisponivel]) -> str:
        if not alternativas:
            return (
                f"Não há vagas disponíveis com *{medicoNome}* nos próximos dias.\n"
                "Liga para a clínica para mais opções."
            )
        alt_txt = "\n".join(
            f"{i+1}. {fmt_dt(a.dataHora)} — {a.medicoNome}"
            for i, a in enumerate(alternativas[:3])
        )
        return (
            f"Não há vagas com *{medicoNome}* para a data pedida.\n\n"
            f"Encontrei estas alternativas:\n{alt_txt}\n\n"
            "Escolhe uma ou escreve *0* para recomeçar."
        )

    @staticmethod
    def receitas(receitas: list[Receita], nome: str) -> str:
        if not receitas:
            return f"Não há receitas recentes, {nome.split()[0]}."

        linhas = [f"As tuas receitas recentes, {nome.split()[0]}:\n"]
        for r in receitas:
            linhas.append(f"*{r.criadoEm.strftime('%d/%m/%Y')}* — Dr(a). {r.medicoNome}")
            for m in r.medicamentos[:3]:
                nome_med = m.get("nome","—")
                dos      = m.get("dosagem","")
                freq     = m.get("frequencia","")
                linhas.append(f"   💊 {nome_med}  {dos}  {freq}".strip())
        return "\n".join(linhas)

    @staticmethod
    def perfil_paciente(p: Paciente, stats: dict) -> str:
        """Resumo do paciente para o bot (uso interno — não enviar ao paciente)."""
        taxa = stats["taxa_no_show"]
        nivel = "🔴 Alto" if taxa > 0.4 else "🟡 Médio" if taxa > 0.2 else "🟢 Baixo"
        return (
            f"*{p.nome}*\n"
            f"📞 {p.telefone or '—'}\n"
            f"Total consultas: {stats['total']}  |  No-shows: {stats['no_shows']}  ({taxa:.0%})\n"
            f"Risco: {nivel}"
        )


# ── Exemplo de uso completo ────────────────────────────────────────────────────

async def exemplo_fluxo_completo():
    """
    Demonstra o fluxo completo:
    1. Paciente escreve "quero marcar cardio para amanhã"
    2. NLU extrai especialidade + data
    3. DB busca médicos + slots
    4. Formatter monta resposta estruturada para WhatsApp
    """
    clinicaId = "clinica-abc-123"
    numero    = "244923456789"
    telefone  = f"+{numero}"

    print("═" * 60)
    print("FLUXO: quero marcar cardio para amanhã")
    print("═" * 60)

    # 1. Identificar paciente
    paciente = await db.paciente_por_telefone(clinicaId, telefone)
    if paciente:
        print(f"\n✓ Paciente identificado: {paciente.nome}")
        stats = await db.stats_no_show_paciente(clinicaId, paciente.id)
        print(f"  Score no-show: {stats['taxa_no_show']:.0%}")
    else:
        print("\n→ Número desconhecido — será criado como paciente novo")

    # 2. Buscar médicos da especialidade
    medicos = await db.medicos_por_especialidade(clinicaId, "Cardiologia")
    print(f"\n✓ Médicos de Cardiologia: {len(medicos)}")
    for m in medicos:
        print(f"  - {m.nome}  ({fmt_kz(m.preco)})")

    # 3. Buscar slots (amanhã, sem filtro de período)
    from datetime import date
    amanha = (datetime.now(LUANDA_TZ) + timedelta(days=1)).date()

    todos_slots = []
    for m in medicos:
        slots = await db.slots_por_regra(
            clinicaId=clinicaId,
            medicoId=m.id,
            data=amanha,
            hora_ini=8, hora_fim=18, intervalo=30, limite=3,
        )
        todos_slots.extend(slots)

    todos_slots.sort(key=lambda s: s.dataHora)
    print(f"\n✓ Slots disponíveis amanhã: {len(todos_slots)}")
    for s in todos_slots[:5]:
        print(f"  - {fmt_dt(s.dataHora)}  —  {s.medicoNome}")

    # 4. Montar Poll para WhatsApp
    if todos_slots:
        poll = WaFormatter.slots_como_poll(todos_slots[:5])
        print(f"\n📊 Poll para WhatsApp:")
        print(f"   Pergunta: {poll['pergunta']}")
        for i, op in enumerate(poll["opcoes"], 1):
            print(f"   {i}. {op}")
    else:
        msg = WaFormatter.sem_slots("Cardiologia", [])
        print(f"\n📨 Mensagem (sem slots):\n{msg}")

    # 5. Consultas futuras do paciente (se identificado)
    if paciente:
        proximas = await db.proximos_agendamentos_paciente(clinicaId, paciente.id)
        msg = WaFormatter.proximas_consultas(proximas, paciente.nome)
        print(f"\n📨 Resposta a 'as minhas consultas':\n{msg}")


if __name__ == "__main__":
    # Para correr o exemplo: DATABASE_URL=postgresql://... python3 db_layer.py
    if os.environ.get("DATABASE_URL"):
        asyncio.run(exemplo_fluxo_completo())
    else:
        print("ℹ️  Para testar: DATABASE_URL=postgresql://... python3 db_layer.py")
        print("\nEstrutura do módulo:")
        print("  ClinicaDB")
        print("    .medicos_por_especialidade(clinicaId, especialidade)")
        print("    .medico_por_id(clinicaId, medicoId)")
        print("    .especialidades_activas(clinicaId)")
        print("    .slots_disponiveis(clinicaId, medicoId, data_inicio, ...)")
        print("    .slots_por_regra(clinicaId, medicoId, data, hora_ini, hora_fim, ...)")
        print("    .paciente_por_telefone(clinicaId, telefone)")
        print("    .paciente_por_id(clinicaId, pacienteId)")
        print("    .proximos_agendamentos_paciente(clinicaId, pacienteId)")
        print("    .historico_agendamentos_paciente(clinicaId, pacienteId)")
        print("    .agendamento_por_id(clinicaId, agendamentoId)")
        print("    .stats_no_show_paciente(clinicaId, pacienteId)")
        print("    .receitas_recentes_paciente(clinicaId, pacienteId)")
        print("\n  WaFormatter")
        print("    .medicos_como_poll(medicos)       → { pergunta, opcoes }")
        print("    .slots_como_poll(slots)           → { pergunta, opcoes }")
        print("    .proximas_consultas(ags, nome)    → str WhatsApp")
        print("    .confirmacao_agendamento(ag)      → str WhatsApp")
        print("    .sem_slots(medicoNome, alts)      → str WhatsApp")
        print("    .receitas(receitas, nome)         → str WhatsApp")
        print("    .perfil_paciente(paciente, stats) → str WhatsApp")
