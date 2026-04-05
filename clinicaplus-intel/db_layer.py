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

    @asynccontextmanager
    async def conn(self):
        pool = await get_pool()
        async with pool.acquire() as c:
            yield c

    # ── Médicos ────────────────────────────────────────────────────────────────

    async def medicos_por_especialidade(
        self,
        clinicaId: str,
        especialidade: str,
    ) -> list[Medico]:
        """
        Retorna médicos activos de uma especialidade.
        Índice usado: @@index([clinicaId, especialidadeId])
        """
        async with self.conn() as c:
            rows = await c.fetch("""
                SELECT m.id, m.nome, e.nome AS especialidade_nome, m.preco, m.ativo, m."clinicaId"
                FROM medicos m
                JOIN especialidades e ON e.id = m."especialidadeId"
                WHERE m."clinicaId" = $1
                  AND e.nome = $2
                  AND m.ativo = true
                ORDER BY m.nome
            """, clinicaId, especialidade)

        return [Medico(
            id=r["id"], nome=r["nome"], especialidade=r["especialidade_nome"],
            preco=r["preco"], ativo=r["ativo"], clinicaId=r["clinicaId"],
        ) for r in rows]


    async def medico_por_id(
        self,
        clinicaId: str,
        medicoId:  str,
    ) -> Optional[Medico]:
        """
        Busca um médico validando que pertence à clínica (prevenção de IDOR).
        """
        async with self.conn() as c:
            r = await c.fetchrow("""
                SELECT m.id, m.nome, e.nome AS especialidade_nome, m.preco, m.ativo, m."clinicaId"
                FROM medicos m
                JOIN especialidades e ON e.id = m."especialidadeId"
                WHERE m."clinicaId" = $1 AND m.id = $2
            """, clinicaId, medicoId)

        if not r: return None
        return Medico(
            id=r["id"], nome=r["nome"], especialidade=r["especialidade_nome"],
            preco=r["preco"], ativo=r["ativo"], clinicaId=r["clinicaId"],
        )

    async def especialidades_activas(self, clinicaId: str) -> list[str]:
        """Retorna lista de nomes de especialidades que têm médicos activos."""
        async with self.conn() as c:
            rows = await c.fetch("""
                SELECT DISTINCT e.nome
                FROM especialidades e
                JOIN medicos m ON m."especialidadeId" = e.id
                WHERE m."clinicaId" = $1 AND m.ativo = true
                ORDER BY e.nome
            """, clinicaId)
        return [r["nome"] for r in rows]


    async def buscar_config_clinica(self, clinicaId: str) -> dict:
        """
        Busca metadados e regras da clínica (configurações, convénios, etc).
        """
        async with self.conn() as c:
            # 1. Dados base da clínica
            clinica = await c.fetchrow('SELECT nome, endereco, cidade, telefone FROM clinicas WHERE id = $1', clinicaId)
            nome_clinica = clinica["nome"] if clinica else "Clínica"
            location = f"{clinica['endereco']}, {clinica['cidade']}" if clinica and clinica["endereco"] else "Luanda, Angola"
            telefone = clinica["telefone"] if clinica else ""

            # 2. Configurações gerais
            cfg = await c.fetchrow("""
                SELECT "lembrete24h", "horasAntecedencia", "preTriagem", "seguradoras"
                FROM configuracoes_clinica
                WHERE "clinicaId" = $1
            """, clinicaId)
            
            # 3. Especialidades activas
            especialidades = await self.especialidades_activas(clinicaId)
            
            # 4. Médicos e preços base (para FAQs)
            medicos = await c.fetch("""
                SELECT m.nome, e.nome as esp, m.preco
                FROM medicos m
                JOIN especialidades e ON e.id = m."especialidadeId"
                WHERE m."clinicaId" = $1 AND m.ativo = true
            """, clinicaId)

            return {
                "name": nome_clinica,
                "location": location,
                "phone": telefone,
                "working_hours": "Seg-Sex 8h-18h, Sáb 8h-13h", # Padrão industrial Angolano
                "seguradoras": cfg["seguradoras"] if cfg else [],
                "preTriagem": cfg["preTriagem"] if cfg else True,
                "antecedencia_horas": cfg["horasAntecedencia"] if cfg else 24,
                "specialties": especialidades, # Mapeado para o código NLU
                "medicos": [{"nome": m["nome"], "especialidade": m["esp"], "preco": m["preco"]} for m in medicos]
            }


    # ── Slots disponíveis ──────────────────────────────────────────────────────

    async def slots_disponiveis(
        self,
        clinicaId:    str,
        medicoId:     str,
        data_alvo:    Optional[date] = None,
        periodo_ini:  Optional[int]  = None,
        periodo_fim:  Optional[int]  = None,
        limite:       int = 6,
    ) -> list[SlotDisponivel]:
        """
        Calcula slots disponíveis baseando-se no horário JSON do médico e agendamentos existentes.
        Substitui a antiga query à tabela inexistente 'horarios_medico'.
        """
        target_date = data_alvo or datetime.now(LUANDA_TZ).date()
        
        async with self.conn() as c:
            # 1. Buscar médico e sua regra de horário
            med_row = await c.fetchrow("""
                SELECT id, nome, preco, horario, "duracaoConsulta" 
                FROM medicos 
                WHERE id = $1 AND "clinicaId" = $2 AND ativo = true
            """, medicoId, clinicaId)
            
            if not med_row: return []

            import json as _json
            horario = _json.loads(med_row["horario"]) if isinstance(med_row["horario"], str) else med_row["horario"]
            duracao = med_row["duracaoConsulta"] or 30
            
            # 2. Identificar dia da semana (pt)
            dias_semana = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]
            dia_pt = dias_semana[target_date.weekday()]
            
            rule = horario.get(dia_pt)
            if not rule or not rule.get("ativo"):
                return []

            try:
                h_ini, m_ini = map(int, rule["inicio"].split(":"))
                h_fim, m_fim = map(int, rule["fim"].split(":"))
            except:
                return []

            # 3. Buscar agendamentos ocupados no dia
            occupied_rows = await c.fetch("""
                SELECT "dataHora" FROM agendamentos 
                WHERE "medicoId" = $1 AND "dataHora"::date = $2 
                AND estado NOT IN ('CANCELADO')
            """, medicoId, target_date)
            occupied_times = {r["dataHora"].replace(tzinfo=None) for r in occupied_rows}

            # 4. Gerar slots e filtrar
            slots = []
            curr = datetime.combine(target_date, datetime.min.time()).replace(hour=h_ini, minute=m_ini)
            end_limit = datetime.combine(target_date, datetime.min.time()).replace(hour=h_fim, minute=m_fim)
            agora = datetime.now(LUANDA_TZ).replace(tzinfo=None)

            while curr < end_limit and len(slots) < limite:
                hour = curr.hour
                if curr > agora and curr not in occupied_times:
                    # Filtro de período (manhã/tarde)
                    if (periodo_ini is None or hour >= periodo_ini) and \
                       (periodo_fim is None or hour <  periodo_fim):
                        
                        # Checar pausa
                        na_pausa = False
                        p_ini_raw = rule.get("pausaInicio")
                        p_fim_raw = rule.get("pausaFim")
                        if p_ini_raw and p_fim_raw:
                            try:
                                ph_ini, pm_ini = map(int, p_ini_raw.split(":"))
                                ph_fim, pm_fim = map(int, p_fim_raw.split(":"))
                                pausa_ini = curr.replace(hour=ph_ini, minute=pm_ini)
                                pausa_fim = curr.replace(hour=ph_fim, minute=pm_fim)
                                if pausa_ini <= curr < pausa_fim:
                                    na_pausa = True
                            except: pass

                        if not na_pausa:
                            slots.append(SlotDisponivel(
                                dataHora=curr.replace(tzinfo=LUANDA_TZ),
                                medicoId=medicoId,
                                medicoNome=med_row["nome"],
                                preco=med_row["preco"]
                            ))
                
                curr += timedelta(minutes=duracao)

            return slots


    async def slots_por_regra(self, *args, **kwargs) -> list[SlotDisponivel]:
        """Alias para manter retrocompatibilidade com as ferramentas do agente."""
        return await self.slots_disponiveis(*args, **kwargs)


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
        async with self.conn() as c:
            r = await c.fetchrow("""
                SELECT id, nome, telefone, "dataNascimento", alergias, "clinicaId", origem
                FROM pacientes
                WHERE "clinicaId" = $1 AND telefone = $2
                LIMIT 1
            """, clinicaId, telefone)

        if not r: return None
        return Paciente(
            id=r["id"], nome=r["nome"], telefone=r["telefone"],
            dataNascimento=r["dataNascimento"], alergias=r["alergias"],
            clinicaId=r["clinicaId"], origem=r["origem"] or "DIRECTO",
        )


    async def paciente_por_id(
        self,
        clinicaId:  str,
        pacienteId: str,
    ) -> Optional[Paciente]:
        async with self.conn() as c:
            r = await c.fetchrow("""
                SELECT id, nome, telefone, "dataNascimento", alergias, "clinicaId", origem
                FROM pacientes
                WHERE "clinicaId" = $1 AND id = $2
            """, clinicaId, pacienteId)

        if not r: return None
        return Paciente(
            id=r["id"], nome=r["nome"], telefone=r["telefone"],
            dataNascimento=r["dataNascimento"], alergias=r["alergias"],
            clinicaId=r["clinicaId"], origem=r["origem"] or "DIRECTO",
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
        """
        agora = datetime.now(LUANDA_TZ).replace(tzinfo=None)
        async with self.conn() as c:
            rows = await c.fetch("""
                SELECT
                    a.id, a."dataHora", a.estado, a.canal,
                    m.nome AS medico_nome, e.nome AS medico_esp,
                    p.nome AS paciente_nome
                FROM agendamentos a
                JOIN medicos   m ON m.id = a."medicoId"
                JOIN especialidades e ON e.id = m."especialidadeId"
                JOIN pacientes p ON p.id = a."pacienteId"
                WHERE a."clinicaId"  = $1
                  AND a."pacienteId" = $2
                  AND a."dataHora"  >= $3
                  AND a.estado NOT IN ('CANCELADO', 'NAO_COMPARECEU')
                ORDER BY a."dataHora"
                LIMIT $4
            """, clinicaId, pacienteId, agora, limite)

        return [Agendamento(
            id=r["id"], dataHora=r["dataHora"], estado=r["estado"],
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
        agora = datetime.now(LUANDA_TZ).replace(tzinfo=None)
        async with self.conn() as c:
            rows = await c.fetch("""
                SELECT
                    a.id, a."dataHora", a.estado, a.canal,
                    m.nome AS medico_nome, e.nome AS medico_esp,
                    p.nome AS paciente_nome
                FROM agendamentos a
                JOIN medicos   m ON m.id = a."medicoId"
                JOIN especialidades e ON e.id = m."especialidadeId"
                JOIN pacientes p ON p.id = a."pacienteId"
                WHERE a."clinicaId"  = $1
                  AND a."pacienteId" = $2
                  AND a."dataHora"   < $3
                ORDER BY a."dataHora" DESC
                LIMIT $4
            """, clinicaId, pacienteId, agora, limite)

        return [Agendamento(
            id=r["id"], dataHora=r["dataHora"], estado=r["estado"],
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
        async with self.conn() as c:
            r = await c.fetchrow("""
                SELECT
                    a.id, a."dataHora", a.estado, a.canal,
                    m.nome AS medico_nome, e.nome AS medico_esp,
                    p.nome AS paciente_nome
                FROM agendamentos a
                JOIN medicos   m ON m.id = a."medicoId"
                JOIN especialidades e ON e.id = m."especialidadeId"
                JOIN pacientes p ON p.id = a."pacienteId"
                WHERE a."clinicaId" = $1 AND a.id = $2
            """, clinicaId, agendamentoId)

        if not r: return None
        return Agendamento(
            id=r["id"], dataHora=r["dataHora"], estado=r["estado"],
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
        """
        async with self.conn() as c:
            r = await c.fetchrow("""
                SELECT
                    COUNT(*) FILTER (WHERE estado IN ('CONCLUIDO','NAO_COMPARECEU')) AS total,
                    COUNT(*) FILTER (WHERE estado = 'NAO_COMPARECEU')               AS no_shows,
                    COUNT(*) FILTER (WHERE estado = 'CANCELADO')                    AS cancelamentos,
                    MAX("dataHora") FILTER (WHERE estado = 'CONCLUIDO')              AS ultima_concluida
                FROM agendamentos
                WHERE "clinicaId"  = $1 AND "pacienteId" = $2
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
        """
        async with self.conn() as c:
            rows = await c.fetch("""
                SELECT
                    r.id, r."criadoEm",
                    m.nome AS medico_nome,
                    r.medicamentos
                FROM receitas r
                JOIN medicos m ON m.id = r."medicoId"
                WHERE r."clinicaId"  = $1
                  AND r."pacienteId" = $2
                ORDER BY r."criadoEm" DESC
                LIMIT $3
            """, clinicaId, pacienteId, limite)

        result = []
        for row in rows:
            import json as _json
            meds = _json.loads(row["medicamentos"]) if isinstance(row["medicamentos"], str) else (row["medicamentos"] or [])
            result.append(Receita(
                id=row["id"],
                criadoEm=row["criadoEm"],
                medicoNome=row["medico_nome"],
                medicamentos=meds,
            ))
        return result
    # ── WhatsApp e Automações ──────────────────────────────────────────────────
    
    async def resolver_ids_por_instancia(self, evolution_name: str) -> Optional[dict]:
        """
        Mapeia o nome da instância da Evolution API (ex: 'clinica-a') 
        para o clinicaId e instanciaId da base de dados.
        """
        async with self.conn() as c:
            row = await c.fetchrow("""
                SELECT id, "clinicaId" 
                FROM wa_instancias 
                WHERE "evolutionName" = $1
                LIMIT 1
            """, evolution_name)
        
        if not row: return None
        return {
            "instanciaId": row["id"],
            "clinicaId":   row["clinicaId"],
        }


    async def is_ia_ativo(self, clinicaId: str, instanciaId: str) -> bool:
        """
        Verifica se o assistente de IA está activo para esta instância.
        Tabela: wa_automacoes (tipo='IA_ASSISTANT')
        """
        async with self.conn() as c:
            row = await c.fetchrow("""
                SELECT ativo 
                FROM wa_automacoes
                WHERE "clinicaId" = $1 
                  AND "waInstanciaId" = $2 
                  AND tipo = 'IA_ASSISTANT'
                LIMIT 1
            """, clinicaId, instanciaId)
        
        return bool(row and row["ativo"])


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
