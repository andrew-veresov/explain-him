# Explain Him

**Express your idea once. Explain Him lets each person's AI explain it to them — and use the same live page as a shared explanation surface.**

Explain Him publishes an Originator-authored visual explanation together with a typed WebMCP contract. A user's personal agent can understand the current page, answer at the right depth, focus relevant parts, and add reversible browser-local analogies, examples, summaries, warnings, or comparisons without rewriting the original.

- **Live demo:** <https://andrew-veresov.github.io/explain-him/>
- **WebMCP Challenge judge guide:** [[WEBMCP_CHALLENGE]]
- **Public source:** <https://github.com/andrew-veresov/explain-him>
- **License:** Apache-2.0

## Why WebMCP

Without WebMCP, a browser agent can read pixels/DOM and click controls, but it has to infer application structure and state. Explain Him gives the agent an explicit contract for two things that matter to the product:

1. **meaning on the current authored page** — stable semantic targets, headings, and concise text;
2. **the shared local explanation state** — focus, add, remove, undo, and redo actions that change the same page the human is viewing.

```text
Human asks a question
        |
        v
Personal AI agent
        |
        +---- get_explanation_context ----> authored page meaning
        |
        +---- answer in normal chat
        |
        +---- focus/add/remove/undo/redo --> browser-local page state
                                                |
                                                v
                                  human sees the same change
```

The authored layer remains immutable. Personalization is local, visible, reversible, and never becomes canonical evidence.

## WebMCP Site Tools

Explain Him uses top-level imperative WebMCP through `document.modelContext.registerTool()`.

The public surface is deliberately small and user-oriented:

| Tool | Purpose |
|---|---|
| `get_explanation_context` | Read structured meaning already present on the current authored page |
| `get_personalization_state` | Inspect browser-local additions and undo/redo state |
| `focus_explanation` | Show and focus one authored target |
| `add_personal_explanation` | Add a safe local analogy/example/summary/warning/comparison |
| `remove_personal_explanation` | Remove one browser-local addition |
| `undo_personalization` | Undo the latest local change |
| `redo_personalization` | Redo a reverted local change |

There are no duplicate compatibility tools, diagnostic tools, or WebMCP tools for repository search/answer generation. The browser contract models user intentions rather than internal implementation details.

When the host also exposes `document.modelContext.getTools()`, the page verifies the seven expected tools against the host and reports **WebMCP verified**. Otherwise successful `registerTool()` registration reports **WebMCP ready**.

## Try the human–agent flow

Open the live page in the ChatGPT desktop in-app browser with Site Tools enabled, or a WebMCP-enabled Chrome build, then try:

1. **“Explain this idea in one paragraph, then add a short analogy next to the mechanism.”**
2. **“Focus the part about grounding.”**
3. **“Undo my last personalization.”**

The first prompt exercises structured page understanding plus a visible local mutation; the next two show shared navigation and reversible collaboration.

See [[WEBMCP_CHALLENGE]] for the exact judge flow, expected tool calls, challenge-period commit provenance, and submission checklist.

## Responsibility split

### Personal agent

The personal agent owns conversation, reasoning, and grounding. It:

- understands the user's question and desired depth;
- uses WebMCP current-page context when available;
- reads repository sources only when deeper evidence is necessary;
- applies source precedence and statuses;
- forms the grounded answer and provenance;
- decides whether a specialized Presentation Capability would improve understanding;
- handles the confirmed GitHub Issue feedback flow when evidence is insufficient.

### Explain Him page / WebMCP

The page:

- presents Originator-authored visual meaning;
- exposes structured meaning from that current page;
- exposes stable targets and browser-local state;
- lets the agent and human share focus and local personalization;
- persists browser-local changes and supports undo/redo.

WebMCP **does not** search the repository, resolve claims, generate canonical answers, inject arbitrary HTML/JavaScript, or create GitHub Issues.

### Presentation Capability

A Presentation Capability is a pluggable way to represent already-grounded meaning as a diagram, architecture map, workflow, timeline, graph, simulation, data visualization, or another specialized view.

The personal agent owns meaning; the presenter owns representation. Presenter output is not new evidence.

The public reference registry includes:

| Capability | Trust | Execution | Purpose |
|---|---|---|---|
| `explain-him-safe-text` | `builtin` | `embedded` | deterministic safe fallback |
| `archify` | `originator-approved` | `personal-agent` | architecture, workflow, sequence, dataflow, lifecycle |

External presenter HTML is never injected into the Explain Him DOM.

## Browser-local workspace

```text
Originator-authored HTML
        +
browser-local typed operations
        =
personalized visible explanation
```

Workspace v2 provides:

- typed local Presentation Artifacts with provenance;
- IndexedDB with a memory fallback;
- undo/redo;
- JSON export;
- confirmed reset;
- safe DOM rendering through `textContent`;
- the same underlying workspace API for Site Tools and accessible browser controls.

Cross-device sync, collaboration, private hosted storage, and operational guarantees belong to **Explain Him Pro**.

## Source and grounding model

When sources conflict, use this precedence:

1. accepted `resolutions/`;
2. Originator-authored `index.html` and explicit `explain-him.yaml` claims;
3. `knowledge/`;
4. `README.md` and navigation material;
5. agent inference.

Important statuses are `current`, `target`, `hypothesis`, `open`, `demo-only`, and `deprecated`. Browser-local additions are never canonical evidence.

## Browser compatibility

| Host | Behavior |
|---|---|
| ChatGPT desktop in-app browser | Primary Site Tools / challenge path through `document.modelContext` |
| Chrome with WebMCP enabled | Same imperative tool surface; `getTools()` verification is used when available |
| ChatGPT/Codex Chrome sidebar without Site Tool access | Page reading + accessible controls remain the graceful fallback |
| Browser without WebMCP | Human controls continue to work over the same local workspace |

`navigator.modelContext` is retained only as a legacy fallback for older experimental hosts. Explain Him does not depend on the non-standard `registerSkill()` proposal or on declarative WebMCP support.

## Challenge-period work

The Explain Him concept predates the WebMCP Challenge, but the public WebMCP implementation was created and substantially extended after the challenge start. The public repository itself was created on August 27, 2026.

Key evidence and the distinction between earlier product ideation and challenge-period implementation are documented in [[WEBMCP_CHALLENGE]].

## Quick start

```bash
python -m http.server 8000
```

Open `http://localhost:8000/`.

Conversation happens in the user's existing agent interface; the Explain Him page intentionally contains no second chat panel.

## Tests and evals

```bash
python tools/check_public_demo.py
node --test tests/*.test.mjs
```

Checks cover public boundaries, WebMCP host discovery, tool registration/verification, schema quality, semantic page context, visible mutations, workspace behavior, Presentation Artifact safety, and prompt-to-tool eval fixtures.

## Repository structure

```text
index.html                     Originator-authored explanation page
WEBMCP_CHALLENGE.md            challenge judge guide and provenance
AGENTS.md                      repository-scoped agent instructions
explain-him.yaml               machine-readable manifest
skills/explain-him/            portable repository skill
knowledge/                     public explanatory sources
resolutions/                   accepted/superseded decisions
schemas/                       Presentation Capability / Artifact schemas
runtime/webmcp.mjs             Site Tool contract and registration
runtime/workspace.mjs          browser-local state and safe rendering
runtime/presentation/          presentation registry and validation
assets/                        page UI and orchestration
tests/                         contracts and WebMCP eval fixtures
00 Home.md + .obsidian/        Obsidian Vault entrypoint
```

## Project language

Repository-authored content is English: documentation, UI copy, manifests, templates, resolutions, examples, code-facing text, and tests. A personal agent may answer an end user in the user's preferred language.

## License

Apache License 2.0. See `LICENSE`.
