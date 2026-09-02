---
name: explain-him-presentation
description: Convert an already-grounded Explain Him answer into safe typed browser-local blocks and display or focus it directly through the Protocol v5 explain_tool.
---

# Explain Him – presentation skill

## Purpose

Represent meaning already grounded by the personal agent inside the live Explain Him page as a small number of safe, typed, browser-local blocks. This skill never retrieves facts, resolves claims, or changes Originator-authored content.

## Prerequisites

Before using this skill:

1. Follow `skills/explain-him/SKILL.md`.
2. Require Protocol v5 and inspect the visible authored page and Personalized UI available through the host.
3. Ground the answer from the visible page and, when needed, the linked pinned GitHub repository.
4. Preserve repository provenance and status.
5. Always answer in chat.
6. Unless the user explicitly forbids page changes, call `explain_tool` directly to focus or display the explanation. There is no separate context tool.

## WebMCP boundary

`explain_tool` accepts an ordered list containing:

- `add` – add a typed local block beside a mutable target;
- `replace` – locally substitute a mutable authored target;
- `update` – refine an existing same-topic local block while preserving its ID;
- `remove` – restore the authored target by removing a local result;
- `focus` – reveal and focus an existing authored or local explanation.

One mutation call is one atomic browser-local transaction and one undo step. Authored HTML remains intact.

For mutation decisions, do not append a `focus` operation. `explain_tool` automatically focuses the block selected by `primaryOperationIndex`, or the last mutation by default. Restore automatically focuses the authored target. The `existing` decision is the only decision that carries a focus-only operation.

Do not use WebMCP for retrieval, reasoning, diagnostics, tool discovery, GitHub operations, or arbitrary DOM mutation.

## Target capabilities

Use only these registered page targets:

- mutable targets: `flow-model`, `personal-agent`, `workflow-diagram`, `question-loop`, `grounding-contract`, and `browser-workspace`;
- focus-only targets: `action-originator`, `action-user`, `action-agent-read`, `action-agent-answer`, `action-agent-adapt`, and `action-original-safe`.

- every target with `focus` may be highlighted and scrolled into view;
- `add` requires `hasInsertionSlot: true` and `add` in `allowedOperations`;
- `replace` requires `hasInsertionSlot: true` and `replace` in `allowedOperations`;
- focus-only workflow steps must never receive a local block.

A successful response must identify the focused visible block. Do not report success from persistence or revision alone.

## Decision rules

| Decision | Valid operation behavior |
| --- | --- |
| `existing` | Exactly one `focus`; revision remains unchanged |
| `missing` | One or more `add` operations; duplicate same-topic content is rejected |
| `partial` | `update` the same-topic local block; `add` only when none exists |
| `inconsistent` | Atomic `replace` and/or `update` operations |
| `restore` | `remove` one or more same-topic local blocks, then focus the authored target |

Every call includes `requestId`, `topicId`, `decision`, and `operations`. Supply `primaryOperationIndex` only when a mutation batch needs a focus target other than its default. Do not send removed context-handshake fields.

Reuse the returned local block ID for every same-topic continuation. Never claim a page update before `ok: true` and the expected `workspaceRevision`, `applied`, and `focused` values are returned.

## Supported typed blocks

Canonical schema: `schemas/explanation-block.v1.schema.json`.

Choose the smallest representation that materially improves understanding:

1. `callout` for one compact explanation, analogy, warning, or insight.
2. `comparison` for two to four alternatives or concepts.
3. `workflow` when order or causality is central.
4. `timeline` for chronology or lifecycle stages.
5. `diagram` when relationships or topology add value.

Do not create a diagram merely because diagrams are available.

### Callout

```json
{
  "type": "callout",
  "title": "Why this matters",
  "body": "Grounded explanation text.",
  "tone": "insight",
  "sources": []
}
```

### Comparison

```json
{
  "type": "comparison",
  "title": "Authored and personal layers",
  "columns": [
    {"title": "Authored", "items": ["Canonical", "Originator-owned"]},
    {"title": "Personal", "items": ["Browser-local", "Agent-added"]}
  ],
  "sources": []
}
```

### Workflow

```json
{
  "type": "workflow",
  "title": "How the agent explains",
  "steps": [
    {"title": "Read the page", "body": "Start from authored meaning."},
    {"title": "Retrieve deeper evidence", "body": "Use the linked repository only when needed."},
    {"title": "Ground and present", "body": "Answer, then display or focus the explanation."}
  ],
  "sources": []
}
```

### Timeline

```json
{
  "type": "timeline",
  "title": "Evolution",
  "items": [
    {"label": "Stage 1", "body": "First state."},
    {"label": "Stage 2", "body": "Next state."}
  ],
  "sources": []
}
```

### Diagram

```json
{
  "type": "diagram",
  "title": "Explanation loop",
  "variant": "flow",
  "nodes": [
    {"id": "page", "label": "Authored page"},
    {"id": "agent", "label": "Personal agent"},
    {"id": "local", "label": "Typed local block"}
  ],
  "edges": [
    {"from": "page", "to": "agent", "label": "ground"},
    {"from": "agent", "to": "local", "label": "explain_tool"}
  ],
  "sources": []
}
```

Node IDs must be unique. Every edge must reference existing nodes.

## Example calls

Focus an explanation that already exists:

```json
{
  "requestId": "focus-grounding-1",
  "topicId": "grounding:overview",
  "decision": "existing",
  "operations": [{"op": "focus", "targetId": "grounding-contract"}]
}
```

Add and automatically focus a missing explanation:

```json
{
  "requestId": "originator-workflow-1",
  "topicId": "originator:workflow",
  "decision": "missing",
  "operations": [
    {
      "op": "add",
      "targetId": "browser-workspace",
      "block": {
        "type": "workflow",
        "title": "From idea to explanation",
        "steps": [
          {"title": "Prepare the repository"},
          {"title": "Publish the authored page and skills"},
          {"title": "Let the personal agent ground and present"}
        ],
        "sources": [{"path": "knowledge/01-originator-flow.md", "status": "current"}]
      }
    }
  ]
}
```

## Provenance and safety

Every repository-grounded block should carry known `repository`, `path`, `ref`, `section`, and `status` values. Use `index.html` when the authored page itself is the source. Never invent metadata.

Never emit arbitrary HTML, JavaScript, CSS, iframe content, executable URLs, selectors, or SVG markup. Never remove Originator-authored content. Browser-local blocks and external presentation output are not evidence.

If an external presenter helps structure already-grounded meaning, translate its semantic result into a supported typed block. Do not inject its executable output or allow it to become a second repository-retrieval path.

## Failure behavior

If `explain_tool` fails, keep the conversational answer and state that the Personalized UI did not change or focus. Do not change the facts merely to make rendering succeed, and do not retry with a legacy protocol or tool identity.
