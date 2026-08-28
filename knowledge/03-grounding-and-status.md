---
title: Grounding, provenance, and statuses
status: current
tags: [explain-him, grounding, provenance]
---

# Grounding, provenance, and statuses

## Source precedence

1. accepted resolutions;
2. authored page and explicit manifest claims;
3. knowledge notes;
4. README/navigation;
5. explicitly labeled agent inference.

A lower-priority source must not silently override a higher-priority source.

## Status vocabulary

| Status | Meaning |
|---|---|
| `current` | An accepted and current property of the model or an existing artifact. |
| `target` | Desired target behavior that is not yet guaranteed. |
| `hypothesis` | A testable assumption. |
| `open` | A decision or supporting evidence is missing. |
| `demo-only` | Implemented for demonstration but not claimed as a production contract. |
| `deprecated` | No longer applicable; a replacement should be identified. |

## Provenance

A material answer should make it possible to identify where a claim came from: page/path, section, status, and, when possible, commit/ref. A browser-local block may store these references, but workspace state itself is not evidence for a fact.

## Safe adaptation

- authored blocks are immutable;
- local blocks are rendered through `textContent`;
- a local analogy does not change the source of truth;
- inference is explicitly separated from repository-backed statements;
- when evidence is insufficient, the answer becomes `open` rather than a plausible invention.
