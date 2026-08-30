# Explain Him

**Explain Him** is a way to publish an idea so that a user's personal AI agent can understand it, explain it at the required depth, and keep an Originator-authored HTML page synchronized with the conversation.

This repository is a standalone public demo/reference package for the core approach. It does not require a separate hosted Explain Him runtime or a separate Explain Him chat.

## Quick start

```bash
python -m http.server 8000
```

Open `http://localhost:8000/`.

`index.html` is a visual explanation page prepared by the Originator. Conversation happens in the user's browser/personal agent; the page itself contains no chat panel.

## Using Explain Him with a personal agent

Give the agent a link to this repository and ask it to explain the idea. The agent should:

1. read `AGENTS.md` and the repository-scoped skill;
2. read the current HTML page;
3. inspect only the minimum repository sources required for deeper context;
4. distinguish `current`, `target`, `hypothesis`, `open`, and `demo-only`;
5. form and ground the answer in its normal chat;
6. decide whether a specialized presentation would materially improve understanding;
7. if useful, resolve a trusted Presentation Capability and form a typed Presentation Artifact;
8. use WebMCP Site Tools to synchronize the visual/browser-local layer when the current host supports them, otherwise use the accessible browser-agent controls over the same workspace API;
9. when evidence is insufficient, offer a minimized Issue draft and obtain confirmation before writing.

## Model

```text
User <-> browser / personal agent
                    |
          +---------+--------------------+
          |                              |
          v                              v
  read page/repository          form grounded meaning
                                         |
                                         v
                               Presentation Artifact
                                         |
                              +----------+----------+
                              |                     |
                              v                     v
                       trusted capability     consumer-local tool
                              |
                              v
                     personal representation
                              |
                              v
               WebMCP Site Tool / browser-control sync
                              |
                              v
Originator-authored HTML + browser-local operations
                              |
                              v
                 personalized visual explanation
```

## Responsibility split

### Personal agent

- owns the conversation, reasoning, and grounding;
- understands the question and desired depth;
- reads the authored page and, when needed, the repository;
- applies source precedence and statuses;
- forms a grounded answer and provenance;
- decides whether a Presentation Capability would help;
- forms the typed Presentation Artifact before invoking an external presenter;
- performs the GitHub Issue flow after user confirmation.

### Presentation Capability

A Presentation Capability is a pluggable ability to represent already-grounded meaning as a diagram, architecture map, workflow, timeline, graph, simulation, data visualization, or another specialized view.

It does **not** own repository reasoning and does not become evidence. The Originator controls what may execute inside the trusted page; the Consumer may use their own local presentation tools outside that surface.

Archify is included only as a reference `originator-approved` capability for technical views. It runs on the personal-agent side; its generated HTML is never injected directly into the Explain Him DOM.

### Explain Him page / WebMCP

- presents the authored visual explanation;
- exposes the repository-scoped Explain Him bootstrap through the `get_explain_him_skill` WebMCP tool;
- reports WebMCP availability and registered Site Tools through `get_webmcp_status`;
- reports stable visual targets, presentation capabilities, and local workspace state;
- focuses an authored block;
- adds an already-grounded typed Presentation Artifact to the browser-local layer;
- supports remove, undo, and redo.

The current standard host is `document.modelContext`. `navigator.modelContext` is retained only as a legacy compatibility fallback. Explain Him does not depend on a non-standard `registerSkill()` API.

WebMCP **does not** search knowledge, read the repository, form answers, execute presentation reasoning, create Issues, or provide a second chat interface.

## Agent host compatibility

| Host | Explain Him integration |
|---|---|
| ChatGPT desktop built-in browser | Native WebMCP/Site Tools through `document.modelContext`; this is the primary acceptance path. |
| Google Chrome with WebMCP enabled by experimental flag or origin trial | Standard WebMCP tools register through `document.modelContext` and are available to WebMCP-aware agents. |
| ChatGPT Chrome extension/sidebar | The page remains usable through page reading and accessible browser controls. OpenAI currently does not expose ChatGPT Site Tools in Chrome, so the sidebar cannot directly invoke the WebMCP tool surface yet. |
| Browser without WebMCP | Accessible controls call the same browser-local workspace API. |

For Desktop ChatGPT, Site Tools availability also depends on the account, selected model, and the **Enable site tools** browser permission. For Chrome WebMCP testing, use the current Chrome experimental flag or origin trial.

## Browser-local workspace

The authored HTML remains immutable. Personalization is stored in the browser as a typed operation log:

```text
Originator-authored HTML + browser-local presentation operations = personalized visible page
```

Workspace v2 stores generalized `add-presentation` / `remove-presentation` operations. Existing v1 `add-block` data is migrated to safe-text Presentation Artifacts.

The implementation includes:

- typed Presentation Artifacts with provenance;
- capability trust/execution metadata;
- IndexedDB with a memory fallback;
- undo/redo;
- JSON export;
- confirmed reset;
- safe DOM rendering through `textContent`;
- WebMCP Site Tools and accessible browser controls over the same workspace API;
- standard `document.modelContext` host discovery with a legacy fallback;
- a WebMCP diagnostics tool and repository-scoped bootstrap tool;
- compatibility wrappers for the previous block API.

Cross-device sync, collaboration, private hosted storage, and operational guarantees belong to **Explain Him Pro**.

## Presentation Capability v1

The public reference registry currently contains:

| Capability | Trust | Execution | Purpose |
|---|---|---|---|
| `explain-him-safe-text` | `builtin` | `embedded` | deterministic safe fallback |
| `archify` | `originator-approved` | `personal-agent` | architecture, workflow, sequence, dataflow, lifecycle |

Capability resolution prefers an explicit Consumer request when allowed, then the Originator recommendation, semantic match, runtime availability, and finally the safe fallback. Security policy may veto any candidate.

The page never accepts arbitrary HTML or JavaScript as a Presentation Artifact.

## What is real and what is a target

| Element | Status |
|---|---|
| Public repository, authored page, skill, knowledge, resolutions | `current` artifacts |
| Presentation Capability contract and reference registry | `current` reference implementation |
| Browser-local workspace v2 and WebMCP Site Tools on this page | `demo-only` implementation |
| Standard WebMCP host discovery through `document.modelContext` | `current` implementation |
| Archify adapter contract | `demo-only`; external execution depends on the personal-agent environment |
| Conversation in the user's browser/personal agent | `current` product boundary |
| Embedded Explain Him chat | intentionally absent |
| Direct Site Tool invocation from the ChatGPT Chrome sidebar | external platform limitation; accessible browser controls are the compatibility path |
| GitHub Issues as the only mass-market feedback UX | `hypothesis` |
| A2UI | optional target, not a web-flow requirement |

## Repository structure

```text
index.html                     authored explanation page
AGENTS.md                      repository-scoped bootstrap
explain-him.yaml               machine-readable manifest
skills/explain-him/            repository skill
knowledge/                     public explanatory sources
resolutions/                   accepted public decisions
schemas/                       Presentation Capability / Artifact schemas
runtime/presentation/          registry, policy checks, artifact validation
runtime/                       browser-local + WebMCP runtime
assets/                        UI styles and orchestration
question-template.md           safe Issue draft
00 Home.md + .obsidian/        Obsidian Vault entrypoint
```

## Checks

```bash
python tools/check_public_demo.py
node --test tests/workspace.test.mjs tests/webmcp.test.mjs tests/presentation.test.mjs
```

The checks reject private dependencies, internal product contours, arbitrary HTML injection, untrusted presentation channels, WebMCP retrieval/answer tools, obsolete host wiring, root-scope errors, and non-English Cyrillic content in project text files.

## Project language

Repository-authored content is English: documentation, UI copy, manifests, templates, resolutions, examples, code-facing text, and tests. A personal agent may still answer an end user in the user's preferred language.

## License

Apache License 2.0. See `LICENSE`.
