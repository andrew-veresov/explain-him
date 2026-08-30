---
title: Skills own grounding and WebMCP delivers typed results
status: accepted
date: 2026-08-30
tags: [explain-him, resolution, webmcp, skills, typed-ui]
---

# Skills own grounding and WebMCP delivers typed results

## Decision

Explain Him uses the standard imperative WebMCP API through `document.modelContext` and exposes exactly two public Site Tools:

1. `get_explanation_contract` returns the public repository, grounding skill, presentation skill, typed-block schema, authored targets, and current local block IDs.
2. `apply_explanation` atomically applies safe `add`, `replace`, `update`, `remove`, and `focus` operations.

The page also publishes invisible machine-readable repository and skill links in its `<head>` as a bootstrap hint. Repository-scoped skills own source discovery, grounding, provenance, typed-block selection, and guided walkthrough behavior. WebMCP does not perform those tasks.

## End-to-end flow

1. The user opens the GitHub Pages explanation in a WebMCP-capable ChatGPT browser surface.
2. The agent discovers `get_explanation_contract` and loads both repository-scoped skills.
3. The agent answers from the page or retrieves the minimum deeper repository evidence through its own integration.
4. The agent answers in normal chat.
5. When a page representation helps, the agent sends only already-grounded typed blocks and authored target IDs to `apply_explanation`.
6. A `focus` operation reveals and highlights the relevant authored target so the chat can guide the user through the result.

## Boundary

WebMCP must not search the repository, generate answers, resolve claims, choose evidence, inject executable content, or write GitHub Issues. Authored HTML remains immutable. Browser-local blocks are non-canonical and reversible through human controls.

This decision supersedes [[2026-08-30-webmcp-challenge-surface]] and retains its standard-host and security conclusions.
