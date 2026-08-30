---
name: explain-him-presentation
description: Convert an already-grounded Explain Him answer into safe typed browser-local blocks and embed them through the minimal WebMCP apply_explanation tool.
---

# Explain Him – presentation skill

## Purpose

Take meaning that has already been grounded by the personal agent and represent it inside the live Explain Him page as a small number of safe, typed, browser-local blocks.

This skill never retrieves facts, resolves claims, or changes Originator-authored content. It only chooses a representation for meaning that is already known.

## Prerequisite

Before using this skill:

1. follow `skills/explain-him/SKILL.md`;
2. ground the answer from the authored page and, when needed, GitHub;
3. preserve repository provenance and status;
4. answer the user in the normal agent conversation;
5. call `get_explanation_contract` if you have not already done so in this page session.

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
6. Check the returned `applied` entries and local block IDs.

## Guided walkthrough

After adding a grounded block, use `focus` when the user asked to be shown or guided through the result. Keep the chat answer active: state what is focused, explain why it matters, and let the user's next question determine the next focus target.

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

Use `replace` when a visible authored target needs a user-local correction or simplification. Use `update` for a later refinement of that same local result so its ID stays stable. Use `remove` when the user asks to restore the author version.

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

If `apply_explanation` fails, keep the conversational answer and report only that the page embedding failed. Do not re-ground or invent different facts to make the renderer succeed.
