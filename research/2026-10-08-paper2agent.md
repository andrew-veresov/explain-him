---
title: Paper2Agent as an Explain Him reference
status: hypothesis
date: 2026-10-08
related_issue: 8
---

# Paper2Agent as an Explain Him reference

## Decision brief

**Recommendation (not an accepted product decision):** reuse Paper2Agent's source packaging and verification discipline. Keep any executable Paper MCP on the personal-agent side as an optional, separately authorized capability. Keep Explain Him WebMCP unchanged: one presentation-only `explain_tool`, Protocol v5. Start with a source-package comparison, not a scientific runtime integration.

This is the analytical memo, proposed architecture, and minimal experiment plan requested in [issue #8](https://github.com/andrew-veresov/explain-him/issues/8). It implements no runtime, registers no MCP server, and changes no accepted product rule. The issue remains open because the Originator must read this proposal and choose whether to authorize the proposed experiment or retain Paper2Agent as reference only. This belongs to Explain Him; no Autonomous Sber integration is assumed.

**Owner review:** read the decision brief, sections 5–7, and the acceptance checklist. Choose **A: reference only** or **B: authorize the bounded source-package experiment**. B still requires selection of one rights-cleared source and approval of the execution environment/resource budget. The optional executable extension is a separate decision, not bundled into B.

## Evidence and version boundary

Reviewed on 2026-10-08:

- Explain Him main: `469463dd71dd9c18c1fe6ac5a5b226427f322ad1`; [Product Contract][eh-contract], [Protocol v5 decision][eh-v5], [Originator flow][eh-originator], and repository-scoped grounding/presentation skills.
- Paper2Agent: `8c2d059165ef8cdcb70dbea76655b9c2b55b38e6`, commit dated 2026-09-17. Links below pin the reviewed implementation instructions rather than mutable `main`.
- The [final Nature article][paper], published 2026-09-16, supersedes the earlier [arXiv v1][preprint] for reported study results. The current repository workflow and the paper's study setup are related but not identical.
- Issue #8 had no comments or previous deliverable; repository issue search found no other Paper2Agent discussion. No earlier unpublished research is assumed.

The final paper distinguishes executable tools, resources, and workflow prompts, and connects them to a conversational agent. Its evaluation includes 100 computational-biology papers: 74 were agentified, with 593 of 599 proposed tools passing automated validation. It also reports a resource-only route for data/discovery papers. These are author-reported results, not experiments reproduced for this memo. Neither successful conversion nor benchmark accuracy establishes faithful explanation for every reader. [Nature, Overview and Large-scale evaluation][paper]

## 1. What actually gets converted

The current [router][router] separates two workflows:

1. **Paper2Skill:** PDFs and associated material become a reviewed, compact reading package. Outputs include `SKILL.md`, a navigation index, section-preserving paper/supplement text, figure assets, and table assets. Source snapshots and review/verification records remain outside the delivery. Its conversion interface does not execute methods or code found in a paper. [Paper2Skill][p2skill]
2. **Paper2MCP:** existing Python, R, or CLI implementations become minimal MCP wrappers. Selection begins from useful user tasks, then binds each tool to a concrete function, script, CLI command, or existing tutorial code in a pinned repository. It explicitly forbids inventing scientific computation when the upstream implementation is missing. [Paper2MCP][p2mcp]; [selection contract][selection]
3. **Combined package:** the reviewed paper skill and separately verified MCP component can be delivered together. A blocked component makes the combined result partial; the presence of paper text is not evidence of a working executable method. [Router][router]

Paper2MCP's sequence is environment/selection → direct upstream execution → wrapper implementation → fresh independent verification → MCP integration → clean-runtime installation → relocated ZIP acceptance. The default deliverable includes the server, required source or fixed-version installation, pinned dependencies, and `USAGE.md`; it excludes development evidence and example material unless runtime-required. Deployment and client registration are not automatic completion steps. [Workflow][p2mcp]; [delivery contract][delivery]

## 2. Automatic generation versus human responsibility

| Item | What the upstream workflow provides | What it does not establish |
| --- | --- | --- |
| Reading package | Source snapshots, extraction, review plans, searchable prose/captions/assets, strict mechanical verification | Author endorsement, copyright clearance, or guaranteed equation/figure interpretation |
| Tool inventory | Task-based selection, source binding, explicit excluded/deferred/merged work | Permission to expose every upstream function or execute on private inputs |
| Executable wrappers | Minimal calls into existing scientific code; necessary I/O adaptation | Independent scientific validity of the upstream method |
| Verification | Reference comparisons, changed inputs, relevant errors, separate verifier, real MCP calls, relocation checks | Universal correctness or whole-paper reproduction |
| Usage and prompts | Tested setup instructions; optional structured workflow guidance | Proof that an analysis ran, or that a host/model followed the guidance |

Paper2Skill requires inspection of every page/image, review notes, and an independent assembled-package verifier when available. This is a required review workflow, **not a guarantee of human or paper-author review**. Its strict verifier can succeed with documented limitations; that status must remain visible. Paper2MCP similarly uses independent agents and executable evidence, not mandatory author sign-off. [Paper2Skill][p2skill]; [Paper2MCP][p2mcp]

**Proposed Explain Him gate:** an Originator accepts the meaning package before it becomes canonical. They approve interpretation boundaries, source precedence, material claim statuses, licenses, and any chosen executable scope. Automated checks cannot accept an author position on their behalf. This is our proposed governance mapping, not a Paper2Agent feature claim.

## 3. What the MCP publishes

There is no universal fixed set of tools across all papers. The inventory follows the selected existing code and its verification evidence. [Selection contract][selection]

| Requested category | Evidence-backed interpretation | Explain Him treatment |
| --- | --- | --- |
| Retrieval / explanation | Paper2Skill is a reading package. Optional MCP resources expose bounded reference material; the consuming agent forms conversational answers. Do not assume a standard `explain_paper` tool. | Personal agent reads approved sources through its own integration. |
| Methods / calculations | Core Paper2MCP output: wrappers over source-backed operations, exposing supported inputs/parameters and useful results. | Optional external agent-side capability; never added to page WebMCP. |
| Examples / datasets | Reference inputs support verification. Runtime-required data is packaged or explicitly acquired; optional resources can carry metadata and links. Default ZIP excludes examples/test fixtures unless required at runtime. | Keep metadata and rights/availability explicit; no bulk corpus ingestion. |
| Verification / reproduction | Generated tests and acceptance calls compare to direct upstream execution. They are development evidence, not necessarily callable public tools. | Preserve result provenance and validation scope; do not promise a generic reproduction endpoint. |
| Domain actions | Task-dependent scientific operations or visualization may be exposed when already implemented and independently useful. | Evaluate permissions, resource costs, side effects, and output safety separately. |
| Workflow prompts | Optional instructions describing input requirements, tool order, dependent artifacts, and limitations. A prompt does not execute itself. | Useful reference for progressive guidance, without transferring canonical authority. |

Resources and prompts are **optional extensions in the current conversion workflow**, despite their central role in the paper's conceptual server architecture. The bundled MCP verifier checks tools; resources/prompts require additional client checks. [Extensions][extensions]

## 4. Provenance, correctness, and versioning

Reusable controls from the reviewed implementation:

- Bind each tool to pinned upstream source and a concrete symbol/command; record adaptations and changed defaults. A URL or import alone does not prove faithful reuse. [Selection][selection]
- Establish expected results independently by running upstream code on the same inputs, plus meaningful changed inputs and failure cases. Separate implementers from fresh verifiers. [Selection][selection]
- Validate expected inventory independently of server discovery. Require a successful asserted call per tool; schema listing, expected errors, and timeouts do not count as successful execution. [Runtime acceptance][acceptance]
- Keep numerical/figure correctness separate from artifact existence. The verifier's `min_artifacts` checks existence; its output-schema recording is not an independent semantic oracle. [Runtime acceptance][acceptance]
- Preserve source SHA-256 snapshots for reading-package review reuse; changed bytes cannot inherit old review silently. Record `reviewed_with_limitations` honestly. [Paper2Skill][p2skill]
- Pin dependencies/source versions and retain ZIP/file hashes and clean relocated execution evidence. Any package change invalidates the corresponding delivery result. [Delivery][delivery]

**Remaining gap for Explain Him:** these controls do not by themselves define author-owned semantic precedence, a claim-level status model, approval of an interpretation, or migration of a reader's local explanation when the author changes a claim. Keep Explain Him's accepted resolutions and provenance contract authoritative. Package version, upstream code version, scientific result, and author position must remain distinguishable.

## 5. Personalization and author meaning

No dedicated reader-profile model or reversible shared-page personalization mechanism was found in the reviewed Paper2Agent router, workflows, and extension contract. The consuming agent can explain methods and adapt its response to a query; this is different from a verified product-level mechanism preserving an immutable Original and typed Personalized layers. This is a bounded inspection finding, not a claim about every external demo or future version. [Router][router]; [extensions][extensions]; [Explain Him contract][eh-contract]

The separation proposed for Explain Him is:

1. **Originator-owned meaning:** authored page, accepted resolutions, evidence, claims/statuses, caveats and source precedence. Generated extraction remains a candidate until accepted.
2. **Machine-readable source/contract:** pinned reading package and navigation metadata. It helps discovery; it does not override the canonical source.
3. **Executable evidence:** optional external, pinned MCP wrappers. An execution result is a result under stated inputs and versions, not a silent amendment to author meaning.
4. **Personalized representation:** the user's agent chooses language, depth, analogy, and supported typed view while preserving the claim and its qualifications. It answers in chat and uses the existing page channel only when the supported host is available and the interaction calls for it.

**Hardcoded versus structured explanations:** static authored text remains useful as canonical meaning and a stable initial page. Structured sources improve selective retrieval; they need not become pre-written variants for every reader. Progressive disclosure means reading the minimum relevant section and adding depth when requested, rather than sending an entire corpus or forcing a fixed walkthrough. Both source packaging and presentation must retain evidence links. These are recommendations derived from the existing [Originator flow][eh-originator] and [Product Contract][eh-contract].

## 6. Proposed integration architecture

**Status: hypothesis; no implementation in this PR.**

Originator source → reviewed candidate reading package → Originator acceptance → pinned published repository.

User question → personal agent → minimum approved source; optionally a separately authorized Paper MCP call → grounded chat answer → safe typed local artifact → existing `explain_tool`.

Boundaries:

- The page retains exactly one WebMCP tool. No retrieval, calculation, answer-generation, server-registration, or diagnostics endpoint is added. [Protocol v5][eh-v5]
- The personal agent's own capability handles repository retrieval and any approved scientific execution. Neither page JavaScript nor a renderer obtains unrestricted repository/data access.
- Represent external outputs as supported typed text/blocks with known provenance. Never inject generated HTML, scripts, or executable payloads.
- Preserve author claims, computed observations, and agent inference separately. A new inference can disagree with an author conclusion but cannot replace canonical meaning silently.
- Record proposed package ID/version, source URLs/revisions/hashes, claim anchors/statuses, approval state, licenses, tool bindings, environment and validation limits. This is an evidence checklist, not a new accepted schema.
- Existing contract changes would require an accepted ADR synchronized with `PRODUCT-CONTRACT.md`. This research creates neither.

**Reuse now as design guidance:** compact source navigation, source binding, explicit limitations, independent verification, and reproducible delivery evidence.

**Keep external:** scientific runtime generation, dataset/model installation, remote hosting, credentials, agent-to-agent collaboration, and specialized domain workflows. They are outside the base static-site product and need separate authorization and evaluation.

## 7. Minimal experiment plan

### 7.1 Recommended first experiment: source package only

**Not executed.** After owner approval, use one small Originator-owned or clearly licensed document, with a verified right to create and distribute derived text/figure assets. Prefer synthetic content with two explicit claims, one limitation, one table and one diagram, avoiding sensitive inputs and paid services.

1. Freeze its version and author-reviewed answer key. Choose five questions: overview, one numeric/table fact, a caveat, an out-of-scope request, and a misleading paraphrase of an author claim.
2. Compare the same agent/model and questions with (a) original source navigation and (b) a reviewed Paper2Skill-style package. Keep the answer key hidden from the responding agent. Record source accesses, omissions, unsupported claims, latency and available token/cost measurements.
3. Test two declared audiences: newcomer and technical reader. Change language/depth, not meaning. Run each of five questions for both audiences in each arm: 20 total answers. This is a small feasibility comparison, not a general benchmark.
4. Require every material claim to resolve to a real source anchor; zero fabricated facts/sources; all caveats and uncertainty preserved; out-of-scope question explicitly bounded. Have the Originator score semantic fidelity before accepting any package.
5. Prepare supported typed blocks from accepted answers without changing product runtime. If a live UI trial is separately available, verify Original preservation, same-topic update, restore, provenance, and actual successful tool result. Otherwise report the UI stage as not run, never as passed.

**Stop/fail:** unresolved rights, missing provenance, altered author meaning, unsupported extraction, or any false execution/UI claim. Repair and rerun affected cases before acceptance. Stop after the comparison and owner review; do not expand into a multi-paper corpus or runtime deployment.

**Deliverable:** compact results sheet, source/variant hashes, answer transcripts with citations, rubric findings, and a go/no-go recommendation. Choose B only if this experiment is worth the owner's review effort.

### 7.2 Optional later executable extension

Requires separate authorization for one existing, deterministic upstream function with a rights-cleared synthetic fixture; no remote service, private data, API key, or GPU. Follow the upstream selection and wrapper contract. Establish a direct-code oracle, then test nominal, changed-input, invalid-input, and repeated-call behavior. Validate exact tool inventory/schema, scientific outputs, clean runtime, and relocated package. Record side effects and output roots. Do not register a client or deploy the server as a side effect of producing it. Failure to reproduce upstream results means **no executable capability accepted**. [Selection][selection]; [acceptance][acceptance]; [delivery][delivery]

## Acceptance and remaining action

- [x] Conversion paths and generated artifacts analyzed.
- [x] Human/author responsibility separated from automated and agent review.
- [x] Tool/resource/prompt categories mapped without inventing a fixed inventory.
- [x] Provenance, correctness, versioning and their limits assessed.
- [x] Author meaning, contract, execution and personalization separated.
- [x] Existing Explain Him boundary preserved in proposed architecture.
- [x] Minimal source-package experiment and optional execution gate specified.
- [ ] Originator reads the proposal and chooses reference-only or the bounded experiment.
- [ ] If experiment chosen: source, rights, environment and resource budget approved before execution.

Research is prepared for review; product adoption and experimentation remain open. Passing repository checks validates the documentation change against repository checks, not Paper2Agent's scientific runtime or production Site Tools behavior.

## Primary sources

[paper]: https://www.nature.com/articles/s41586-026-11044-y
[preprint]: https://arxiv.org/html/2509.06917v1
[router]: https://github.com/jmiao24/Paper2Agent/blob/8c2d059165ef8cdcb70dbea76655b9c2b55b38e6/skills/paper2agent/SKILL.md
[p2skill]: https://github.com/jmiao24/Paper2Agent/blob/8c2d059165ef8cdcb70dbea76655b9c2b55b38e6/skills/paper2agent/paper2skill/SKILL.md
[p2mcp]: https://github.com/jmiao24/Paper2Agent/blob/8c2d059165ef8cdcb70dbea76655b9c2b55b38e6/skills/paper2agent/paper2mcp/SKILL.md
[selection]: https://github.com/jmiao24/Paper2Agent/blob/8c2d059165ef8cdcb70dbea76655b9c2b55b38e6/skills/paper2agent/paper2mcp/references/tool-selection-and-wrapping.md
[acceptance]: https://github.com/jmiao24/Paper2Agent/blob/8c2d059165ef8cdcb70dbea76655b9c2b55b38e6/skills/paper2agent/paper2mcp/references/runtime-verification.md
[extensions]: https://github.com/jmiao24/Paper2Agent/blob/8c2d059165ef8cdcb70dbea76655b9c2b55b38e6/skills/paper2agent/paper2mcp/references/extensions.md
[delivery]: https://github.com/jmiao24/Paper2Agent/blob/8c2d059165ef8cdcb70dbea76655b9c2b55b38e6/skills/paper2agent/paper2mcp/references/output-delivery.md
[eh-contract]: https://github.com/andrew-veresov/explain-him/blob/469463dd71dd9c18c1fe6ac5a5b226427f322ad1/PRODUCT-CONTRACT.md
[eh-v5]: https://github.com/andrew-veresov/explain-him/blob/469463dd71dd9c18c1fe6ac5a5b226427f322ad1/resolutions/2026-09-02-webmcp-protocol-v5-single-explain-tool.md
[eh-originator]: https://github.com/andrew-veresov/explain-him/blob/469463dd71dd9c18c1fe6ac5a5b226427f322ad1/knowledge/01-originator-flow.md
