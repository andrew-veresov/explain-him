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
5. form and deliver the answer in its normal chat;
6. use WebMCP only to synchronize the visual/browser-local layer;
7. when evidence is insufficient, offer a minimized Issue draft and obtain confirmation before writing.

## Model

```text
User <-> browser / personal agent
                    |
          +---------+---------+
          |                   |
          v                   v
  read page/repository   WebMCP UI-only tools
                              |
                              v
Originator-authored HTML + browser-local operations
                              |
                              v
                 personalized visual explanation
```

## Responsibility split

### Personal agent

- owns the conversation and reasoning;
- understands the question and desired depth;
- reads the authored page and, when needed, the repository;
- applies source precedence and statuses;
- forms a grounded answer and provenance;
- performs the GitHub Issue flow after user confirmation;
- decides whether visual adaptation would help.

### Explain Him page / WebMCP

- presents the visual explanation;
- delivers the Explain Him skill/context;
- reports stable visual targets and local workspace state;
- focuses an authored block;
- adds an already-formed answer as a local typed block;
- supports remove, undo, and redo.

WebMCP **does not** search knowledge, read the repository, form answers, create Issues, or provide a second chat interface.

## Browser-local workspace

The authored HTML remains immutable. Personalization is stored in the browser as a typed operation log:

```text
Originator-authored HTML + browser-local operations = personalized visible page
```

The implementation includes:

- add/remove local blocks;
- IndexedDB with a memory fallback;
- undo/redo;
- JSON export;
- confirmed reset;
- safe DOM rendering through `textContent`;
- WebMCP tools and accessible browser controls over the same workspace API.

Cross-device sync, collaboration, private hosted storage, and operational guarantees belong to **Explain Him Pro**.

## What is real and what is a target

| Element | Status |
|---|---|
| Public repository, authored page, skill, knowledge, and resolutions | `current` artifacts |
| Browser-local workspace and WebMCP UI tools on this page | `demo-only` implementation |
| Native WebMCP `registerSkill()` | `target` until the proposal stabilizes |
| Conversation in the user's browser/personal agent | `current` product boundary |
| Embedded Explain Him chat | intentionally absent |
| Compatibility with a specific browser agent | `open` until real E2E validation |
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
runtime/                       browser-local + WebMCP runtime
assets/                        UI styles and orchestration
question-template.md           safe Issue draft
00 Home.md + .obsidian/        Obsidian Vault entrypoint
```

## Checks

```bash
python tools/check_public_demo.py
node --test tests/workspace.test.mjs tests/webmcp.test.mjs
```

The checks reject private dependencies, internal product contours, arbitrary HTML injection, WebMCP retrieval/answer tools, root-scope errors, and non-English Cyrillic content in project text files.

## Project language

Repository-authored content is English: documentation, UI copy, manifests, templates, resolutions, examples, code-facing text, and tests. A personal agent may still answer an end user in the user's preferred language.

## License

Apache License 2.0. See `LICENSE`.
