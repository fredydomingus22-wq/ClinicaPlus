#!/usr/bin/env python3
"""
Varrimento recursivo da documentação AGT FE para manter referências locais atualizadas.

Uso:
  python scripts/sync_docs.py
  python scripts/sync_docs.py --base-url https://quiosqueagt.minfin.gov.ao/doc-agt/faturacao-electronica/1/
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests


def normalize(url: str) -> str:
    return re.sub(r"#.*$", "", url.rstrip("/"))


def in_scope(url: str, root: str) -> bool:
    u, r = urlparse(url), urlparse(root)
    return u.netloc == r.netloc and u.path.startswith(r.path.rstrip("/") + "/") or url == root.rstrip("/")


def extract_links(html: str, current: str) -> set[str]:
    links = set(re.findall(r'href=["\']([^"\']+)["\']', html, flags=re.IGNORECASE))
    out = set()
    for lnk in links:
        if lnk.startswith("javascript:") or lnk.startswith("mailto:"):
            continue
        out.add(normalize(urljoin(current, lnk)))
    return out


def crawl(base_url: str) -> dict:
    seen: set[str] = set()
    queue = [normalize(base_url)]
    pages = {}
    session = requests.Session()
    session.headers.update({"User-Agent": "agt-fe-skill-sync/1.0"})

    while queue:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)

        try:
            resp = session.get(url, timeout=25)
            if "text/html" not in resp.headers.get("Content-Type", ""):
                continue
            html = resp.text
            pages[url] = {
                "status": resp.status_code,
                "title": re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL).group(1).strip() if re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL) else "",
                "size": len(html),
            }
            for nxt in extract_links(html, url):
                if in_scope(nxt, base_url) and nxt not in seen:
                    queue.append(nxt)
        except requests.RequestException:
            pages[url] = {"status": "error", "title": "", "size": 0}

    return {"base_url": base_url, "count": len(pages), "pages": pages}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="https://quiosqueagt.minfin.gov.ao/doc-agt/faturacao-electronica/1/")
    parser.add_argument("--out", default="references/discovered_pages.json")
    args = parser.parse_args()

    data = crawl(args.base_url)
    out_path = Path(__file__).resolve().parents[1] / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {data['count']} páginas guardadas em {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
