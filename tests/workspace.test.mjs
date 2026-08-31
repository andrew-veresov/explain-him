import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_WORKSPACE_SCHEMA_VERSION,
  OLDER_WORKSPACE_SCHEMA_VERSION,
  PREVIOUS_WORKSPACE_SCHEMA_VERSION,
  WORKSPACE_SCHEMA_VERSION,
  appendTransaction,
  createAddBlockOperation,
  createInitialWorkspace,
  createRemoveBlockOperation,
  createUpdatePresentationOperation,
  focusAuthoredBlock,
  materializeWorkspace,
  migrateWorkspaceState,
  redoWorkspace,
  setWorkspaceViewMode,
  undoWorkspace
} from '../runtime/workspace.mjs';

function block(id, targetId = 'workflow-diagram', title = 'Personal') {
  return createAddBlockOperation({ targetId, kind: 'summary', title, body: title }, { id, createdAt: '2026-08-30T00:00:00Z' });
}

test('one transaction is one undo step and replacement remains local', () => {
  let state = createInitialWorkspace({ explanationId: 'demo', baseRevision: 'r1' });
  state = appendTransaction(state, [block('local-a'), block('local-b', 'flow-model')], { requestId: 'turn-1' });
  assert.equal(materializeWorkspace(state, { canonicalIds: ['workflow-diagram', 'flow-model'] }).presentations.length, 2);
  state = undoWorkspace(state);
  assert.equal(materializeWorkspace(state, { canonicalIds: ['workflow-diagram', 'flow-model'] }).presentations.length, 0);
  state = redoWorkspace(state);
  assert.equal(materializeWorkspace(state, { canonicalIds: ['workflow-diagram', 'flow-model'] }).presentations.length, 2);
});

test('update preserves the local identifier', () => {
  let state = createInitialWorkspace({ explanationId: 'demo', baseRevision: 'r1' });
  state = appendTransaction(state, [block('local-user')]);
  state = appendTransaction(state, [createUpdatePresentationOperation('local-user', { artifact: block('local-temp', 'workflow-diagram', 'User').presentation.artifact })]);
  const item = materializeWorkspace(state, { canonicalIds: ['workflow-diagram'] }).presentations[0];
  assert.equal(item.id, 'local-user');
  assert.equal(item.artifact.fallback.title, 'User');
});

test('original mode retains local changes without rendering them', () => {
  let state = createInitialWorkspace({ explanationId: 'demo', baseRevision: 'r1' });
  state = appendTransaction(state, [block('local-user')]);
  state = setWorkspaceViewMode(state, 'original');
  const view = materializeWorkspace(state, { canonicalIds: ['workflow-diagram'] });
  assert.equal(view.viewMode, 'original');
  assert.equal(view.presentations.length, 1);
});

test('v1, v2, and v3 workspace data migrates into v4 topic-aware transactions', () => {
  const v1 = migrateWorkspaceState({ schemaVersion: LEGACY_WORKSPACE_SCHEMA_VERSION, explanationId: 'demo', baseRevision: 'r1', cursor: 1, operations: [{ type: 'add-block', block: { id: 'local-old', targetId: 'workflow-diagram', kind: 'summary', title: 'Old', body: 'Body' } }] });
  const v2 = migrateWorkspaceState({ schemaVersion: OLDER_WORKSPACE_SCHEMA_VERSION, explanationId: 'demo', baseRevision: 'r1', cursor: 1, operations: [block('local-v2')] });
  const v3 = migrateWorkspaceState({ schemaVersion: PREVIOUS_WORKSPACE_SCHEMA_VERSION, explanationId: 'demo', baseRevision: 'r1', cursor: 1, revision: 1, viewMode: 'personalized', transactions: [{ id: 'local-v3', requestId: null, requestFingerprint: null, result: null, actor: { kind: 'agent', channel: 'test' }, createdAt: '2026-01-01T00:00:00Z', operations: [block('local-v3-block')] }] });
  assert.equal(v1.schemaVersion, WORKSPACE_SCHEMA_VERSION);
  assert.equal(v2.schemaVersion, WORKSPACE_SCHEMA_VERSION);
  assert.equal(v3.schemaVersion, WORKSPACE_SCHEMA_VERSION);
  assert.equal(v1.transactions[0].operations[0].type, 'add-presentation');
  assert.equal(v3.transactions[0].operations[0].presentation.topicId, null);
});

test('only local blocks can be removed and orphaning remains explicit', () => {
  assert.throws(() => createRemoveBlockOperation('workflow-diagram'), /local/);
  let state = createInitialWorkspace({ explanationId: 'demo', baseRevision: 'r1' });
  state = appendTransaction(state, [block('local-old', 'old')]);
  assert.equal(materializeWorkspace(state, { canonicalIds: ['new'], baseRevision: 'r2' }).presentations[0].orphaned, true);
});

test('focusing a hidden section synchronizes its active tab and label', () => {
  const target = { dataset: { ehBlockId: 'grounding-contract' }, classList: { add() {} }, closest: () => grounding, scrollIntoView() {} };
  const flow = { dataset: { sectionPanel: 'flow' }, hidden: false, classList: { toggle() {} } };
  const grounding = { dataset: { sectionPanel: 'grounding' }, hidden: true, classList: { toggle() {} } };
  const tabState = () => ({ values: {}, toggle() {}, setAttribute(key, value) { this.values[key] = value; }, removeAttribute(key) { delete this.values[key]; } });
  const flowTab = { dataset: { section: 'flow' }, textContent: 'Mechanism', classList: tabState(), setAttribute(key, value) { this.values ||= {}; this.values[key] = value; }, removeAttribute(key) { delete this.values?.[key]; } };
  const groundingTab = { dataset: { section: 'grounding' }, textContent: 'Grounding', classList: tabState(), setAttribute(key, value) { this.values ||= {}; this.values[key] = value; }, removeAttribute(key) { delete this.values?.[key]; } };
  const label = { textContent: 'Mechanism' };
  const document = { querySelector: () => target, querySelectorAll: (selector) => selector === '[data-section-panel]' ? [flow, grounding] : selector === '[data-section]' ? [flowTab, groundingTab] : [], getElementById: () => label };
  focusAuthoredBlock(document, 'grounding-contract');
  assert.equal(grounding.hidden, false);
  assert.equal(flow.hidden, true);
  assert.equal(groundingTab.values['aria-selected'], 'true');
  assert.equal(groundingTab.values['aria-current'], 'page');
  assert.equal(label.textContent, 'Grounding');
});
