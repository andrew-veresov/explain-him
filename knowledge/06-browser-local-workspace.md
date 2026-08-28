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

The personal agent does not receive arbitrary access to HTML. It can add a typed block, remove only a local block, perform undo/redo, or temporarily focus an authored target.

## Persistence

The operation log is stored in IndexedDB within the current origin and browser profile. When IndexedDB is unavailable, a memory fallback is used, so changes last only for the current session. JSON export allows the local state to be saved manually.

## Safety

- the renderer uses `textContent`;
- arbitrary HTML/JavaScript/CSS mutation is forbidden;
- authored blocks cannot be removed or rewritten;
- reset requires confirmation;
- provenance for a local block is supplied by the personal agent after its own retrieval.

## Limitations

- clearing site data removes the workspace;
- another origin or browser profile has separate state;
- updating the base revision can orphan a local block;
- compatibility with a specific browser agent remains `open` until E2E validation;
- cross-device sync belongs to Explain Him Pro.

See [[../resolutions/2026-08-26-browser-local-workspace|accepted resolution]] and [[../resolutions/2026-08-27-webmcp-skill-ui-runtime|WebMCP boundary]].
