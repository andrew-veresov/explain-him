# Explain Him Product Contract

Status: canonical product intent
Last updated: 2026-09-01

Every agent that explains, plans, implements, reviews, or tests Explain Him must read this document first. It is the durable product contract for the public reference implementation. A change that alters this contract requires an accepted decision record and a synchronized update here.

## Product definition

Explain Him is a way for an Originator to publish one canonical explanation so that each reader can ask questions through their existing personal AI agent and, when useful, see a reversible personalized visual result on the same page.

Explain Him is:

- a GitHub-backed authored explanation page and supporting repository;
- repository-scoped grounding and presentation skills;
- a minimal WebMCP Site Tools contract for discovery and safe browser-local presentation;
- an immutable authored layer plus a reversible Personalized layer;
- a question-driven experience, not a fixed tutorial.

Explain Him is not:

- a separate or mandatory Explain Him agent;
- a second chat interface;
- a hosted knowledge-search service;
- a general-purpose page editor or generator;
- a way to rewrite Originator-authored source silently;
- a claim that every browser or model supports Site Tools.

## Primary users

### Originator

The Originator owns canonical meaning, evidence, source precedence, statuses, accepted resolutions, and the authored page.

### Reader with a personal agent

The reader asks questions in an agent they already use. The personal agent owns conversation, retrieval, reasoning, grounding, and the chat answer. Explain Him supplies the shared visual surface and safe local adaptation channel.

## Authoring and publishing reality

Today an Originator:

1. creates or chooses a GitHub repository for the idea;
2. prepares a static authored HTML explanation, represented by `index.html` in this reference repository;
3. adds machine-readable bootstrap metadata, repository-scoped skills, evidence, statuses, and resolutions;
4. publishes the repository URL or a GitHub Pages URL.

The public repository contains this workflow in `knowledge/01-originator-flow.md`. Explain Him does not currently define a dedicated authoring editor, generator, builder platform, or CLI. GitHub Pages is a publication surface, not an authoring tool. Agents must state this limitation rather than inventing a platform.

## Production host

The production acceptance target is **ChatGPT Desktop built-in browser with Site Tools**.

This target is conditional on the selected account, workspace, and model actually exposing Site Tools for the current page. Rollout availability is an external capability gate and must be reported separately from page readiness.

The official ChatGPT Chrome sidebar is not a production compatibility target. It may read or control ordinary browser content, but current official OpenAI documentation does not expose Site Tools in Chrome. Chrome Origin Trial success proves the page WebMCP API, not an agent connection.

The WebMCP Model Context Tool Inspector is a developer debugging aid only. It is never part of the production or reader workflow.

## Required lifecycle

On a supported production host:

1. The reader opens the published page in the ChatGPT Desktop built-in browser.
2. The page registers exactly `get_explain_him_answer` and `apply_explanation` through Protocol v3.
3. The host discovers the tools. Page JavaScript cannot force discovery or invoke the agent on activation.
4. Before answering any question about Explain Him or the current Explain Him page, the agent calls `get_explain_him_answer`. The descriptor is a strong semantic selection instruction, not a page-side guarantee that the host will invoke it.
5. The agent follows the returned ordered answer workflow and verifies the activation, workspace revision, selected skill-delivery mode, immutable source commit, SHA-256 proofs, and declared load order.
6. When the experimental native skill API registered successfully, the agent uses the verified inline composite delivered by the host. Otherwise it loads the grounding skill and then the presentation skill through the pinned remote fallback.
7. The agent reads the relevant visible page content and decides whether it fully and correctly answers the question.
8. The agent always answers in chat.
9. If the visible Personalized UI is missing, partial, or inconsistent, the agent retrieves the minimum required repository evidence, grounds the answer, and calls `apply_explanation` in the same turn.
10. The agent accepts a UI change only after the tool returns success and the expected workspace revision is confirmed.
11. The reader can inspect Original or Personalized view and can remove local results or restore the authored view.

If contract discovery, skill verification, repository retrieval, or apply fails, the agent must state the failure and must not claim that the UI changed.

## Answer and adaptation decision

The agent uses the current Personalized UI, not only the authored HTML, for this decision:

| Visible answer state | Required behavior |
|---|---|
| Fully present and correct, ordinary question | Answer in chat; do not duplicate page content |
| Fully present and correct, explicit show or walkthrough | Answer in chat and use focus only |
| Missing | Retrieve required repository evidence and add a grounded local result in the same turn |
| Partial | Retrieve required repository evidence and update the same-topic local result when possible, otherwise add a supplementary result |
| Inconsistent | Retrieve required repository evidence and replace the affected authored target locally or update the affected local result |
| Explicit no-page-change request | Answer in chat only |
| Explicit restore request | Remove the relevant local result or use Original view |

Terminology consistency is evaluated before the fully-present branch. Equivalent labels that remain visibly mixed are an inconsistency, not a completed explanation.

## Authored and Personalized invariants

- Originator-authored HTML and repository evidence remain canonical and immutable during browser personalization.
- Personalized blocks are typed local presentation artifacts, not canonical knowledge.
- Local operations are persisted in the current browser profile through the browser-local workspace and can be updated, removed, undone, redone, exported, or reset.
- Original view reveals the authored page without deleting the local operation history.
- The base product does not provide server synchronization, collaboration, or cross-device persistence for the Personalized layer.
- The safe renderer uses structured data and text operations. Arbitrary HTML, JavaScript, CSS, iframe content, selectors, or executable URLs are forbidden.
- Every repository-grounded local artifact carries source provenance and material claim status.
- An agent must not invent a fact, source, commit, tool result, authoring platform, or successful mutation.

## Stable WebMCP boundary

Unless a later accepted ADR changes this contract:

- the public WebMCP surface contains exactly two tools;
- the protocol is Protocol v3;
- `get_explain_him_answer` is the mandatory read-only answer bootstrap. It returns the ordered answer workflow, activation, skills, source navigation, tool usage, targets, local block IDs, and revision state;
- `apply_explanation` performs bounded typed `add`, `replace`, `update`, `remove`, and `focus` operations;
- repository search, answer generation, GitHub Issues, diagnostics, and arbitrary DOM mutation are not WebMCP tools.

The page may progressively register one composite inline `explain_him` skill through `document.modelContext.registerSkill` when that experimental method exists. This does not add a WebMCP tool. The composite references the same two tools and is generated deterministically from the immutable grounding and presentation skill sources. Its registration state, digest, and provenance are diagnostic facts, not proof that a model read or followed the skill. When the method is absent or registration fails, the pinned remote A7 path remains complete.

## Grounding and source navigation

For answer grounding, source precedence remains:

1. accepted files in `resolutions/`;
2. Originator-authored `index.html` and explicit claims in `explain-him.yaml`;
3. relevant files in `knowledge/`;
4. `README.md` and other navigation material;
5. clearly marked agent inference.

The Product Contract is the required governance source for product purpose, lifecycle, host target, invariants, and non-goals. Any accepted resolution or ADR that changes those facts must update this file in the same publication.

A machine-readable grounding source index is a navigation aid, not a new source of truth. When the visible page is insufficient, the production contract requires the agent to resolve the topic through that index and read the minimum pinned source. The A6 public runtime exposes this immutable index through page bootstrap and `get_explain_him_answer`; [the public roadmap](ROADMAP.md) records the remaining live-host acceptance gate.

## Key acceptance prompts

### User and Consumer

Prompt: `I see User and Consumer in the diagram. Are they the same?`

The agent must answer that they are the same participant and, because the visible terminology is inconsistent, use a same-turn Personalized replacement with one term. A direct follow-up that selects the other term updates the same local block ID. Restore removes that local replacement and reveals the authored version.

### Where the Originator publishes

Prompt: <code>&#x0433;&#x0434;&#x0435; &#x043F;&#x0443;&#x0431;&#x043B;&#x0438;&#x043A;&#x0443;&#x0435;&#x0442; &#x0430;&#x0432;&#x0442;&#x043E;&#x0440; &#x0441;&#x0432;&#x043E;&#x044E; &#x0438;&#x0434;&#x0435;&#x044E;?</code>

The agent must retrieve the repository source when the visible page is insufficient and answer that the Originator publishes through the idea's GitHub repository or its GitHub Pages URL. It must say that this repository does not currently define a dedicated authoring editor or generator. Because the visible answer is partial, the supported-host scenario also requires a grounded same-turn local page addition or update with provenance.

## Non-goals

- Guaranteed Site Tools behavior in the ChatGPT Chrome sidebar.
- Inspector as a production dependency.
- A second chat or mandatory central Explain Him agent.
- A dedicated authoring platform that does not yet exist.
- Server synchronization of browser-local personalization in the base product.
- Silent UI mutation or success claims without a successful tool result.
- Embedding every chat answer or forcing a fixed walkthrough.
- Treating the open WebMCP skills proposal as a stable browser standard or claiming native skill delivery when only the two tools registered.

## Acceptance evidence

Page registration, Origin Trial validation, fixture AI, and native browser tool execution are separate evidence classes. Production acceptance additionally requires a real ChatGPT Desktop Site Tools turn, visible contract/apply lifecycle evidence, confirmed workspace revisions, and probabilistic testing across at least 10 independent runs with at least 90% required tool choice and zero false-success claims.

## References

- [Public implementation roadmap](ROADMAP.md)
- [Originator workflow](knowledge/01-originator-flow.md)
- [Repository agent instructions](AGENTS.md)
- [OpenAI Site Tools documentation](https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
- [Chrome WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices)
- [WebMCP Community Group source](https://github.com/webmachinelearning/webmcp)
