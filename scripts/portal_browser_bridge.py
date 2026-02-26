#!/usr/bin/env python3
"""
Portal Browser Bridge (offline-safe)

- Uses Playwright when available for rendered content + screenshot.
- Falls back to urllib + stdlib HTML parsing when Playwright is unavailable.
"""

from __future__ import annotations

import base64
import re
from html.parser import HTMLParser
from typing import Any
from urllib.parse import quote_plus
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from playwright.sync_api import sync_playwright  # type: ignore
    HAS_PLAYWRIGHT = True
except Exception:
    HAS_PLAYWRIGHT = False

app = FastAPI(title="Portal Browser Bridge", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SEARCH_ENGINES: dict[str, str] = {
    "duckduckgo_lite": "https://html.duckduckgo.com/html/?q={q}",
    "duckduckgo": "https://duckduckgo.com/?q={q}",
    "bing": "https://www.bing.com/search?q={q}",
    "google": "https://www.google.com/search?q={q}",
    "perplexity": "https://www.perplexity.ai/search/new?q={q}",
}


class PreviewRequest(BaseModel):
    url: str = Field(..., min_length=4)
    wait_ms: int = Field(default=2200, ge=500, le=12000)
    max_links: int = Field(default=10, ge=1, le=30)


class SearchRequest(BaseModel):
    engine: str = Field(default="duckduckgo_lite")
    query: str = Field(..., min_length=2)
    wait_ms: int = Field(default=2200, ge=500, le=12000)


class LinkParser(HTMLParser):
    def __init__(self, max_links: int) -> None:
        super().__init__()
        self.max_links = max_links
        self.links: list[dict[str, str]] = []
        self._capture = False
        self._href = ""
        self._text = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "a" and len(self.links) < self.max_links:
            href = ""
            for k, v in attrs:
                if k.lower() == "href" and v:
                    href = v
                    break
            if href:
                self._capture = True
                self._href = href
                self._text = ""

    def handle_data(self, data: str) -> None:
        if self._capture:
            self._text += data

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._capture:
            label = " ".join(self._text.split())[:140]
            if label and self._href:
                self.links.append({"label": label, "href": self._href})
            self._capture = False
            self._href = ""
            self._text = ""


def _normalize_url(url: str) -> str:
    u = url.strip()
    if not u:
        return u
    if u.startswith("http://") or u.startswith("https://"):
        return u
    return f"https://{u}"


def _strip_html_text(html: str) -> str:
    cleaned = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    cleaned = re.sub(r"<style[\s\S]*?</style>", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def _extract_title(html: str) -> str:
    m = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.I | re.S)
    if not m:
        return ""
    return " ".join(m.group(1).split())


def _extract_links(html: str, max_links: int) -> list[dict[str, str]]:
    parser = LinkParser(max_links=max_links)
    try:
        parser.feed(html)
    except Exception:
        return []
    return parser.links


def _render_playwright(url: str, wait_ms: int, max_links: int) -> dict[str, Any]:
    with sync_playwright() as p:  # type: ignore[misc]
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(wait_ms)

        html = page.content()
        screenshot_bytes = page.screenshot(full_page=True, type="png")
        screenshot_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")

        result = {
            "requested_url": url,
            "final_url": page.url,
            "title": _extract_title(html),
            "text_excerpt": _strip_html_text(html)[:2500],
            "top_links": _extract_links(html, max_links=max_links),
            "screenshot_base64_png": screenshot_b64,
            "render_mode": "playwright",
        }

        context.close()
        browser.close()
        return result


def _render_fallback(url: str, max_links: int) -> dict[str, Any]:
    req = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        },
    )
    with urlopen(req, timeout=20) as resp:  # nosec B310 - user requested browser fetch
        final_url = resp.geturl()
        raw = resp.read()
        html = raw.decode("utf-8", errors="ignore")

    return {
        "requested_url": url,
        "final_url": final_url,
        "title": _extract_title(html),
        "text_excerpt": _strip_html_text(html)[:2500],
        "top_links": _extract_links(html, max_links=max_links),
        "screenshot_base64_png": "",
        "render_mode": "http_fallback",
    }


def _render(url: str, wait_ms: int, max_links: int) -> dict[str, Any]:
    target = _normalize_url(url)
    if not target:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        if HAS_PLAYWRIGHT:
            return _render_playwright(target, wait_ms, max_links)
        return _render_fallback(target, max_links)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Browser render failed: {exc}") from exc


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "portal-browser-bridge", "playwright": HAS_PLAYWRIGHT}


@app.get("/engines")
def engines() -> dict[str, list[str]]:
    return {"engines": sorted(SEARCH_ENGINES.keys())}


@app.post("/preview")
def preview(req: PreviewRequest) -> dict[str, Any]:
    return _render(req.url, req.wait_ms, req.max_links)


@app.post("/search")
def search(req: SearchRequest) -> dict[str, Any]:
    engine = req.engine.strip().lower()
    if engine not in SEARCH_ENGINES:
        raise HTTPException(status_code=400, detail=f"Unsupported engine: {engine}")

    url = SEARCH_ENGINES[engine].format(q=quote_plus(req.query.strip()))
    data = _render(url, req.wait_ms, max_links=12)
    data["engine"] = engine
    data["query"] = req.query
    return data
