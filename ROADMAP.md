# Explain Him Public Implementation Roadmap

Status: planned
Last updated: 2026-09-01

The [Product Contract](PRODUCT-CONTRACT.md) is the source of truth for product intent. This roadmap records the shortest public path from the current A4 reference implementation to production acceptance in ChatGPT Desktop built-in browser Site Tools. It is not a release promise or evidence that an account or model already has Site Tools access.

## Current baseline

- A static GitHub Pages explanation with immutable authored content.
- A reversible browser-local Personalized layer.
- Exactly two Protocol v3 WebMCP tools.
- Immutable pinned A4 grounding and presentation skills.
- Page API, schema, workspace, persistence, Origin Trial, and live deployment checks.
- Honest separation of page readiness from agent-host connection.

## Next release: A5 grounding source index

1. Publish an immutable A5 grounding skill that requires repository retrieval whenever the visible page does not explicitly answer a material part of the user's question.
2. Add a pinned machine-readable `groundingSourceIndex` to page bootstrap and `get_explanation_contract`, including topic, path, section, status, raw URL, commit, and SHA-256.
3. Update the contract description, Protocol v3 schema, manifest, and public checkers without adding a third tool.
4. Protect the exact `User`/`Consumer` and `&#x0433;&#x0434;&#x0435; &#x043F;&#x0443;&#x0431;&#x043B;&#x0438;&#x043A;&#x0443;&#x0435;&#x0442; &#x0430;&#x0432;&#x0442;&#x043E;&#x0440; &#x0441;&#x0432;&#x043E;&#x044E; &#x0438;&#x0434;&#x0435;&#x044E;?` behaviors with deterministic fixtures, browser E2E, negative failure checks, and provenance assertions.
5. Publish private-first, verify the public facade and GitHub Pages deployment, then run the real ChatGPT Desktop Site Tools acceptance gate.

## Production acceptance gate

- ChatGPT Desktop built-in browser is the target host.
- The selected account and model must expose Site Tools for the page.
- At least 10 independent real-host runs are required.
- At least 90% must select every required tool in the required scenario.
- False success is not allowed.
- Page registration, fixture AI, Chrome Origin Trial, or Inspector results cannot substitute for this gate.

Chrome sidebar compatibility and a dedicated Explain Him authoring editor or generator are not part of this roadmap.
