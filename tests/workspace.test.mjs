import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_WORKSPACE_SCHEMA_VERSION,
  MemoryWorkspaceStore,
  appendOperation,
  createAddBlockOperation,
  createAddPresentationOperation,
  createInitialWorkspace,
  createRemoveBlockOperation,
  materializeWorkspace,
  migrateWorkspaceState,
  redoWorkspace,
  undoWorkspace
} from '../runtime/workspace.mjs';

test('add, remove, undo and redo are deterministic', () => {
  let state = createInitialWorkspace({ explanationId: 'demo', baseRevision: 'r1' });
  state = appendOperation(state, createAddBlockOperation({
    targetId: 'flow-model', kind: 'example', title: 'Example', body: 'Body'
  }, { id: 'local-1', createdAt: '2026-08-28T00:00:00Z' }));
  assert.equal(materializeWorkspace(state, { canonicalIds: ['flow-model'] }).presentations.length, 1);
  state = appendOperation(state, createRemoveBlockOperation('local-1'));
  assert.equal(materializeWorkspace(state, { canonicalIds: ['flow-model'] }).presentations.length, 0);
  state = undoWorkspace(state);
  assert.equal(materializeWorkspace(state, { canonicalIds: ['flow-model'] }).presentations.length, 1);
  state = redoWorkspace(state);
  assert.equal(materializeWorkspace(state, { canonicalIds: ['flow-model'] }).presentations.length, 0);
});

test('redo tail is discarded by a new operation', () => {
  let state = createInitialWorkspace({ explanationId: 'demo', baseRevision: 'r1' });
  state = appendOperation(state, createAddBlockOperation({ targetId: 'a', kind: 'summary', title: 'A', body: 'A' }, { id: 'local-a' }));
  state = appendOperation(state, createAddBlockOperation({ targetId: 'a', kind: 'summary', title: 'B', body: 'B' }, { id: 'local-b' }));
  state = undoWorkspace(state);
  state = appendOperation(state, createAddBlockOperation({ targetId: 'a', kind: 'summary', title: 'C', body: 'C' }, { id: 'local-c' }));
  const view = materializeWorkspace(state, { canonicalIds: ['a'] });
  assert.deepEqual(view.presentations.map((item) => item.id), ['local-a', 'local-c']);
  assert.equal(view.canRedo, false);
});

test('unknown target becomes orphaned after base change', () => {
  let state = createInitialWorkspace({ explanationId: 'demo', baseRevision: 'r1' });
  state = appendOperation(state, createAddBlockOperation({ targetId: 'old', kind: 'warning', title: 'Old', body: 'Old' }, { id: 'local-old' }));
  const view = materializeWorkspace(state, { canonicalIds: ['new'], baseRevision: 'r2' });
  assert.equal(view.baseRevisionChanged, true);
  assert.equal(view.presentations[0].orphaned, true);
});

test('only local presentations can be removed', () => {
  assert.throws(() => createRemoveBlockOperation('flow-model'), /local/);
});

test('memory store clones records', async () => {
  const store = new MemoryWorkspaceStore(); const record = { value: 1 };
  await store.save('x', record); record.value = 2; assert.deepEqual(await store.load('x'), { value: 1 });
});

test('legacy v1 operation log migrates to presentations', () => {
  const migrated = migrateWorkspaceState({
    schemaVersion: LEGACY_WORKSPACE_SCHEMA_VERSION, explanationId: 'demo', baseRevision: 'r1', cursor: 1,
    operations: [{ type: 'add-block', block: { id: 'local-old', targetId: 'a', kind: 'summary', title: 'Old', body: 'Body' } }]
  });
  assert.equal(migrated.schemaVersion, 'explain-him-local-workspace.v2');
  assert.equal(migrated.operations[0].type, 'add-presentation');
  assert.equal(materializeWorkspace(migrated, { canonicalIds: ['a'] }).presentations[0].artifact.fallback.title, 'Old');
});

test('typed external presentation is stored without HTML execution', () => {
  let state = createInitialWorkspace({ explanationId: 'demo', baseRevision: 'r1' });
  state = appendOperation(state, createAddPresentationOperation({
    targetId: 'a', artifact: {
      type: 'architecture-map', capability: { id: 'archify', trust: 'originator-approved', execution: 'personal-agent' },
      content: { schema: 'archify.architecture.v1', payload: { nodes: [{ id: 'x' }] } },
      fallback: { title: 'Map', body: 'Safe fallback' }
    }
  }, { id: 'local-map' }));
  const view = materializeWorkspace(state, { canonicalIds: ['a'] });
  assert.equal(view.presentations[0].artifact.capability.id, 'archify');
});
