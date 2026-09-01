# Explain Him Public Implementation Roadmap

Status: implemented – production acceptance pending
Last updated: 2026-09-01

The [Product Contract](PRODUCT-CONTRACT.md) is the source of truth for product intent. This roadmap records the completed A5 repository implementation and the remaining production acceptance path in ChatGPT Desktop built-in browser Site Tools. It is not evidence that an account or model already has Site Tools access.

## Current baseline

- A static GitHub Pages explanation with immutable authored content.
- A reversible browser-local Personalized layer.
- Exactly two Protocol v3 WebMCP tools.
- Immutable pinned A6 grounding and presentation skills.
- A pinned `groundingSourceIndex` that routes insufficient visible answers to the minimum immutable repository source.
- Page API, schema, workspace, persistence, Origin Trial, and live deployment checks.
- Honest separation of page readiness from agent-host connection.

## A5 grounding source index

1. The immutable A5 grounding skill requires repository retrieval whenever the visible page does not explicitly answer a material part of the user's question.
2. Page bootstrap and `get_explain_him_answer` expose a pinned `groundingSourceIndex` with topic, path, section, status, raw URL, commit, and SHA-256.
3. The contract description, Protocol v3 schema, manifest, and public checkers preserve exactly two tools.
4. Deterministic fixtures, browser E2E, negative failure checks, and provenance assertions protect the exact `User`/`Consumer` and <code>&#x0433;&#x0434;&#x0435; &#x043F;&#x0443;&#x0431;&#x043B;&#x0438;&#x043A;&#x0443;&#x0435;&#x0442; &#x0430;&#x0432;&#x0442;&#x043E;&#x0440; &#x0441;&#x0432;&#x043E;&#x044E; &#x0438;&#x0434;&#x0435;&#x044E;?</code> behaviors.
5. The remaining release work is public Pages verification followed by the real ChatGPT Desktop Site Tools acceptance gate.

## Production acceptance gate

- ChatGPT Desktop built-in browser is the target host.
- The selected account and model must expose Site Tools for the page.
- At least 10 independent real-host runs are required.
- At least 90% must select every required tool in the required scenario.
- False success is not allowed.
- Page registration, fixture AI, Chrome Origin Trial, or Inspector results cannot substitute for this gate.

Chrome sidebar compatibility and a dedicated Explain Him authoring editor or generator are not part of this roadmap.
