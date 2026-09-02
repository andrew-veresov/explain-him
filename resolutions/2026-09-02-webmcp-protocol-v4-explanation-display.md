---
title: Protocol v4 explanation context and display
status: accepted
date: 2026-09-02
tags: [explain-him, webmcp, protocol-v4, personalized-ui]
supersedes: 2026-08-30-skill-driven-webmcp
---

# Protocol v4 explanation context and display

## Context

The one-tool WebMCP demo reliably encouraged an agent to display an explanation because its descriptor directly matched the user's intent. The production page had a stronger typed workspace but exposed a conditional write tool, a large proof-echo handshake, and a policy that left fully present ordinary explanations in chat only. It also advertised focus and mutation through the same target list even though only half of those targets had local insertion slots.

The project supports only the current `document.modelContext` API. Experimental skill registration from WebMCP issue 161 remains a deliberate exception.

## Decision

Adopt Protocol v4 with exactly two tools:

1. `get_explain_him_context` returns current authored and Personalized summaries, target capabilities, local block identities, activation and revision state, linked GitHub repository pins, skill-delivery state, and the exact additional-information instruction.
2. `explain_tool` focuses an existing explanation or applies safe typed `add`, `replace`, `update`, or `remove` operations. A successful mutation automatically focuses its visible result.

Every explanation, clarification, comparison, show, or walkthrough request uses both tools when Site Tools are available, except when the user explicitly forbids page changes or scrolling. Fully present content is focused instead of duplicated.

Protocol v4 requires only `requestId`, `activationId`, `expectedWorkspaceRevision`, `topicId`, `decision`, operations, and an optional primary operation index. The page keeps immutable source pins and skill-delivery evidence in its own context rather than requiring the agent to echo them back.

All authored targets remain focusable. Only targets with a matching local slot advertise and accept `add` or `replace`.

The page may still register one generated `explain_him` composite through feature-detected `document.modelContext.registerSkill`. That method remains experimental, adds no tool, has no polyfill, and falls back to pinned remote skills when absent or rejected.

## Alternatives considered

### One `explain_tool` only

Rejected because the agent would lack a structured view of current content, target capabilities, local topic identity, and workspace revision before deciding whether to focus or mutate.

### Retain Protocol v3 names and handshake

Rejected because the conditional `apply_explanation` identity weakened selection for ordinary explanation prompts, while echoed nonce and proof fields did not prove semantic skill reading.

### Mutate every authored target

Rejected because focus-only workflow steps have no insertion slots. Accepting a local mutation there could persist a result that never becomes visible.

## Consequences

- Protocol v3 and the old tool identities are not supported.
- The typed renderer, atomic transaction log, revision checks, idempotent request IDs, provenance, Original view, undo/redo, and safe browser-local persistence remain.
- Tool descriptors directly name explanation intents, but host/model tool selection remains probabilistic and requires real-host evaluation.
- `getTools()` verifies page registration only; it does not prove that an external agent can access or select the tools.
- Existing browser-local workspace data remains readable, but new WebMCP requests must use Protocol v4.

