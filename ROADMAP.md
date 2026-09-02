# Explain Him Public Implementation Roadmap

Status: implemented – production acceptance pending
Last updated: 2026-09-02

The [Product Contract](PRODUCT-CONTRACT.md) is the source of truth for product intent. This roadmap records the Protocol v5 implementation and the remaining production acceptance path in ChatGPT Desktop built-in browser Site Tools. It is not evidence that an account or model already has Site Tools or the experimental native-skill API.

## Current baseline

- A static GitHub Pages explanation with immutable authored content.
- A reversible browser-local Personalized layer.
- Exactly one Protocol v5 WebMCP tool: `explain_tool`.
- Immutable pinned A9 grounding and presentation skills.
- A pinned `repository.groundingSources` list and stable `additionalInformation` instruction that route insufficient visible answers to the minimum repository source.
- Page API, schema, workspace, persistence, Origin Trial, and live deployment checks.
- Honest separation of page readiness from agent-host connection.
- One deterministically generated composite `explain_him` skill for progressive issue-161 registration, with the pinned remote workflow retained as the complete fallback.

## Protocol v5 direct explanation action

1. Every explanation request calls `explain_tool` directly unless the user explicitly opts out of page changes or scrolling.
2. Fully reflected content uses `explain_tool(existing)` to focus the exact block without changing revision.
3. Missing, partial, or inconsistent content uses minimum repository grounding when needed, then a typed mutation with automatic focus.
4. Target capabilities prevent local artifacts on the six focus-only child blocks.
5. Public Pages exposes the pinned source guidance and complete fallback even when the experimental native-skill method is absent.

## A9 progressive native skill

1. The standard public tool remains exactly `explain_tool`.
2. `document.modelContext.registerSkill` is feature-detected only on a standard document host. The page never polyfills it or calls a navigator variant.
3. One generated inline skill combines the ordered grounding and presentation instructions with provenance, structured context, annotations, and the direct tool name.
4. Registration success records `native-inline`. Absence or failure leaves `pinned-remote-fallback`; neither registration state establishes semantic compliance by the model.
5. WebMCP issue 161 remains an open backlog proposal. Native-skill simulation protects compatibility but is not deployed-host evidence.

## Production acceptance gate

- ChatGPT Desktop built-in browser is the target host.
- The selected account and model must expose Site Tools for the page.
- At least 10 independent real-host runs are required.
- At least 90% must select every required tool in the required scenario.
- False success is not allowed.
- Page registration, fixture AI, Chrome Origin Trial, or Inspector results cannot substitute for this gate.

Chrome sidebar compatibility and a dedicated Explain Him authoring editor or generator are not part of this roadmap. A checked-in build generator for the composite skill is implementation infrastructure, not an Originator-facing authoring product.
