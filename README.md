# Explain Him

> **Required read:** the [Explain Him Product Contract](PRODUCT-CONTRACT.md) is the canonical product intent for agents and contributors. The [public implementation roadmap](ROADMAP.md) summarizes the next release without claiming that Site Tools are already available for every account or model.

**Express your idea once. Explain Him lets each person's AI explain it to them – and use the same live page as a shared explanation surface.**

Explain Him publishes an Originator-authored visual explanation, repository-scoped grounding and presentation skills, and a typed WebMCP contract. A user's personal agent can discover the repository, answer at the right depth, focus relevant parts, and add reversible browser-local callouts, comparisons, workflows, timelines, or diagrams without rewriting the original.

- **Live demo:** <https://andrew-veresov.github.io/explain-him/>
- **WebMCP Challenge judge guide:** [[WEBMCP_CHALLENGE]]
- **Public source:** <https://github.com/andrew-veresov/explain-him>
- **License:** Apache-2.0

## Why WebMCP

Without WebMCP, a browser agent can read pixels/DOM and click controls, but it has to infer application structure and state. Explain Him gives the agent an explicit contract for two things that matter to the product:

1. **integration discovery** – the public repository, both repository-scoped skills, typed-block schema, authored targets, and local block IDs;
2. **typed result delivery** – safe add, replace, update, remove, and focus operations over the same page the human is viewing.

```text
Human asks a question
        |
        v
Personal AI agent
        |
        +---- get_explain_him_context ---> visible state + repository guidance
        |
        +---- read the minimum page/repository evidence + answer in chat
        |
        +---- explain_tool --------------> focus existing or mutate + auto-focus
                                                |
                                                v
                                  human sees the same explanation
```

The authored layer remains immutable. Personalization is local, visible, reversible, and never becomes canonical evidence.

## WebMCP Site Tools

Explain Him uses top-level imperative WebMCP through `document.modelContext.registerTool()`.

The public surface is deliberately small and user-oriented:

| Tool | Purpose |
|---|---|
| `get_explain_him_context` | Read the current Original/Personalized state, target capabilities, local blocks, pinned repository, grounding sources, and Protocol v4 activation |
| `explain_tool` | Focus an existing explanation or atomically add, replace, update, or restore a browser-local typed explanation |

There are no duplicate compatibility tools, diagnostic tools, or WebMCP tools for repository search/answer generation. The browser contract models user intentions rather than internal implementation details.

After awaited registration, the page calls `document.modelContext.getTools()` once and reports success only when both expected descriptors are present. This proves page registration, not that an external agent can access or select the tools. Production shows one registration status; detailed state is available only with `?webmcp-debug=1`.

## Try the human–agent flow

Open the live page in the ChatGPT Desktop built-in browser when it exposes `document.modelContext`, then try:

1. **“What should I do as the author of an idea to get my own explanation? Show the sequence on the page.”**
2. **“Compare the authored and personal layers and add that comparison to the page.”**
3. **“Show me where grounding is explained.”**

The first prompt exercises context discovery, repository grounding, chat output, typed workflow insertion, and automatic focus. The next two exercise another typed representation and focus-only navigation.

See [[WEBMCP_CHALLENGE]] for the exact judge flow, expected tool calls, challenge-period commit provenance, and submission checklist.

## Responsibility split

### Personal agent

The personal agent owns conversation, reasoning, and grounding. It:

- understands the user's question and desired depth;
- uses WebMCP contract discovery when available;
- reads repository sources only when deeper evidence is necessary;
- applies source precedence and statuses;
- forms the grounded answer and provenance;
- decides whether a specialized Presentation Capability would improve understanding;
- handles the confirmed GitHub Issue feedback flow when evidence is insufficient.

### Explain Him page / WebMCP

The page:

- presents Originator-authored visual meaning;
- exposes the public repository, both skills, stable targets, typed schema, and local block IDs;
- accepts only already-grounded typed page operations;
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

Workspace v4 provides transactional, topic-aware persisted local state:

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

| Surface | Verified meaning |
|---|---|
| ChatGPT Desktop built-in browser | Official OpenAI Site Tools path; full flow still requires that the selected account/model exposes the page tools |
| Chrome 149+ with this Origin Trial | Enables the page WebMCP API for this origin; does not by itself connect an agent |
| Official ChatGPT Chrome extension | Capability-gated agent host; when no WebMCP connection is exposed, classify the flow `BLOCKED_EXTERNAL` and use chat-only fallback |
| Model Context Tool Inspector extension | Page-tool debugging only; never an Explain Him production or user workflow |
| Browser without WebMCP | Human controls continue to work over the same local workspace |

Only `document.modelContext` is supported. There is no navigator fallback, compatibility alias, old tool identity, or Protocol v3 handshake. Explain Him separately feature-detects the experimental `document.modelContext.registerSkill` shape proposed in WebMCP issue 161. After both tools register successfully, the page may register one deterministic inline `explain_him` skill. When the method is absent or rejects, the pinned A8 remote fallback remains available. The page does not polyfill the experimental API or treat it as normative WebMCP.

The page cannot force a host or model to choose a tool. Descriptors and skills require `get_explain_him_context` for explanation requests, followed by `explain_tool` unless the user explicitly forbids page changes or scrolling. Fully present content is focused without a revision change; missing, partial, or inconsistent content is mutated and automatically focused. A mutation is reported only after revision, DOM visibility, and focus are confirmed.

On September 1, 2026, the installed official ChatGPT Chrome extension version `1.26.827.12125` answered the exact `User`/`Consumer` prompt, while the page observed no contract invocation and remained at revision 0. The page API independently verified 2/2 tools. This is `BLOCKED_EXTERNAL` at the agent-host connection boundary, not a successful end-to-end run and not a page-registration failure.

Chrome's built-in AI Early Preview Program gives access to feedback channels and opportunities to test unreleased APIs through local prototypes. It does not guarantee a WebMCP feature gate or packaged bridge in the ChatGPT extension.

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
python -m unittest tools/test_generate_native_skill.py tools/test_webmcp_host_preflight.py
```

Checks cover public boundaries, deterministic native-skill generation and drift detection, machine-readable bootstrap, WebMCP host discovery, two-tool registration/verification, progressive native-skill registration or pinned fallback, typed schemas, workflow insertion, guided focus, workspace behavior, Presentation Artifact safety, host-preflight classification, and prompt-to-tool eval fixtures. Simulated `registerSkill`, native Chrome page-runtime evidence, and deterministic fixture AI are reported separately from real agent-host/model evidence.

## Repository structure

```text
index.html                     Originator-authored explanation page
WEBMCP_CHALLENGE.md            challenge judge guide and provenance
AGENTS.md                      repository-scoped agent instructions
explain-him.yaml               machine-readable manifest
skills/explain-him/            portable repository skill
skills/explain-him-presentation/ typed presentation and walkthrough skill
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
