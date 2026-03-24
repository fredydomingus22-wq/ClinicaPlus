import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from db.layer import ClinicaDB, WaFormatter, SlotDisponivel, Medico
from datetime import datetime, timezone, timedelta

LUANDA = timezone(timedelta(hours=1))

@pytest.fixture
def db():
    return ClinicaDB()

@pytest.mark.asyncio
async def test_medicos_filtra_por_clinica(db):
    mock_row = {
        "id": "med-1", "nome": "Dr. Carlos", "especialidade": "Cardiologia",
        "preco": 3000, "ativo": True, "clinica_id": "cli-1"
    }
    # Mocking the async with conn() as c: block
    with patch("db.layer.conn") as mock_conn:
        mock_handler = MagicMock()
        mock_handler.fetch = AsyncMock(return_value=[mock_row])
        
        # Async context manager mock: async with mock_conn() as c
        mock_conn.return_value.__aenter__ = AsyncMock(return_value=mock_handler)
        
        medicos = await db.medicos_por_especialidade("cli-1", "Cardiologia")
        
    assert len(medicos) == 1
    assert medicos[0].nome == "Dr. Carlos"
    assert medicos[0].clinicaId == "cli-1"
    # Ensure it filtered by clinicaId in the query
    args = mock_handler.fetch.call_args[0]
    assert "clinica_id = $1" in args[0]
    assert args[1] == "cli-1"

@pytest.mark.asyncio
async def test_paciente_por_telefone_retorna_none_se_nao_existe(db):
    with patch("db.layer.conn") as mock_conn:
        mock_handler = MagicMock()
        mock_handler.fetchrow = AsyncMock(return_value=None)
        mock_conn.return_value.__aenter__ = AsyncMock(return_value=mock_handler)
        
        p = await db.paciente_por_telefone("cli-1", "+244900000000")
    assert p is None

@pytest.mark.asyncio
async def test_stats_no_show_retorna_zeros_para_novo_paciente(db):
    mock_row = {"total": 0, "no_shows": 0, "cancelamentos": 0, "ultima_concluida": None}
    with patch("db.layer.conn") as mock_conn:
        mock_handler = MagicMock()
        mock_handler.fetchrow = AsyncMock(return_value=mock_row)
        mock_conn.return_value.__aenter__ = AsyncMock(return_value=mock_handler)
        
        stats = await db.stats_no_show_paciente("cli-1", "pac-1")
    assert stats["taxa_no_show"] == 0.0
    assert stats["total"] == 0

def test_formatter_slots_como_poll():
    slots = [SlotDisponivel(
        dataHora=datetime(2026, 3, 25, 9, 0, tzinfo=LUANDA),
        medicoId="med-1", medicoNome="Dr. Carlos", preco=3000,
    )]
    poll = WaFormatter.slots_como_poll(slots)
    assert "pergunta" in poll
    assert len(poll["opcoes"]) == 1
    # Poll should not show doctor name if already selected, just time
    assert "09:00" in poll["opcoes"][0]
    assert "Dr. Carlos" not in poll["opcoes"][0]

def test_formatter_confirmacao_agendamento():
    from db.layer import Agendamento
    ag = Agendamento(
        id="ag-1", dataHora=datetime(2026, 3, 25, 9, 0, tzinfo=LUANDA),
        estado="CONFIRMADO", canal="WHATSAPP",
        medicoNome="Dr. Carlos", medicoEsp="Cardiologia",
        pacienteNome="João Silva", clinicaId="cli-1",
    )
    msg = WaFormatter.confirmacao_agendamento(ag)
    assert "✅" in msg
    assert "Dr. Carlos" in msg
    assert "09:00" in msg
