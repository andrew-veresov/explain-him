---
name: explain-him-presentation
description: Convert an already-grounded Explain Him answer into safe typed browser-local blocks and embed them through the minimal WebMCP apply_explanation tool.
---

# Explain Him – presentation skill

## Purpose

Take meaning that has already been grounded by the personal agent and represent it inside the live Explain Him page as a small number of safe, typed, browser-local blocks.

This skill never retrieves facts, resolves claims, or changes Originator-authored content. It only chooses a representation for meaning that is already known.

## Mandatory activation bootstrap

Before using this skill:

1. follow `skills/explain-him/SKILL.md`;
2. complete its mandatory activation bootstrap before grounding, focus, or mutation;
3. reuse the initial `get_explanation_contract` result for this activation; request another contract only for a confirmed stale-workspace or session-conflict refresh, or for an explicitly new page session;
4. ground the answer from the authored page and, when needed, GitHub;
5. preserve repository provenance and status;
6. retain the contract workspace revision, authored target IDs, and local block IDs until the transaction completes.

## Protocol selection and legacy v2 fallback

Select the protocol only from the returned `schemaVersion`; this skill must not relabel, downgrade, or translate a returned contract.

- A returned `explain-him-webmcp-contract.v3` requires its full activation handshake, including the activation ID, nonce, base revision, and exact ordered `skillProof`. Verify the immutable raw URLs, commits, and digests before applying a typed result, then send the complete v3 handshake unchanged with `apply_explanation`.
- Never downgrade or translate a returned v3 contract to v2. Retain its revision, topic, and local block IDs for the current activation.
- An actual older page may return `explain-him-webmcp-contract.v2`. Use that legacy compatibility fallback only with the fields it actually returns. Do not fabricate v3 activation or proof fields, and do not claim that a v3 handshake ran.
- If the contract is absent or has an unknown version, this skill cannot mutate or focus the page.

The contract tells you:

- valid authored `targetId` insertion anchors;
- current browser-local block IDs;
- the canonical typed-block schema path;
- the repository/skill location.

## WebMCP boundary

The only write capability is `apply_explanation`.

It accepts an ordered list of operations:

- `add` – add one typed block next to an authored target;
- `replace` – locally substitute a whole registered semantic target with a safe typed block;
- `update` – change an earlier local block while preserving its ID;
- `remove` – remove one earlier browser-local block or replacement;
- `focus` – reveal and focus an authored target or visible local result.

One call is one atomic browser-local transaction and one undo step. `replace` never changes canonical HTML: the authored subtree remains intact and returns with Original view or removal of the replacement.

Do not use WebMCP for retrieval, reasoning, diagnostics, tool discovery, or GitHub operations.

## Supported typed blocks

Canonical machine-readable schema: `schemas/explanation-block.v1.schema.json`.

Choose the smallest block that materially improves understanding.

### `callout`

Use for one compact explanation, analogy, example, warning, or insight.

```json
{
  "type": "callout",
  "title": "Why this matters",
  "body": "Grounded explanation text.",
  "tone": "insight",
  "sources": []
}
```

`tone` is one of `neutral`, `example`, `warning`, `insight`.

### `comparison`

Use when the main value is seeing 2–4 alternatives or concepts side by side.

```json
{
  "type": "comparison",
  "title": "Authored vs personal layer",
  "columns": [
    { "title": "Authored", "items": ["Canonical", "Originator-owned"] },
    { "title": "Personal", "items": ["Browser-local", "Agent-added"] }
  ],
  "sources": []
}
```

### `workflow`

Use for an ordered process or causal/action chain.

```json
{
  "type": "workflow",
  "title": "How the agent explains",
  "steps": [
    { "title": "Read page", "body": "Start from authored meaning." },
    { "title": "Retrieve deeper evidence", "body": "Use GitHub only when needed." },
    { "title": "Ground and present", "body": "Answer, then embed a typed block." }
  ],
  "sources": []
}
```

### `timeline`

Use for chronology, lifecycle stages, or evolution over time where labels matter.

```json
{
  "type": "timeline",
  "title": "Evolution",
  "items": [
    { "label": "Stage 1", "body": "First state." },
    { "label": "Stage 2", "body": "Next state." }
  ],
  "sources": []
}
```

### `diagram`

Use for relationships among concepts/components where nodes and edges add value.

Variants: `concept`, `architecture`, `sequence`, `flow`.

```json
{
  "type": "diagram",
  "title": "Explanation loop",
  "variant": "flow",
  "nodes": [
    { "id": "page", "label": "Authored page" },
    { "id": "agent", "label": "Personal agent" },
    { "id": "local", "label": "Typed local block" }
  ],
  "edges": [
    { "from": "page", "to": "agent", "label": "ground" },
    { "from": "agent", "to": "local", "label": "apply_explanation" }
  ],
  "sources": []
}
```

Node IDs must be unique. Every edge must reference existing node IDs.

## Block-selection heuristic

Use this order:

1. If one paragraph is enough → `callout`.
2. If the user is contrasting things → `comparison`.
3. If order/causality is central → `workflow`.
4. If dates/stages over time are central → `timeline`.
5. If relationships/topology are central → `diagram`.

Do not create a diagram just because diagrams are possible.

## Same-turn decision and topic reuse

The conversational answer is always required. Before selecting an operation, assess whether both the grounded answer and the representation the user requested already exist correctly in the current Personalized UI. Do not infer that a requested diagram exists merely because equivalent prose exists.

- Fully present and correct for an ordinary question: do not apply and do not duplicate the result.
- Fully present and correct for an explicit show or walkthrough: call `apply_explanation` in the same turn with focus only.
- Missing answer or representation: use `add`; an absent requested diagram is missing representation.
- Partial result: use `update` on the existing same-topic local block, or add a supplementary block when no such block exists.
- Inconsistent result: use `replace` for an authored target or `update` for a local block, batching every affected target in one transaction.
- An explicit no-page-change instruction means chat only, even if a page adaptation would otherwise be appropriate.
- Explicit restore: use `remove` to return to the Originator's version.

When this matrix selects an operation, `apply_explanation` in the same turn is mandatory. Use chat only for a simple, correct answer whose answer and requested representation are already fully present and that is not a show or walkthrough request.

Treat a topic as the stable semantic subject plus its authored target and, once created, its returned `local-*` block ID. In the v2 fallback this identity is session-local agent state, not a new runtime field. Reuse it rather than adding duplicate blocks. Use `update` for a same-topic refinement when that existing local block is partial or needs a refined grounded result. Do not tell the user that a page result changed until the selected same-turn transaction succeeds.

### Terminology consistency precedes fully-present

Run this narrow terminology check before the fully-present branch. An equivalence note does not make mixed labels consistent: when a question notices or compares equivalent visible `User` and `Consumer` labels, the requested representation remains inconsistent until one term is used throughout. Do not normalize labels that denote distinct roles.

- An explicit no-page-change instruction still wins and leaves the result chat-only.
- Default to `User` in user-facing local material, unless the user directly asks for `Consumer`.
- For the exact visible `User`/`Consumer` question, answer in chat and make the same-turn `apply_explanation` call with `replace` for `workflow-diagram`; use topic `terminology:user-consumer` when the protocol provides a topic field.
- For the direct same-topic Consumer follow-up, call `update` with the same returned local block ID. For a return to the author version, call `remove` for that ID.

Batch any other affected equivalent-label targets in the same transaction so Personalized view does not present mixed terminology. The authored source remains immutable. This narrow correction does not justify mutation for every otherwise-correct answer.

## Provenance

Every repository-grounded block should carry `sources` from the grounding skill.

Example:

```json
{
  "repository": "andrew-veresov/explain-him",
  "path": "resolutions/2026-08-30-webmcp-challenge-surface.md",
  "ref": "main",
  "section": "Decision",
  "status": "current"
}
```

Use `index.html` when the authored page itself is the source. Do not invent missing metadata.

## Adding blocks

1. Choose the authored `targetId` from `get_explanation_contract`.
2. Choose the typed block with the heuristic above.
3. Keep it concise; the conversational answer remains primary.
4. Include provenance.
5. Call `apply_explanation` once, batching related additions when useful.
6. Check that the returned result is `ok`, has the expected workspace revision, and includes the expected `applied` entries and local block IDs.

## Guided walkthrough

After adding a grounded block, include `focus` in the same `apply_explanation` transaction when the user asked to be shown or guided through the result. When no content change is needed, a walkthrough still requires a same-turn `apply_explanation` call with a focus-only operation. Keep the chat answer active: state what is focused, explain why it matters, and let the user's next question determine the next focus target.

```json
{
  "operations": [
    {
      "op": "add",
      "targetId": "browser-workspace",
      "block": {
        "type": "workflow",
        "title": "From idea to explanation",
        "steps": [
          { "title": "Prepare the repository" },
          { "title": "Publish the authored page and skills" },
          { "title": "Let the personal agent ground and present" }
        ],
        "sources": []
      }
    },
    { "op": "focus", "targetId": "browser-workspace" }
  ]
}
```

Do not force a fixed walkthrough. Focus follows the user's question and can be applied again on later turns.

Example input:

```json
{
  "operations": [
    {
      "op": "add",
      "targetId": "flow-model",
      "block": {
        "type": "callout",
        "title": "A useful analogy",
        "body": "The authored page is the score; the agent creates a local arrangement without rewriting the score.",
        "tone": "example",
        "sources": [
          { "path": "index.html", "section": "Mechanism", "status": "current" }
        ]
      }
    }
  ]
}
```

## Replacing, updating, or removing blocks

Use only block IDs returned by `get_explanation_contract` or a successful `apply_explanation` response.

Remove:

```json
{
  "operations": [
    { "op": "remove", "blockId": "local-presentation-..." }
  ]
}
```

Use `replace` when a visible authored target needs a user-local correction or simplification. Use `update` for a later refinement of that same local result so its ID stays stable. Use `remove` when the user asks to restore the author version. Use the latest returned workspace revision as `expectedWorkspaceRevision` and only IDs returned by the contract or a successful prior result.

```json
{
  "operations": [
    { "op": "replace", "targetId": "workflow-diagram", "block": { "type": "diagram", "title": "Personal terminology", "variant": "flow", "nodes": [{ "id": "user", "label": "User" }, { "id": "agent", "label": "Agent" }], "edges": [{ "from": "user", "to": "agent" }] } }
  ]
}
```

## External presentation capabilities

If the personal agent uses Archify or another external presenter to help design a representation:

- give it only already-grounded semantic material;
- do not let it become a second repository-retrieval path;
- do not inject its HTML/JavaScript into the Explain Him page;
- translate the useful result into one of the supported typed blocks above.

## Safety

- Never emit arbitrary HTML, JavaScript, CSS, iframe content, or executable URLs through `apply_explanation`.
- Never remove Originator-authored content.
- For terminology normalization, replace every affected visible semantic target. Do not leave a mixed User/Consumer presentation in Personalized view.
- Browser-local blocks are personalization, not evidence.
- A visualization must not add claims that were not grounded first.
- Prefer fewer, clearer blocks over many decorative blocks.

## Failure behavior

If `apply_explanation` fails, keep the conversational answer and plainly say that the requested local page change was not applied. Do not re-ground or invent different facts to make the renderer succeed, and do not claim that an edit, correction, refinement, or restore completed.
