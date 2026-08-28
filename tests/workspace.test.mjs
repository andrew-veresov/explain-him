import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MemoryWorkspaceStore,
  appendOperation,
  createAddBlockOperation,
  createInitialWorkspace,
  createRemoveBlockOperation,
  materializeWorkspace,
  redoWorkspace,
  undoWorkspace
} from '../runtime/workspace.mjs';

test('add, remove, undo and redo are deterministic', () => {
  let state = createInitialWorkspace({ explanationId: 'demo', baseRevision: 'r1' });
  state = appendOperation(state, createAddBlockOperation({
    targetId: 'flow-model', kind: 'example', title: 'Example', body: 'Body'
  }, { id: 'local-1', createdAt: '2026-08-28T00:00:00Z' }));
  assert.equal(materializeWorkspace(state, { canonicalIds: ['flow-model'] }).blocks.length, 1);

  state = appendOperation(state, createRemoveBlockOperation('local-1'));
  assert.equal(materializeWorkspace(state, { canonicalIds: ['flow-model'] }).blocks.length, 0);

  state = undoWorkspace(state);
  assert.equal(materializeWorkspace(state, { canonicalIds: ['flow-model'] }).blocks.length, 1);
  state = redoWorkspace(state);
  assert.equal(materializeWorkspace(state, { canonicalIds: ['flow-model'] }).blocks.length, 0);
});

test('redo tail is discarded by a new operation', () => {
  let state = createInitialWorkspace({ explanationId: 'demo', baseRevision: 'r1' });
  state = appendOperation(state, createAddBlockOperation({ targetId: 'a', kind: 'summary', title: 'A', body: 'A' }, { id: 'local-a' }));
  state = appendOperation(state, createAddBlockOperation({ targetId: 'a', kind: 'summary', title: 'B', body: 'B' }, { id: 'local-b' }));
  state = undoWorkspace(state);
  state = appendOperation(state, createAddBlockOperation({ targetId: 'a', kind: 'summary', title: 'C', body: 'C' }, { id: 'local-c' }));
  const view = materializeWorkspace(state, { canonicalIds: ['a'] });
  assert.deepEqual(view.blocks.map((block) => block.id), ['local-a', 'local-c']);
  assert.equal(view.canRedo, false);
});

test('unknown target becomes orphaned after base change', () => {
  let state = createInitialWorkspace({ explanationId: 'demo', baseRevision: 'r1' });
  state = appendOperation(state, createAddBlockOperation({ targetId: 'old', kind: 'warning', title: 'Old', body: 'Old' }, { id: 'local-old' }));
  const view = materializeWorkspace(state, { canonicalIds: ['new'], baseRevision: 'r2' });
  assert.equal(view.baseRevisionChanged, true);
  assert.equal(view.blocks[0].orphaned, true);
});

test('only local blocks can be removed', () => {
  assert.throws(() => createRemoveBlockOperation('flow-model'), /local/);
});

test('memory store clones records', async () => {
  const store = new MemoryWorkspaceStore();
  const record = { value: 1 };
  await store.save('x', record);
  record.value = 2;
  assert.deepEqual(await store.load('x'), { value: 1 });
});
