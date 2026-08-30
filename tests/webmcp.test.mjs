import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPLAIN_HIM_WEBMCP_TOOLS, createWebMcpTools, registerWebMcpTools, resolveWebMcpHost } from '../runtime/webmcp.mjs';
import { createInitialWorkspace, materializeWorkspace, appendTransaction } from '../runtime/workspace.mjs';

function node(id, title) { return { dataset: { ehBlockId: id }, querySelector: () => ({ textContent: title }), classList: { add() {} }, closest: () => null, scrollIntoView() {} }; }
function workspace() {
  const nodes = [node('workflow-diagram', 'Who is in the explanation?'), node('flow-model', 'Mechanism')];
  let state = createInitialWorkspace({ explanationId: 'test', baseRevision: 'r1' });
  const document = { querySelectorAll: (selector) => selector === '[data-eh-block-id]' ? nodes : [] };
  return {
    document,
    getContext: () => ({ explanationId: 'test', baseRevision: 'r1', workspaceRevision: state.revision, authoredTargetIds: nodes.map((item) => item.dataset.ehBlockId) }),
    getVisibleState: () => materializeWorkspace(state, { canonicalIds: nodes.map((item) => item.dataset.ehBlockId) }),
    getLocalChangeHistory: () => ({ transactions: state.transactions }),
    applyTransaction: async (operations, options) => { state = appendTransaction(state, operations, options); },
    attachTransactionResult: async (transactionId, result) => { state.transactions.find((item) => item.id === transactionId).result = result; },
    focusBlock: ({ targetId, blockId }) => {
      const local = materializeWorkspace(state, { canonicalIds: nodes.map((item) => item.dataset.ehBlockId) }).presentations
        .find((item) => (blockId && item.id === blockId) || (!blockId && item.targetId === targetId && item.placement === 'replace'));
      return local ? { targetId: targetId || local.targetId, blockId: local.id, localPresentation: true } : { targetId, blockId };
    }
  };
}
function toolMap(subject = workspace()) { return new Map(createWebMcpTools(subject).map((tool) => [tool.name, tool])); }
const diagram = (title = 'User terminology') => ({ type: 'diagram', title, variant: 'flow', nodes: [{ id: 'user', label: 'User' }, { id: 'agent', label: 'Agent' }], edges: [{ from: 'user', to: 'agent', label: 'asks' }], sources: [{ path: 'resolutions/2026-08-30-user-consumer-terminology.md', status: 'current' }] });

test('surface remains exactly two tools and contract exposes v2 discovery', async () => {
  assert.deepEqual(EXPLAIN_HIM_WEBMCP_TOOLS, ['get_explanation_contract', 'apply_explanation']);
  const contract = await toolMap().get('get_explanation_contract').execute({});
  assert.equal(contract.schemaVersion, 'explain-him-webmcp-contract.v2');
  assert.ok(contract.repository.url.startsWith('https://github.com/'));
  assert.deepEqual(contract.applyOperations, ['add', 'replace', 'update', 'remove', 'focus']);
  assert.equal(contract.targets[0].replaceable, true);
  assert.deepEqual(contract.skillLoadOrder, ['explain-him', 'explain-him-presentation']);
});

test('registered apply descriptor exposes complete typed operation JSON Schema', async () => {
  const registered = new Map(); const host = { registerTool: async (tool) => registered.set(tool.name, tool), getTools: async () => [...registered.values()] };
  const status = registerWebMcpTools(workspace(), host); await status.ready;
  const schema = registered.get('apply_explanation').inputSchema;
  assert.equal(schema.additionalProperties, false);
  const variants = schema.properties.operations.items.oneOf;
  assert.equal(variants.length, 5);
  const byOp = new Map(variants.map((variant) => [variant.properties.op.const, variant]));
  for (const op of ['add', 'replace', 'update', 'remove', 'focus']) assert.ok(byOp.has(op));
  for (const op of ['add', 'replace', 'update', 'remove']) assert.equal(byOp.get(op).additionalProperties, false);
  assert.deepEqual(byOp.get('add').required, ['op', 'targetId', 'block']);
  assert.deepEqual(byOp.get('replace').required, ['op', 'targetId', 'block']);
  assert.deepEqual(byOp.get('update').required, ['op', 'blockId', 'block']);
  assert.deepEqual(byOp.get('remove').required, ['op', 'blockId']);
  assert.equal(byOp.get('add').properties.block.oneOf.length, 5);
  assert.equal(byOp.get('focus').oneOf.length, 2);
});

test('P0 terminology replacement updates the same local ID and is atomic', async () => {
  const subject = workspace(); const tools = toolMap(subject); const tool = tools.get('apply_explanation');
  await tools.get('get_explanation_contract').execute({});
  const first = await tool.execute({ requestId: 'user-consumer', expectedWorkspaceRevision: 0, operations: [{ op: 'replace', targetId: 'workflow-diagram', block: diagram() }, { op: 'focus', targetId: 'workflow-diagram' }] });
  const id = first.localBlocks[0].id;
  assert.equal(first.applied[0].op, 'replace');
  assert.deepEqual(first.applied[1], { op: 'focus', targetId: 'workflow-diagram', blockId: id, localPresentation: true });
  const second = await tool.execute({ expectedWorkspaceRevision: first.workspaceRevision, operations: [{ op: 'update', blockId: id, block: diagram('Consumer terminology') }] });
  assert.equal(second.localBlocks[0].id, id);
  assert.equal(second.localBlocks[0].title, 'Consumer terminology');
});

test('invalid batch and stale revision leave state untouched', async () => {
  const subject = workspace(); const tools = toolMap(subject); const tool = tools.get('apply_explanation');
  await tools.get('get_explanation_contract').execute({});
  await assert.rejects(tool.execute({ expectedWorkspaceRevision: 1, operations: [{ op: 'replace', targetId: 'workflow-diagram', block: diagram() }] }), /Stale/);
  await assert.rejects(tool.execute({ operations: [{ op: 'replace', targetId: 'workflow-diagram', block: diagram() }, { op: 'add', targetId: 'missing', block: diagram() }] }), /Unknown authored target/);
  await assert.rejects(tool.execute({ operations: [{ op: 'replace', targetId: 'workflow-diagram', block: diagram() }, { op: 'focus', targetId: 'missing' }] }), /Unknown authored target/);
  assert.equal(subject.getVisibleState().presentations.length, 0);
});

test('dangerous executable channels fail closed and retries are idempotent', async () => {
  const subject = workspace(); const tools = toolMap(subject); const tool = tools.get('apply_explanation');
  await tools.get('get_explanation_contract').execute({});
  await assert.rejects(tool.execute({ operations: [{ op: 'add', targetId: 'flow-model', block: { ...diagram(), html: '<script>bad()</script>' } }] }), /forbidden/);
  await tool.execute({ requestId: 'retry', operations: [{ op: 'add', targetId: 'flow-model', block: diagram() }] });
  const retried = await tool.execute({ requestId: 'retry', expectedWorkspaceRevision: 999, operations: [{ op: 'add', targetId: 'flow-model', block: diagram() }] });
  assert.equal(retried.idempotent, true);
  assert.equal(subject.getVisibleState().presentations.length, 1);
  await assert.rejects(tool.execute({ requestId: 'retry', operations: [{ op: 'add', targetId: 'workflow-diagram', block: diagram('Different') }] }), /different payload/);
});

test('apply_explanation requires contract discovery in the current page session', async () => {
  const tool = toolMap().get('apply_explanation');
  await assert.rejects(tool.execute({ operations: [{ op: 'add', targetId: 'flow-model', block: diagram() }] }), /get_explanation_contract/);
});

test('standard document.modelContext is preferred and both tools register', async () => {
  const registered = new Map(); const host = { registerTool: async (tool) => registered.set(tool.name, tool), getTools: async () => [...registered.values()] };
  const resolved = resolveWebMcpHost({ document: { modelContext: host }, navigator: { modelContext: { registerTool() {} } } });
  assert.equal(resolved.source, 'document.modelContext');
  const status = registerWebMcpTools(workspace(), null, { environment: { document: { modelContext: host }, navigator: {} } }); await status.ready;
  assert.equal(status.verified, true); assert.deepEqual([...registered.keys()], [...EXPLAIN_HIM_WEBMCP_TOOLS]);
});
