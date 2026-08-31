from __future__ import annotations

"""Exercise the deployed WebMCP flow in native Chrome without testing feature flags.

Exit 0 means the live browser flow passed. Exit 2 is BLOCKED: the required
deployment or native host capability is absent, so this script never turns that
state into a false pass. Exit 1 means a present capability violated the contract.
"""

import json
import re
import sys
from typing import Any

try:
    from playwright.sync_api import Error, sync_playwright
except ModuleNotFoundError:
    Error = RuntimeError
    sync_playwright = None


URL = "https://andrew-veresov.github.io/explain-him/"
MINIMUM_CHROME_MAJOR = 149
EXPECTED_TOOLS = ["apply_explanation", "get_explanation_contract"]


def emit(status: str, reason: str, **evidence: Any) -> int:
    payload = {"status": status, "reason": reason, "evidence": evidence}
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True))
    return {"PASS": 0, "BLOCKED": 2, "FAILED": 1}[status]


def main() -> int:
    if sync_playwright is None:
        return emit("BLOCKED", "Playwright is not installed")
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(channel="chrome", headless=True)
            try:
                version = browser.version
                match = re.search(r"(\d+)", version)
                if not match or int(match.group(1)) < MINIMUM_CHROME_MAJOR:
                    return emit("BLOCKED", "native Chrome is below the required major version", chrome_version=version, minimum_major=MINIMUM_CHROME_MAJOR)
                context = browser.new_context()
                try:
                    page = context.new_page()
                    page.goto(URL, wait_until="domcontentloaded", timeout=30000)
                    meta_count = page.locator('head meta[http-equiv="origin-trial"]').count()
                    session = context.new_cdp_session(page)
                    try:
                        cdp_trials = session.send("Page.getOriginTrials")
                        cdp_statuses = sorted({str(item.get("status", "unknown")) for item in cdp_trials.get("originTrials", []) if isinstance(item, dict)})
                        cdp_evidence = {"available": True, "trial_statuses": cdp_statuses}
                    except Error as error:
                        cdp_evidence = {"available": False, "error_type": type(error).__name__}
                    if meta_count != 1:
                        return emit("BLOCKED", "live page does not yet contain the required Origin Trial meta", chrome_version=version, origin_trial_meta_count=meta_count, cdp=cdp_evidence)
                    try:
                        page.wait_for_function("""() => ['verified', 'ready', 'partial', 'unavailable', 'error'].includes(document.documentElement.dataset.webmcpState)""", timeout=10000)
                    except Error:
                        return emit("FAILED", "WebMCP registration did not reach a terminal state", chrome_version=version)
                    registration = page.evaluate("""() => ({
                      state: document.documentElement.dataset.webmcpState || null,
                      host: document.documentElement.dataset.webmcpHost || null,
                      registered_tools: document.documentElement.dataset.webmcpRegistered || null,
                      verified_tools: document.documentElement.dataset.webmcpVerifiedTools || null
                    })""")
                    if registration["state"] == "unavailable":
                        return emit("BLOCKED", "native Chrome does not expose a WebMCP host", chrome_version=version, registration=registration)
                    if registration["state"] in {"partial", "error"}:
                        return emit("FAILED", "WebMCP registration was not complete", chrome_version=version, registration=registration)
                    if registration["state"] not in {"ready", "verified"}:
                        return emit("FAILED", "WebMCP registration reached an unexpected state", chrome_version=version, registration=registration)
                    host = page.evaluate("""() => ({
                      standard: typeof document.modelContext?.registerTool === 'function',
                      legacy: typeof navigator.modelContext?.registerTool === 'function',
                      getTools: typeof document.modelContext?.getTools === 'function'
                    })""")
                    if not host["standard"]:
                        return emit("BLOCKED", "native Chrome does not expose document.modelContext", chrome_version=version, cdp=cdp_evidence, host=host)
                    if not host["getTools"]:
                        return emit("BLOCKED", "native host cannot enumerate Site Tools", chrome_version=version, cdp=cdp_evidence, host=host)
                    try:
                        tool_state = page.evaluate("""async () => {
                          const tools = await document.modelContext.getTools();
                          return (Array.isArray(tools) ? tools : []).map((tool) => ({ name: tool?.name, origin: tool?.origin || null }));
                        }""")
                    except Error:
                        return emit("FAILED", "native host rejected Site Tool enumeration", chrome_version=version)
                    names = sorted(item.get("name") for item in tool_state)
                    if names != EXPECTED_TOOLS:
                        return emit("FAILED", "native host exposes an unexpected WebMCP tool surface", chrome_version=version, tool_names=names)
                    try:
                        flow = page.evaluate("""async () => {
                          const tools = await document.modelContext.getTools();
                          const byName = new Map(tools.map((tool) => [tool.name, tool]));
                          const execute = (name, args) => document.modelContext.executeTool(byName.get(name), JSON.stringify(args));
                          const contract = await execute('get_explanation_contract', {});
                          const block = (term) => ({
                            type: 'diagram', title: `Native ${term}`, variant: 'flow',
                            nodes: [{ id: term.toLowerCase(), label: term }, { id: 'agent', label: 'Personal agent' }],
                            edges: [{ from: term.toLowerCase(), to: 'agent', label: 'asks' }], sources: []
                          });
                          const first = await execute('apply_explanation', {
                            requestId: 'native-chrome-user-consumer', expectedWorkspaceRevision: contract.workspaceRevision,
                            operations: [{ op: 'replace', targetId: 'workflow-diagram', block: block('User') }]
                          });
                          const id = first.localBlocks[0]?.id;
                          const second = await execute('apply_explanation', {
                            requestId: 'native-chrome-user-consumer-update', expectedWorkspaceRevision: first.workspaceRevision,
                            operations: [{ op: 'update', blockId: id, block: block('Consumer') }]
                          });
                          const third = await execute('apply_explanation', {
                            requestId: 'native-chrome-user-consumer-remove', expectedWorkspaceRevision: second.workspaceRevision,
                            operations: [{ op: 'remove', blockId: id }]
                          });
                          return { schema_version: contract.schemaVersion, local_id_preserved: id === first.applied[0]?.blockId && id === second.applied[0]?.blockId, local_blocks_after_remove: third.localBlocks.length };
                        }""")
                    except Error:
                        return emit("FAILED", "native host rejected the expected contract sequence", chrome_version=version)
                    if flow["schema_version"] != "explain-him-webmcp-contract.v2" or not flow["local_id_preserved"] or flow["local_blocks_after_remove"] != 0:
                        return emit("FAILED", "native replace-update-remove flow violated the WebMCP contract", chrome_version=version, flow=flow)
                    return emit("PASS", "native Chrome executed the live WebMCP contract", chrome_version=version, cdp=cdp_evidence, tool_names=names)
                finally:
                    context.close()
            finally:
                browser.close()
    except Error as error:
        return emit("BLOCKED", "native Chrome or Playwright is unavailable", error_type=type(error).__name__)


if __name__ == "__main__":
    raise SystemExit(main())
