---
title: Browser-local explanation adaptation
status: accepted
date: 2026-08-26
tags: [resolution, browser, adaptive-explanation]
---

# Browser-local explanation adaptation

Explain Him uses an immutable authored UI and a browser-local personal layer.

The personal agent changes the visible page only through typed operations. Local additions are stored in IndexedDB, replayed after the page is reopened, and support undo/redo. The original HTML and canonical claims are not changed.

WebMCP is used when available. Accessible controls are the fallback; both interfaces call the same workspace API.

The minimum demo contract is add, remove, undo, redo, confirmed reset, and export. Visual focus is temporary and is not part of the operation log. Compatibility with a specific browser agent remains `open`; cross-device sync belongs to Explain Him Pro.
