---
title: Presentation Capabilities
status: current
tags: [explain-him, presentation, capabilities]
---

# Presentation Capabilities

A **Presentation Capability** is a pluggable ability used by the personal agent to represent an already-grounded explanation in a specialized visual or interactive form.

The boundary is deliberate:

```text
Originator-authored knowledge
        ↓
personal agent: understand + ground + form meaning
        ↓
Presentation Artifact: typed IR + provenance
        ↓
Presentation Capability
        ↓
personal representation
```

The capability is not a knowledge source. It must not silently reinterpret repository evidence or promote its rendered output into a canonical fact.

## Ownership

The Originator controls canonical meaning and what may execute inside the trusted Explain Him surface. The Consumer controls how that meaning is represented personally and may use a consumer-local capability outside the trusted surface.

A consumer-local view never becomes canonical merely because it is useful.

## Presentation Artifact

`explain-him-presentation.v1` carries:

- semantic presentation type;
- capability id, trust, and execution mode;
- typed content schema and payload;
- a safe textual fallback;
- provenance back to authored blocks and repository references;
- authorship metadata that separates meaning from presentation.

Executable HTML or JavaScript is not a Presentation Artifact.

## Trust and execution

Trust levels are `builtin`, `originator-approved`, `consumer-local`, and `untrusted`. Execution modes are `embedded`, `personal-agent`, and `consumer-local`.

`untrusted` fails closed. Consumer-local code does not execute inside the Originator-authored page. Embedded capabilities must be known implementations with typed input.

## Capability selection

When a presentation would materially improve understanding, the personal agent resolves a capability in this order:

1. explicit Consumer request, when allowed and available;
2. Originator recommendation;
3. semantic match;
4. runtime availability;
5. safe fallback.

Trust and security checks may veto a candidate at any step.

## Archify reference capability

Archify is the first reference external capability for `architecture-map`, `workflow`, `sequence`, `dataflow`, and `lifecycle` presentations. It runs on the personal-agent side.

The personal agent first grounds and forms the semantic artifact. Archify then receives only the bounded presentation input needed to render it. Archify-generated standalone HTML is not injected directly into the Explain Him DOM.

Archify validates the model; it does not become a dependency of Explain Him or a second reasoning path over the idea repository.

## Failure behavior

If the requested capability is unavailable or fails, the normal chat answer remains valid. Explain Him may use the builtin safe-text fallback without changing the grounded meaning.
