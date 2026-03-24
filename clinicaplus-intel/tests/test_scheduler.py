import pytest
from unittest.mock import patch, MagicMock
from jobs.scheduler import init_scheduler, get_scheduler

@pytest.mark.asyncio
async def test_scheduler_initialization():
    scheduler_instance = get_scheduler()
    with patch("apscheduler.schedulers.asyncio.AsyncIOScheduler.start") as mock_start:
        with patch("apscheduler.schedulers.asyncio.AsyncIOScheduler.add_job") as mock_add:
            await init_scheduler()
            
            # Verify jobs are added
            assert mock_add.call_count >= 3
            
            # Verify specific jobs by ID
            calls = [call.kwargs.get("id") for call in mock_add.call_args_list]
            assert "expirar_conversas" in calls
            assert "lembretes_proativos" in calls
            assert "retrain_noshow" in calls


def test_scheduler_access():
    # Verify global scheduler object is accessible via getter
    from jobs.scheduler import get_scheduler
    assert get_scheduler() is not None

