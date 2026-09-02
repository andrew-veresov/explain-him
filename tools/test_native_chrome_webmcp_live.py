from __future__ import annotations

"""Exercise the deployed page-side WebMCP runtime in native Chrome.

This is not an agent-host test. Exit 0 proves the page API, descriptors, and
runtime sequence. Exit 2 is BLOCKED when the deployment or browser page API is
absent. Exit 1 means a present page capability violated the contract.
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


URL = "https://andrew-veresov.github.io/explain-him/?webmcp-debug=1"
MINIMUM_CHROME_MAJOR = 149
EXPECTED_TOOLS = ["explain_tool", "get_explain_him_context"]


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
                          const normalizeResult = (raw, name) => {
                            let value = raw;
                            if (typeof raw === 'string') {
                              try { value = JSON.parse(raw); }
                              catch { throw new TypeError(`${name} returned malformed JSON`); }
                            }
                            if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value === 'string') {
                              throw new TypeError(`${name} returned a non-object or double-encoded result`);
                            }
                            return value;
                          };
                          const requireArray = (value, name) => {
                            if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
                            return value;
                          };
                          const requireRevision = (value, name) => {
                            if (!Number.isInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer`);
                            return value;
                          };
                          const requireId = (value, name) => {
                            if (typeof value !== 'string' || !value.startsWith('local-')) throw new TypeError(`${name} must be a local block ID`);
                            return value;
                          };
                          const requireOk = (value, name) => {
                            if (value.ok !== true) throw new TypeError(`${name} did not report ok`);
                            return value;
                          };
                          const execute = async (name, args) => {
                            const descriptor = byName.get(name);
                            if (!descriptor || typeof descriptor !== 'object') throw new TypeError(`${name} descriptor is missing`);
                            return normalizeResult(await document.modelContext.executeTool(descriptor, JSON.stringify(args)), name);
                          };
                          const context = await execute('get_explain_him_context', {});
                          if (context.schemaVersion !== 'explain-him-webmcp-context.v4' || context.protocolVersion !== 4) throw new TypeError('unexpected context schema');
                          const contextRevision = requireRevision(context.workspaceRevision, 'context.workspaceRevision');
                          if (!context.activationId || typeof context.additionalInformation !== 'string') throw new TypeError('context is missing Protocol v4 activation or repository guidance');
                          const targets = requireArray(context.targets, 'context.targets');
                          const workflow = targets.find((target) => target?.id === 'workflow-diagram');
                          if (!workflow?.allowedOperations?.includes('replace')) throw new TypeError('context does not expose mutable workflow-diagram');
                          const block = (term) => ({
                            type: 'diagram', title: `Native ${term}`, variant: 'flow',
                            nodes: [{ id: term.toLowerCase(), label: term }, { id: 'agent', label: 'Personal agent' }],
                            edges: [{ from: term.toLowerCase(), to: 'agent', label: 'asks' }], sources: []
                          });
                          const request = (requestId, expectedWorkspaceRevision, decision, operations) => ({ requestId, activationId: context.activationId, expectedWorkspaceRevision, topicId: 'terminology:user-consumer', decision, operations });
                          const first = requireOk(await execute('explain_tool', request('native-chrome-user-consumer', contextRevision, 'inconsistent', [{ op: 'replace', targetId: 'workflow-diagram', block: block('User') }])), 'replace');
                          const firstRevision = requireRevision(first.workspaceRevision, 'replace.workspaceRevision');
                          if (firstRevision <= contextRevision || first.focused?.blockId !== first.applied?.[0]?.blockId) throw new TypeError('replace did not advance revision and focus its visible result');
                          const firstBlocks = requireArray(first.localBlocks, 'replace.localBlocks');
                          const firstApplied = requireArray(first.applied, 'replace.applied');
                          const id = requireId(firstBlocks[0]?.id, 'replace.localBlocks[0].id');
                          if (firstApplied[0]?.op !== 'replace' || firstApplied[0]?.blockId !== id) throw new TypeError('replace result does not preserve the local block ID');
                          const second = requireOk(await execute('explain_tool', request('native-chrome-user-consumer-update', firstRevision, 'partial', [{ op: 'update', blockId: id, block: block('Consumer') }])), 'update');
                          const secondRevision = requireRevision(second.workspaceRevision, 'update.workspaceRevision');
                          if (secondRevision <= firstRevision) throw new TypeError('update did not advance workspace revision');
                          const secondBlocks = requireArray(second.localBlocks, 'update.localBlocks');
                          const secondApplied = requireArray(second.applied, 'update.applied');
                          if (requireId(secondBlocks[0]?.id, 'update.localBlocks[0].id') !== id || secondApplied[0]?.op !== 'update' || secondApplied[0]?.blockId !== id) throw new TypeError('update result does not preserve the local block ID');
                          const third = requireOk(await execute('explain_tool', request('native-chrome-user-consumer-remove', secondRevision, 'restore', [{ op: 'remove', blockId: id }])), 'remove');
                          const thirdRevision = requireRevision(third.workspaceRevision, 'remove.workspaceRevision');
                          if (thirdRevision <= secondRevision) throw new TypeError('remove did not advance workspace revision');
                          const finalBlocks = requireArray(third.localBlocks, 'remove.localBlocks');
                          const thirdApplied = requireArray(third.applied, 'remove.applied');
                          if (thirdApplied[0]?.op !== 'remove' || thirdApplied[0]?.blockId !== id || finalBlocks.length !== 0) throw new TypeError('remove result did not empty the local block list');
                          return {
                            schema_version: context.schemaVersion,
                            local_id_preserved: true,
                            local_blocks_after_remove: finalBlocks.length,
                            skill_delivery_mode: context.skillDelivery?.mode,
                            native_skill_state: document.documentElement.dataset.webmcpNativeSkillState
                          };
                        }""")
                    except Error:
                        deployed_schema = page.evaluate("""async () => {
                          const tools = await document.modelContext.getTools();
                          const descriptor = tools.find((tool) => tool?.name === 'get_explain_him_context');
                          if (!descriptor) return null;
                          const raw = await document.modelContext.executeTool(descriptor, JSON.stringify({}));
                          const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
                          return value && typeof value === 'object' && !Array.isArray(value) ? value.schemaVersion || null : null;
                        }""")
                        if deployed_schema != "explain-him-webmcp-context.v4":
                            return emit("BLOCKED", "live page has not deployed Protocol v4", chrome_version=version, deployed_schema=deployed_schema)
                        return emit("FAILED", "native host rejected the expected Protocol v4 sequence", chrome_version=version)
                    if flow["schema_version"] != "explain-him-webmcp-context.v4" or not flow["local_id_preserved"] or flow["local_blocks_after_remove"] != 0:
                        return emit("FAILED", "native replace-update-remove flow violated the WebMCP contract", chrome_version=version, flow=flow)
                    if flow.get("native_skill_state") not in {"registered", "unavailable", "error"}:
                        return emit("FAILED", "experimental native-skill diagnostic is missing or false", chrome_version=version, flow=flow)
                    expected_mode = "native-inline" if flow.get("native_skill_state") == "registered" else "pinned-remote-fallback"
                    if flow.get("skill_delivery_mode") != expected_mode:
                        return emit("FAILED", "skill delivery mode does not match the page-issued native-skill state", chrome_version=version, flow=flow)
                    return emit(
                        "PASS",
                        "native Chrome page runtime executed the live WebMCP contract",
                        chrome_version=version,
                        cdp=cdp_evidence,
                        tool_names=names,
                        evidence_scope="page-runtime-only",
                        agent_host_connection="not-tested",
                    )
                finally:
                    context.close()
            finally:
                browser.close()
    except Error as error:
        return emit("BLOCKED", "native Chrome or Playwright is unavailable", error_type=type(error).__name__)


if __name__ == "__main__":
    raise SystemExit(main())
