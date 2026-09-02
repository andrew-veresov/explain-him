import {
  createAddPresentationOperation,
  createRemovePresentationOperation,
  createUpdatePresentationOperation
} from './workspace.mjs';
import {
  EXPLAIN_HIM_NATIVE_SKILL,
  EXPLAIN_HIM_NATIVE_SKILL_DIGEST
} from './generated/explain-him-native-skill.mjs';

export const EXPLAIN_HIM_WEBMCP_TOOLS = Object.freeze(['get_explain_him_context', 'explain_tool']);
export const EXPLANATION_BLOCK_TYPES = Object.freeze(['callout', 'comparison', 'workflow', 'timeline', 'diagram']);
export const WEBMCP_PROTOCOL_VERSION = 4;
export const EXPLAIN_HIM_REPOSITORY = 'andrew-veresov/explain-him';
export const EXPLAIN_HIM_REPOSITORY_URL = `https://github.com/${EXPLAIN_HIM_REPOSITORY}`;
export const EXPLAIN_HIM_SKILL_COMMIT = '59167103ebfb7d4fd0c276de7f2b81862c536b4f';
export const ADDITIONAL_INFORMATION = 'For additional information, inspect the GitHub repository linked to this page. Prefer the pinned commit and grounding sources returned in this context.';

export const IMMUTABLE_SKILL_PROOF = Object.freeze([
  {
    id: 'explain-him', commit: EXPLAIN_HIM_SKILL_COMMIT,
    sha256: '3e7b6208e00b7bb1370a3958f9ea625b17afe554f9e577bc18fa4ca8c128ec5b',
    path: 'skills/explain-him/SKILL.md',
    url: `https://raw.githubusercontent.com/${EXPLAIN_HIM_REPOSITORY}/${EXPLAIN_HIM_SKILL_COMMIT}/skills/explain-him/SKILL.md`,
    responsibility: 'grounding-and-repository-retrieval'
  },
  {
    id: 'explain-him-presentation', commit: EXPLAIN_HIM_SKILL_COMMIT,
    sha256: 'a85ced352e77b435da9783e4819337d75b4fe3239f7dc0a6d33b072ae982362c',
    path: 'skills/explain-him-presentation/SKILL.md',
    url: `https://raw.githubusercontent.com/${EXPLAIN_HIM_REPOSITORY}/${EXPLAIN_HIM_SKILL_COMMIT}/skills/explain-him-presentation/SKILL.md`,
    responsibility: 'typed-page-presentation-and-guided-focus'
  }
]);

export const GROUNDING_SOURCE_INDEX = Object.freeze([
  Object.freeze({
    topic: 'originator-publishing', path: 'knowledge/01-originator-flow.md', section: 'Basic flow', status: 'current',
    rawUrl: `https://raw.githubusercontent.com/${EXPLAIN_HIM_REPOSITORY}/${EXPLAIN_HIM_SKILL_COMMIT}/knowledge/01-originator-flow.md`,
    commit: EXPLAIN_HIM_SKILL_COMMIT,
    sha256: 'cf7a396231a50a18c37a9c52ddc7c7315c07cf4107b6dea524760eaa630f3659'
  }),
  Object.freeze({
    topic: 'originator-publishing', path: 'PRODUCT-CONTRACT.md', section: 'Authoring and publishing reality', status: 'current',
    rawUrl: `https://raw.githubusercontent.com/${EXPLAIN_HIM_REPOSITORY}/${EXPLAIN_HIM_SKILL_COMMIT}/PRODUCT-CONTRACT.md`,
    commit: EXPLAIN_HIM_SKILL_COMMIT,
    sha256: '24acbad739ead8781ad2918a227e5670ca9bdbf464088e5de530a29ae63a1c3c'
  })
]);

const CONTEXT_TOOL = 'get_explain_him_context';
const EXPLAIN_TOOL = 'explain_tool';
const DECISIONS = Object.freeze(['existing', 'missing', 'partial', 'inconsistent', 'restore']);
const INPUT_FIELDS = Object.freeze(['requestId', 'activationId', 'expectedWorkspaceRevision', 'topicId', 'decision', 'operations', 'primaryOperationIndex']);
const POLICY = Object.freeze({
  alwaysProvideChatAnswer: true,
  explicitNoPageChange: 'chat-only',
  existing: 'focus-existing',
  missing: 'add-and-auto-focus',
  partial: 'update-same-topic-or-add-and-auto-focus',
  inconsistent: 'replace-authored-or-update-local-and-auto-focus',
  restore: 'remove-and-focus-authored',
  sameTopicContinuation: 'reuse-topic-and-local-block-id'
});

const clone = (value) => JSON.parse(JSON.stringify(value));
const stable = (value) => Array.isArray(value)
  ? `[${value.map(stable).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
    : JSON.stringify(value);

function required(value, field, max = 500) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} must be a non-empty string`);
  if (value.trim().length > max) throw new RangeError(`${field} exceeds ${max} characters`);
  return value.trim();
}
function optionalString(object, key, field, max) { return Object.hasOwn(object, key) ? required(object[key], field, max) : null; }
function integer(value, field) { if (!Number.isInteger(value) || value < 0) throw new TypeError(`${field} must be a non-negative integer`); return value; }
function safeObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${field} must be an object`);
  for (const key of Object.keys(value)) if (['html', 'innerhtml', 'outerhtml', 'srcdoc', 'script', 'javascript', 'svg', 'selector'].includes(key.toLowerCase())) throw new TypeError(`${field}.${key} is forbidden`);
  return value;
}
function strictObject(value, field, allowed) {
  const input = safeObject(value, field);
  for (const key of Object.keys(input)) if (!allowed.includes(key)) throw new TypeError(`Unknown ${field} field: ${key}`);
  return input;
}
function topic(value) {
  const result = required(value, 'topicId', 120);
  if (!/^[A-Za-z][A-Za-z0-9._:-]*$/.test(result)) throw new TypeError('topicId must use the safe stable topic pattern');
  return result;
}
function opaque(prefix) {
  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) throw new TypeError('Secure activation entropy is unavailable');
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
function summary(value, max = 280) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max); }

function targets(workspace) {
  const document = workspace.document;
  const nodes = document?.querySelectorAll?.('[data-eh-block-id]');
  if (!nodes) {
    const context = workspace.getContext?.() || {};
    const mutable = new Set(context.insertionTargetIds || context.authoredTargetIds || []);
    return (context.authoredTargetIds || []).map((id) => ({
      id, title: id, contentSummary: '', hasInsertionSlot: mutable.has(id),
      allowedOperations: mutable.has(id) ? ['focus', 'add', 'replace'] : ['focus'],
      acceptedTypes: mutable.has(id) ? [...EXPLANATION_BLOCK_TYPES] : []
    }));
  }
  const slots = new Set([...document.querySelectorAll('[data-eh-local-slot]')].map((node) => node.dataset.ehLocalSlot));
  return [...nodes].map((node) => {
    const id = node.dataset.ehBlockId;
    const hasInsertionSlot = slots.has(id);
    const replaceable = hasInsertionSlot && node.dataset.ehReplaceable !== 'false';
    return {
      id,
      title: summary(node.querySelector?.('h1,h2,h3,h4,strong')?.textContent || id, 120),
      contentSummary: summary(node.innerText || node.textContent),
      hasInsertionSlot,
      allowedOperations: ['focus', ...(hasInsertionSlot ? ['add'] : []), ...(replaceable ? ['replace'] : [])],
      acceptedTypes: hasInsertionSlot ? [...EXPLANATION_BLOCK_TYPES] : []
    };
  });
}

function locals(workspace) {
  return (workspace.getVisibleState?.().presentations || []).map((item) => ({
    id: item.id, topicId: item.topicId, targetId: item.targetId, placement: item.placement,
    type: item.artifact?.type, title: item.artifact?.fallback?.title,
    contentSummary: summary(item.artifact?.fallback?.body), updatedAt: item.updatedAt
  }));
}
function fallbackDeliveryState(state = 'unavailable') { return { mode: 'pinned-remote-fallback', state, registrationId: null }; }

function contextFor(workspace, current, deliveryState) {
  const workspaceContext = workspace.getContext?.() || {};
  const visible = workspace.getVisibleState?.() || {};
  return {
    schemaVersion: 'explain-him-webmcp-context.v4', protocolVersion: WEBMCP_PROTOCOL_VERSION,
    activationId: current.activationId, workspaceRevision: workspaceContext.workspaceRevision ?? 0,
    viewMode: visible.viewMode || 'personalized',
    repository: {
      fullName: EXPLAIN_HIM_REPOSITORY, url: EXPLAIN_HIM_REPOSITORY_URL,
      pinnedCommit: EXPLAIN_HIM_SKILL_COMMIT, groundingSources: clone(GROUNDING_SOURCE_INDEX)
    },
    additionalInformation: ADDITIONAL_INFORMATION,
    skills: IMMUTABLE_SKILL_PROOF.map(({ id, path, url, commit, sha256 }) => ({ id, path, rawUrl: url, commit, sha256 })),
    skillDelivery: {
      mode: deliveryState.mode, state: deliveryState.state, proposalStatus: 'experimental-open-backlog',
      registrationId: deliveryState.registrationId, compositeSha256: EXPLAIN_HIM_NATIVE_SKILL_DIGEST
    },
    policy: clone(POLICY), targets: targets(workspace), localBlocks: locals(workspace),
    blockSchema: { path: 'schemas/explanation-block.v1.schema.json', url: '/explain-him/schemas/explanation-block.v1.schema.json', types: [...EXPLANATION_BLOCK_TYPES] },
    explainSchema: { path: 'schemas/webmcp-explain.v4.schema.json', url: '/explain-him/schemas/webmcp-explain.v4.schema.json' },
    authoredLayerMutable: false, repositoryAccessViaWebMcp: false
  };
}

function block(value) {
  const input = safeObject(value, 'block');
  const type = required(input.type, 'block.type', 40);
  if (!EXPLANATION_BLOCK_TYPES.includes(type)) throw new TypeError(`Unsupported explanation block type: ${type}`);
  const allowed = {
    callout: ['type', 'title', 'body', 'tone', 'sources'], comparison: ['type', 'title', 'columns', 'sources'],
    workflow: ['type', 'title', 'steps', 'sources'], timeline: ['type', 'title', 'items', 'sources'],
    diagram: ['type', 'title', 'variant', 'nodes', 'edges', 'sources']
  }[type];
  strictObject(input, 'block', allowed);
  const title = required(input.title, 'block.title', 160);
  const sources = input.sources === undefined ? [] : input.sources;
  if (!Array.isArray(sources) || sources.length > 20) throw new TypeError('block.sources must contain 0 to 20 entries');
  const sourceRefs = sources.map((source) => {
    const item = strictObject(source, 'source', ['repository', 'path', 'ref', 'section', 'status']);
    return {
      repository: Object.hasOwn(item, 'repository') ? required(item.repository, 'source.repository', 200) : EXPLAIN_HIM_REPOSITORY,
      path: required(item.path, 'source.path', 500), ref: optionalString(item, 'ref', 'source.ref', 160),
      section: optionalString(item, 'section', 'source.section', 300), status: optionalString(item, 'status', 'source.status', 40)
    };
  });
  if (type === 'callout') {
    const tone = Object.hasOwn(input, 'tone') ? required(input.tone, 'block.tone', 40) : 'neutral';
    if (!['neutral', 'example', 'warning', 'insight'].includes(tone)) throw new TypeError('block.tone must be a supported tone');
    return { type, title, body: required(input.body, 'block.body', 5000), tone, sources: sourceRefs };
  }
  if (type === 'comparison') {
    if (!Array.isArray(input.columns) || input.columns.length < 2 || input.columns.length > 4) throw new TypeError('comparison.columns must contain 2 to 4 columns');
    return { type, title, sources: sourceRefs, columns: input.columns.map((column) => {
      const item = strictObject(column, 'comparison.column', ['title', 'items']);
      if (!Array.isArray(item.items) || !item.items.length) throw new TypeError('comparison.columns.items must not be empty');
      return { title: required(item.title, 'comparison.columns.title', 120), items: item.items.map((entry) => required(entry, 'comparison.columns.items', 500)) };
    }) };
  }
  if (type === 'workflow') {
    if (!Array.isArray(input.steps) || input.steps.length < 2 || input.steps.length > 12) throw new TypeError('workflow.steps must contain 2 to 12 steps');
    return { type, title, sources: sourceRefs, steps: input.steps.map((step) => {
      const item = strictObject(step, 'workflow.step', ['title', 'body']);
      return { title: required(item.title, 'workflow.steps.title', 120), body: optionalString(item, 'body', 'workflow.steps.body', 800) };
    }) };
  }
  if (type === 'timeline') {
    if (!Array.isArray(input.items) || input.items.length < 2 || input.items.length > 16) throw new TypeError('timeline.items must contain 2 to 16 items');
    return { type, title, sources: sourceRefs, items: input.items.map((item) => {
      const entry = strictObject(item, 'timeline.item', ['label', 'body']);
      return { label: required(entry.label, 'timeline.items.label', 100), body: required(entry.body, 'timeline.items.body', 800) };
    }) };
  }
  if (!Array.isArray(input.nodes) || input.nodes.length < 2 || input.nodes.length > 16) throw new TypeError('diagram.nodes must contain 2 to 16 nodes');
  const nodes = input.nodes.map((node) => {
    const item = strictObject(node, 'diagram.node', ['id', 'label', 'body']);
    return { id: required(item.id, 'diagram.nodes.id', 80), label: required(item.label, 'diagram.nodes.label', 140), body: optionalString(item, 'body', 'diagram.nodes.body', 600) };
  });
  const ids = new Set(nodes.map((node) => node.id));
  if (ids.size !== nodes.length) throw new TypeError('diagram node IDs must be unique');
  const edges = input.edges === undefined ? [] : input.edges;
  if (!Array.isArray(edges) || edges.length > 30) throw new TypeError('diagram.edges must contain 0 to 30 entries');
  const variant = Object.hasOwn(input, 'variant') ? required(input.variant, 'diagram.variant', 40) : 'concept';
  if (!['concept', 'architecture', 'sequence', 'flow'].includes(variant)) throw new TypeError('diagram.variant must be a supported variant');
  return { type, title, sources: sourceRefs, variant, nodes, edges: edges.map((edge) => {
    const item = strictObject(edge, 'diagram.edge', ['from', 'to', 'label']);
    const from = required(item.from, 'diagram.edges.from', 80); const to = required(item.to, 'diagram.edges.to', 80);
    if (!ids.has(from) || !ids.has(to)) throw new TypeError('diagram edges must reference existing node IDs');
    return { from, to, label: optionalString(item, 'label', 'diagram.edges.label', 120) };
  }) };
}

function artifact(input, targetId) {
  const typed = block(input); const { sources, ...payload } = typed;
  const body = typed.type === 'callout' ? typed.body
    : typed.type === 'workflow' ? typed.steps.map((step, index) => `${index + 1}. ${step.title}`).join('\n')
      : typed.type === 'comparison' ? typed.columns.map((column) => `${column.title}: ${column.items.join('; ')}`).join('\n')
        : typed.type === 'timeline' ? typed.items.map((item) => `${item.label}: ${item.body}`).join('\n')
          : typed.nodes.map((node) => `${node.id}: ${node.label}`).join('\n');
  return {
    type: typed.type, capability: { id: 'explain-him-safe-block', trust: 'builtin', execution: 'embedded' },
    content: { schema: `explain-him.block.${typed.type}.v1`, payload }, fallback: { title: typed.title, body },
    provenance: { sourceBlockIds: [targetId], repositoryRefs: sources },
    authorship: { meaning: 'personal-agent', presentation: 'explain-him-safe-block', requestedBy: 'agent' }
  };
}

function strictOperation(value) {
  const input = safeObject(value, 'operation'); const op = required(input.op, 'operation.op', 20);
  const allowed = op === 'add' || op === 'replace' ? ['op', 'targetId', 'blockId', 'block']
    : op === 'update' ? ['op', 'blockId', 'block'] : op === 'remove' ? ['op', 'blockId']
      : op === 'focus' ? ['op', 'targetId', 'blockId'] : [];
  if (!allowed.length) throw new TypeError('operation.op must be add, replace, update, remove, or focus');
  strictObject(input, 'operation', allowed); return input;
}

function requestData(input, workspace, current) {
  const request = strictObject(input, 'explain request', INPUT_FIELDS);
  for (const field of INPUT_FIELDS.slice(0, 6)) if (!Object.hasOwn(request, field)) throw new TypeError(`Missing required Protocol v4 field: ${field}`);
  if (!current) throw new TypeError(`Call ${CONTEXT_TOOL} before ${EXPLAIN_TOOL} in this page session`);
  const data = {
    requestId: required(request.requestId, 'requestId', 160), activationId: required(request.activationId, 'activationId', 160),
    expectedWorkspaceRevision: integer(request.expectedWorkspaceRevision, 'expectedWorkspaceRevision'), topicId: topic(request.topicId),
    decision: required(request.decision, 'decision', 40),
    primaryOperationIndex: Object.hasOwn(request, 'primaryOperationIndex') ? integer(request.primaryOperationIndex, 'primaryOperationIndex') : null
  };
  if (data.activationId !== current.activationId) throw new RangeError('Activation is stale or does not belong to this page session');
  if (!DECISIONS.includes(data.decision)) throw new TypeError(`decision must be one of: ${DECISIONS.join(', ')}`);
  return data;
}

function validateDecision(data, operations, currentLocals) {
  const ops = operations.map((operation) => operation.op);
  if (data.decision === 'existing') {
    if (ops.length !== 1 || ops[0] !== 'focus') throw new TypeError('decision existing requires exactly one focus operation');
    if (data.primaryOperationIndex !== null) throw new TypeError('decision existing does not accept primaryOperationIndex');
    return;
  }
  if (ops.includes('focus')) throw new TypeError('Mutation decisions are focused automatically and must not include a focus operation');
  const allowed = { missing: ['add'], partial: ['add', 'update'], inconsistent: ['replace', 'update'], restore: ['remove'] }[data.decision];
  if (ops.some((op) => !allowed.includes(op))) throw new TypeError(`decision ${data.decision} accepts only ${allowed.join(' or ')} operations`);
  const sameTopicExists = currentLocals.some((item) => item.topicId === data.topicId);
  if ((data.decision === 'missing' || data.decision === 'partial') && ops.includes('add') && sameTopicExists) throw new RangeError('A same-topic local explanation already exists; update or focus it instead of adding a duplicate');
  if (data.primaryOperationIndex !== null && data.primaryOperationIndex >= operations.length) throw new RangeError('primaryOperationIndex must reference an operation in this request');
}

function prepare(workspace, input, data) {
  if (!Array.isArray(input.operations) || !input.operations.length || input.operations.length > 8) throw new TypeError('operations must contain 1 to 8 items');
  const operations = input.operations.map(strictOperation);
  const knownTargets = new Map(targets(workspace).map((item) => [item.id, item]));
  const currentItems = locals(workspace); const current = new Map(currentItems.map((item) => [item.id, item]));
  validateDecision(data, operations, currentItems);
  const created = new Map(); const mutations = []; const focusRequests = [];
  const existingTopicTarget = (targetId) => [...current.values(), ...created.values()].some((item) => item.topicId === data.topicId && item.targetId === targetId);
  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index]; const op = operation.op;
    if (op === 'focus') {
      const hasBlock = Object.hasOwn(operation, 'blockId'); const hasTarget = Object.hasOwn(operation, 'targetId');
      if (hasBlock === hasTarget) throw new TypeError('focus must contain exactly one of targetId or blockId');
      if (hasBlock) {
        const blockId = required(operation.blockId, 'operation.blockId', 120); const item = current.get(blockId);
        if (!item) throw new RangeError('Unknown local explanation block');
        if (item.topicId !== data.topicId) throw new RangeError('Cannot focus a local block from a different topic');
        focusRequests.push({ blockId });
      } else {
        const targetId = required(operation.targetId, 'operation.targetId', 120);
        if (!knownTargets.has(targetId)) throw new RangeError(`Unknown authored target: ${targetId}`);
        focusRequests.push({ targetId });
      }
      continue;
    }
    if (op === 'add' || op === 'replace') {
      const targetId = required(operation.targetId, 'operation.targetId', 120); const target = knownTargets.get(targetId);
      if (!target) throw new RangeError(`Unknown authored target: ${targetId}`);
      if (!target.allowedOperations.includes(op)) throw new RangeError(`Target ${targetId} does not support ${op}; use it only as a focus anchor`);
      if (existingTopicTarget(targetId)) throw new RangeError('Duplicate local topic presentation for this authored target');
      if (op === 'replace' && [...current.values(), ...created.values()].some((item) => item.targetId === targetId && item.placement === 'replace')) throw new RangeError(`Target already has a local replacement: ${targetId}`);
      const id = Object.hasOwn(operation, 'blockId') ? required(operation.blockId, 'operation.blockId', 120) : null;
      if (id && (!id.startsWith('local-') || current.has(id) || created.has(id))) throw new RangeError(`Invalid new local block ID: ${id}`);
      const add = createAddPresentationOperation({
        topicId: data.topicId, targetId, placement: op === 'replace' ? 'replace' : 'after',
        artifact: artifact(operation.block, targetId), actor: { kind: 'agent', channel: 'webmcp' }
      }, id ? { id } : {});
      created.set(add.presentation.id, add.presentation);
      mutations.push({ index, op, targetId, blockId: add.presentation.id, operation: add });
      continue;
    }
    const blockId = required(operation.blockId, 'operation.blockId', 120); const item = current.get(blockId) || created.get(blockId);
    if (!blockId.startsWith('local-') || !item) throw new RangeError('Unknown local explanation block');
    if (item.topicId !== data.topicId) throw new RangeError(`Cannot ${op} a local block from a different topic`);
    if (op === 'update') mutations.push({ index, op, targetId: item.targetId, blockId, operation: createUpdatePresentationOperation(blockId, { artifact: artifact(operation.block, item.targetId) }) });
    else if (op === 'remove') {
      current.delete(blockId); created.delete(blockId);
      mutations.push({ index, op, targetId: item.targetId, blockId, operation: createRemovePresentationOperation(blockId) });
    }
  }
  return { operations, mutations, focusRequests };
}

function fingerprint(data, input) {
  return stable({ requestId: data.requestId, activationId: data.activationId, topicId: data.topicId, decision: data.decision, operations: input.operations, primaryOperationIndex: data.primaryOperationIndex });
}
async function focusPrepared(workspace, data, prepared) {
  if (data.decision === 'existing') return workspace.focusBlock(prepared.focusRequests[0]);
  const requestedIndex = data.primaryOperationIndex ?? (data.decision === 'restore' ? prepared.mutations[0].index : prepared.mutations.at(-1).index);
  const primary = prepared.mutations.find((item) => item.index === requestedIndex);
  if (!primary) throw new RangeError('primaryOperationIndex must reference a mutation operation');
  if (data.decision === 'restore') return workspace.focusBlock({ targetId: primary.targetId });
  await workspace.setViewMode?.('personalized');
  return workspace.focusBlock({ blockId: primary.blockId });
}
function compactLocals(workspace) { return locals(workspace).map(({ id, topicId, targetId, placement, type, title }) => ({ id, topicId, targetId, placement, type, title })); }

async function executeExplain(workspace, input, current, focusReplays) {
  const data = requestData(input, workspace, current); const semantic = fingerprint(data, input);
  const prior = workspace.getLocalChangeHistory?.().transactions?.find((transaction) => transaction.requestId === data.requestId);
  if (prior) {
    if (prior.semanticFingerprint !== semantic || prior.topicId !== data.topicId || prior.activationId !== data.activationId || !prior.result) throw new RangeError(`requestId ${data.requestId} was already used with a different semantic request`);
    return { ...clone(prior.result), idempotent: true };
  }
  const focusReplay = focusReplays.get(data.requestId);
  if (focusReplay) {
    if (focusReplay.semantic !== semantic) throw new RangeError(`requestId ${data.requestId} was already used with a different semantic request`);
    return { ...clone(focusReplay.result), idempotent: true };
  }
  const revision = workspace.getContext?.().workspaceRevision ?? 0;
  if (data.expectedWorkspaceRevision !== revision) throw new RangeError(`Stale workspace revision: expected ${data.expectedWorkspaceRevision}, current ${revision}`);
  const prepared = prepare(workspace, input, data);
  let transactionId = null;
  if (prepared.mutations.length) {
    await workspace.applyTransaction(prepared.mutations.map((item) => item.operation), {
    requestId: data.requestId, requestFingerprint: semantic, semanticFingerprint: semantic,
    topicId: data.topicId, activationId: data.activationId, actor: { kind: 'agent', channel: 'webmcp' }
    });
    transactionId = workspace.getLocalChangeHistory?.().transactions?.at(-1)?.id || null;
  }
  let focused;
  try {
    focused = await focusPrepared(workspace, data, prepared);
    if (workspace.document && (focused?.unavailable || focused?.visible !== true || focused?.focused !== true)) throw new Error('The requested explanation could not be confirmed visible and focused');
  } catch (error) {
    if (transactionId && workspace.rollbackTransaction) await workspace.rollbackTransaction(transactionId);
    throw error;
  }
  const history = workspace.getLocalChangeHistory?.();
  const output = {
    ok: true, idempotent: false, requestId: data.requestId, decision: data.decision, topicId: data.topicId,
    changed: prepared.mutations.length > 0, workspaceRevision: workspace.getContext?.().workspaceRevision ?? 0,
    transactionId,
    applied: prepared.mutations.map(({ op, blockId, targetId }) => ({ op, blockId, targetId })), focused,
    localBlocks: compactLocals(workspace)
  };
  if (output.transactionId && workspace.attachTransactionResult) await workspace.attachTransactionResult(output.transactionId, output);
  else focusReplays.set(data.requestId, { semantic, result: clone(output) });
  return output;
}

function explainSchemaV4() {
  const string = (max = 160) => ({ type: 'string', minLength: 1, maxLength: max });
  const localId = { ...string(120), pattern: '^local-[A-Za-z0-9._:-]+$' };
  const source = { type: 'object', additionalProperties: false, required: ['path'], properties: { repository: string(200), path: string(500), ref: string(160), section: string(300), status: string(40) } };
  const sources = { type: 'array', maxItems: 20, items: source };
  const callout = { type: 'object', additionalProperties: false, required: ['type', 'title', 'body'], properties: { type: { const: 'callout' }, title: string(), body: string(5000), tone: { enum: ['neutral', 'example', 'warning', 'insight'] }, sources } };
  const comparison = { type: 'object', additionalProperties: false, required: ['type', 'title', 'columns'], properties: { type: { const: 'comparison' }, title: string(), columns: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'object', additionalProperties: false, required: ['title', 'items'], properties: { title: string(120), items: { type: 'array', minItems: 1, items: string(500) } } } }, sources } };
  const workflow = { type: 'object', additionalProperties: false, required: ['type', 'title', 'steps'], properties: { type: { const: 'workflow' }, title: string(), steps: { type: 'array', minItems: 2, maxItems: 12, items: { type: 'object', additionalProperties: false, required: ['title'], properties: { title: string(120), body: string(800) } } }, sources } };
  const timeline = { type: 'object', additionalProperties: false, required: ['type', 'title', 'items'], properties: { type: { const: 'timeline' }, title: string(), items: { type: 'array', minItems: 2, maxItems: 16, items: { type: 'object', additionalProperties: false, required: ['label', 'body'], properties: { label: string(100), body: string(800) } } }, sources } };
  const diagram = { type: 'object', additionalProperties: false, required: ['type', 'title', 'nodes'], properties: { type: { const: 'diagram' }, title: string(), variant: { enum: ['concept', 'architecture', 'sequence', 'flow'] }, nodes: { type: 'array', minItems: 2, maxItems: 16, items: { type: 'object', additionalProperties: false, required: ['id', 'label'], properties: { id: string(80), label: string(140), body: string(600) } } }, edges: { type: 'array', maxItems: 30, items: { type: 'object', additionalProperties: false, required: ['from', 'to'], properties: { from: string(80), to: string(80), label: string(120) } } }, sources } };
  const typedBlock = { oneOf: [callout, comparison, workflow, timeline, diagram] };
  const operation = (name, requiredFields, properties) => ({ type: 'object', additionalProperties: false, required: ['op', ...requiredFields], properties: { op: { const: name }, ...properties } });
  return {
    type: 'object', additionalProperties: false,
    required: ['requestId', 'activationId', 'expectedWorkspaceRevision', 'topicId', 'decision', 'operations'],
    properties: {
      requestId: string(), activationId: string(), expectedWorkspaceRevision: { type: 'integer', minimum: 0 },
      topicId: { type: 'string', minLength: 1, maxLength: 120, pattern: '^[A-Za-z][A-Za-z0-9._:-]*$' },
      decision: { enum: [...DECISIONS] }, primaryOperationIndex: { type: 'integer', minimum: 0, maximum: 7 },
      operations: { type: 'array', minItems: 1, maxItems: 8, items: { oneOf: [
        operation('add', ['targetId', 'block'], { targetId: string(120), blockId: localId, block: typedBlock }),
        operation('replace', ['targetId', 'block'], { targetId: string(120), blockId: localId, block: typedBlock }),
        operation('update', ['blockId', 'block'], { blockId: localId, block: typedBlock }),
        operation('remove', ['blockId'], { blockId: localId }),
        { type: 'object', additionalProperties: false, properties: { op: { const: 'focus' }, targetId: string(120), blockId: localId }, oneOf: [{ required: ['op', 'targetId'] }, { required: ['op', 'blockId'] }] }
      ] } }
    }
  };
}

function throwIfAborted(signal) { if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('Tool execution was cancelled'); }
export function resolveWebMcpHost(environment = globalThis) {
  const modelContext = environment?.document?.modelContext;
  return modelContext && typeof modelContext.registerTool === 'function'
    ? { modelContext, source: 'document.modelContext', standard: true }
    : { modelContext: null, source: 'none', standard: false };
}

export function createWebMcpTools(workspaceOrPromise, options = {}) {
  let current = null; const focusReplays = new Map();
  const deliveryState = options.deliveryState || fallbackDeliveryState();
  const resolveWorkspace = () => Promise.resolve(workspaceOrPromise);
  return [
    {
      name: CONTEXT_TOOL, title: 'Get Explain Him Context',
      description: 'Call this first whenever the user asks to explain, clarify, ask why or how, compare, show, or walk through anything about this page. Returns current authored and Personalized UI state, repository guidance, Protocol v4 activation, targets, and local blocks needed to decide whether explain_tool should focus an existing explanation or add, update, or replace one.',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: async (_input = {}, executionOptions = {}) => {
        throwIfAborted(executionOptions.signal); const workspace = await resolveWorkspace(); throwIfAborted(executionOptions.signal);
        current ||= { activationId: opaque('activation') };
        return contextFor(workspace, current, deliveryState);
      }
    },
    {
      name: EXPLAIN_TOOL, title: 'Explain on This Page',
      description: 'Call this after get_explain_him_context for every request to explain, clarify, ask why or how, compare, show, or walk through page-related content unless the user explicitly forbids page changes or scrolling. Focus an existing correct explanation, or add, update, replace, or restore a safe browser-local explanation. Mutations automatically focus the resulting visible block.',
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      inputSchema: explainSchemaV4(),
      execute: async (input, executionOptions = {}) => {
        throwIfAborted(executionOptions.signal); const workspace = await resolveWorkspace(); throwIfAborted(executionOptions.signal);
        return executeExplain(workspace, input, current, focusReplays);
      }
    }
  ];
}

export function registerWebMcpTools(workspaceOrPromise, modelContext = null, options = {}) {
  const resolved = modelContext && typeof modelContext.registerTool === 'function'
    ? { modelContext, source: options.hostSource || 'explicit', standard: options.standardHost ?? false }
    : resolveWebMcpHost(options.environment || globalThis);
  const skillApiAvailable = Boolean(resolved.modelContext && resolved.standard && typeof resolved.modelContext.registerSkill === 'function');
  const deliveryState = fallbackDeliveryState(skillApiAvailable ? 'pending' : 'unavailable');
  const status = {
    supported: Boolean(resolved.modelContext), ok: false, verified: false, verificationError: null,
    hostSource: resolved.source, standardHost: resolved.standard, expectedTools: [...EXPLAIN_HIM_WEBMCP_TOOLS],
    registered: [], verifiedTools: [], errors: [], ready: null, skillApiAvailable,
    skillRegistrationState: skillApiAvailable ? 'pending' : 'unavailable', registeredSkill: null,
    skillRegistrationError: null, nativeSkillProposalStatus: 'experimental-open-backlog',
    nativeSkillDigest: EXPLAIN_HIM_NATIVE_SKILL_DIGEST
  };
  if (!resolved.modelContext) { status.ready = Promise.resolve(status); return status; }
  status.ready = (async () => {
    for (const tool of createWebMcpTools(workspaceOrPromise, { deliveryState })) {
      try { await resolved.modelContext.registerTool(tool); status.registered.push(tool.name); }
      catch (error) { status.errors.push({ name: tool.name, message: String(error?.message || error) }); }
    }
    status.ok = !status.errors.length && status.expectedTools.every((name) => status.registered.includes(name));
    if (skillApiAvailable && status.ok) {
      try {
        await resolved.modelContext.registerSkill(EXPLAIN_HIM_NATIVE_SKILL);
        deliveryState.mode = 'native-inline'; deliveryState.state = 'registered'; deliveryState.registrationId = opaque('skill-registration');
        status.skillRegistrationState = 'registered';
        status.registeredSkill = { name: EXPLAIN_HIM_NATIVE_SKILL.name, digest: EXPLAIN_HIM_NATIVE_SKILL_DIGEST };
      } catch (error) {
        deliveryState.state = 'error'; status.skillRegistrationState = 'error';
        status.skillRegistrationError = String(error?.message || 'registration-failed');
      }
    } else if (skillApiAvailable) {
      deliveryState.state = 'blocked-tools'; status.skillRegistrationState = 'blocked-tools';
    }
    if (typeof resolved.modelContext.getTools !== 'function') {
      status.verificationError = 'document.modelContext.getTools is unavailable'; return status;
    }
    try {
      const available = await resolved.modelContext.getTools();
      const names = Array.isArray(available) ? available.map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean) : [];
      status.verifiedTools = status.expectedTools.filter((name) => names.includes(name));
      status.verified = names.length === status.expectedTools.length
        && new Set(names).size === status.expectedTools.length
        && status.verifiedTools.length === status.expectedTools.length;
    } catch (error) { status.verificationError = String(error?.message || error); }
    return status;
  })();
  return status;
}
