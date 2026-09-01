---
tags: [explain-him, webmcp, challenge, judge-guide]
---

# Explain Him – WebMCP Challenge guide

## One-sentence pitch

**Explain Him turns an authored idea page into a shared human-agent explanation surface: the personal agent discovers repository-scoped skills, grounds an answer from the page and repository, talks in normal chat, and safely adds typed explanations or guided focus to the same live page.**

Live app: <https://andrew-veresov.github.io/explain-him/>

Public source: <https://github.com/andrew-veresov/explain-him>

License: Apache-2.0 (`LICENSE`).

## Why WebMCP is essential

A generic browser agent can read pixels/DOM and click controls, but it has to infer the integration contract and safe mutation surface. Explain Him exposes two explicit capabilities:

1. `get_explanation_contract` discovers the public repository, grounding skill, presentation skill, typed-block schema, authored targets, and current local block IDs.
2. `apply_explanation` delivers already-grounded typed blocks and guided focus to the same page the human is viewing.

Grounding and GitHub retrieval remain with the personal agent. The authored layer remains immutable. Agent additions are browser-local, reversible, and visibly separated from Originator content.

## WebMCP implementation

Explain Him uses the imperative WebMCP API from top-level JavaScript.

```text
document.modelContext
        |
        +-- registerTool(get_explanation_contract)
        +-- registerTool(apply_explanation)
```

`navigator.modelContext` exists only as a legacy fallback for older experimental hosts. The implementation does not depend on `registerSkill()`, iframe tools, or declarative WebMCP support.

The page `<head>` also exposes immutable machine-readable Protocol v3 bootstrap metadata with repository identity, ordered raw A5 skill URLs, the pinned grounding source index, public commits, and SHA-256 digests. These are consistency and discovery hints, not a hidden knowledge bundle and not a page-side command to an agent.

## Site Tool surface

| Tool | Read/write | User intent | Verifiable result |
|---|---|---|---|
| `get_explanation_contract` | read | Discover how to ground and present this page | Returns repository, both skills, schema, targets, and local IDs |
| `apply_explanation` | write | Add/remove a grounded typed block or focus an authored target | Typed block appears/disappears or the target becomes visible and focused |

The public surface intentionally avoids compatibility aliases, diagnostics, retrieval tools, and answer-generation tools.

## Judge flow

Use the live page in a supported agent host. OpenAI currently documents Site Tools for the ChatGPT Desktop built-in browser. Chrome Origin Trial enrollment enables the page API, while agent discovery remains a separate host capability. An official ChatGPT Chrome extension run is accepted only when the page observes contract/apply lifecycle events and the expected revision; otherwise report `BLOCKED_EXTERNAL`, not success.

### Prompt 1 – originator workflow

> What should I do as the author of an idea to get my own explanation? Show the sequence on the page.

Expected behavior:

1. The agent calls `get_explanation_contract`.
2. It loads both repository-scoped skills.
3. It reads the authored page and the minimum relevant repository sources, such as `knowledge/01-originator-flow.md`.
4. It answers in normal chat.
5. It calls `apply_explanation` with a grounded `workflow` block and a `focus` operation.
6. The page visibly gains a **Personal presentation** beside the relevant authored target and highlights that target.

### Prompt 2 – typed comparison

> Compare the authored and personal layers and add the comparison to the page.

Expected behavior: the agent grounds the distinction, answers in chat, and adds a typed `comparison` with provenance.

### Prompt 3 – guided focus

> Show me where grounding is explained.

Expected behavior: `apply_explanation` with a `focus` operation reveals and highlights `grounding-contract`; the agent explains the focused material in chat.

## Runtime verification

The page publishes separate runtime state on the root element:

- `data-webmcp-api="document.modelContext"`
- `data-webmcp-host`
- `data-webmcp-state`
- `data-webmcp-tools`
- `data-webmcp-registered`
- `data-webmcp-verified`
- `data-webmcp-page-state`
- `data-webmcp-agent-state`
- `data-webmcp-contract-state`
- `data-webmcp-apply-state`
- `data-webmcp-workspace-revision`

`getTools()` verification proves the browser page surface only. Agent connection becomes observed when the host invokes the contract. Apply success is shown only after the transaction succeeds, and the status includes the resulting workspace revision. Failures never emit a success lifecycle event.

## Host preflight and evidence classes

Run `python tools/webmcp_host_preflight.py evidence.json` with non-secret observable evidence. The classifier distinguishes page API/registration, agent connection, contract choice, apply execution, and revision confirmation. Missing agent capability is `BLOCKED_EXTERNAL`; a real turn that has access but skips the mandatory contract or required mutation is a failure; a success claim without lifecycle and revision evidence is `FALSE_SUCCESS`.

The native Chrome gate exercises the deployed page runtime through the browser's `executeTool()` and parses its JSON-string result. It does not test an AI agent. The deterministic fixture suite validates policy and payloads, but it does not qualify a host/model compatibility claim. Such a claim requires at least 10 independent real-host/model turns, at least 90% required tool selection, and zero false-success claims.

Chrome's Model Context Tool Inspector may inspect descriptors, call tools, and run a Gemini-backed debugging chat. It is debug-only and is not the production flow. Chrome built-in AI EPP membership provides preview and feedback access, but does not guarantee the OpenAI extension's capability gate.

## Current WebMCP compatibility

Explain Him follows the current `webmachinelearning/webmcp` imperative descriptor shape: two bounded tools, clear what-and-when descriptions, strict object schemas and runtime validation, correct read-only annotations, callback `AbortSignal`, JSON-serializable callback results, and browser-managed `toolchange`. The page does not synthesize `toolchange` or depend on timing against unrelated tasks. The repository `main/index.bs` is the primary current source; `gh-pages` is treated as a generated published snapshot and is checked for correspondence, not as a separate API definition.

The current draft declares an object input to `ModelContext.executeTool()`. Installed Chrome 151 currently rejects that form and accepts serialized JSON arguments; it returns serialized JSON as a string. The native gate uses this observed shipped form and parses results fail-closed. This divergence is isolated to the diagnostic caller, not the page's registered callback contract.

## Human fallback

Accessible controls use the same browser-local workspace API. Without Site Tools, the user may operate those controls, while the ordinary Chrome sidebar remains a chat-only fallback and does not receive the typed contract. It must not report that it changed the page. Chat answers remain available when page presentation is unavailable.

## Security and trust boundary

WebMCP does not:

- search or read repository files;
- generate or resolve claims;
- choose source precedence;
- inject arbitrary HTML, JavaScript, CSS, iframes, or executable URLs;
- modify Originator-authored blocks;
- search or create GitHub Issues.

Typed content is rendered with DOM text operations. Repository provenance is supplied by the personal agent after grounding.

## Challenge-period work and provenance

The Explain Him concept predates the challenge, but the public WebMCP implementation was created during the challenge period.

- **August 27, 2026** – public repository created.
- **August 28, 2026** – first public demo with WebMCP and browser-local workspace: commit [`ea61e373`](https://github.com/andrew-veresov/explain-him/commit/ea61e373e5da16fbf0ed171d583b9503f3825cca).
- **August 30, 2026** – standard `document.modelContext` host support: merge commit [`4c20e83b`](https://github.com/andrew-veresov/explain-him/commit/4c20e83bc4221c051841ec732b55bc38b9c847a3).
- **August 30, 2026** – challenge-ready current-page tool surface in PR #7.
- **August 30, 2026** – skill-driven two-tool contract, safe typed blocks, and guided focus.

## Tests and evals

```bash
python tools/check_public_demo.py
node --test tests/*.test.mjs
```

The tests cover standard host discovery, complete tool registration, optional host verification, machine-readable bootstrap, both skill locations, safe typed blocks, workflow insertion, guided focus, invalid targets, executable-channel stripping, partial registration failure, and prompt-to-tool eval fixtures.

The private source repository contains the cross-agent Docker evaluation framework, scripted AI scenarios, LLM judge, and user-emulator runs. Private evaluation material is intentionally not included in this public repository.

## Submission checklist

- working live URL;
- public source repository;
- visible open-source license;
- written explanation of WebMCP leverage and the human-agent journey;
- public demo video under three minutes with audio;
- evidence of challenge-period WebMCP work;
- participant eligibility confirmation under the official rules.

Official challenge page: <https://openai.com/webmcp-challenge/>

Official rules: <https://webmcp.devpost.com/rules>

After submitting, preserve the judged repository and live app unchanged during judging; use a fork or separate branch for later experiments.
