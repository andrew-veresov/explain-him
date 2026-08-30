---
tags: [explain-him, webmcp, challenge, judge-guide]
---

# Explain Him — WebMCP Challenge guide

## One-sentence pitch

**Explain Him turns an authored idea page into a shared human–agent explanation surface: the agent reads structured page meaning through WebMCP and can focus, personalize, remove, undo, and redo explanations in the same live UI the human sees.**

Live app: <https://andrew-veresov.github.io/explain-him/>

Public source: <https://github.com/andrew-veresov/explain-him>

License: Apache-2.0 (`LICENSE`).

## Why WebMCP is essential

A normal browser agent can inspect visible text and click controls, but it has to infer DOM structure and application state. Explain Him exposes a typed contract for the semantic targets and the browser-local personalization state.

WebMCP therefore provides two capabilities that are central to the product experience:

1. **structured understanding of the current authored page** — stable target IDs, headings, and concise authored meaning through `get_explanation_context`;
2. **shared live explanation state** — the agent safely changes the same page the human is looking at through focus/add/remove/undo/redo tools.

The authored layer remains immutable. Agent additions are browser-local, reversible, and visibly separated from Originator content.

## WebMCP implementation

Explain Him uses the imperative WebMCP API from top-level JavaScript.

```text
document.modelContext
        |
        +-- registerTool(get_explanation_context)
        +-- registerTool(get_personalization_state)
        +-- registerTool(focus_explanation)
        +-- registerTool(add_personal_explanation)
        +-- registerTool(remove_personal_explanation)
        +-- registerTool(undo_personalization)
        +-- registerTool(redo_personalization)
```

`navigator.modelContext` exists only as a legacy fallback for older experimental hosts; it is not the challenge path.

The implementation does not depend on `registerSkill()`, iframe tools, or the declarative WebMCP API.

## Site Tool surface

| Tool | Read/write | User intent | Verifiable result |
|---|---|---|---|
| `get_explanation_context` | read | Understand the current authored page or one target | Returns current-page semantic targets |
| `get_personalization_state` | read | See what the agent has added | Returns local IDs, targets, titles, undo/redo state |
| `focus_explanation` | write | Show a specific part of the explanation | Target becomes visible and focused |
| `add_personal_explanation` | write | Add an analogy/example/summary/warning/comparison | New local presentation appears beside the authored target |
| `remove_personal_explanation` | write | Remove one local explanation | Local presentation disappears; authored content remains |
| `undo_personalization` | write | Undo the last local change | Previous browser-local state is restored |
| `redo_personalization` | write | Redo an undone local change | Reverted local state returns |

The public surface intentionally avoids compatibility aliases, diagnostics, or duplicate tools. Internal Presentation Capability machinery remains an implementation detail rather than competing with user-intent tools.

## Judge flow

Use the live page in the ChatGPT desktop in-app browser with Site Tools enabled, or in a WebMCP-enabled Chrome build.

### Prompt 1 — understand + personalize

> Explain this idea in one paragraph, then add a short analogy next to the mechanism.

Expected behavior:

1. the agent uses `get_explanation_context`;
2. it answers in the normal agent conversation;
3. it calls `add_personal_explanation` for an authored target such as `flow-model`;
4. the page visibly gains a **Personal presentation** without changing authored content.

### Prompt 2 — navigate the shared page

> Focus the part about grounding.

Expected behavior: `focus_explanation` brings `grounding-contract` into the visible tab and focuses it.

### Prompt 3 — reversible collaboration

> Undo my last personalization.

Expected behavior: `undo_personalization` changes the browser-local state and the visible page returns to the previous state.

## Runtime verification

The page publishes runtime state on the root element after registration:

- `data-webmcp-api="document.modelContext"`
- `data-webmcp-host`
- `data-webmcp-state`
- `data-webmcp-tools`
- `data-webmcp-registered`
- `data-webmcp-verified`

When the host implements `document.modelContext.getTools()`, Explain Him verifies the seven expected tools against the host and reports `WebMCP verified`. When `getTools()` is not exposed but all `registerTool()` calls succeed, it reports `WebMCP ready` instead of treating verification as a dependency.

## Human fallback

The same workspace API is connected to accessible page controls. The product remains usable when WebMCP is unavailable, but the agent then loses the typed semantic/action contract. This is graceful degradation, not a second implementation of the agent protocol.

## Security and trust boundary

WebMCP may read meaning already authored into the current page and manipulate only browser-local personalization.

It does **not**:

- search or read repository files;
- generate canonical claims;
- inject arbitrary HTML or JavaScript;
- modify Originator-authored blocks;
- search or create GitHub Issues.

Local rendering uses safe DOM text operations. The richer Presentation Artifact layer validates payloads and keeps external presentation tools outside the trusted authored surface.

## Challenge-period work and provenance

The Explain Him concept predates the challenge, but the public WebMCP implementation was created during the challenge period.

Evidence in the public repository:

- **August 27, 2026** — public repository created;
- **August 28, 2026** — first public demo with WebMCP and browser-local workspace: commit [`ea61e373`](https://github.com/andrew-veresov/explain-him/commit/ea61e373e5da16fbf0ed171d583b9503f3825cca);
- **August 30, 2026** — standard `document.modelContext` Site Tools host fix: merge commit [`4c20e83b`](https://github.com/andrew-veresov/explain-him/commit/4c20e83bc4221c051841ec732b55bc38b9c847a3);
- **August 30, 2026** — challenge-focused redesign in [PR #7](https://github.com/andrew-veresov/explain-him/pull/7): smaller non-overlapping tool surface, live-page semantic context, host verification, judge flow, and WebMCP eval cases.

This file exists specifically to distinguish pre-existing product ideation from challenge-period WebMCP implementation work.

## Tests and evals

Run:

```bash
python tools/check_public_demo.py
node --test tests/*.test.mjs
```

The WebMCP tests cover:

- standard host discovery;
- complete tool registration;
- optional `getTools()` verification;
- narrow, described schemas;
- live-page semantic context;
- visible and verifiable local mutations;
- partial registration failure;
- prompt-to-tool eval fixtures in `tests/webmcp-eval-cases.json`.

## Submission checklist

The official challenge submission should include all of the following before the deadline:

- working live URL;
- public source repository;
- visible open-source license;
- written explanation of WebMCP leverage and the human–agent journey;
- public demo video under three minutes with audio;
- evidence of challenge-period WebMCP work;
- participant eligibility confirmation under the official rules.

Official challenge page: <https://openai.com/webmcp-challenge/>

Official rules: <https://webmcp.devpost.com/rules>

After submitting, preserve the judged repository and live app unchanged during the judging period; use a fork or separate branch for later experimentation if necessary.
