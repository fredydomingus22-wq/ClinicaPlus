from datetime import datetime, timezone
import time

local_now = datetime.now()
utc_now = datetime.now(timezone.utc)

print(f"Local now: {local_now}")
print(f"UTC now: {utc_now}")
print(f"Local timestamp: {local_now.timestamp()}")
print(f"UTC timestamp: {utc_now.timestamp()}")
print(f"Difference: {utc_now.timestamp() - local_now.timestamp()}")

# Se a diferença for significativa, aqui está o bug.
# Em algumas versões de Python/Windows, datetime.now().timestamp() assume local.
# Se o Redis guardou uma e agora comparamos com outra, falha.
