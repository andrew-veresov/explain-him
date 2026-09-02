import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ADDITIONAL_INFORMATION, EXPLAIN_HIM_WEBMCP_TOOLS, WEBMCP_PROTOCOL_VERSION, createWebMcpTools, registerWebMcpTools, resolveWebMcpHost } from '../runtime/webmcp.mjs';
import { appendTransaction, createInitialWorkspace, materializeWorkspace } from '../runtime/workspace.mjs';

function workspace({ mutableTargets = ['workflow-diagram'], targets = ['workflow-diagram', 'workflow-step-1', 'flow-model'] } = {}) {
  let state = createInitialWorkspace({ explanationId: 'test', baseRevision: 'r1' }); let viewMode = 'original';
  const authoredNodes = targets.map((id) => ({ dataset: { ehBlockId: id }, innerText: `${id} visible explanation`, querySelector: () => ({ textContent: `${id} title` }) }));
  const slotNodes = mutableTargets.map((id) => ({ dataset: { ehLocalSlot: id } }));
  return {
    document: { querySelectorAll: (selector) => selector === '[data-eh-local-slot]' ? slotNodes : authoredNodes },
    getContext: () => ({ workspaceRevision: state.revision, authoredTargetIds: targets, insertionTargetIds: mutableTargets }),
    getVisibleState: () => ({ ...materializeWorkspace(state, { canonicalIds: targets }), viewMode }),
    getLocalChangeHistory: () => ({ transactions: state.transactions }),
    applyTransaction: async (operations, options) => { state = appendTransaction(state, operations, options); },
    rollbackTransaction: async (id) => { if (state.transactions.at(-1)?.id !== id) throw new Error('wrong rollback'); state.transactions.pop(); state.cursor = state.transactions.length; state.revision -= 1; },
    attachTransactionResult: async (id, result) => { state.transactions.find((item) => item.id === id).result = result; },
    setViewMode: async (mode) => { viewMode = mode; },
    focusBlock: async (focusRequest) => ({ ...focusRequest, visible: true, focused: true })
  };
}

const callout = (title = 'Explanation') => ({ type: 'callout', title, body: `${title} body`, sources: [{ path: 'PRODUCT-CONTRACT.md', status: 'current' }] });
const diagram = () => ({ type: 'diagram', title: 'Terminology', variant: 'flow', nodes: [{ id: 'user', label: 'User' }, { id: 'agent', label: 'Personal agent' }], edges: [{ from: 'user', to: 'agent', label: 'asks' }], sources: [] });
const tools = (subject = workspace()) => new Map(createWebMcpTools(subject).map((tool) => [tool.name, tool]));
const request = (overrides = {}) => ({ requestId: overrides.requestId || 'request-1', topicId: overrides.topicId || 'topic:explanation', decision: overrides.decision || 'missing', operations: overrides.operations || [{ op: 'add', targetId: 'workflow-diagram', block: callout() }], ...(overrides.primaryOperationIndex === undefined ? {} : { primaryOperationIndex: overrides.primaryOperationIndex }) });

test('Protocol v5 exposes exactly one direct explanation tool', () => {
  const map = tools();
  assert.deepEqual(EXPLAIN_HIM_WEBMCP_TOOLS, ['explain_tool']); assert.deepEqual([...map.keys()], EXPLAIN_HIM_WEBMCP_TOOLS); assert.equal(WEBMCP_PROTOCOL_VERSION, 5);
  assert.match(map.get('explain_tool').description, /Call this directly for every request/i); assert.match(map.get('explain_tool').description, /inspects the current page state during the action/i);
});

test('existing focuses one authored block without changing revision and replays safely', async () => {
  const tool = tools().get('explain_tool'); const input = request({ decision: 'existing', operations: [{ op: 'focus', targetId: 'flow-model' }] });
  const first = await tool.execute(input); const replay = await tool.execute(input);
  assert.equal(first.protocolVersion, 5); assert.equal(first.changed, false); assert.equal(first.workspaceRevisionBefore, 0); assert.equal(first.workspaceRevision, 0);
  assert.deepEqual(first.focused, { targetId: 'flow-model', visible: true, focused: true }); assert.equal(replay.idempotent, true);
});

test('missing adds, changes revision, enters Personalized mode, and auto-focuses', async () => {
  const subject = workspace(); const result = await tools(subject).get('explain_tool').execute(request());
  assert.equal(result.changed, true); assert.equal(result.workspaceRevisionBefore, 0); assert.equal(result.workspaceRevision, 1); assert.match(result.applied[0].blockId, /^local-/);
  assert.deepEqual(result.focused, { blockId: result.applied[0].blockId, visible: true, focused: true }); assert.equal(subject.getVisibleState().viewMode, 'personalized');
});

test('partial updates the same block and rejects a duplicate same-topic add', async () => {
  const tool = tools().get('explain_tool'); const first = await tool.execute(request()); const blockId = first.applied[0].blockId;
  const updated = await tool.execute(request({ requestId: 'request-2', decision: 'partial', operations: [{ op: 'update', blockId, block: callout('Expanded') }] }));
  assert.equal(updated.applied[0].blockId, blockId);
  await assert.rejects(tool.execute(request({ requestId: 'request-3', decision: 'partial' })), /same-topic local explanation already exists/i);
});

test('inconsistent applies an atomic batch and primaryOperationIndex selects focus', async () => {
  const tool = tools(workspace({ mutableTargets: ['workflow-diagram', 'flow-model'] })).get('explain_tool');
  const result = await tool.execute(request({ decision: 'inconsistent', primaryOperationIndex: 0, operations: [{ op: 'replace', targetId: 'workflow-diagram', block: diagram() }, { op: 'replace', targetId: 'flow-model', block: callout('Correct flow') }] }));
  assert.equal(result.applied.length, 2); assert.deepEqual(result.focused, { blockId: result.applied[0].blockId, visible: true, focused: true });
});

test('restore removes a local result and focuses its authored target', async () => {
  const tool = tools().get('explain_tool'); const first = await tool.execute(request());
  const restored = await tool.execute(request({ requestId: 'restore-1', decision: 'restore', operations: [{ op: 'remove', blockId: first.applied[0].blockId }] }));
  assert.equal(restored.localBlocks.length, 0); assert.deepEqual(restored.focused, { targetId: 'workflow-diagram', visible: true, focused: true });
});

test('focus-only child targets reject invisible mutations atomically', async () => {
  const subject = workspace(); const tool = tools(subject).get('explain_tool');
  await assert.rejects(tool.execute(request({ operations: [{ op: 'add', targetId: 'workflow-diagram', block: callout() }, { op: 'add', targetId: 'workflow-step-1', block: callout() }] })), /focus anchor/);
  assert.equal(subject.getContext().workspaceRevision, 0);
});

test('a mutation is rolled back when its result cannot be confirmed visible and focused', async () => {
  const subject = workspace(); subject.focusBlock = async ({ blockId }) => ({ blockId, unavailable: true, visible: false, focused: false });
  await assert.rejects(tools(subject).get('explain_tool').execute(request()), /could not be confirmed visible and focused/); assert.equal(subject.getContext().workspaceRevision, 0);
});

test('v5 rejects removed context fields, executable content, and manual mutation focus', async () => {
  const tool = tools().get('explain_tool');
  await assert.rejects(tool.execute({ ...request(), activationId: 'removed' }), /Unknown explain request field/);
  await assert.rejects(tool.execute({ ...request(), expectedWorkspaceRevision: 0 }), /Unknown explain request field/);
  await assert.rejects(tool.execute(request({ operations: [{ op: 'add', targetId: 'workflow-diagram', block: { ...callout(), html: '<script>bad()</script>' } }] })), /forbidden/);
  await assert.rejects(tool.execute(request({ operations: [{ op: 'add', targetId: 'workflow-diagram', block: callout() }, { op: 'focus', targetId: 'workflow-diagram' }] })), /focused automatically/);
});

test('only document.modelContext is resolved; navigator legacy host is ignored', () => {
  const standard = { registerTool() {} };
  assert.equal(resolveWebMcpHost({ document: { modelContext: standard }, navigator: { modelContext: {} } }).modelContext, standard); assert.equal(resolveWebMcpHost({ document: {}, navigator: { modelContext: standard } }).modelContext, null);
});

test('registration awaits the tool then verifies the exact registration with getTools', async () => {
  const order = []; const registered = []; const host = { registerTool: async (tool) => { order.push(`start:${tool.name}`); await Promise.resolve(); registered.push(tool); order.push(`end:${tool.name}`); }, getTools: async () => { order.push('getTools'); return registered; } };
  const status = registerWebMcpTools(workspace(), host); await status.ready;
  assert.deepEqual(order, ['start:explain_tool', 'end:explain_tool', 'getTools']); assert.equal(status.ok, true); assert.equal(status.verified, true);
});

test('rejected registration and extra or duplicate descriptors never verify', async () => {
  const rejected = registerWebMcpTools(workspace(), { registerTool: async () => { throw new Error('denied'); }, getTools: async () => [] }); await rejected.ready;
  assert.equal(rejected.ok, false); assert.deepEqual(rejected.errors, [{ name: 'explain_tool', message: 'denied' }]);
  for (const available of [[{ name: 'explain_tool' }, { name: 'extra' }], [{ name: 'explain_tool' }, { name: 'explain_tool' }]]) {
    const status = registerWebMcpTools(workspace(), { registerTool: async () => {}, getTools: async () => available }); await status.ready; assert.equal(status.verified, false);
  }
});

test('issue 161 registerSkill failure leaves the standard tool verified', async () => {
  const registered = []; const host = { registerTool: async (tool) => registered.push(tool), getTools: async () => registered, registerSkill: async () => { throw new Error('experimental API rejected'); } };
  const status = registerWebMcpTools(workspace(), host, { standardHost: true, hostSource: 'document.modelContext' }); await status.ready;
  assert.equal(status.skillRegistrationState, 'error'); assert.equal(status.ok, true); assert.equal(status.verified, true);
});

test('execute honors AbortSignal', async () => {
  const controller = new AbortController(); controller.abort(new Error('cancelled by host'));
  await assert.rejects(tools().get('explain_tool').execute({}, { signal: controller.signal }), /cancelled by host/);
});

test('bootstrap metadata is Protocol v5 and keeps repository guidance', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8'); const bootstrap = JSON.parse(html.match(/<script id="explain-him-agent-bootstrap" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(bootstrap.protocolVersion, 5); assert.deepEqual(bootstrap.tools, EXPLAIN_HIM_WEBMCP_TOOLS); assert.equal(bootstrap.additionalInformation, ADDITIONAL_INFORMATION);
});
