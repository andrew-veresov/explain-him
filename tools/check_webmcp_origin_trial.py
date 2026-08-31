from __future__ import annotations

"""Fail closed when the pinned WebMCP Origin Trial metadata is invalid or expiring."""

import argparse
import base64
import binascii
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
from typing import Any
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class TrialExpectation:
    feature: str = "WebMCP"
    origin: str = "https://andrew-veresov.github.io:443"
    expiry: int = 1794873600
    token_sha256: str | None = "7f151bb88d4636beb26c991c2853d6a43b1b50f23ea9860b3a6658553912f2e2"


EXPECTED = TrialExpectation()
EXPIRY_FAIL_WINDOW_SECONDS = 14 * 24 * 60 * 60
API_SCRIPT_MARKERS = ("assets/app.mjs", "runtime/webmcp.mjs")
TOKEN_HEADER_BYTES = 1 + 64 + 4
TOKEN_VERSIONS = frozenset((2, 3))


@dataclass(frozen=True)
class TrialMeta:
    token: str
    position: tuple[int, int]


class HeadParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_head = False
        self.trials: list[TrialMeta] = []
        self.api_script_positions: list[tuple[int, int]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = {name.lower(): value for name, value in attrs}
        if tag.lower() == "head":
            self.in_head = True
            return
        if tag.lower() == "script" and any(marker in (data.get("src") or "") for marker in API_SCRIPT_MARKERS):
            self.api_script_positions.append(self.getpos())
        if tag.lower() == "meta" and (data.get("http-equiv") or "").lower() == "origin-trial":
            if not self.in_head:
                raise ValueError("origin-trial meta must be inside head")
            token = data.get("content")
            if token is None:
                raise ValueError("origin-trial meta must have content")
            self.trials.append(TrialMeta(token=token, position=self.getpos()))

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "head":
            self.in_head = False


def decode_claims(token: str, expected_sha256: str | None = EXPECTED.token_sha256) -> tuple[dict[str, Any], int]:
    """Decode the public token enough to verify its pinned claim set.

    Errors intentionally omit the token. Origin Trial tokens belong in public HTML,
    but a failing check must not replicate one into logs or generated reports.
    """
    if expected_sha256 is not None and sha256(token.encode("utf-8")).hexdigest() != expected_sha256:
        raise ValueError("origin-trial token SHA-256 does not match the approved pin")
    try:
        raw = base64.b64decode(token, validate=True)
    except (binascii.Error, ValueError) as error:
        raise ValueError("origin-trial token is not strict base64") from error
    if len(raw) < TOKEN_HEADER_BYTES:
        raise ValueError("origin-trial token is shorter than its binary header")
    version = raw[0]
    if version not in TOKEN_VERSIONS:
        raise ValueError("origin-trial token has an unsupported binary version")
    signature = raw[1:65]
    if len(signature) != 64:
        raise ValueError("origin-trial token does not contain a 64-byte signature")
    payload_length = int.from_bytes(raw[65:69], byteorder="big", signed=False)
    payload_bytes = raw[TOKEN_HEADER_BYTES:]
    if payload_length != len(payload_bytes):
        raise ValueError("origin-trial token declared payload length does not match remaining bytes")
    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("origin-trial token cannot be decoded as its expected payload") from error
    if not isinstance(payload, dict):
        raise ValueError("origin-trial payload must be an object")
    return payload, version


def validate_claims(payload: dict[str, Any], now: int, expected: TrialExpectation = EXPECTED) -> dict[str, Any]:
    if payload.get("feature") != expected.feature:
        raise ValueError("origin-trial feature is not WebMCP")
    if payload.get("origin") != expected.origin:
        raise ValueError("origin-trial origin is not the approved canonical origin")
    if payload.get("isSubdomain") is not True:
        raise ValueError("origin-trial isSubdomain must be true")
    if "isThirdParty" in payload and payload["isThirdParty"] is not False:
        raise ValueError("origin-trial third-party scope must be false when present")
    if payload.get("expiry") != expected.expiry:
        raise ValueError("origin-trial expiry is not the approved expiry")
    if expected.expiry - now <= EXPIRY_FAIL_WINDOW_SECONDS:
        raise ValueError("origin-trial expires within the 14-day fail window")
    return {
        "feature": expected.feature,
        "origin": expected.origin,
        "expiry": expected.expiry,
        "is_subdomain": True,
        "third_party": payload.get("isThirdParty", False),
        "expires_in_seconds": expected.expiry - now,
    }


def validate_html(html: str, now: int, expected: TrialExpectation = EXPECTED) -> dict[str, Any]:
    parser = HeadParser()
    parser.feed(html)
    parser.close()
    if len(parser.trials) != 1:
        raise ValueError("exactly one origin-trial meta is required")
    trial = parser.trials[0]
    if not parser.api_script_positions:
        raise ValueError("WebMCP API script is missing")
    if trial.position >= min(parser.api_script_positions):
        raise ValueError("origin-trial meta must precede the WebMCP API script")
    payload, version = decode_claims(trial.token, expected.token_sha256)
    evidence = validate_claims(payload, now, expected)
    return {"status": "valid", "version": version, "token_sha256": expected.token_sha256, **evidence}


def read_live(url: str) -> str:
    request = Request(url, headers={"Accept": "text/html", "User-Agent": "Explain-Him-Origin-Trial-Check/1.0"})
    with urlopen(request, timeout=20) as response:
        if response.status != 200:
            raise ValueError(f"live origin-trial page returned HTTP {response.status}")
        if response.geturl() != url:
            raise ValueError("live origin-trial page redirected away from its canonical URL")
        return response.read().decode("utf-8", errors="strict")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--html", type=Path)
    source.add_argument("--url")
    parser.add_argument("--paired-html", type=Path, help="require an exact mapped public/private HTML surface")
    parser.add_argument("--now", type=int, default=int(datetime.now(timezone.utc).timestamp()))
    args = parser.parse_args(argv)
    try:
        primary = args.html.read_text(encoding="utf-8") if args.html else read_live(args.url)
        validate_html(primary, args.now)
        if args.paired_html:
            paired = args.paired_html.read_text(encoding="utf-8")
            validate_html(paired, args.now)
            if primary != paired:
                raise ValueError("mapped public/private HTML surfaces differ")
    except (OSError, ValueError) as error:
        print(f"WebMCP Origin Trial check: FAILED: {error}")
        return 1
    print("WebMCP Origin Trial check: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
