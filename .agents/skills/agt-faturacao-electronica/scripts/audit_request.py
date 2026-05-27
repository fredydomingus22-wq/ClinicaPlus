#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

REQUIRED = [
    "schemaVersion",
    "taxRegistrationNumber",
    "submissionTimeStamp",
    "softwareInfo",
]


def main() -> int:
    p = argparse.ArgumentParser(description="Audita payload mínimo AGT FE")
    p.add_argument("--payload", required=True)
    args = p.parse_args()

    payload = json.loads(Path(args.payload).read_text(encoding="utf-8"))
    missing = [k for k in REQUIRED if k not in payload]

    if missing:
      print("FAIL: campos ausentes ->", ", ".join(missing))
      return 2

    if "jwsSignature" not in payload:
      print("WARN: jwsSignature ausente")
    else:
      print("OK: jwsSignature presente")

    print("OK: validação mínima concluída")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
