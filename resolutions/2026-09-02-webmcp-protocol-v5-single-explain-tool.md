---
title: Protocol v5 single explanation tool
status: accepted
date: 2026-09-02
tags: [explain-him, webmcp, protocol-v5, personalized-ui]
supersedes: 2026-09-02-webmcp-protocol-v4-explanation-display
---

# Protocol v5 single explanation tool

## Context

Protocol v4 split explanation handling between a read-only context tool and a page-action tool. In a real agent turn, the model called `get_explain_him_context` but stopped before `explain_tool`, interpreting the user's request as chat-only even though the skill required same-turn page focus or display. The read-only call became a plausible completion point.

The one-tool demo does not create that stopping point. Its descriptor maps explanation intent directly to the action the user expects.

## Decision

Adopt Protocol v5 with exactly one public WebMCP tool: `explain_tool`.

The agent calls it directly for every explanation, clarification, why/how, comparison, show, or walkthrough request unless the user explicitly forbids page changes or scrolling. The request carries `requestId`, `topicId`, `decision`, operations, and an optional primary operation index. The runtime inspects current DOM targets and browser-local state during the action.

The page no longer registers `get_explain_him_context`. It no longer requires callers to echo `activationId` or `expectedWorkspaceRevision`. The tool records the revision observed before the action and returns both before/after revisions. `requestId` idempotency, typed artifacts, atomic transactions, same-topic duplicate rejection, executable-content rejection, visible focus confirmation, and rollback remain.

Stable target capabilities are published in the tool descriptor and repository skills. Runtime validation remains authoritative, so focus-only anchors cannot receive invisible local artifacts.

Repository navigation guidance stays in the page bootstrap and generated issue-161 skill. Repository retrieval remains the personal agent's responsibility and is not a WebMCP operation.

The page may still register one generated `explain_him` composite through feature-detected `document.modelContext.registerSkill`. That method remains experimental, adds no tool, has no polyfill, and falls back to pinned remote skills when absent or rejected.

## Consequences

- There is no read-only WebMCP context call at which an agent can stop.
- One direct tool selection now produces either a visible focus or a visible local explanation.
- Callers no longer perform optimistic revision checks. Runtime execution observes and reports the current revision; atomic application and rollback protect each transaction.
- A model still may decline to select a tool. Descriptor and skill instructions improve selection but do not make it a JavaScript guarantee.
- Protocol v4 and older public artifacts are not supported after migration.
