#!/usr/bin/env python3
import argparse
import base64
import json
from pathlib import Path

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def canonical_json(data: dict) -> bytes:
    return json.dumps(data, separators=(",", ":"), ensure_ascii=False, sort_keys=True).encode("utf-8")


def sign_rs256(private_key_pem: bytes, payload: dict) -> str:
    header = {"alg": "RS256", "typ": "JWT"}
    part1 = b64url(canonical_json(header))
    part2 = b64url(canonical_json(payload))
    signing_input = f"{part1}.{part2}".encode("ascii")

    private_key = serialization.load_pem_private_key(private_key_pem, password=None)
    signature = private_key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
    return f"{part1}.{part2}.{b64url(signature)}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera JWS RS256 para payload AGT FE")
    parser.add_argument("--private-key", required=True, help="Caminho da chave privada PEM")
    parser.add_argument("--payload", required=True, help="JSON file do payload a assinar")
    args = parser.parse_args()

    private_key = Path(args.private_key).read_bytes()
    payload = json.loads(Path(args.payload).read_text(encoding="utf-8"))
    token = sign_rs256(private_key, payload)
    print(token)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
