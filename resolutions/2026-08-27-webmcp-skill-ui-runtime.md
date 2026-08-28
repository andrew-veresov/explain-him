---
title: WebMCP delivers the skill and mutates only local UI
status: accepted
date: 2026-08-27
tags: [explain-him, resolution, webmcp, skills]
---

# WebMCP delivers the skill and mutates only local UI

## Decision

In the browser flow, Explain Him uses WebMCP for two tasks:

1. deliver the Explain Him skill to the personal agent as instructions, structured context, and related UI tools;
2. display an answer already formed by the agent on the authored page through typed visual/workspace operations.

WebMCP is not a knowledge/retrieval layer and does not require a browser-readable knowledge bundle.

The personal agent reads the current page and, when needed, the repository through its own GitHub integration, applies source precedence, forms a grounded answer and provenance, answers the user, and then optionally calls a UI tool.

WebMCP may deliver the descriptor, report stable targets, focus an authored block, add/remove a local block, read local state/history, and support undo/redo.

WebMCP does not provide tools for knowledge search, repository read/search, claim resolution, answer generation, or GitHub Issues. Authored HTML remains immutable.

When `registerSkill()` is available, the descriptor is registered directly. Otherwise the read-only `get_explain_him_skill` tool returns the same descriptor; repository `SKILL.md` remains the non-WebMCP fallback.
