from __future__ import annotations

"""Verify the deployed public Explain Him Pages facade without third-party packages."""

import argparse
from dataclasses import dataclass
from hashlib import sha256
from html.parser import HTMLParser
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin, urlparse, urlunparse
from urllib.request import HTTPRedirectHandler, Request, build_opener


ORIGIN_TRIAL_SPEC = importlib.util.spec_from_file_location("explain_him_origin_trial", Path(__file__).with_name("check_webmcp_origin_trial.py"))
assert ORIGIN_TRIAL_SPEC and ORIGIN_TRIAL_SPEC.loader
origin_trial = importlib.util.module_from_spec(ORIGIN_TRIAL_SPEC)
sys.modules[ORIGIN_TRIAL_SPEC.name] = origin_trial
ORIGIN_TRIAL_SPEC.loader.exec_module(origin_trial)

DEFAULT_URL = "https://andrew-veresov.github.io/explain-him/"
DEFAULT_REPOSITORY = "andrew-veresov/explain-him"
SKILLS = ("skills/explain-him/SKILL.md", "skills/explain-him-presentation/SKILL.md")
REQUIRED = ("", "assets/app.mjs", "assets/styles.css", "runtime/workspace.mjs", "runtime/webmcp.mjs", "explain-him.yaml", "schemas/explanation-block.v1.schema.json", "schemas/webmcp-contract.v3.schema.json", "schemas/webmcp-apply.v3.schema.json", "resolutions/2026-08-30-user-consumer-terminology.md", *SKILLS)
MARKERS = {
    "index.html": (b"andrew-veresov/explain-him", b"skills/explain-him/SKILL.md", b"skills/explain-him-presentation/SKILL.md", b"data-eh-block-id=\"workflow-diagram\"", b"data-scroll-section=\"how-it-works\"", b"data-scroll-section=\"how-to-express\"", b"Ask your agent how to express your own idea with Explain Him.", b"http-equiv=\"origin-trial\""),
    "assets/app.mjs": (b"registerWebMcpTools", b"webmcpProtocol"),
    "runtime/webmcp.mjs": (b"explain-him-webmcp-contract.v3", b"get_explanation_contract", b"apply_explanation", b"IMMUTABLE_SKILL_PROOF", b"00c89a7c4ef2133189399ba820f92addacdf9b57", b"decisionPrecedence", b"terminologyConsistency"),
    "runtime/workspace.mjs": (b"explain-him-local-workspace.v4",),
    "explain-him.yaml": (b"repository: andrew-veresov/explain-him", b"entrypoint: skills/explain-him/SKILL.md", b"entrypoint: skills/explain-him-presentation/SKILL.md", b"state_model: transactional-typed-presentation-operation-log", b"- get_explanation_contract", b"- apply_explanation"),
    "resolutions/2026-08-30-user-consumer-terminology.md": (b"Status: accepted", b"`User` and `Consumer` refer to the same participant", b"`User` is the preferred term"),
    "skills/explain-him/SKILL.md": (b"name: explain-him",),
    "skills/explain-him-presentation/SKILL.md": (b"name: explain-him-presentation",),
}
IMPORT_RE = re.compile(r"(?:\bimport\s+(?:[^'\"]+?\s+from\s+)?|\bimport\s*\(\s*)['\"]([^'\"]+)['\"]|@import\s+(?:url\()?['\"]?([^'\"\)]+)", re.MULTILINE)
SHA_RE = re.compile(r"^[0-9a-f]{40}$")


@dataclass
class FetchResult:
    url: str
    status: int
    final_url: str
    body: bytes
    content_type: str


class Links(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = dict(attrs)
        if tag == "script" and data.get("src"):
            self.links.append(str(data["src"]))
        if tag == "link" and data.get("href") and set(str(data.get("rel", "")).lower().split()) & {"stylesheet", "preload", "modulepreload", "icon", "help"}:
            self.links.append(str(data["href"]))


def normalized_base(value: str) -> tuple[str, str]:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc or parsed.params or parsed.fragment:
        raise ValueError("Pages URL must be an absolute HTTPS origin without a fragment")
    path = parsed.path if parsed.path.endswith("/") else parsed.path + "/"
    if ".." in PurePosixPath(path).parts:
        raise ValueError("Pages base path must not traverse directories")
    return parsed.netloc, path


def safe_url(base: str, candidate: str) -> str | None:
    if not candidate or candidate.startswith(("#", "data:", "mailto:", "javascript:")):
        return None
    origin, base_path = normalized_base(base)
    parsed = urlparse(urljoin(base, candidate))
    if parsed.scheme != "https" or parsed.netloc != origin or not parsed.path.startswith(base_path):
        raise ValueError(f"unsafe public resource URL: {candidate}")
    if ".." in PurePosixPath(parsed.path).parts:
        raise ValueError(f"unsafe public resource path: {candidate}")
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", parsed.query, ""))


class SafeRedirect(HTTPRedirectHandler):
    def __init__(self, base: str) -> None:
        super().__init__()
        self.base = base

    def redirect_request(self, req: Request, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> Request | None:
        safe_url(self.base, newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(url: str, base: str, timeout: float, retries: int, cache_bust: str) -> FetchResult:
    parsed = urlparse(url)
    query = f"{parsed.query}&" if parsed.query else ""
    request_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", query + "live-smoke=" + quote(cache_bust), ""))
    last: Exception | None = None
    for attempt in range(retries):
        try:
            request = Request(request_url, headers={"Accept": "*/*", "User-Agent": "Explain-Him-Live-Pages-Smoke/1.0"})
            with build_opener(SafeRedirect(base)).open(request, timeout=timeout) as response:
                final_url = response.geturl()
                safe_url(base, final_url)
                return FetchResult(url, response.status, final_url, response.read(), response.headers.get("Content-Type", ""))
        except (HTTPError, URLError, TimeoutError, ValueError) as exc:
            last = exc
            if attempt + 1 < retries:
                time.sleep(1 + attempt)
    if isinstance(last, HTTPError):
        return FetchResult(url, last.code, last.geturl(), last.read(), last.headers.get("Content-Type", ""))
    raise RuntimeError(f"fetch failed for {url}: {last}")


def local_path(root: Path, base: str, url: str) -> Path:
    _, base_path = normalized_base(base)
    path = urlparse(url).path.removeprefix(base_path).lstrip("/") or "index.html"
    candidate = (root / PurePosixPath(path)).resolve()
    if root.resolve() not in candidate.parents and candidate != root.resolve():
        raise ValueError(f"local path escapes facade root: {path}")
    return candidate


def graph_links(url: str, content_type: str, body: bytes) -> list[str]:
    text = body.decode("utf-8", errors="strict")
    if urlparse(url).path.endswith((".html", "/")) or "html" in content_type:
        parser = Links(); parser.feed(text); return parser.links
    if urlparse(url).path.endswith((".mjs", ".js", ".css")):
        return [left or right for left, right in IMPORT_RE.findall(text)]
    return []


def normalized_pages_url(value: str) -> str:
    origin, path = normalized_base(value)
    return f"https://{origin}{path}"


def api_json(url: str, token: str, timeout: float) -> Any:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != "api.github.com" or not parsed.path.startswith("/repos/"):
        raise ValueError("unsafe GitHub API URL")
    request = Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "Explain-Him-Live-Pages-Smoke/1.0", **({"Authorization": f"Bearer {token}"} if token else {})})
    with build_opener().open(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def deployment_provenance(repository: str, sha: str, base: str, token: str, timeout: float) -> dict[str, Any]:
    api = f"https://api.github.com/repos/{repository}/deployments?sha={quote(sha)}&per_page=100"
    deployments = api_json(api, token, timeout)
    if not isinstance(deployments, list):
        raise RuntimeError("GitHub deployments response is not a list")
    candidates = sorted((item for item in deployments if isinstance(item, dict) and item.get("sha") == sha and item.get("environment") == "github-pages"), key=lambda item: str(item.get("created_at", "")), reverse=True)
    if not candidates:
        raise RuntimeError("no github-pages deployment was found for the expected SHA")
    deployment = candidates[0]
    statuses = api_json(str(deployment.get("statuses_url", "")), token, timeout)
    if not isinstance(statuses, list) or not statuses:
        raise RuntimeError("GitHub deployment has no statuses")
    latest = sorted((item for item in statuses if isinstance(item, dict)), key=lambda item: str(item.get("created_at", "")), reverse=True)[0]
    if latest.get("state") != "success":
        raise RuntimeError(f"latest github-pages deployment status is {latest.get('state')!r}, not success")
    environment_url = str(latest.get("environment_url") or "")
    if normalized_pages_url(environment_url) != normalized_pages_url(base):
        raise RuntimeError("latest deployment environment URL does not exactly match the approved Pages base")
    return {"deployment_id": deployment.get("id"), "sha": deployment.get("sha"), "environment": deployment.get("environment"), "state": latest.get("state"), "environment_url": environment_url}


def query_normalized(url: str) -> str:
    parsed = urlparse(url)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))


def resource_key(base: str, url: str) -> str:
    _, base_path = normalized_base(base)
    return urlparse(url).path.removeprefix(base_path).lstrip("/") or "index.html"


def snapshot(root: Path, base: str, expected_sha: str, timeout: float, attempt: int) -> dict[str, Any]:
    errors: list[str] = []
    resources: dict[str, dict[str, Any]] = {}
    edges: list[dict[str, str]] = []
    origin_trial_evidence: dict[str, Any] | None = None
    pending: list[tuple[str, str | None, str | None]] = [(safe_url(base, item) or base, None, None) for item in REQUIRED]
    seen: set[str] = set()
    while pending:
        url, referrer, reference = pending.pop(0)
        if url in seen: continue
        seen.add(url)
        cache_bust = f"{expected_sha[:12]}-attempt-{attempt}-{sha256(url.encode()).hexdigest()[:10]}"
        if referrer and reference: edges.append({"referrer": referrer, "reference": reference, "target": url})
        try:
            result = fetch(url, base, timeout, 1, cache_bust)
            local = local_path(root, base, url); local_bytes = local.read_bytes() if local.is_file() else b""
            key = resource_key(base, url)
            marker_results = [{"marker": marker.decode("ascii"), "present": marker in result.body} for marker in MARKERS.get(key, ())]
            record = {"status": result.status, "final_url": result.final_url, "content_type": result.content_type, "bytes": len(result.body), "cache_bust": cache_bust, "live_sha256": sha256(result.body).hexdigest(), "local_sha256": sha256(local_bytes).hexdigest(), "local_exists": local.is_file(), "hash_match": result.body == local_bytes, "markers": marker_results}
            if key == "index.html":
                try:
                    origin_trial_evidence = origin_trial.validate_html(result.body.decode("utf-8", errors="strict"), int(time.time()))
                    record["origin_trial"] = origin_trial_evidence
                except (UnicodeDecodeError, ValueError) as exc:
                    origin_trial_evidence = {"status": "invalid", "error": str(exc)}
                    record["origin_trial"] = origin_trial_evidence
                    errors.append(f"index.html: WebMCP Origin Trial: {exc}")
            if key == "runtime/webmcp.mjs":
                tool_names = re.findall(r"name:\s*'([^']+)'", result.body.decode("utf-8", errors="strict"))
                record["tool_names"] = tool_names; record["exact_tool_names"] = tool_names == ["get_explanation_contract", "apply_explanation"]
            resources[url] = record
            if result.status != 200: errors.append(f"{url}: expected HTTP 200, got {result.status}")
            if not local.is_file(): errors.append(f"{url}: local facade resource is missing")
            elif result.body != local_bytes: errors.append(f"{url}: live/local SHA-256 mismatch")
            for marker in marker_results:
                if not marker["present"]: errors.append(f"{key}: missing required marker {marker['marker']}")
            if key == "runtime/webmcp.mjs" and not record.get("exact_tool_names"): errors.append("runtime/webmcp.mjs: registered tool names are not exactly get_explanation_contract and apply_explanation")
            if result.status == 200:
                for link in graph_links(url, result.content_type, result.body):
                    resolved = safe_url(base, urljoin(url if url.endswith("/") else urljoin(url, "."), link))
                    if resolved: pending.append((resolved, url, link))
        except (RuntimeError, ValueError, UnicodeDecodeError) as exc:
            errors.append(str(exc))
    for skill in SKILLS:
        url = safe_url(base, skill.removesuffix(".md") + ".html")
        cache_bust = f"{expected_sha[:12]}-attempt-{attempt}-{sha256(url.encode()).hexdigest()[:10]}"
        try:
            result = fetch(url, base, timeout, 1, cache_bust)
            resources[url] = {"status": result.status, "final_url": result.final_url, "content_type": result.content_type, "bytes": len(result.body), "cache_bust": cache_bust, "strict_direct_404": result.status == 404 and query_normalized(result.final_url) == query_normalized(url)}
            if result.status != 404 or query_normalized(result.final_url) != query_normalized(url): errors.append(f"{url}: expected strict direct HTTP 404 without redirect")
        except (RuntimeError, ValueError) as exc:
            errors.append(str(exc))
    return {"attempt": attempt, "resources": resources, "edges": edges, "origin_trial": origin_trial_evidence, "errors": errors}


def smoke(root: Path, base: str, expected_sha: str, repository: str, token: str, timeout: float, retries: int, require_provenance: bool = True) -> dict[str, Any]:
    normalized_base(base)
    histories: list[dict[str, Any]] = []
    chosen: dict[str, Any] | None = None
    for attempt in range(1, retries + 1):
        current = snapshot(root, base, expected_sha, timeout, attempt)
        histories.append({"attempt": attempt, "resource_count": len(current["resources"]), "edge_count": len(current["edges"]), "resources": current["resources"], "edges": current["edges"], "origin_trial": current["origin_trial"], "errors": current["errors"]})
        if not current["errors"]:
            chosen = current; break
        if any("unsafe public resource" in error or "unsafe public resource path" in error for error in current["errors"]): break
        if attempt < retries: time.sleep(attempt)
    final = chosen or current
    errors = list(final["errors"])
    provenance: dict[str, Any] | None = None
    if require_provenance:
        try: provenance = deployment_provenance(repository, expected_sha, base, token, timeout)
        except (RuntimeError, HTTPError, URLError, ValueError, json.JSONDecodeError) as exc: errors.append(f"deployment provenance: {exc}")
    root_url = safe_url(base, "") or base
    return {"ok": not errors, "base_url": base, "expected_sha": expected_sha, "attempt_count": len(histories), "attempt_history": histories, "resources": final["resources"], "edges": final["edges"], "origin_trial": final["origin_trial"], "provenance": provenance, "errors": errors, "index_live_sha256": final["resources"].get(root_url, {}).get("live_sha256")}


def redact(value: Any, token: str) -> Any:
    if isinstance(value, dict): return {key: "[redacted]" if key.lower() in {"token", "body", "raw"} else redact(item, token) for key, item in value.items()}
    if isinstance(value, list): return [redact(item, token) for item in value]
    if not isinstance(value, str): return value
    result = value.replace(token, "[redacted]") if token else value
    result = re.sub(r"(?i)authorization\s*[:=]\s*(?:bearer\s+)?[^\s,;]+", "[redacted authorization]", result)
    result = re.sub(r"(?i)body\s*[:=]\s*(?:b?['\"]).*?(?:['\"])", "[redacted body]", result)
    return re.sub(r"(?i)body\s*[:=]\s*[^\s,;]+", "[redacted body]", result)


def write_reports(report: dict[str, Any], json_path: Path, markdown_path: Path, token: str = "") -> None:
    safe_report = redact(report, token)
    json_path.write_text(json.dumps(safe_report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["# Explain Him live Pages smoke", "", f"- Result: {'PASS' if safe_report['ok'] else 'FAIL'}", f"- Expected SHA: `{safe_report['expected_sha']}`", f"- Trigger: `{safe_report.get('trigger', 'local')}`", f"- Run: `{safe_report.get('run_id', 'local')}`", f"- Attempts: {safe_report.get('attempt_count', 0)}", f"- Resources: {len(safe_report['resources'])}", ""]
    if safe_report.get("provenance"):
        lines.extend(["## Deployment provenance", "", f"- Deployment: `{safe_report['provenance'].get('deployment_id')}`", f"- State: `{safe_report['provenance'].get('state')}`", ""])
    if safe_report.get("origin_trial"):
        trial = safe_report["origin_trial"]
        lines.extend(["## WebMCP Origin Trial", "", f"- Status: `{trial.get('status', 'invalid')}`", f"- Feature: `{trial.get('feature', 'unavailable')}`", f"- Origin: `{trial.get('origin', 'unavailable')}`", f"- Expiry: `{trial.get('expiry', 'unavailable')}`", f"- Version: `{trial.get('version', 'unavailable')}`", ""])
    if safe_report["errors"]:
        lines.extend(["## Errors", "", *[f"- {item}" for item in safe_report["errors"]], ""])
    markdown_path.write_text("\n".join(lines), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--repository", default=DEFAULT_REPOSITORY)
    parser.add_argument("--expected-sha", required=True)
    parser.add_argument("--local-root", type=Path, default=Path("."))
    parser.add_argument("--token", default=os.environ.get("GITHUB_TOKEN", ""), help="optional GitHub token; defaults to GITHUB_TOKEN and is never reported")
    parser.add_argument("--timeout", type=float, default=20)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--markdown-report", type=Path, required=True)
    parser.add_argument("--skip-deployment-provenance", action="store_true")
    parser.add_argument("--trigger", default=os.environ.get("GITHUB_WORKFLOW", "local"))
    parser.add_argument("--run-id", default=os.environ.get("GITHUB_RUN_ID", "local"))
    args = parser.parse_args(argv)
    try:
        if not SHA_RE.fullmatch(args.expected_sha): raise ValueError("expected SHA must match ^[0-9a-f]{40}$")
        if args.retries < 1 or args.timeout <= 0: raise ValueError("timeout must be positive and retries must be at least one")
        report = smoke(args.local_root.resolve(), args.url, args.expected_sha, args.repository, args.token, args.timeout, args.retries, not args.skip_deployment_provenance)
    except (RuntimeError, ValueError, HTTPError, URLError, json.JSONDecodeError) as exc:
        report = {"ok": False, "base_url": args.url, "expected_sha": args.expected_sha, "attempt_count": 0, "attempt_history": [], "resources": {}, "edges": [], "origin_trial": None, "provenance": None, "errors": [str(exc)], "index_live_sha256": None}
    report["trigger"] = args.trigger
    report["run_id"] = args.run_id
    write_reports(report, args.report, args.markdown_report, args.token)
    print(f"Explain Him live Pages smoke: {'OK' if report['ok'] else 'FAILED'}")
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
