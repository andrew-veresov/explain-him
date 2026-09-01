import { createAddPresentationOperation, createRemovePresentationOperation, createUpdatePresentationOperation } from './workspace.mjs';

export const EXPLAIN_HIM_WEBMCP_TOOLS = Object.freeze(['get_explain_him_answer', 'apply_explanation']);
export const EXPLAIN_HIM_UI_TOOLS = EXPLAIN_HIM_WEBMCP_TOOLS;
export const EXPLANATION_BLOCK_TYPES = Object.freeze(['callout', 'comparison', 'workflow', 'timeline', 'diagram']);
export const WEBMCP_PROTOCOL_VERSION = 3;
export const EXPLAIN_HIM_REPOSITORY = 'andrew-veresov/explain-him';
export const EXPLAIN_HIM_REPOSITORY_URL = `https://github.com/${EXPLAIN_HIM_REPOSITORY}`;
export const EXPLAIN_HIM_SKILL_COMMIT = 'e7da9515f5ea444b5919a99477bcbc8e56e03edd';
export const IMMUTABLE_SKILL_PROOF = Object.freeze([
  { id: 'explain-him', commit: EXPLAIN_HIM_SKILL_COMMIT, sha256: 'badedfe003582f7fc54eaf862fdbf55e4aec4311dba1c27249229d1a629a4434', path: 'skills/explain-him/SKILL.md', url: `https://raw.githubusercontent.com/${EXPLAIN_HIM_REPOSITORY}/${EXPLAIN_HIM_SKILL_COMMIT}/skills/explain-him/SKILL.md`, responsibility: 'grounding-and-repository-retrieval' },
  { id: 'explain-him-presentation', commit: EXPLAIN_HIM_SKILL_COMMIT, sha256: '3e8a618543ae59db47c784a25c070c3fccfae3e1bfdc9734907910cfdb094e4e', path: 'skills/explain-him-presentation/SKILL.md', url: `https://raw.githubusercontent.com/${EXPLAIN_HIM_REPOSITORY}/${EXPLAIN_HIM_SKILL_COMMIT}/skills/explain-him-presentation/SKILL.md`, responsibility: 'typed-page-presentation-and-guided-focus' }
]);
export const GROUNDING_SOURCE_INDEX = Object.freeze([
  Object.freeze({
    topic: 'originator-publishing',
    path: 'knowledge/01-originator-flow.md',
    section: 'Basic flow',
    status: 'current',
    rawUrl: `https://raw.githubusercontent.com/${EXPLAIN_HIM_REPOSITORY}/${EXPLAIN_HIM_SKILL_COMMIT}/knowledge/01-originator-flow.md`,
    commit: EXPLAIN_HIM_SKILL_COMMIT,
    sha256: 'cf7a396231a50a18c37a9c52ddc7c7315c07cf4107b6dea524760eaa630f3659'
  }),
  Object.freeze({
    topic: 'originator-publishing',
    path: 'PRODUCT-CONTRACT.md',
    section: 'Authoring and publishing reality',
    status: 'current',
    rawUrl: `https://raw.githubusercontent.com/${EXPLAIN_HIM_REPOSITORY}/${EXPLAIN_HIM_SKILL_COMMIT}/PRODUCT-CONTRACT.md`,
    commit: EXPLAIN_HIM_SKILL_COMMIT,
    sha256: '0df8585ee8293165b936d803eb095bba19e62a32fbd7745db284003ef78b4006'
  })
]);
const LOAD_ORDER = Object.freeze(IMMUTABLE_SKILL_PROOF.map((item) => item.id));
const BOOTSTRAP_TOOL = 'get_explain_him_answer';
const ANSWER_WORKFLOW = Object.freeze({
  schemaVersion: 'explain-him-answer-workflow.v1',
  requiredBeforeAnyExplainHimAnswer: true,
  steps: Object.freeze([
    Object.freeze({ order: 1, id: 'verify-contract-and-revision', action: 'Verify Protocol v3, activation identity, bootstrap tool identity, and current workspaceRevision.' }),
    Object.freeze({ order: 2, id: 'load-pinned-skills', action: 'Fetch every skill in skillLoadOrder from its immutable raw URL and verify its commit and SHA-256 before use.' }),
    Object.freeze({ order: 3, id: 'inspect-visible-authored-page', action: 'Inspect the relevant visible authored page and current Personalized UI before deciding answer sufficiency.' }),
    Object.freeze({ order: 4, id: 'retrieve-minimum-grounding-sources', action: 'If any material answer part is missing, partial, ambiguous, or inconsistent, retrieve and verify the minimum matching pinned grounding sources.' }),
    Object.freeze({ order: 5, id: 'form-grounded-chat-answer', action: 'Form the grounded answer and always provide it in the user conversation, preserving provenance and documented uncertainty.' }),
    Object.freeze({ order: 6, id: 'decide-presentation-operation', action: 'Choose chat-only, focus, add, update, replace, remove, or restore according to agentPolicy and the visible Personalized UI.' }),
    Object.freeze({ order: 7, id: 'apply-required-adaptation', action: 'When agentPolicy requires a page change, call apply_explanation in the same turn with the complete A6 Protocol v3 handshake.' }),
    Object.freeze({ order: 8, id: 'confirm-workspace-revision', action: 'Accept a page change only after apply_explanation succeeds and returns the expected new workspaceRevision and local block identity.' }),
    Object.freeze({ order: 9, id: 'disclose-failure', action: 'Disclose repository retrieval or apply failure and never claim that the Personalized UI changed when success was not confirmed.' }),
    Object.freeze({ order: 10, id: 'restore-on-request', action: 'On restore request, remove the relevant local result or guide the user to Original view without mutating authored source.' })
  ])
});
const TOOL_USAGE = Object.freeze({
  get_explain_him_answer: Object.freeze({ readOnly: true, when: 'Always first, before answering any question about Explain Him or the current Explain Him page.', returns: 'Mandatory answer workflow, activation, revision, immutable skills, grounding source index, agent policy, targets, local blocks, and apply handshake requirements.' }),
  apply_explanation: Object.freeze({ readOnly: false, when: 'After grounding, in the same turn when the visible Personalized UI is missing, partial, inconsistent, or the user requests focus or restore.', effects: 'Atomically applies bounded add, replace, update, remove, or focus operations to browser-local Personalized state only.' })
});
const HANDSHAKE_FIELDS = Object.freeze(['requestId', 'expectedWorkspaceRevision', 'explanationId', 'topicId', 'operations', 'handshake']);
const AGENT_POLICY = Object.freeze({
  revision: 'A6',
  bootstrap: { tool: BOOTSTRAP_TOOL, requiredOnPageActivation: true, beforeAnyExplainHimAnswer: true },
  skillLoading: { required: true, loadOrder: LOAD_ORDER },
  repositoryRetrievalRequiredWhenPageInsufficient: true,
  decisionPrecedence: ['explicitNoPageChange', 'restore', 'terminologyConsistency', 'answerPresence'],
  terminologyConsistency: {
    equivalentLabels: ['User', 'Consumer'],
    equivalenceNoteDoesNotMakeMixedLabelsConsistent: true,
    questionTriggersSameTurnNormalization: true,
    defaultTerm: 'User',
    distinctRoles: 'never-normalize',
    firstCorrection: { topicId: 'terminology:user-consumer', targetId: 'workflow-diagram', operation: 'replace' },
    sameTopicFollowUp: { operation: 'update', reuseLocalBlockId: true },
    restore: { operation: 'remove' }
  },
  presentationDecision: { alwaysProvideChatAnswer: true, assessAnswerAndRequestedRepresentationInPersonalizedUi: true, fullyPresent: { ordinaryQuestion: 'chat-only', showOrWalkthrough: 'focus-only' }, missing: { operation: 'add', requestedDiagramAbsent: 'missing-representation' }, partial: { sameTopicLocalBlock: 'update', otherwise: 'add' }, inconsistent: { authoredTarget: 'replace', localBlock: 'update', batchAffectedTargets: true }, explicitNoPageChange: 'chat-only', restore: 'remove' },
  continuation: { reuseTopicAndLocalBlock: true },
  failure: { applyFailure: 'honest-acknowledgement-no-false-success' },
  applyHandshake: { required: HANDSHAKE_FIELDS, nonceReuse: 'same-activation-idempotent-retry-and-ordered-chain-only', focusOnlyChangesRevision: false }
});
const clone = (value) => JSON.parse(JSON.stringify(value));
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
function required(value, field, max = 500) { if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} must be a non-empty string`); if (value.trim().length > max) throw new RangeError(`${field} exceeds ${max} characters`); return value.trim(); }
function optionalString(object, key, field, max) { return Object.hasOwn(object, key) ? required(object[key], field, max) : null; }
function integer(value, field) { if (!Number.isInteger(value) || value < 0) throw new TypeError(`${field} must be a non-negative integer`); return value; }
function safeObject(value, field) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${field} must be an object`); for (const key of Object.keys(value)) if (['html', 'innerhtml', 'outerhtml', 'srcdoc', 'script', 'javascript', 'svg', 'selector'].includes(key.toLowerCase())) throw new TypeError(`${field}.${key} is forbidden`); return value; }
function strictObject(value, field, allowed) { const input = safeObject(value, field); for (const key of Object.keys(input)) if (!allowed.includes(key)) throw new TypeError(`Unknown ${field} field: ${key}`); return input; }
function topic(value) { const result = required(value, 'topicId', 120); if (!/^[A-Za-z][A-Za-z0-9._:-]*$/.test(result)) throw new TypeError('topicId must use the safe stable topic pattern'); return result; }
function opaque(prefix) { const crypto = globalThis.crypto; if (!crypto?.getRandomValues) throw new TypeError('Secure activation entropy is unavailable'); const bytes = new Uint8Array(18); crypto.getRandomValues(bytes); return `${prefix}-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`; }
function targets(workspace) { const nodes = workspace.document?.querySelectorAll?.('[data-eh-block-id]'); if (!nodes) return (workspace.getContext?.().authoredTargetIds || []).map((id) => ({ id, title: id, replaceable: true, acceptedTypes: [...EXPLANATION_BLOCK_TYPES] })); return [...nodes].map((node) => ({ id: node.dataset.ehBlockId, title: String(node.querySelector?.('h1,h2,h3,h4,strong')?.textContent || node.dataset.ehBlockId).trim().slice(0, 120), replaceable: node.dataset.ehReplaceable !== 'false', acceptedTypes: [...EXPLANATION_BLOCK_TYPES] })); }
function locals(workspace) { return (workspace.getVisibleState?.().presentations || []).map((item) => ({ id: item.id, topicId: item.topicId, targetId: item.targetId, placement: item.placement, type: item.artifact?.type, title: item.artifact?.fallback?.title, updatedAt: item.updatedAt })); }
function proof() { return IMMUTABLE_SKILL_PROOF.map(({ id, commit, sha256 }) => ({ id, commit, sha256 })); }
function activation() { return { contractId: opaque('contract'), activationId: opaque('activation'), nonce: opaque('nonce') }; }
function contractFor(workspace, current) { const context = workspace.getContext?.() || {}; const skillProof = proof(); const skills = IMMUTABLE_SKILL_PROOF.map(({ url, ...skill }) => ({ ...skill, rawUrl: url })); return { schemaVersion: 'explain-him-webmcp-contract.v3', protocolVersion: 3, bootstrapTool: BOOTSTRAP_TOOL, answerWorkflow: clone(ANSWER_WORKFLOW), toolUsage: clone(TOOL_USAGE), activation: { id: current.activationId, nonce: current.nonce }, contractId: current.contractId, explanationId: context.explanationId || null, baseRevision: context.baseRevision || null, workspaceRevision: context.workspaceRevision ?? 0, repository: { fullName: EXPLAIN_HIM_REPOSITORY, url: EXPLAIN_HIM_REPOSITORY_URL, skillsCommit: EXPLAIN_HIM_SKILL_COMMIT }, skills, skillLoadOrder: LOAD_ORDER, skillProof, groundingSourceIndex: clone(GROUNDING_SOURCE_INDEX), agentPolicy: clone(AGENT_POLICY), blockSchema: { path: 'schemas/explanation-block.v1.schema.json', url: '/explain-him/schemas/explanation-block.v1.schema.json', types: EXPLANATION_BLOCK_TYPES }, handshakeSchema: { path: 'schemas/webmcp-apply.v3.schema.json', url: '/explain-him/schemas/webmcp-apply.v3.schema.json' }, targets: targets(workspace), localBlocks: locals(workspace), applyOperations: ['add', 'replace', 'update', 'remove', 'focus'], authoredLayerMutable: false, repositoryAccessViaWebMcp: false }; }
function block(value) { const input = safeObject(value, 'block'); const type = required(input.type, 'block.type', 40); if (!EXPLANATION_BLOCK_TYPES.includes(type)) throw new TypeError(`Unsupported explanation block type: ${type}`); const allowed = { callout: ['type', 'title', 'body', 'tone', 'sources'], comparison: ['type', 'title', 'columns', 'sources'], workflow: ['type', 'title', 'steps', 'sources'], timeline: ['type', 'title', 'items', 'sources'], diagram: ['type', 'title', 'variant', 'nodes', 'edges', 'sources'] }[type]; strictObject(input, 'block', allowed); const title = required(input.title, 'block.title', 160); const sources = input.sources === undefined ? [] : input.sources; if (!Array.isArray(sources) || sources.length > 20) throw new TypeError('block.sources must contain 0 to 20 entries'); const sourceRefs = sources.map((source) => { const item = strictObject(source, 'source', ['repository', 'path', 'ref', 'section', 'status']); return { repository: Object.hasOwn(item, 'repository') ? required(item.repository, 'source.repository', 200) : EXPLAIN_HIM_REPOSITORY, path: required(item.path, 'source.path', 500), ref: optionalString(item, 'ref', 'source.ref', 160), section: optionalString(item, 'section', 'source.section', 300), status: optionalString(item, 'status', 'source.status', 40) }; });
  if (type === 'callout') { const tone = Object.hasOwn(input, 'tone') ? required(input.tone, 'block.tone', 40) : 'neutral'; if (!['neutral', 'example', 'warning', 'insight'].includes(tone)) throw new TypeError('block.tone must be a supported tone'); return { type, title, body: required(input.body, 'block.body', 5000), tone, sources: sourceRefs }; }
  if (type === 'comparison') { if (!Array.isArray(input.columns) || input.columns.length < 2 || input.columns.length > 4) throw new TypeError('comparison.columns must contain 2 to 4 columns'); return { type, title, sources: sourceRefs, columns: input.columns.map((column) => { const item = strictObject(column, 'comparison.column', ['title', 'items']); return { title: required(item.title, 'comparison.columns.title', 120), items: Array.isArray(item.items) && item.items.length ? item.items.map((value) => required(value, 'comparison.columns.items', 500)) : (() => { throw new TypeError('comparison.columns.items must not be empty'); })() }; }) }; }
  if (type === 'workflow') { if (!Array.isArray(input.steps) || input.steps.length < 2 || input.steps.length > 12) throw new TypeError('workflow.steps must contain 2 to 12 steps'); return { type, title, sources: sourceRefs, steps: input.steps.map((step) => { const item = strictObject(step, 'workflow.step', ['title', 'body']); return { title: required(item.title, 'workflow.steps.title', 120), body: optionalString(item, 'body', 'workflow.steps.body', 800) }; }) }; }
  if (type === 'timeline') { if (!Array.isArray(input.items) || input.items.length < 2 || input.items.length > 16) throw new TypeError('timeline.items must contain 2 to 16 items'); return { type, title, sources: sourceRefs, items: input.items.map((item) => { const entry = strictObject(item, 'timeline.item', ['label', 'body']); return { label: required(entry.label, 'timeline.items.label', 100), body: required(entry.body, 'timeline.items.body', 800) }; }) }; }
  if (!Array.isArray(input.nodes) || input.nodes.length < 2 || input.nodes.length > 16) throw new TypeError('diagram.nodes must contain 2 to 16 nodes'); const nodes = input.nodes.map((node) => { const item = strictObject(node, 'diagram.node', ['id', 'label', 'body']); return { id: required(item.id, 'diagram.nodes.id', 80), label: required(item.label, 'diagram.nodes.label', 140), body: optionalString(item, 'body', 'diagram.nodes.body', 600) }; }); const ids = new Set(nodes.map((node) => node.id)); if (ids.size !== nodes.length) throw new TypeError('diagram node IDs must be unique'); const edges = input.edges === undefined ? [] : input.edges; if (!Array.isArray(edges) || edges.length > 30) throw new TypeError('diagram.edges must contain 0 to 30 entries'); const variant = Object.hasOwn(input, 'variant') ? required(input.variant, 'diagram.variant', 40) : 'concept'; if (!['concept', 'architecture', 'sequence', 'flow'].includes(variant)) throw new TypeError('diagram.variant must be a supported variant'); return { type, title, sources: sourceRefs, variant, nodes, edges: edges.map((edge) => { const item = strictObject(edge, 'diagram.edge', ['from', 'to', 'label']); const from = required(item.from, 'diagram.edges.from', 80); const to = required(item.to, 'diagram.edges.to', 80); if (!ids.has(from) || !ids.has(to)) throw new TypeError('diagram edges must reference existing node IDs'); return { from, to, label: optionalString(item, 'label', 'diagram.edges.label', 120) }; }) };
}
function artifact(input, targetId) { const typed = block(input); const { sources, ...payload } = typed; const body = typed.type === 'callout' ? typed.body : typed.type === 'workflow' ? typed.steps.map((step, index) => `${index + 1}. ${step.title}`).join('\n') : typed.type === 'comparison' ? typed.columns.map((column) => `${column.title}: ${column.items.join('; ')}`).join('\n') : typed.type === 'timeline' ? typed.items.map((item) => `${item.label}: ${item.body}`).join('\n') : typed.nodes.map((node) => `${node.id}: ${node.label}`).join('\n'); return { type: typed.type, capability: { id: 'explain-him-safe-block', trust: 'builtin', execution: 'embedded' }, content: { schema: `explain-him.block.${typed.type}.v1`, payload }, fallback: { title: typed.title, body }, provenance: { sourceBlockIds: [targetId], repositoryRefs: sources }, authorship: { meaning: 'personal-agent', presentation: 'explain-him-safe-block', requestedBy: 'agent' } }; }
function verifyProof(value) { const expected = proof(); if (!Array.isArray(value) || value.length !== expected.length) throw new TypeError('skillProof must contain the complete ordered immutable skill proof'); for (let index = 0; index < expected.length; index += 1) { const item = safeObject(value[index], `skillProof[${index}]`); if (Object.keys(item).length !== 3 || stable(item) !== stable(expected[index])) throw new TypeError('skillProof does not match the ordered immutable skill publication'); } return clone(value); }
function handshake(input, workspace, current) { if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object'); const allowed = new Set(HANDSHAKE_FIELDS); for (const key of Object.keys(input)) if (!allowed.has(key)) throw new TypeError(`Unknown apply field: ${key}`); for (const field of HANDSHAKE_FIELDS) if (!Object.hasOwn(input, field)) throw new TypeError(`Missing required v3 handshake field: ${field}`); const nested = safeObject(input.handshake, 'handshake'); const nestedAllowed = new Set(['bootstrapTool', 'contractId', 'activationId', 'nonce', 'baseRevision', 'skillProof']); for (const key of Object.keys(nested)) if (!nestedAllowed.has(key)) throw new TypeError(`Unknown handshake field: ${key}`); for (const field of nestedAllowed) if (!Object.hasOwn(nested, field)) throw new TypeError(`Missing handshake field: ${field}`); const context = workspace.getContext?.() || {}; const result = { requestId: required(input.requestId, 'requestId', 160), expectedWorkspaceRevision: integer(input.expectedWorkspaceRevision, 'expectedWorkspaceRevision'), explanationId: required(input.explanationId, 'explanationId', 160), topicId: topic(input.topicId), bootstrapTool: required(nested.bootstrapTool, 'handshake.bootstrapTool', 128), contractId: required(nested.contractId, 'handshake.contractId', 160), activationId: required(nested.activationId, 'handshake.activationId', 160), nonce: required(nested.nonce, 'handshake.nonce', 160), baseRevision: required(nested.baseRevision, 'handshake.baseRevision', 160), skillProof: verifyProof(nested.skillProof) }; if (result.bootstrapTool !== BOOTSTRAP_TOOL) throw new TypeError(`handshake.bootstrapTool must be ${BOOTSTRAP_TOOL}; older bootstrap identities are not accepted`); if (!current) throw new TypeError(`Call ${BOOTSTRAP_TOOL} before apply_explanation in this page session`); if (result.contractId !== current.contractId || result.activationId !== current.activationId || result.nonce !== current.nonce) throw new TypeError('Activation handshake is stale or does not belong to this page session'); if (result.explanationId !== context.explanationId || result.baseRevision !== context.baseRevision) throw new TypeError('Activation handshake does not match this explanation identity'); return result; }
function strictOperation(value) { const input = safeObject(value, 'operation'); const op = required(input.op, 'operation.op', 20); const allowed = op === 'add' || op === 'replace' ? ['op', 'targetId', 'blockId', 'block'] : op === 'update' ? ['op', 'blockId', 'block'] : op === 'remove' ? ['op', 'blockId'] : op === 'focus' ? ['op', 'targetId', 'blockId'] : []; if (!allowed.length) throw new TypeError('operation.op must be add, replace, update, remove, or focus'); strictObject(input, 'operation', allowed); return input; }
function plan(workspace, input, currentTopic) { if (!Array.isArray(input.operations) || !input.operations.length || input.operations.length > 8) throw new TypeError('operations must contain 1 to 8 items'); const knownTargets = new Map(targets(workspace).map((item) => [item.id, item])); const current = new Map(locals(workspace).map((item) => [item.id, item])); const created = new Map(); const mutations = []; const focuses = []; const existingTopicTarget = (targetId) => [...current.values(), ...created.values()].some((item) => item.topicId === currentTopic && item.targetId === targetId);
  for (const raw of input.operations) { const operation = strictOperation(raw); const op = required(operation.op, 'operation.op', 20); if (op === 'focus') { const hasBlock = Object.hasOwn(operation, 'blockId'); const hasTarget = Object.hasOwn(operation, 'targetId'); if (hasBlock === hasTarget) throw new TypeError('focus must contain exactly one of targetId or blockId'); if (hasBlock) { const blockId = required(operation.blockId, 'operation.blockId', 120); const item = current.get(blockId) || created.get(blockId); if (!item) throw new RangeError('Unknown local explanation block'); if (item.topicId !== currentTopic) throw new RangeError('Cannot focus a local block from a different topic'); focuses.push({ blockId: item.id }); } else { const targetId = required(operation.targetId, 'operation.targetId', 120); if (!knownTargets.has(targetId)) throw new RangeError(`Unknown authored target: ${targetId}`); focuses.push({ targetId }); } continue; }
    if (op === 'add' || op === 'replace') { const targetId = required(operation.targetId, 'operation.targetId', 120); const target = knownTargets.get(targetId); if (!target) throw new RangeError(`Unknown authored target: ${targetId}`); if (existingTopicTarget(targetId)) throw new RangeError('Duplicate local topic presentation for this authored target'); if (op === 'replace' && (!target.replaceable || [...current.values(), ...created.values()].some((item) => item.targetId === targetId && item.placement === 'replace'))) throw new RangeError(`Target already has a local replacement: ${targetId}`); const id = Object.hasOwn(operation, 'blockId') ? required(operation.blockId, 'operation.blockId', 120) : null; if (id && (!id.startsWith('local-') || current.has(id) || created.has(id))) throw new RangeError(`Invalid new local block ID: ${id}`); const add = createAddPresentationOperation({ topicId: currentTopic, targetId, placement: op === 'replace' ? 'replace' : 'after', artifact: artifact(operation.block, targetId), actor: { kind: 'agent', channel: 'webmcp' } }, id ? { id } : {}); created.set(add.presentation.id, add.presentation); mutations.push({ op, operation: add }); continue; }
    const blockId = required(operation.blockId, 'operation.blockId', 120); const item = current.get(blockId) || created.get(blockId); if (!blockId.startsWith('local-') || !item) throw new RangeError('Unknown local explanation block'); if (item.topicId !== currentTopic) throw new RangeError(`Cannot ${op} a local block from a different topic`); if (op === 'update') mutations.push({ op, blockId, operation: createUpdatePresentationOperation(blockId, { artifact: artifact(operation.block, item.targetId) }) }); else if (op === 'remove') { current.delete(blockId); created.delete(blockId); mutations.push({ op, blockId, operation: createRemovePresentationOperation(blockId) }); } else throw new TypeError('operation.op must be add, replace, update, remove, or focus'); }
  return { mutations, focuses }; }
function fingerprint(data, input) { return stable({ requestId: data.requestId, explanationId: data.explanationId, topicId: data.topicId, bootstrapTool: data.bootstrapTool, contractId: data.contractId, activationId: data.activationId, nonce: data.nonce, baseRevision: data.baseRevision, skillProof: data.skillProof, operations: input.operations }); }
function result(workspace, data, prepared, idempotent = false) { const history = workspace.getLocalChangeHistory?.(); const applied = prepared.mutations.map((item) => ({ op: item.op, blockId: item.operation.presentation?.id || item.blockId, topicId: data.topicId, targetId: item.operation.presentation?.targetId, type: item.operation.presentation?.artifact.type })); for (const focus of prepared.focuses) applied.push({ op: 'focus', ...workspace.focusBlock(focus) }); return { ok: true, idempotent, requestId: data.requestId, topicId: data.topicId, contractId: data.contractId, activationId: data.activationId, transactionId: prepared.mutations.length ? history?.transactions?.at(-1)?.id || null : null, workspaceRevision: workspace.getContext?.().workspaceRevision ?? 0, applied, localBlocks: locals(workspace) }; }
async function apply(workspace, input, current, focusReplays) { const data = handshake(input, workspace, current); const semantic = fingerprint(data, input); const prior = workspace.getLocalChangeHistory?.().transactions?.find((transaction) => transaction.requestId === data.requestId); if (prior) { if (prior.semanticFingerprint !== semantic || prior.topicId !== data.topicId || prior.activationId !== data.activationId || prior.contractId !== data.contractId || !prior.result) throw new RangeError(`requestId ${data.requestId} was already used with a different semantic request`); return { ...clone(prior.result), idempotent: true }; } const focusReplay = focusReplays.get(data.requestId); if (focusReplay) { if (focusReplay.semantic !== semantic) throw new RangeError(`requestId ${data.requestId} was already used with a different semantic request`); return { ...clone(focusReplay.result), idempotent: true }; } const revision = workspace.getContext?.().workspaceRevision ?? 0; if (data.expectedWorkspaceRevision !== revision) throw new RangeError(`Stale workspace revision: expected ${data.expectedWorkspaceRevision}, current ${revision}`); const prepared = plan(workspace, input, data.topicId); if (prepared.mutations.length) await workspace.applyTransaction(prepared.mutations.map((item) => item.operation), { requestId: data.requestId, requestFingerprint: semantic, semanticFingerprint: semantic, topicId: data.topicId, activationId: data.activationId, contractId: data.contractId, actor: { kind: 'agent', channel: 'webmcp' } }); const output = result(workspace, data, prepared); if (output.transactionId && workspace.attachTransactionResult) await workspace.attachTransactionResult(output.transactionId, output); if (!prepared.mutations.length) focusReplays.set(data.requestId, { semantic, result: clone(output) }); return output; }
export function resolveWebMcpHost(environment = globalThis) { const standard = environment?.document?.modelContext; if (standard && typeof standard.registerTool === 'function') return { modelContext: standard, source: 'document.modelContext', standard: true }; const legacy = environment?.navigator?.modelContext; if (legacy && typeof legacy.registerTool === 'function') return { modelContext: legacy, source: 'navigator.modelContext', standard: false }; return { modelContext: null, source: 'none', standard: false }; }
function applySchemaV3() {
  const string = (max = 160) => ({ type: 'string', minLength: 1, maxLength: max });
  const localId = { ...string(120), pattern: '^local-[A-Za-z0-9._:-]+$' };
  const source = { type: 'object', additionalProperties: false, required: ['path'], properties: { repository: string(200), path: string(500), ref: string(160), section: string(300), status: string(40) } };
  const sources = { type: 'array', maxItems: 20, items: source };
  const callout = { type: 'object', additionalProperties: false, required: ['type', 'title', 'body'], properties: { type: { const: 'callout' }, title: string(), body: string(5000), tone: { enum: ['neutral', 'example', 'warning', 'insight'] }, sources } };
  const comparison = { type: 'object', additionalProperties: false, required: ['type', 'title', 'columns'], properties: { type: { const: 'comparison' }, title: string(), columns: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'object', additionalProperties: false, required: ['title', 'items'], properties: { title: string(120), items: { type: 'array', minItems: 1, items: string(500) } } } }, sources } };
  const workflow = { type: 'object', additionalProperties: false, required: ['type', 'title', 'steps'], properties: { type: { const: 'workflow' }, title: string(), steps: { type: 'array', minItems: 2, maxItems: 12, items: { type: 'object', additionalProperties: false, required: ['title'], properties: { title: string(120), body: string(800) } } }, sources } };
  const timeline = { type: 'object', additionalProperties: false, required: ['type', 'title', 'items'], properties: { type: { const: 'timeline' }, title: string(), items: { type: 'array', minItems: 2, maxItems: 16, items: { type: 'object', additionalProperties: false, required: ['label', 'body'], properties: { label: string(100), body: string(800) } } }, sources } };
  const diagram = { type: 'object', additionalProperties: false, required: ['type', 'title', 'nodes'], properties: { type: { const: 'diagram' }, title: string(), variant: { enum: ['concept', 'architecture', 'sequence', 'flow'] }, nodes: { type: 'array', minItems: 2, maxItems: 16, items: { type: 'object', additionalProperties: false, required: ['id', 'label'], properties: { id: string(80), label: string(140), body: string(600) } } }, edges: { type: 'array', maxItems: 30, items: { type: 'object', additionalProperties: false, required: ['from', 'to'], properties: { from: string(80), to: string(80), label: string(120) } } }, sources } };
  const block = { oneOf: [callout, comparison, workflow, timeline, diagram] };
  const proofItem = { type: 'object', additionalProperties: false, required: ['id', 'commit', 'sha256'], properties: { id: string(), commit: { type: 'string', pattern: '^[0-9a-f]{40}$' }, sha256: { type: 'string', pattern: '^[0-9a-f]{64}$' } } };
  const operation = (name, required, properties) => ({ type: 'object', additionalProperties: false, required: ['op', ...required], properties: { op: { const: name }, ...properties } });
  return { type: 'object', additionalProperties: false, required: HANDSHAKE_FIELDS, properties: { requestId: string(), expectedWorkspaceRevision: { type: 'integer', minimum: 0 }, explanationId: string(), topicId: { type: 'string', minLength: 1, maxLength: 120, pattern: '^[A-Za-z][A-Za-z0-9._:-]*$' }, operations: { type: 'array', minItems: 1, maxItems: 8, items: { oneOf: [operation('add', ['targetId', 'block'], { targetId: string(120), blockId: localId, block }), operation('replace', ['targetId', 'block'], { targetId: string(120), blockId: localId, block }), operation('update', ['blockId', 'block'], { blockId: localId, block }), operation('remove', ['blockId'], { blockId: localId }), { type: 'object', additionalProperties: false, properties: { op: { const: 'focus' }, targetId: string(120), blockId: localId }, oneOf: [{ required: ['op', 'targetId'] }, { required: ['op', 'blockId'] }] }] } }, handshake: { type: 'object', additionalProperties: false, required: ['bootstrapTool', 'contractId', 'activationId', 'nonce', 'baseRevision', 'skillProof'], properties: { bootstrapTool: { const: BOOTSTRAP_TOOL }, contractId: string(), activationId: string(), nonce: string(), baseRevision: string(), skillProof: { type: 'array', minItems: 2, maxItems: 2, items: proofItem } } } } };
}
function lifecycle(callback, detail) {
  if (typeof callback !== 'function') return;
  try { callback(clone(detail)); } catch { /* Observability must never change tool behavior. */ }
}
function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  throw signal.reason instanceof Error ? signal.reason : new Error('Tool execution was cancelled');
}
function safeTopicId(input) { return typeof input?.topicId === 'string' && /^[A-Za-z][A-Za-z0-9._:-]{0,119}$/.test(input.topicId) ? input.topicId : null; }
function lifecycleErrorCode(error) { return error instanceof RangeError ? 'conflict' : error instanceof TypeError ? 'validation-error' : 'execution-error'; }
export function createWebMcpTools(workspaceOrPromise, options = {}) {
  let current = null;
  const focusReplays = new Map();
  const resolveWorkspace = () => Promise.resolve(workspaceOrPromise);
  return [
    {
      name: BOOTSTRAP_TOOL,
      title: 'Get Explain Him Answer Workflow',
      description: 'MUST ALWAYS be called first and before answering ANY question about Explain Him or the current Explain Him page. Returns the mandatory ordered answer workflow, Protocol v3 activation and workspace revision, immutable pinned skills and grounding source index, agent policy, page targets and local blocks, and exact usage guidance for get_explain_him_answer and apply_explanation. It does not fetch GitHub or form the answer: follow the returned workflow, retrieve pinned sources when the visible UI is insufficient, answer in chat, and apply the required same-turn reversible UI adaptation.',
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: async (_input = {}, executionOptions = {}) => {
        throwIfAborted(executionOptions.signal);
        const workspace = await resolveWorkspace();
        throwIfAborted(executionOptions.signal);
        current ||= activation();
        const output = contractFor(workspace, current);
        lifecycle(options.onLifecycle, { type: 'answer-bootstrap-invoked', workspaceRevision: output.workspaceRevision });
        return output;
      }
    },
    {
      name: 'apply_explanation',
      title: 'Keep Personalized UI Consistent',
      description: 'After first calling get_explain_him_answer and grounding the chat answer, call this in the same turn whenever the returned policy identifies missing, partial, or inconsistent visible Personalized UI, or an explicit focus or restore request. Atomically applies only bounded add, replace, update, remove, or focus operations to browser-local Personalized state and requires the complete A6 Protocol v3 handshake proving the get_explain_him_answer activation.',
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      inputSchema: applySchemaV3(),
      execute: async (input, executionOptions = {}) => {
        const topicId = safeTopicId(input);
        let workspaceRevision = 0;
        let started = false;
        try {
          throwIfAborted(executionOptions.signal);
          const workspace = await resolveWorkspace();
          throwIfAborted(executionOptions.signal);
          workspaceRevision = workspace.getContext?.().workspaceRevision ?? 0;
          lifecycle(options.onLifecycle, { type: 'apply-started', topicId, workspaceRevision });
          started = true;
          const output = await apply(workspace, input, current, focusReplays);
          lifecycle(options.onLifecycle, {
            type: 'apply-succeeded',
            topicId: output.topicId,
            workspaceRevision: output.workspaceRevision,
            operations: output.applied.map((item) => item.op),
            localBlockIds: output.localBlocks.map((item) => item.id)
          });
          return output;
        } catch (error) {
          if (!started) lifecycle(options.onLifecycle, { type: 'apply-started', topicId, workspaceRevision });
          lifecycle(options.onLifecycle, { type: 'apply-failed', topicId, workspaceRevision, errorCode: lifecycleErrorCode(error) });
          throw error;
        }
      }
    }
  ];
}
export function registerWebMcpTools(workspaceOrPromise, modelContext = null, options = {}) { const resolved = modelContext && typeof modelContext.registerTool === 'function' ? { modelContext, source: options.hostSource || 'explicit', standard: options.standardHost ?? options.hostSource === 'document.modelContext' } : resolveWebMcpHost(options.environment || globalThis); const status = { supported: Boolean(resolved.modelContext), ok: false, verified: false, verificationError: null, hostSource: resolved.source, standardHost: resolved.standard, expectedTools: [...EXPLAIN_HIM_WEBMCP_TOOLS], registered: [], verifiedTools: [], errors: [], ready: null }; if (!resolved.modelContext) { status.ready = Promise.resolve(status); return status; } status.ready = (async () => { for (const tool of createWebMcpTools(workspaceOrPromise, { onLifecycle: options.onLifecycle })) try { await resolved.modelContext.registerTool(tool); status.registered.push(tool.name); } catch (error) { status.errors.push({ name: tool.name, message: String(error?.message || error) }); } status.ok = !status.errors.length && status.expectedTools.every((name) => status.registered.includes(name)); if (typeof resolved.modelContext.getTools === 'function') try { const available = await resolved.modelContext.getTools(); const names = Array.isArray(available) ? available.map((item) => typeof item === 'string' ? item : item?.name) : []; status.verifiedTools = status.expectedTools.filter((name) => names.includes(name)); status.verified = status.verifiedTools.length === status.expectedTools.length; } catch (error) { status.verificationError = String(error?.message || error); } return status; })(); return status; }
