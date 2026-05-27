#!/usr/bin/env python3
import sys
from pathlib import Path

required = [
    "AGT_FE_BASE_URL",
    "AGT_FE_USERNAME",
    "AGT_FE_PASSWORD",
    "AGT_FE_TAX_REG_NUMBER",
]

def main() -> int:
    env_file = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".env")
    if not env_file.exists():
        print(f"Erro: ficheiro {env_file} não encontrado")
        return 1

    lines = env_file.read_text(encoding="utf-8").splitlines()
    keys = {line.split("=", 1)[0].strip() for line in lines if "=" in line and not line.startswith("#")}
    missing = [k for k in required if k not in keys]
    if missing:
        print("Variáveis ausentes:", ", ".join(missing))
        return 2

    print("OK: variáveis mínimas encontradas")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
