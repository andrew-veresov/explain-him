import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EXPLAIN_HIM_REPOSITORY, EXPLAIN_HIM_REPOSITORY_URL, EXPLAIN_HIM_SKILL_COMMIT, EXPLAIN_HIM_WEBMCP_TOOLS, GROUNDING_SOURCE_INDEX, IMMUTABLE_SKILL_PROOF, WEBMCP_PROTOCOL_VERSION, createWebMcpTools, registerWebMcpTools, resolveWebMcpHost } from '../runtime/webmcp.mjs';
import { appendTransaction, createInitialWorkspace, materializeWorkspace } from '../runtime/workspace.mjs';

function workspace() { const nodes = ['workflow-diagram', 'flow-model'].map((id) => ({ dataset: { ehBlockId: id }, querySelector: () => ({ textContent: id }) })); let state = createInitialWorkspace({ explanationId: 'test', baseRevision: 'r1' }); return { document: { querySelectorAll: () => nodes }, getContext: () => ({ explanationId: 'test', baseRevision: 'r1', workspaceRevision: state.revision, authoredTargetIds: nodes.map((node) => node.dataset.ehBlockId) }), getVisibleState: () => materializeWorkspace(state, { canonicalIds: nodes.map((node) => node.dataset.ehBlockId) }), getLocalChangeHistory: () => ({ transactions: state.transactions }), applyTransaction: async (operations, options) => { state = appendTransaction(state, operations, options); }, attachTransactionResult: async (id, result) => { state.transactions.find((item) => item.id === id).result = result; }, focusBlock: ({ targetId, blockId }) => ({ targetId, blockId }) }; }
const diagram = (title = 'User terminology') => ({ type: 'diagram', title, variant: 'flow', nodes: [{ id: 'user', label: 'User' }, { id: 'agent', label: 'Agent' }], edges: [{ from: 'user', to: 'agent', label: 'asks' }], sources: [{ path: 'resolutions/2026-08-30-user-consumer-terminology.md', status: 'current' }] });
function tools(subject = workspace()) { return new Map(createWebMcpTools(subject).map((tool) => [tool.name, tool])); }
function request(contract, { requestId = 'request-1', topicId = 'terminology:user-consumer', expectedWorkspaceRevision = contract.workspaceRevision, operations } = {}) { return { requestId, expectedWorkspaceRevision, explanationId: contract.explanationId, topicId, operations, handshake: { bootstrapTool: contract.bootstrapTool, contractId: contract.contractId, activationId: contract.activation.id, nonce: contract.activation.nonce, baseRevision: contract.baseRevision, skillProof: contract.skillProof } }; }

test('surface remains exactly two tools and answer bootstrap exposes pinned A6 Protocol v3 workflow', async () => {
  const map = tools();
  const contract = await map.get('get_explain_him_answer').execute({});
  const repeated = await map.get('get_explain_him_answer').execute({});
  const bootstrap = map.get('get_explain_him_answer');
  const apply = map.get('apply_explanation');
  assert.deepEqual(EXPLAIN_HIM_WEBMCP_TOOLS, ['get_explain_him_answer', 'apply_explanation']);
  assert.equal(contract.bootstrapTool, 'get_explain_him_answer');
  assert.equal(contract.answerWorkflow.schemaVersion, 'explain-him-answer-workflow.v1');
  assert.equal(contract.answerWorkflow.requiredBeforeAnyExplainHimAnswer, true);
  assert.deepEqual(contract.answerWorkflow.steps.map(({ order, id }) => ({ order, id })), [
    { order: 1, id: 'verify-contract-and-revision' },
    { order: 2, id: 'load-pinned-skills' },
    { order: 3, id: 'inspect-visible-authored-page' },
    { order: 4, id: 'retrieve-minimum-grounding-sources' },
    { order: 5, id: 'form-grounded-chat-answer' },
    { order: 6, id: 'decide-presentation-operation' },
    { order: 7, id: 'apply-required-adaptation' },
    { order: 8, id: 'confirm-workspace-revision' },
    { order: 9, id: 'disclose-failure' },
    { order: 10, id: 'restore-on-request' },
  ]);
  assert.deepEqual(Object.keys(contract.toolUsage), ['get_explain_him_answer', 'apply_explanation']);
  assert.equal(contract.schemaVersion, 'explain-him-webmcp-contract.v3');
  assert.equal(contract.protocolVersion, 3);
  assert.equal(contract.activation.id, repeated.activation.id);
  assert.equal(contract.activation.nonce, repeated.activation.nonce);
  assert.equal(contract.contractId, repeated.contractId);
  assert.equal(contract.workspaceRevision, repeated.workspaceRevision);
  assert.equal(contract.skills[0].rawUrl.includes('/e7da9515f5ea444b5919a99477bcbc8e56e03edd/'), true);
  assert.deepEqual(contract.skillProof.map((item) => item.sha256), IMMUTABLE_SKILL_PROOF.map((item) => item.sha256));
  assert.deepEqual(contract.skillProof.map((item) => item.sha256), [
    'badedfe003582f7fc54eaf862fdbf55e4aec4311dba1c27249229d1a629a4434',
    '3e8a618543ae59db47c784a25c070c3fccfae3e1bfdc9734907910cfdb094e4e',
  ]);
  assert.equal(contract.repository.skillsCommit, 'e7da9515f5ea444b5919a99477bcbc8e56e03edd');
  assert.equal(contract.blockSchema.url, '/explain-him/schemas/explanation-block.v1.schema.json');
  assert.equal(contract.handshakeSchema.url, '/explain-him/schemas/webmcp-apply.v3.schema.json');
  assert.notEqual(contract.skills[0].rawUrl, contract.handshakeSchema.url);
  assert.equal(contract.agentPolicy.revision, 'A6');
  assert.equal(contract.agentPolicy.repositoryRetrievalRequiredWhenPageInsufficient, true);
  assert.deepEqual(contract.agentPolicy.decisionPrecedence, ['explicitNoPageChange', 'restore', 'terminologyConsistency', 'answerPresence']);
  assert.deepEqual(contract.agentPolicy.terminologyConsistency, { equivalentLabels: ['User', 'Consumer'], equivalenceNoteDoesNotMakeMixedLabelsConsistent: true, questionTriggersSameTurnNormalization: true, defaultTerm: 'User', distinctRoles: 'never-normalize', firstCorrection: { topicId: 'terminology:user-consumer', targetId: 'workflow-diagram', operation: 'replace' }, sameTopicFollowUp: { operation: 'update', reuseLocalBlockId: true }, restore: { operation: 'remove' } });
  assert.equal(contract.agentPolicy.presentationDecision.alwaysProvideChatAnswer, true);
  assert.equal(contract.agentPolicy.presentationDecision.fullyPresent.ordinaryQuestion, 'chat-only');
  assert.equal(contract.agentPolicy.failure.applyFailure, 'honest-acknowledgement-no-false-success');
  assert.equal(bootstrap.title, 'Get Explain Him Answer Workflow');
  assert.match(bootstrap.description, /MUST ALWAYS be called first and before answering ANY question about Explain Him or the current Explain Him page/);
  assert.match(bootstrap.description, /immutable pinned skills and grounding source index/);
  assert.equal(bootstrap.annotations.readOnlyHint, true);
  assert.equal(bootstrap.annotations.untrustedContentHint, true);
  assert.equal(apply.title, 'Keep Personalized UI Consistent');
  assert.match(apply.description, /same turn whenever the returned policy identifies missing, partial, or inconsistent visible Personalized UI/);
  assert.match(apply.description, /bounded add, replace, update, remove, or focus operations/);
  assert.match(apply.description, /complete A6 Protocol v3 handshake/);
});

test('A6 answer bootstrap pins the minimum repository source for insufficient visible answers', async () => {
  const map = tools();
  const contract = await map.get('get_explain_him_answer').execute({});
  assert.equal(contract.agentPolicy.revision, 'A6');
  assert.equal(contract.agentPolicy.repositoryRetrievalRequiredWhenPageInsufficient, true);
  assert.deepEqual(contract.groundingSourceIndex, [{
    topic: 'originator-publishing',
    path: 'knowledge/01-originator-flow.md',
    section: 'Basic flow',
    status: 'current',
    rawUrl: 'https://raw.githubusercontent.com/andrew-veresov/explain-him/e7da9515f5ea444b5919a99477bcbc8e56e03edd/knowledge/01-originator-flow.md',
    commit: 'e7da9515f5ea444b5919a99477bcbc8e56e03edd',
    sha256: 'cf7a396231a50a18c37a9c52ddc7c7315c07cf4107b6dea524760eaa630f3659'
  }, {
    topic: 'originator-publishing',
    path: 'PRODUCT-CONTRACT.md',
    section: 'Authoring and publishing reality',
    status: 'current',
    rawUrl: 'https://raw.githubusercontent.com/andrew-veresov/explain-him/e7da9515f5ea444b5919a99477bcbc8e56e03edd/PRODUCT-CONTRACT.md',
    commit: 'e7da9515f5ea444b5919a99477bcbc8e56e03edd',
    sha256: '0df8585ee8293165b936d803eb095bba19e62a32fbd7745db284003ef78b4006'
  }]);
  assert.match(map.get('get_explain_him_answer').description, /grounding source index/i);
  assert.match(map.get('get_explain_him_answer').description, /visible UI is insufficient/i);

  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const bootstrap = JSON.parse(html.match(/<script id="explain-him-agent-bootstrap" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(bootstrap.repositoryRetrievalRequiredWhenPageInsufficient, true);
  assert.deepEqual(bootstrap.groundingSourceIndex, contract.groundingSourceIndex);
});

test('apply schema requires the complete nested v3 handshake', async () => { const registered = new Map(); const host = { registerTool: async (tool) => registered.set(tool.name, tool), getTools: async () => [...registered.values()] }; const status = registerWebMcpTools(workspace(), host); await status.ready; const schema = registered.get('apply_explanation').inputSchema; assert.equal(schema.additionalProperties, false); for (const field of ['requestId', 'expectedWorkspaceRevision', 'explanationId', 'topicId', 'operations', 'handshake']) assert.ok(schema.required.includes(field)); for (const field of ['bootstrapTool', 'contractId', 'activationId', 'nonce', 'baseRevision', 'skillProof']) assert.ok(schema.properties.handshake.required.includes(field)); assert.equal(schema.properties.handshake.properties.bootstrapTool.const, 'get_explain_him_answer'); assert.equal(schema.properties.operations.items.oneOf.length, 5); });

test('same tools instance keeps activation identity while refreshing workspace fields', async () => { const subject = workspace(); const map = tools(subject); const first = await map.get('get_explain_him_answer').execute({}); await map.get('apply_explanation').execute(request(first, { operations: [{ op: 'replace', targetId: 'workflow-diagram', block: diagram() }] })); const refreshed = await map.get('get_explain_him_answer').execute({}); assert.equal(refreshed.contractId, first.contractId); assert.deepEqual(refreshed.activation, first.activation); assert.equal(refreshed.workspaceRevision, 1); assert.equal(refreshed.localBlocks.length, 1); });

test('replace, update, and remove preserve topic-local ID and semantic retries', async () => { const subject = workspace(); const map = tools(subject); const contract = await map.get('get_explain_him_answer').execute({}); const apply = map.get('apply_explanation'); const firstInput = request(contract, { operations: [{ op: 'replace', targetId: 'workflow-diagram', block: diagram() }] }); const first = await apply.execute(firstInput); const id = first.localBlocks[0].id; const retry = await apply.execute({ ...firstInput, expectedWorkspaceRevision: 999 }); assert.equal(retry.idempotent, true); const second = await apply.execute(request(contract, { requestId: 'request-2', expectedWorkspaceRevision: first.workspaceRevision, operations: [{ op: 'update', blockId: id, block: diagram('Consumer terminology') }] })); assert.equal(second.localBlocks[0].id, id); const third = await apply.execute(request(contract, { requestId: 'request-3', expectedWorkspaceRevision: second.workspaceRevision, operations: [{ op: 'remove', blockId: id }] })); assert.equal(third.localBlocks.length, 0); });

test('handshake, topic, duplicate, and executable-content violations fail closed', async () => { const subject = workspace(); const map = tools(subject); const contract = await map.get('get_explain_him_answer').execute({}); const apply = map.get('apply_explanation'); await assert.rejects(apply.execute({ operations: [] }), /Missing required v3 handshake field/); const badNonce = request(contract, { operations: [{ op: 'add', targetId: 'flow-model', block: diagram() }] }); badNonce.handshake.nonce = 'wrong'; await assert.rejects(apply.execute(badNonce), /stale/); const first = await apply.execute(request(contract, { operations: [{ op: 'add', targetId: 'flow-model', block: diagram() }] })); const id = first.localBlocks[0].id; await assert.rejects(apply.execute(request(contract, { requestId: 'other-topic', expectedWorkspaceRevision: first.workspaceRevision, topicId: 'terminology:other', operations: [{ op: 'update', blockId: id, block: diagram() }] })), /different topic/); await assert.rejects(apply.execute(request(contract, { requestId: 'duplicate', expectedWorkspaceRevision: first.workspaceRevision, operations: [{ op: 'add', targetId: 'flow-model', block: diagram() }] })), /Duplicate/); await assert.rejects(apply.execute(request(contract, { requestId: 'executable', expectedWorkspaceRevision: first.workspaceRevision, operations: [{ op: 'add', targetId: 'workflow-diagram', block: { ...diagram(), html: '<script>bad()</script>' } }] })), /forbidden/); });

test('apply rejects proof obtained from the retired bootstrap tool identity', async () => { const map = tools(); const contract = await map.get('get_explain_him_answer').execute({}); const input = request(contract, { operations: [{ op: 'focus', targetId: 'flow-model' }] }); input.handshake.bootstrapTool = 'get_explanation_contract'; await assert.rejects(map.get('apply_explanation').execute(input), /older bootstrap identities are not accepted/); });

test('v3 rejects unknown nested properties, reordered proof, replay, stale revisions, and an atomic rejected batch', async () => { const subject = workspace(); const map = tools(subject); const contract = await map.get('get_explain_him_answer').execute({}); const apply = map.get('apply_explanation'); const valid = request(contract, { operations: [{ op: 'replace', targetId: 'workflow-diagram', block: diagram() }] }); for (const [value, expected] of [[{ ...valid, extra: true }, /Unknown apply/], [{ ...valid, handshake: { ...valid.handshake, extra: true } }, /Unknown handshake/], [{ ...valid, handshake: { ...valid.handshake, skillProof: [{ ...valid.handshake.skillProof[0], extra: true }, valid.handshake.skillProof[1]] } }, /skillProof/], [{ ...valid, operations: [{ ...valid.operations[0], extra: true }] }, /Unknown operation/], [{ ...valid, operations: [{ ...valid.operations[0], block: { ...valid.operations[0].block, extra: true } }] }, /Unknown block/], [{ ...valid, handshake: { ...valid.handshake, skillProof: [...valid.handshake.skillProof].reverse() } }, /skillProof/]]) await assert.rejects(apply.execute(value), expected); const before = subject.getContext().workspaceRevision; await assert.rejects(apply.execute(request(contract, { operations: [valid.operations[0], { op: 'replace', targetId: 'missing', block: diagram() }] })), /Unknown authored target/); assert.equal(subject.getContext().workspaceRevision, before); const applied = await apply.execute(valid); await assert.rejects(apply.execute(request(contract, { requestId: 'stale', expectedWorkspaceRevision: 0, operations: [{ op: 'focus', targetId: 'flow-model' }] })), /Stale workspace revision/); await assert.rejects(apply.execute({ ...valid, operations: [{ op: 'update', blockId: applied.localBlocks[0].id, block: diagram('Changed') }] }), /different semantic/); const other = tools(subject); const otherContract = await other.get('get_explain_him_answer').execute({}); await assert.rejects(other.get('apply_explanation').execute(request(contract, { requestId: 'cross-activation', expectedWorkspaceRevision: applied.workspaceRevision, operations: [{ op: 'remove', blockId: applied.localBlocks[0].id }] })), /stale/); assert.notEqual(contract.activation.id, otherContract.activation.id); });

test('runtime rejects optional nulls and invalid enum values exactly as the v3 schema does', async () => { const map = tools(); const contract = await map.get('get_explain_him_answer').execute({}); const apply = map.get('apply_explanation'); const callout = { type: 'callout', title: 'Terminology', body: 'User and Consumer name one role.', sources: [] }; const invalid = [[{ ...callout, tone: 'loud' }, /block.tone/], [{ ...callout, tone: null }, /block.tone/], [{ ...diagram(), variant: 'radial' }, /diagram.variant/], [{ ...diagram(), variant: null }, /diagram.variant/], [{ ...diagram(), nodes: [{ id: 'user', label: 'User', body: null }, { id: 'agent', label: 'Agent' }] }, /diagram.nodes.body/], [{ ...diagram(), edges: [{ from: 'user', to: 'agent', label: null }] }, /diagram.edges.label/], [{ ...diagram(), sources: [{ path: 'resolutions/terminology.md', ref: null }] }, /source.ref/]]; for (let index = 0; index < invalid.length; index += 1) await assert.rejects(apply.execute(request(contract, { requestId: `optional-${index}`, operations: [{ op: 'add', targetId: 'flow-model', block: invalid[index][0] }] })), invalid[index][1]); await assert.rejects(apply.execute(request(contract, { requestId: 'focus-both', operations: [{ op: 'focus', targetId: 'flow-model', blockId: 'local-nope' }] })), /exactly one/); await assert.rejects(apply.execute(request(contract, { requestId: 'add-null-id', operations: [{ op: 'add', targetId: 'flow-model', blockId: null, block: callout }] })), /operation.blockId/); });

test('focus-only is replay-safe and does not change workspace revision', async () => { const subject = workspace(); const map = tools(subject); const contract = await map.get('get_explain_him_answer').execute({}); const input = request(contract, { operations: [{ op: 'focus', targetId: 'flow-model' }] }); const first = await map.get('apply_explanation').execute(input); const second = await map.get('apply_explanation').execute(input); assert.equal(first.workspaceRevision, contract.workspaceRevision); assert.equal(second.idempotent, true); });

test('standard document.modelContext is preferred and both tools register', async () => { const registered = new Map(); const host = { registerTool: async (tool) => registered.set(tool.name, tool), getTools: async () => [...registered.values()] }; assert.equal(resolveWebMcpHost({ document: { modelContext: host }, navigator: {} }).source, 'document.modelContext'); const status = registerWebMcpTools(workspace(), host); await status.ready; assert.equal(status.verified, true); assert.deepEqual([...registered.keys()], [...EXPLAIN_HIM_WEBMCP_TOOLS]); });

test('descriptors register before a delayed workspace finishes initialization', async () => {
  let resolveWorkspace;
  const delayedWorkspace = new Promise((resolve) => { resolveWorkspace = resolve; });
  const registered = new Map();
  const host = { registerTool: async (tool) => registered.set(tool.name, tool), getTools: async () => [...registered.values()] };
  const status = registerWebMcpTools(delayedWorkspace, host);
  await status.ready;
  assert.equal(status.verified, true);
  assert.deepEqual([...registered.keys()], [...EXPLAIN_HIM_WEBMCP_TOOLS]);
  resolveWorkspace(workspace());
  const contract = await registered.get('get_explain_him_answer').execute({});
  assert.equal(contract.schemaVersion, 'explain-him-webmcp-contract.v3');
});

test('lifecycle events expose only safe status fields and never report success after failure', async () => {
  const events = [];
  const map = new Map(createWebMcpTools(workspace(), { onLifecycle: (event) => events.push(event) }).map((tool) => [tool.name, tool]));
  const contract = await map.get('get_explain_him_answer').execute({});
  const applied = await map.get('apply_explanation').execute(request(contract, { operations: [{ op: 'replace', targetId: 'workflow-diagram', block: diagram() }] }));
  await assert.rejects(map.get('apply_explanation').execute(request(contract, { requestId: 'bad-revision', expectedWorkspaceRevision: 0, operations: [{ op: 'remove', blockId: applied.localBlocks[0].id }] })), /Stale workspace revision/);
  assert.deepEqual(events.map((event) => event.type), ['answer-bootstrap-invoked', 'apply-started', 'apply-succeeded', 'apply-started', 'apply-failed']);
  assert.deepEqual(Object.keys(events[0]).sort(), ['type', 'workspaceRevision']);
  assert.deepEqual(Object.keys(events[2]).sort(), ['localBlockIds', 'operations', 'topicId', 'type', 'workspaceRevision']);
  assert.deepEqual(Object.keys(events[4]).sort(), ['errorCode', 'topicId', 'type', 'workspaceRevision']);
  assert.equal(events[4].errorCode, 'conflict');
  assert.equal(events.some((event) => JSON.stringify(event).includes(contract.activation.nonce)), false);
  assert.equal(events.filter((event) => event.type === 'apply-succeeded').length, 1);
});

test('machine-readable bootstrap metadata matches the runtime pins exactly', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const match = html.match(/<script id="explain-him-agent-bootstrap" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'bootstrap metadata script must exist');
  const bootstrap = JSON.parse(match[1]);
  assert.equal(bootstrap.schemaVersion, 'explain-him-agent-bootstrap.v1');
  assert.equal(bootstrap.protocolVersion, WEBMCP_PROTOCOL_VERSION);
  assert.deepEqual(bootstrap.repository, { fullName: EXPLAIN_HIM_REPOSITORY, url: EXPLAIN_HIM_REPOSITORY_URL, skillsCommit: EXPLAIN_HIM_SKILL_COMMIT });
  assert.deepEqual(bootstrap.tools, EXPLAIN_HIM_WEBMCP_TOOLS);
  assert.equal(bootstrap.repositoryRetrievalRequiredWhenPageInsufficient, true);
  assert.deepEqual(bootstrap.skillLoadOrder, IMMUTABLE_SKILL_PROOF.map((item) => item.id));
  assert.deepEqual(bootstrap.skills, IMMUTABLE_SKILL_PROOF.map(({ id, commit, sha256, url }) => ({ id, commit, sha256, rawUrl: url })));
  assert.deepEqual(bootstrap.groundingSourceIndex, GROUNDING_SOURCE_INDEX);
});

test('tool descriptors follow the current imperative WebMCP shape and bounded-action guidance', async () => {
  const descriptors = createWebMcpTools(workspace());
  assert.equal(descriptors.length, 2);
  for (const descriptor of descriptors) {
    assert.match(descriptor.name, /^[A-Za-z0-9_.-]{1,128}$/);
    assert.equal(typeof descriptor.title, 'string');
    assert.ok(descriptor.title.length > 0);
    assert.equal(typeof descriptor.description, 'string');
    assert.match(descriptor.description, /call this|Call this|be called/);
    assert.equal(descriptor.inputSchema.type, 'object');
    assert.equal(descriptor.inputSchema.additionalProperties, false);
    assert.equal(typeof descriptor.annotations.readOnlyHint, 'boolean');
    assert.equal(typeof descriptor.execute, 'function');
    const serialized = JSON.stringify(await descriptor.execute({}, { signal: new AbortController().signal }).catch((error) => ({ error: error.message })));
    assert.equal(typeof serialized, 'string');
  }
  assert.match(descriptors[0].description, /before answering ANY question/);
  assert.match(descriptors[1].description, /same turn/);
  assert.notEqual(descriptors[0].annotations.readOnlyHint, descriptors[1].annotations.readOnlyHint);
});

test('imperative callbacks honor the current WebMCP execution AbortSignal without false success', async () => {
  const events = [];
  const controller = new AbortController();
  controller.abort(new Error('cancelled by host'));
  const map = new Map(createWebMcpTools(workspace(), { onLifecycle: (event) => events.push(event) }).map((tool) => [tool.name, tool]));
  await assert.rejects(map.get('get_explain_him_answer').execute({}, { signal: controller.signal }), /cancelled by host/);
  await assert.rejects(map.get('apply_explanation').execute({}, { signal: controller.signal }), /cancelled by host/);
  assert.deepEqual(events.map((event) => event.type), ['apply-started', 'apply-failed']);
  assert.equal(events.some((event) => event.type === 'apply-succeeded'), false);
  assert.equal(events[1].errorCode, 'execution-error');
});
