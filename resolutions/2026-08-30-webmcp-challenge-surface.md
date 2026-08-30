---
title: WebMCP exposes authored page meaning and shared UI actions
status: superseded
date: 2026-08-30
tags: [explain-him, resolution, webmcp, site-tools]
---

# WebMCP exposes authored page meaning and shared UI actions

This decision is superseded by [[2026-08-30-skill-driven-webmcp]].

## Decision

Explain Him uses the standard imperative WebMCP API from top-level JavaScript through `document.modelContext`.

The public Site Tool surface is intentionally small and maps to user intentions rather than implementation details:

1. `get_explanation_context` – read structured meaning already present on the current authored page;
2. `get_personalization_state` – inspect browser-local personal explanations;
3. `focus_explanation` – bring one authored target into focus;
4. `add_personal_explanation` – add a safe local analogy/example/summary/warning/comparison;
5. `remove_personal_explanation` – remove one local addition;
6. `undo_personalization` – undo the latest local change;
7. `redo_personalization` – redo a reverted local change.

The current authored page is therefore a shared human-agent surface: the human sees the visual explanation, the agent receives structured page meaning through WebMCP, and both observe the same local UI changes.

## Boundary

WebMCP may read only meaning already authored into the current page. It does not become a repository retrieval or answer-generation service.

WebMCP must not:

- search or read repository files;
- resolve unsupported claims;
- generate canonical knowledge;
- inject arbitrary HTML or JavaScript;
- modify Originator-authored blocks;
- search or create GitHub Issues.

Deeper evidence remains the responsibility of the personal agent using its own repository integration. Browser-local additions remain non-canonical and reversible.

## Rationale

A small, non-overlapping capability surface improves agent tool selection and makes WebMCP leverage observable: without WebMCP the agent can still converse, but it cannot reliably obtain the authored page's stable semantic targets or safely co-manipulate the user's live explanation state through a typed contract.

This decision supersedes [[2026-08-27-webmcp-skill-ui-runtime]].
