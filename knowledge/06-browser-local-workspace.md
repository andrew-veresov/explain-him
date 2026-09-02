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

The personal agent does not receive arbitrary mutation access to HTML. Stable authored targets are published by the page and skills. `explain_tool` validates current target capabilities and browser-local block IDs while focusing, adding, locally replacing, updating, or removing safe typed results. Undo/redo remain human controls.

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

`explain_tool` receives only results already grounded by the personal agent and inspects current page state only to validate and apply the requested action. Repository navigation metadata remains in the page bootstrap and skills rather than a separate WebMCP context response. Accessible controls call the same workspace API when WebMCP is unavailable.

## Limitations

- clearing site data removes the workspace;
- another origin or browser profile has separate state;
- updating the base revision can orphan a local presentation;
- direct Site Tool availability depends on the browser/agent host;
- cross-device sync belongs to Explain Him Pro.

See [[../resolutions/2026-08-26-browser-local-workspace|browser-local workspace resolution]] and [[../resolutions/2026-08-30-skill-driven-webmcp|current WebMCP boundary]].
