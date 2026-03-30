# intel/cost/tracker.py
import json
from datetime import datetime, timezone, timedelta
from intel.config.models import PRICING_USD_PER_1M

LUANDA_TZ = timezone(timedelta(hours=1))

class CostTracker:
    """
    Rastreia custos por agente, por clínica, e por conversa.
    Guarda no Redis para agregação mensal.
    """
    def __init__(self, redis_client):
        self.redis = redis_client

    async def registar(
        self,
        clinica_id:  str,
        agente:      str,
        modelo:      str,
        input_tokens: int,
        output_tokens: int,
    ) -> float:
        pricing = PRICING_USD_PER_1M.get(modelo, {"input": 0.0, "output": 0.0})
        custo   = (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000

        agora = datetime.now(LUANDA_TZ)
        mes   = agora.strftime("%Y-%m")
        dia   = agora.strftime("%Y-%m-%d")

        # Acumular por clínica/mês para budget tracking
        pipe = self.redis.pipeline()
        pipe.incrbyfloat(f"cost:clinica:{clinica_id}:{mes}", custo)
        pipe.incrbyfloat(f"cost:agente:{agente}:{mes}", custo)
        pipe.incrbyfloat(f"cost:total:{mes}", custo)
        pipe.incrbyfloat(f"cost:clinica:{clinica_id}:{dia}", custo)
        await pipe.execute()

        return custo

    async def get_custo_mensal(self, clinica_id: str) -> dict:
        mes = datetime.now(LUANDA_TZ).strftime("%Y-%m")
        custo_str = await self.redis.get(f"cost:clinica:{clinica_id}:{mes}")
        custo_val = float(custo_str or 0)
        return {
            "mes": mes,
            "clinica_id": clinica_id,
            "custo_usd": custo_val,
            "custo_kz":  custo_val * 900,  # taxa aproximada USD→KZ
        }

    async def verificar_budget(self, clinica_id: str, budget_usd: float = 10.0) -> bool:
        """Retorna False se a clínica excedeu o budget mensal."""
        info = await self.get_custo_mensal(clinica_id)
        return info["custo_usd"] < budget_usd
