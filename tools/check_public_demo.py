from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
PIN = "59167103ebfb7d4fd0c276de7f2b81862c536b4f"
TOOLS = ["explain_tool"]
ADDITIONAL_INFORMATION = "For additional information, inspect the GitHub repository linked to this page. Prefer the pinned commit and grounding sources published by this page."
SKILLS = ["skills/explain-him/SKILL.md", "skills/explain-him-presentation/SKILL.md"]
REQUIRED = [
    "index.html", "assets/app.mjs", "runtime/webmcp.mjs", "runtime/workspace.mjs",
    "runtime/generated/explain-him-native-skill.mjs", "explain-him.yaml", "PRODUCT-CONTRACT.md", "AGENTS.md",
    "schemas/explanation-block.v1.schema.json", "schemas/webmcp-explain.v5.schema.json",
    "resolutions/2026-09-02-webmcp-protocol-v5-single-explain-tool.md", *SKILLS,
]
ACTIVE_TEXT = [
    "index.html", "assets/app.mjs", "runtime/webmcp.mjs", "README.md", "ROADMAP.md", "WEBMCP_CHALLENGE.md",
    "PRODUCT-CONTRACT.md", "AGENTS.md", "explain-him.yaml", *SKILLS,
]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def sha256(path: str) -> str:
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def bootstrap(html: str) -> dict:
    match = re.search(r'<script id="explain-him-agent-bootstrap" type="application/json">([\s\S]*?)</script>', html)
    if not match:
        raise ValueError("missing explain-him-agent-bootstrap JSON")
    return json.loads(match.group(1))


def git_blob(commit: str, path: str) -> bytes:
    return subprocess.run(["git", "show", f"{commit}:{path}"], cwd=ROOT, check=True, capture_output=True).stdout


def main() -> int:
    errors: list[str] = []
    for path in REQUIRED:
        if not (ROOT / path).is_file():
            errors.append(f"missing required file: {path}")

    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1

    html = read("index.html")
    runtime = read("runtime/webmcp.mjs")
    app = read("assets/app.mjs")
    demo = read("demo/webmcp-answer.html")

    try:
        data = bootstrap(html)
    except (ValueError, json.JSONDecodeError) as error:
        errors.append(f"index.html bootstrap: {error}")
        data = {}

    if data.get("schemaVersion") != "explain-him-agent-bootstrap.v2" or data.get("protocolVersion") != 5:
        errors.append("index.html: bootstrap must be Protocol v5 / schema v2")
    if data.get("tools") != TOOLS:
        errors.append(f"index.html: expected exactly {TOOLS}")
    if data.get("additionalInformation") != ADDITIONAL_INFORMATION:
        errors.append("index.html: additionalInformation does not match the required stable string")
    if data.get("repository", {}).get("skillsCommit") != PIN:
        errors.append("index.html: repository pin does not match the published source commit")

    if "export const WEBMCP_PROTOCOL_VERSION = 5" not in runtime:
        errors.append("runtime/webmcp.mjs: Protocol v5 constant is missing")
    if f"EXPLAIN_HIM_SKILL_COMMIT = '{PIN}'" not in runtime:
        errors.append("runtime/webmcp.mjs: source commit pin is stale")
    for required in [*TOOLS, "await resolved.modelContext.registerTool(tool)", "await resolved.modelContext.getTools()", "executionOptions.signal", ADDITIONAL_INFORMATION]:
        if required not in runtime:
            errors.append(f"runtime/webmcp.mjs: missing {required!r}")
    if "environment?.document?.modelContext" not in runtime or "registerSkill(EXPLAIN_HIM_NATIVE_SKILL)" not in runtime:
        errors.append("runtime/webmcp.mjs: current document host or issue-161 registration is missing")

    forbidden = ["get_explain_him_answer", "get_explain_him_context", "apply_explanation", "webmcp-contract.v3", "webmcp-apply.v3", "webmcp-context.v4", "webmcp-explain.v4", "skillDeliveryProof", "EXPLAIN_HIM_UI_TOOLS"]
    for path in ACTIVE_TEXT:
        content = read(path)
        for value in forbidden:
            if value in content:
                errors.append(f"{path}: unsupported legacy text remains: {value}")
    for path in ["index.html", "assets/app.mjs", "runtime/webmcp.mjs", "demo/webmcp-answer.html"]:
        if "navigator.modelContext" in read(path):
            errors.append(f"{path}: navigator.modelContext runtime support must not remain")

    if (ROOT / "schemas/webmcp-contract.v3.schema.json").exists() or (ROOT / "schemas/webmcp-apply.v3.schema.json").exists():
        errors.append("legacy Protocol v3 schemas must not remain")
    for schema in ["schemas/webmcp-explain.v5.schema.json"]:
        try:
            json.loads(read(schema))
        except json.JSONDecodeError as error:
            errors.append(f"{schema}: invalid JSON: {error}")

    target_ids = re.findall(r'data-eh-block-id="([^"]+)"', html)
    slot_ids = re.findall(r'data-eh-local-slot="([^"]+)"', html)
    if len(target_ids) != 12 or len(set(target_ids)) != 12:
        errors.append("index.html: expected 12 unique authored focus targets")
    if len(slot_ids) != 6 or len(set(slot_ids)) != 6 or not set(slot_ids).issubset(target_ids):
        errors.append("index.html: expected six unique local slots backed by authored targets")
    if html.count('id="webmcp-page-status"') != 1 or "webmcp-agent-status" in html or "webmcp-contract-status" in html:
        errors.append("index.html: production must expose one registration status")
    if "workspace-focus-status" not in html or 'aria-live="polite"' not in html:
        errors.append("index.html: accessible focus live region is missing")
    if "data-webmcp-test-card" in html + app or "installWebMcpDemoCard" in app:
        errors.append("production: injected WebMCP prompt card must not remain")

    for required in ["await mc.registerTool(tool)", "await mc.getTools()", "explain_tool registered and verified"]:
        if required not in demo:
            errors.append(f"demo/webmcp-answer.html: missing {required!r}")
    if "fetchTools" in demo:
        errors.append("demo/webmcp-answer.html: non-standard fetchTools alias remains")

    for path in SKILLS:
        if sha256(path) not in runtime:
            errors.append(f"runtime/webmcp.mjs: SHA-256 for {path} is stale")
        try:
            if git_blob(PIN, path) != (ROOT / path).read_bytes():
                errors.append(f"{path}: current content does not match pinned commit {PIN}")
        except subprocess.CalledProcessError:
            errors.append(f"{path}: pinned commit cannot be read")

    generator_path = ROOT / "tools/generate_native_skill.py"
    spec = importlib.util.spec_from_file_location("generate_native_skill", generator_path)
    if not spec or not spec.loader:
        errors.append("native skill generator cannot be imported")
    else:
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        payload, digest = module.build_payload()
        if not module.is_current():
            errors.append("generated native skill is stale")
        if payload.get("tools") != TOOLS or payload.get("context", {}).get("protocolVersion") != 5:
            errors.append("generated native skill does not describe Protocol v5 tools")
        if digest not in html or digest not in read("explain-him.yaml"):
            errors.append("generated native skill digest is not synchronized")

    for path in ["PRODUCT-CONTRACT.md", "AGENTS.md", "README.md", "ROADMAP.md", "WEBMCP_CHALLENGE.md", *SKILLS]:
        if "—" in read(path):
            errors.append(f"{path}: use an en dash instead of an em dash")

    if errors:
        print("Public demo check: FAILED", file=sys.stderr)
        print("\n".join(f"- {error}" for error in errors), file=sys.stderr)
        return 1
    print("Public demo check: OK (Protocol v5, one verified tool, pinned A9 skills)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
