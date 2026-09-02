import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ADDITIONAL_INFORMATION, EXPLAIN_HIM_REPOSITORY, EXPLAIN_HIM_REPOSITORY_URL,
  EXPLAIN_HIM_SKILL_COMMIT, EXPLAIN_HIM_WEBMCP_TOOLS, WEBMCP_PROTOCOL_VERSION,
  createWebMcpTools, registerWebMcpTools, resolveWebMcpHost
} from '../runtime/webmcp.mjs';
import { appendTransaction, createInitialWorkspace, materializeWorkspace } from '../runtime/workspace.mjs';

function workspace({ mutableTargets = ['workflow-diagram'], targets = ['workflow-diagram', 'workflow-step-1', 'flow-model'] } = {}) {
  let state = createInitialWorkspace({ explanationId: 'test', baseRevision: 'r1' });
  let viewMode = 'original';
  const focused = [];
  const authoredNodes = targets.map((id) => ({ dataset: { ehBlockId: id }, innerText: `${id} visible explanation`, querySelector: () => ({ textContent: `${id} title` }) }));
  const slotNodes = mutableTargets.map((id) => ({ dataset: { ehLocalSlot: id } }));
  return {
    document: { querySelectorAll: (selector) => selector === '[data-eh-local-slot]' ? slotNodes : authoredNodes },
    getContext: () => ({ explanationId: 'test', baseRevision: 'r1', workspaceRevision: state.revision, authoredTargetIds: targets, insertionTargetIds: mutableTargets }),
    getVisibleState: () => ({ ...materializeWorkspace(state, { canonicalIds: targets }), viewMode }),
    getLocalChangeHistory: () => ({ transactions: state.transactions }),
    applyTransaction: async (operations, options) => { state = appendTransaction(state, operations, options); },
    rollbackTransaction: async (id) => { if (state.transactions.at(-1)?.id !== id) throw new Error('wrong rollback'); state.transactions.pop(); state.cursor = state.transactions.length; state.revision -= 1; },
    attachTransactionResult: async (id, result) => { state.transactions.find((item) => item.id === id).result = result; },
    setViewMode: async (mode) => { viewMode = mode; },
    focusBlock: async (focusRequest) => { focused.push(focusRequest); return { ...focusRequest, visible: true, focused: true }; },
    focused
  };
}

const callout = (title = 'Explanation') => ({ type: 'callout', title, body: `${title} body`, sources: [{ path: 'PRODUCT-CONTRACT.md', status: 'current' }] });
const diagram = (title = 'Terminology') => ({ type: 'diagram', title, variant: 'flow', nodes: [{ id: 'user', label: 'User' }, { id: 'agent', label: 'Personal agent' }], edges: [{ from: 'user', to: 'agent', label: 'asks' }], sources: [] });
const tools = (subject = workspace()) => new Map(createWebMcpTools(subject).map((tool) => [tool.name, tool]));
const request = (context, overrides = {}) => ({
  requestId: overrides.requestId || 'request-1', activationId: overrides.activationId || context.activationId,
  expectedWorkspaceRevision: overrides.expectedWorkspaceRevision ?? context.workspaceRevision,
  topicId: overrides.topicId || 'topic:explanation', decision: overrides.decision || 'missing',
  operations: overrides.operations || [{ op: 'add', targetId: 'workflow-diagram', block: callout() }],
  ...(overrides.primaryOperationIndex === undefined ? {} : { primaryOperationIndex: overrides.primaryOperationIndex })
});

test('Protocol v4 exposes exactly the context and explanation tools', async () => {
  const map = tools();
  assert.deepEqual(EXPLAIN_HIM_WEBMCP_TOOLS, ['get_explain_him_context', 'explain_tool']);
  assert.deepEqual([...map.keys()], EXPLAIN_HIM_WEBMCP_TOOLS);
  const context = await map.get('get_explain_him_context').execute({});
  assert.equal(context.schemaVersion, 'explain-him-webmcp-context.v4');
  assert.equal(context.protocolVersion, 4);
  assert.equal(WEBMCP_PROTOCOL_VERSION, 4);
  assert.equal(context.additionalInformation, ADDITIONAL_INFORMATION);
  assert.match(context.additionalInformation, /GitHub repository linked to this page/);
  assert.equal(context.repository.fullName, EXPLAIN_HIM_REPOSITORY);
  assert.equal(context.repository.url, EXPLAIN_HIM_REPOSITORY_URL);
  assert.equal(context.repository.pinnedCommit, EXPLAIN_HIM_SKILL_COMMIT);
  assert.ok(context.repository.groundingSources.length >= 1);
  assert.equal(context.policy.existing, 'focus-existing');
  assert.equal(context.targets.find(({ id }) => id === 'workflow-step-1').hasInsertionSlot, false);
  assert.deepEqual(context.targets.find(({ id }) => id === 'workflow-step-1').allowedOperations, ['focus']);
});

test('context activation stays stable while revision and local blocks refresh', async () => {
  const subject = workspace(); const map = tools(subject);
  const first = await map.get('get_explain_him_context').execute({});
  const applied = await map.get('explain_tool').execute(request(first));
  const second = await map.get('get_explain_him_context').execute({});
  assert.equal(second.activationId, first.activationId);
  assert.equal(second.workspaceRevision, applied.workspaceRevision);
  assert.equal(second.localBlocks.length, 1);
  assert.equal(second.viewMode, 'personalized');
});

test('existing focuses one authored block without changing revision and replays safely', async () => {
  const map = tools(); const context = await map.get('get_explain_him_context').execute({});
  const input = request(context, { decision: 'existing', operations: [{ op: 'focus', targetId: 'flow-model' }] });
  const first = await map.get('explain_tool').execute(input);
  const replay = await map.get('explain_tool').execute({ ...input, expectedWorkspaceRevision: 999 });
  assert.equal(first.changed, false);
  assert.equal(first.workspaceRevision, context.workspaceRevision);
  assert.deepEqual(first.focused, { targetId: 'flow-model', visible: true, focused: true });
  assert.equal(replay.idempotent, true);
});

test('missing adds, changes revision, enters Personalized mode, and auto-focuses', async () => {
  const subject = workspace(); const map = tools(subject);
  const context = await map.get('get_explain_him_context').execute({});
  const result = await map.get('explain_tool').execute(request(context));
  assert.equal(result.changed, true);
  assert.equal(result.workspaceRevision, context.workspaceRevision + 1);
  assert.equal(result.applied[0].op, 'add');
  assert.match(result.applied[0].blockId, /^local-/);
  assert.deepEqual(result.focused, { blockId: result.applied[0].blockId, visible: true, focused: true });
  assert.equal(subject.getVisibleState().viewMode, 'personalized');
});

test('partial updates the same block and rejects a duplicate same-topic add', async () => {
  const subject = workspace(); const map = tools(subject);
  const context = await map.get('get_explain_him_context').execute({});
  const first = await map.get('explain_tool').execute(request(context)); const blockId = first.applied[0].blockId;
  const updated = await map.get('explain_tool').execute(request(context, { requestId: 'request-2', expectedWorkspaceRevision: first.workspaceRevision, decision: 'partial', operations: [{ op: 'update', blockId, block: callout('Expanded') }] }));
  assert.equal(updated.applied[0].blockId, blockId);
  assert.deepEqual(updated.focused, { blockId, visible: true, focused: true });
  await assert.rejects(map.get('explain_tool').execute(request(context, { requestId: 'request-3', expectedWorkspaceRevision: updated.workspaceRevision, decision: 'partial' })), /same-topic local explanation already exists/i);
});

test('inconsistent applies an atomic batch and primaryOperationIndex selects focus', async () => {
  const subject = workspace({ mutableTargets: ['workflow-diagram', 'flow-model'] }); const map = tools(subject);
  const context = await map.get('get_explain_him_context').execute({});
  const result = await map.get('explain_tool').execute(request(context, { decision: 'inconsistent', primaryOperationIndex: 0, operations: [{ op: 'replace', targetId: 'workflow-diagram', block: diagram('Correct terminology') }, { op: 'replace', targetId: 'flow-model', block: callout('Correct flow') }] }));
  assert.equal(result.applied.length, 2);
  assert.deepEqual(result.focused, { blockId: result.applied[0].blockId, visible: true, focused: true });
});

test('restore removes a local result and focuses its authored target', async () => {
  const subject = workspace(); const map = tools(subject);
  const context = await map.get('get_explain_him_context').execute({});
  const first = await map.get('explain_tool').execute(request(context));
  const restored = await map.get('explain_tool').execute(request(context, { requestId: 'restore-1', expectedWorkspaceRevision: first.workspaceRevision, decision: 'restore', operations: [{ op: 'remove', blockId: first.applied[0].blockId }] }));
  assert.equal(restored.localBlocks.length, 0);
  assert.deepEqual(restored.focused, { targetId: 'workflow-diagram', visible: true, focused: true });
});

test('focus-only child targets reject invisible mutations atomically', async () => {
  const subject = workspace(); const map = tools(subject);
  const context = await map.get('get_explain_him_context').execute({});
  await assert.rejects(map.get('explain_tool').execute(request(context, { operations: [{ op: 'add', targetId: 'workflow-diagram', block: callout() }, { op: 'add', targetId: 'workflow-step-1', block: callout() }] })), /focus anchor/);
  assert.equal(subject.getContext().workspaceRevision, 0);
  assert.equal(subject.getVisibleState().presentations.length, 0);
});

test('a mutation is rolled back when its rendered result cannot be confirmed visible and focused', async () => {
  const subject = workspace(); subject.focusBlock = async ({ blockId }) => ({ blockId, unavailable: true, visible: false, focused: false });
  const map = tools(subject); const context = await map.get('get_explain_him_context').execute({});
  await assert.rejects(map.get('explain_tool').execute(request(context)), /could not be confirmed visible and focused/);
  assert.equal(subject.getContext().workspaceRevision, 0);
  assert.equal(subject.getVisibleState().presentations.length, 0);
});

test('v4 rejects old fields, stale state, executable content, and manual mutation focus', async () => {
  const map = tools(); const context = await map.get('get_explain_him_context').execute({});
  await assert.rejects(map.get('explain_tool').execute({ ...request(context), contractId: 'old' }), /Unknown explain request field/);
  await assert.rejects(map.get('explain_tool').execute(request(context, { activationId: 'activation-other' })), /Activation is stale/);
  await assert.rejects(map.get('explain_tool').execute(request(context, { expectedWorkspaceRevision: 9 })), /Stale workspace revision/);
  await assert.rejects(map.get('explain_tool').execute(request(context, { operations: [{ op: 'add', targetId: 'workflow-diagram', block: { ...callout(), html: '<script>bad()</script>' } }] })), /forbidden/);
  await assert.rejects(map.get('explain_tool').execute(request(context, { operations: [{ op: 'add', targetId: 'workflow-diagram', block: callout() }, { op: 'focus', targetId: 'workflow-diagram' }] })), /focused automatically/);
});

test('only document.modelContext is resolved; navigator legacy host is ignored', () => {
  const standard = { registerTool() {} };
  assert.equal(resolveWebMcpHost({ document: { modelContext: standard }, navigator: { modelContext: {} } }).modelContext, standard);
  assert.equal(resolveWebMcpHost({ document: {}, navigator: { modelContext: standard } }).modelContext, null);
});

test('registration awaits tools then verifies page registrations with getTools', async () => {
  const order = []; const registered = [];
  const host = { registerTool: async (tool) => { order.push(`start:${tool.name}`); await Promise.resolve(); registered.push(tool); order.push(`end:${tool.name}`); }, getTools: async () => { order.push('getTools'); return registered; } };
  const status = registerWebMcpTools(workspace(), host); await status.ready;
  assert.deepEqual(order, ['start:get_explain_him_context', 'end:get_explain_him_context', 'start:explain_tool', 'end:explain_tool', 'getTools']);
  assert.equal(status.ok, true); assert.equal(status.verified, true);
  assert.deepEqual(status.verifiedTools, EXPLAIN_HIM_WEBMCP_TOOLS);
});

test('a rejected registerTool never reports success', async () => {
  const host = { registerTool: async (tool) => { if (tool.name === 'explain_tool') throw new Error('denied'); }, getTools: async () => [{ name: 'get_explain_him_context' }] };
  const status = registerWebMcpTools(workspace(), host); await status.ready;
  assert.equal(status.ok, false); assert.equal(status.verified, false);
  assert.deepEqual(status.errors, [{ name: 'explain_tool', message: 'denied' }]);
});

test('getTools verification rejects an extra or duplicate descriptor', async () => {
  for (const available of [
    [{ name: 'get_explain_him_context' }, { name: 'explain_tool' }, { name: 'extra' }],
    [{ name: 'get_explain_him_context' }, { name: 'get_explain_him_context' }, { name: 'explain_tool' }]
  ]) {
    const host = { registerTool: async () => {}, getTools: async () => available };
    const status = registerWebMcpTools(workspace(), host); await status.ready;
    assert.equal(status.verified, false);
  }
});

test('issue 161 registerSkill failure leaves both tools verified', async () => {
  const registered = [];
  const host = { registerTool: async (tool) => registered.push(tool), getTools: async () => registered, registerSkill: async () => { throw new Error('experimental API rejected'); } };
  const status = registerWebMcpTools(workspace(), host, { standardHost: true, hostSource: 'document.modelContext' }); await status.ready;
  assert.equal(status.skillRegistrationState, 'error');
  assert.equal(status.skillRegistrationError, 'experimental API rejected');
  assert.equal(status.ok, true); assert.equal(status.verified, true);
});

test('both execute callbacks honor AbortSignal', async () => {
  const map = tools(); const controller = new AbortController(); controller.abort(new Error('cancelled by host'));
  await assert.rejects(map.get('get_explain_him_context').execute({}, { signal: controller.signal }), /cancelled by host/);
  await assert.rejects(map.get('explain_tool').execute({}, { signal: controller.signal }), /cancelled by host/);
});

test('bootstrap metadata is Protocol v4 and carries the exact repository instruction', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const bootstrap = JSON.parse(html.match(/<script id="explain-him-agent-bootstrap" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(bootstrap.schemaVersion, 'explain-him-agent-bootstrap.v2');
  assert.equal(bootstrap.protocolVersion, 4);
  assert.deepEqual(bootstrap.tools, EXPLAIN_HIM_WEBMCP_TOOLS);
  assert.equal(bootstrap.additionalInformation, ADDITIONAL_INFORMATION);
});
