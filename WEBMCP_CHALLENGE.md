---
tags: [explain-him, webmcp, challenge, judge-guide]
---

# Explain Him – WebMCP Challenge guide

## One-sentence pitch

**Explain Him turns an authored idea page into a shared human-agent explanation surface: the personal agent inspects the live page, grounds missing detail from the linked repository, answers in chat, and focuses or displays the explanation on that same page.**

Live app: <https://andrew-veresov.github.io/explain-him/>

Public source: <https://github.com/andrew-veresov/explain-him>

License: Apache-2.0 (`LICENSE`).

## Current WebMCP implementation

The top-level page uses only the current imperative host:

```text
document.modelContext
        |
        +-- await registerTool(explain_tool)
        +-- await getTools()
```

There is no `navigator.modelContext` fallback, compatibility alias, old tool identity, or Protocol v3 handshake. `getTools()` proves only page registration. Tool selection remains a host/model decision.

The sole exception is the isolated experimental `document.modelContext.registerSkill` method proposed in WebMCP issue 161. It runs only after the standard tool registers, adds one generated `explain_him` composite skill without adding another tool, and falls back to pinned remote skills when unavailable or rejected.

## Protocol v5 surface

| Tool | Read/write | Required behavior |
|---|---|---|
| `explain_tool` | write/focus | Inspect current targets and local state during the action, then focus a fully present explanation or atomically add, update, replace, or restore a typed browser-local explanation and focus the visible result |

The context always includes:

> For additional information, inspect the GitHub repository linked to this page. Prefer the pinned commit and grounding sources published by this page.

This is navigation guidance, not product evidence. The personal agent reads the minimum pinned repository source only when the visible authored and Personalized UI are insufficient, partial, inconsistent, or ambiguous.

## Decision matrix

| Visible state | Expected action |
|---|---|
| Fully present | Chat answer, then `explain_tool(existing)` with one focus operation and no revision change |
| Missing | Repository grounding when needed, then `missing` with `add`; runtime focuses the new block |
| Partial | Ground the gap, then `partial` with same-topic `update`, or `add` only when no same-topic block exists |
| Inconsistent | Verify authoritative sources, then `inconsistent` with atomic `replace` and/or `update` |
| Same-topic continuation | Reuse `topicId` and the returned local block ID |
| Explicit no-page-change or no-scroll request | Chat only; do not call `explain_tool` |
| Restore | Remove the local result and focus the authored target |

All 12 authored blocks may be focus anchors. Only the six targets with a real `data-eh-local-slot` advertise `add` or `replace`. Successful mutations require a revision increase, an existing visible DOM node, and actual programmatic focus.

## Judge prompts

### Existing explanation

> Show me where grounding is explained.

Expected sequence: chat answer plus a direct `explain_tool(existing)` call focused on `grounding-contract`. Workspace revision remains unchanged.

### Missing explanation with repository grounding

> What should I do as the author of an idea to get my own explanation? Show the sequence on the page.

Expected sequence: minimum pinned repository source → chat answer plus direct `explain_tool(missing)` with a typed workflow. The page enters Personalized mode and focuses the new block.

### Inconsistent explanation

> Compare User and Consumer and fix the inconsistency on the page.

Expected sequence: authoritative source check → chat answer plus direct `explain_tool(inconsistent)` with a local replacement or update, followed by automatic focus.

### Explicit opt-out

> Explain it in chat, but do not change or scroll the page.

Expected sequence: chat answer only. `explain_tool` is not called.

## Verification and evidence

The production page shows one accessible registration status. Add `?webmcp-debug=1` to expose detailed page-side datasets for diagnostics. Page registration, fixture tests, browser runtime execution, and actual agent-host/model selection are separate evidence classes.

Run:

```bash
python tools/check_public_demo.py
node --test tests/*.test.mjs
python -m unittest tests/browser_e2e_test.py
python -m unittest tools/test_generate_native_skill.py tools/test_webmcp_host_preflight.py
```

A real host/model compatibility claim requires repeated agent turns. A local `getTools()` result cannot substitute for that gate.

## Security boundary

WebMCP does not search the repository, form the answer, resolve claims, inject arbitrary HTML/JavaScript/CSS/SVG, mutate Originator-authored HTML, or create GitHub Issues. It accepts safe typed blocks, enforces activation/revision/idempotency checks, applies mutation batches atomically, and renders through DOM text operations.

Browser-local output is reversible and never becomes canonical evidence.
