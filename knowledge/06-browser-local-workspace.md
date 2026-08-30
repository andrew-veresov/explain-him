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

The personal agent does not receive arbitrary access to HTML. Through the public WebMCP surface it can read stable authored-page targets, focus one target, add a safe local explanation, remove only a local explanation, and perform undo/redo.

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

`get_explanation_context` exposes only meaning already present on the current authored page. The remaining public tools manipulate browser-local state through narrow user-intent operations. The accessible controls call the same workspace API when WebMCP is unavailable.

## Limitations

- clearing site data removes the workspace;
- another origin or browser profile has separate state;
- updating the base revision can orphan a local presentation;
- direct Site Tool availability depends on the browser/agent host;
- cross-device sync belongs to Explain Him Pro.

See [[../resolutions/2026-08-26-browser-local-workspace|browser-local workspace resolution]] and [[../resolutions/2026-08-30-webmcp-challenge-surface|current WebMCP boundary]].
