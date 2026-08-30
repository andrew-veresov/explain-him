---
title: Browser-local adaptive explanation
status: demo-only
tags: [explain-him, browser, webmcp, indexeddb]
---

# Browser-local adaptive explanation

## Model

```text
immutable authored HTML
        +
typed local operation log
        =
personalized visible DOM
```

The personal agent does not receive arbitrary access to HTML. `get_explanation_contract` exposes stable authored targets and browser-local block IDs. `apply_explanation` can add, locally replace, update, remove, or focus safe typed results. Undo/redo remain human controls.

## Persistence

The operation log is stored in IndexedDB within the current origin and browser profile. When IndexedDB is unavailable, a memory fallback is used, so changes last only for the current session. JSON export allows the local state to be saved manually.

## Safety

- the renderer uses `textContent`;
- arbitrary HTML/JavaScript/CSS mutation is forbidden;
- authored blocks cannot be removed or rewritten;
- reset requires confirmation;
- browser-local additions are non-canonical;
- deeper repository provenance is supplied by the personal agent after its own retrieval, not by WebMCP.

## WebMCP relationship

`get_explanation_contract` exposes integration metadata rather than a browser knowledge bundle. `apply_explanation` receives only results already grounded by the personal agent. Accessible controls call the same workspace API when WebMCP is unavailable.

## Limitations

- clearing site data removes the workspace;
- another origin or browser profile has separate state;
- updating the base revision can orphan a local presentation;
- direct Site Tool availability depends on the browser/agent host;
- cross-device sync belongs to Explain Him Pro.

See [[../resolutions/2026-08-26-browser-local-workspace|browser-local workspace resolution]] and [[../resolutions/2026-08-30-skill-driven-webmcp|current WebMCP boundary]].
