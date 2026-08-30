import { createPresentationArtifact, createSafeTextArtifact } from './presentation/artifact.mjs';

export const WORKSPACE_SCHEMA_VERSION = 'explain-him-local-workspace.v2';
export const LEGACY_WORKSPACE_SCHEMA_VERSION = 'explain-him-local-workspace.v1';
export const ALLOWED_BLOCK_KINDS = Object.freeze([
  'example', 'analogy', 'summary', 'warning', 'comparison', 'diagram'
]);

const MAX_OPERATIONS = 250;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requireString(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} must be a non-empty string`);
  if (value.length > maxLength) throw new RangeError(`${field} exceeds ${maxLength} characters`);
  return value.trim();
}

function localId(prefix = 'presentation') {
  return `local-${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function createInitialWorkspace({ explanationId, baseRevision }) {
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    explanationId: requireString(explanationId, 'explanationId', 160),
    baseRevision: requireString(baseRevision, 'baseRevision', 160),
    operations: [],
    cursor: 0
  };
}

export function createAddPresentationOperation(input, options = {}) {
  const id = options.id || localId('presentation');
  if (!/^local-[A-Za-z0-9._:-]+$/.test(id)) throw new TypeError('Local presentation id must start with local-');
  const artifact = createPresentationArtifact(input.artifact || input);
  return {
    type: 'add-presentation',
    presentation: {
      id,
      targetId: requireString(input.targetId, 'targetId', 120),
      artifact,
      actor: {
        kind: typeof input.actor?.kind === 'string' ? input.actor.kind.slice(0, 40) : 'agent',
        channel: typeof input.actor?.channel === 'string' ? input.actor.channel.slice(0, 40) : 'browser-control'
      },
      createdAt: options.createdAt || new Date().toISOString()
    }
  };
}

export function createRemovePresentationOperation(presentationId) {
  const normalized = requireString(presentationId, 'presentationId', 120);
  if (!normalized.startsWith('local-')) throw new TypeError('Only local-* presentations can be removed');
  return { type: 'remove-presentation', presentationId: normalized };
}

// v1 compatibility: an old block is a safe-text presentation.
export function createAddBlockOperation(input, options = {}) {
  const kind = requireString(input.kind, 'kind', 40);
  if (!ALLOWED_BLOCK_KINDS.includes(kind)) throw new TypeError(`Unsupported block kind: ${kind}`);
  const type = kind === 'comparison' ? 'comparison' : kind === 'diagram' ? 'diagram' : 'callout';
  return createAddPresentationOperation({
    targetId: input.targetId,
    artifact: createSafeTextArtifact({
      type,
      title: input.title,
      body: input.body,
      provenance: input.provenance || { sourceBlockIds: [input.targetId], repositoryRefs: [] }
    }),
    actor: input.actor
  }, options);
}

export function createRemoveBlockOperation(blockId) {
  return createRemovePresentationOperation(blockId);
}

export function appendOperation(state, operation) {
  if (!state || state.schemaVersion !== WORKSPACE_SCHEMA_VERSION) throw new TypeError('Unsupported workspace state');
  if (!operation || !['add-presentation', 'remove-presentation'].includes(operation.type)) throw new TypeError('Unsupported operation');
  const next = clone(state);
  next.operations = next.operations.slice(0, next.cursor);
  next.operations.push(clone(operation));
  if (next.operations.length > MAX_OPERATIONS) next.operations = next.operations.slice(-MAX_OPERATIONS);
  next.cursor = next.operations.length;
  return next;
}

export function undoWorkspace(state) {
  const next = clone(state);
  next.cursor = Math.max(0, next.cursor - 1);
  return next;
}

export function redoWorkspace(state) {
  const next = clone(state);
  next.cursor = Math.min(next.operations.length, next.cursor + 1);
  return next;
}

function legacyBlockToPresentation(block) {
  const kind = ALLOWED_BLOCK_KINDS.includes(block.kind) ? block.kind : 'summary';
  const type = kind === 'comparison' ? 'comparison' : kind === 'diagram' ? 'diagram' : 'callout';
  return {
    id: block.id,
    targetId: block.targetId,
    artifact: createSafeTextArtifact({
      type,
      title: block.title || 'Personal explanation',
      body: block.body || 'Imported local explanation',
      provenance: block.provenance || { sourceBlockIds: [block.targetId], repositoryRefs: [] }
    }),
    actor: block.actor || { kind: 'agent', channel: 'migration' },
    createdAt: block.createdAt || new Date(0).toISOString()
  };
}

export function migrateWorkspaceState(state) {
  if (!state || typeof state !== 'object') return null;
  if (state.schemaVersion === WORKSPACE_SCHEMA_VERSION) return clone(state);
  if (state.schemaVersion !== LEGACY_WORKSPACE_SCHEMA_VERSION) return null;
  const operations = (state.operations || []).map((operation) => {
    if (operation.type === 'add-block') return { type: 'add-presentation', presentation: legacyBlockToPresentation(operation.block) };
    if (operation.type === 'remove-block') return { type: 'remove-presentation', presentationId: operation.blockId };
    return null;
  }).filter(Boolean);
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    explanationId: state.explanationId,
    baseRevision: state.baseRevision,
    operations,
    cursor: Math.min(Number.isInteger(state.cursor) ? state.cursor : operations.length, operations.length)
  };
}

export function materializeWorkspace(state, { canonicalIds = [], baseRevision } = {}) {
  const active = new Map();
  for (const operation of state.operations.slice(0, state.cursor)) {
    if (operation.type === 'add-presentation') active.set(operation.presentation.id, clone(operation.presentation));
    if (operation.type === 'remove-presentation') active.delete(operation.presentationId);
  }
  const canonical = new Set(canonicalIds);
  const presentations = [...active.values()].map((presentation) => ({
    ...presentation,
    orphaned: !canonical.has(presentation.targetId)
  }));
  const blocks = presentations.map((presentation) => ({
    id: presentation.id,
    targetId: presentation.targetId,
    kind: presentation.artifact.type,
    title: presentation.artifact.fallback.title,
    body: presentation.artifact.fallback.body,
    actor: presentation.actor,
    provenance: presentation.artifact.provenance,
    createdAt: presentation.createdAt,
    orphaned: presentation.orphaned
  }));
  return {
    schemaVersion: state.schemaVersion,
    explanationId: state.explanationId,
    storedBaseRevision: state.baseRevision,
    currentBaseRevision: baseRevision || state.baseRevision,
    baseRevisionChanged: Boolean(baseRevision && baseRevision !== state.baseRevision),
    cursor: state.cursor,
    operationCount: state.operations.length,
    presentations,
    blocks,
    canUndo: state.cursor > 0,
    canRedo: state.cursor < state.operations.length,
    orphanedPresentationCount: presentations.filter((item) => item.orphaned).length,
    orphanedBlockCount: presentations.filter((item) => item.orphaned).length
  };
}

export class MemoryWorkspaceStore {
  constructor() { this.mode = 'memory'; this.records = new Map(); }
  async load(key) { return clone(this.records.get(key) || null); }
  async save(key, value) { this.records.set(key, clone(value)); }
  async clear(key) { this.records.delete(key); }
}

export class IndexedDbWorkspaceStore {
  constructor({ dbName = 'explain-him-public', storeName = 'workspaces' } = {}) {
    this.mode = 'indexeddb'; this.dbName = dbName; this.storeName = storeName;
  }
  async open() {
    return new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.storeName)) request.result.createObjectStore(this.storeName);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async withStore(mode, action) {
    const db = await this.open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, mode);
        const request = action(tx.objectStore(this.storeName));
        request.onsuccess = () => resolve(clone(request.result ?? null));
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  }
  async load(key) { return this.withStore('readonly', (store) => store.get(key)); }
  async save(key, value) { await this.withStore('readwrite', (store) => store.put(clone(value), key)); }
  async clear(key) { await this.withStore('readwrite', (store) => store.delete(key)); }
}

export function createWorkspaceStore() {
  return globalThis.indexedDB ? new IndexedDbWorkspaceStore() : new MemoryWorkspaceStore();
}

function make(document, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderCallout(document, article, payload, fallback) {
  const body = make(document, 'p', 'typed-callout-body', payload?.body || fallback.body);
  if (payload?.tone) body.dataset.tone = payload.tone;
  article.append(body);
}

function renderComparison(document, article, payload, fallback) {
  if (!Array.isArray(payload?.columns) || payload.columns.length < 2) {
    article.append(make(document, 'p', 'local-body', fallback.body));
    return;
  }
  const grid = make(document, 'div', 'typed-comparison-grid');
  for (const column of payload.columns) {
    const card = make(document, 'section', 'typed-comparison-column');
    card.append(make(document, 'h4', null, column.title));
    const list = make(document, 'ul');
    for (const item of column.items || []) list.append(make(document, 'li', null, item));
    card.append(list);
    grid.append(card);
  }
  article.append(grid);
}

function renderWorkflow(document, article, payload, fallback) {
  if (!Array.isArray(payload?.steps) || payload.steps.length < 2) {
    article.append(make(document, 'p', 'local-body', fallback.body));
    return;
  }
  const list = make(document, 'ol', 'typed-workflow');
  for (const step of payload.steps) {
    const item = make(document, 'li', 'typed-workflow-step');
    item.append(make(document, 'strong', null, step.title));
    if (step.body) item.append(make(document, 'p', null, step.body));
    list.append(item);
  }
  article.append(list);
}

function renderTimeline(document, article, payload, fallback) {
  if (!Array.isArray(payload?.items) || payload.items.length < 2) {
    article.append(make(document, 'p', 'local-body', fallback.body));
    return;
  }
  const list = make(document, 'ol', 'typed-timeline');
  for (const entry of payload.items) {
    const item = make(document, 'li', 'typed-timeline-item');
    item.append(make(document, 'strong', 'typed-timeline-label', entry.label));
    item.append(make(document, 'p', null, entry.body));
    list.append(item);
  }
  article.append(list);
}

function renderDiagram(document, article, payload, fallback) {
  if (!Array.isArray(payload?.nodes) || payload.nodes.length < 2) {
    article.append(make(document, 'p', 'local-body', fallback.body));
    return;
  }
  const diagram = make(document, 'div', 'typed-diagram');
  diagram.dataset.variant = payload.variant || 'concept';
  const nodes = make(document, 'div', 'typed-diagram-nodes');
  for (const node of payload.nodes) {
    const card = make(document, 'article', 'typed-diagram-node');
    card.dataset.nodeId = node.id;
    card.append(make(document, 'strong', null, node.label));
    if (node.body) card.append(make(document, 'small', null, node.body));
    nodes.append(card);
  }
  diagram.append(nodes);
  if (Array.isArray(payload.edges) && payload.edges.length) {
    const edges = make(document, 'ul', 'typed-diagram-edges');
    for (const edge of payload.edges) {
      const text = `${edge.from} → ${edge.to}${edge.label ? ` · ${edge.label}` : ''}`;
      edges.append(make(document, 'li', null, text));
    }
    diagram.append(edges);
  }
  article.append(diagram);
}

function renderArtifactContent(document, article, artifact) {
  const payload = artifact.content?.payload || {};
  const typed = artifact.capability?.id === 'explain-him-safe-block'
    && String(artifact.content?.schema || '').startsWith('explain-him.block.');
  if (!typed) {
    article.append(make(document, 'p', 'local-body', artifact.fallback.body));
    return;
  }
  if (artifact.type === 'callout') return renderCallout(document, article, payload, artifact.fallback);
  if (artifact.type === 'comparison') return renderComparison(document, article, payload, artifact.fallback);
  if (artifact.type === 'workflow') return renderWorkflow(document, article, payload, artifact.fallback);
  if (artifact.type === 'timeline') return renderTimeline(document, article, payload, artifact.fallback);
  if (artifact.type === 'diagram') return renderDiagram(document, article, payload, artifact.fallback);
  article.append(make(document, 'p', 'local-body', artifact.fallback.body));
}

export function renderWorkspace(document, view) {
  const slots = new Map();
  for (const slot of document.querySelectorAll('[data-eh-local-slot]')) {
    slot.replaceChildren(); slots.set(slot.dataset.ehLocalSlot, slot);
  }
  for (const presentation of view.presentations) {
    const slot = slots.get(presentation.targetId);
    if (!slot) continue;
    const artifact = presentation.artifact;
    const article = make(document, 'article', `local-explanation local-${artifact.type}`);
    article.dataset.ehLocalBlockId = presentation.id;
    article.dataset.ehLocalPresentationId = presentation.id;
    article.dataset.ehTypedBlock = artifact.capability?.id === 'explain-him-safe-block' ? artifact.type : 'fallback';
    const header = make(document, 'header', 'local-explanation-header');
    const heading = make(document, 'div');
    heading.append(make(document, 'span', 'local-label', 'Personal presentation'));
    heading.append(make(document, 'h3', null, artifact.fallback.title));
    const remove = make(document, 'button', 'local-remove', 'Remove');
    remove.type = 'button'; remove.dataset.ehRemoveLocal = presentation.id;
    header.append(heading, remove);
    article.append(header);
    renderArtifactContent(document, article, artifact);
    const meta = make(document, 'div', 'local-meta');
    meta.append(make(document, 'span', null, artifact.type));
    meta.append(make(document, 'span', null, artifact.capability.id));
    meta.append(make(document, 'span', null, artifact.capability.execution));
    if (presentation.orphaned) meta.append(make(document, 'strong', null, 'orphaned target'));
    article.append(meta);
    if (artifact.provenance?.repositoryRefs?.length) {
      const list = make(document, 'ul', 'local-sources');
      for (const ref of artifact.provenance.repositoryRefs) {
        const suffix = [ref.section, ref.status, ref.ref].filter(Boolean).join(' · ');
        list.append(make(document, 'li', null, suffix ? `${ref.path} — ${suffix}` : ref.path));
      }
      article.append(list);
    }
    slot.append(article);
  }
  const summary = document.getElementById('workspace-summary');
  if (summary) summary.textContent = `Original · ${view.presentations.length} local presentations`;
  const count = document.getElementById('workspace-count');
  if (count) count.textContent = String(view.presentations.length);
  const undo = document.getElementById('workspace-undo');
  if (undo) undo.disabled = !view.canUndo;
  const redo = document.getElementById('workspace-redo');
  if (redo) redo.disabled = !view.canRedo;
  const stale = document.getElementById('workspace-stale-base');
  if (stale) {
    stale.hidden = !view.baseRevisionChanged;
    stale.textContent = view.baseRevisionChanged
      ? `The page was updated: local presentations were preserved, but ${view.orphanedPresentationCount} may require review.`
      : '';
  }
}

export function focusAuthoredBlock(document, targetId) {
  let target = null;
  for (const node of document.querySelectorAll('[data-eh-block-id]')) {
    node.classList.remove('is-focused');
    if (node.dataset.ehBlockId === targetId) target = node;
  }
  if (!target) throw new RangeError(`Unknown authored target: ${targetId}`);
  target.classList.add('is-focused');
  target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  return { targetId };
}

export class ExplanationWorkspace {
  constructor({ document, store, explanationId, baseRevision, canonicalIds }) {
    this.document = document; this.store = store; this.explanationId = explanationId;
    this.baseRevision = baseRevision; this.canonicalIds = [...canonicalIds];
    this.storageKey = `${explanationId}:${globalThis.location?.origin || 'local'}`;
    this.state = createInitialWorkspace({ explanationId, baseRevision });
  }
  async initialize() {
    const loaded = await this.store.load(this.storageKey).catch(() => null);
    const migrated = migrateWorkspaceState(loaded);
    if (migrated?.explanationId === this.explanationId) {
      this.state = migrated;
      if (loaded?.schemaVersion === LEGACY_WORKSPACE_SCHEMA_VERSION) await this.store.save(this.storageKey, this.state);
    }
    this.render(); return this;
  }
  view() { return materializeWorkspace(this.state, { canonicalIds: this.canonicalIds, baseRevision: this.baseRevision }); }
  render() { const view = this.view(); if (this.document) renderWorkspace(this.document, view); return view; }
  async persist() { await this.store.save(this.storageKey, this.state); return this.render(); }
  getContext() {
    return {
      explanationId: this.explanationId,
      baseRevision: this.baseRevision,
      storageMode: this.store.mode,
      authoredTargetIds: [...this.canonicalIds],
      authoredLayerMutable: false,
      presentationSchemaVersion: 'explain-him-presentation.v1',
      capabilities: ['focus', 'add-local-presentation', 'remove-local-presentation', 'undo', 'redo', 'export']
    };
  }
  getVisibleState() { return this.view(); }
  getLocalChangeHistory() {
    return { schemaVersion: this.state.schemaVersion, operations: clone(this.state.operations), cursor: this.state.cursor,
      canUndo: this.state.cursor > 0, canRedo: this.state.cursor < this.state.operations.length };
  }
  focusBlock({ targetId }) { if (!this.document) return { targetId }; return focusAuthoredBlock(this.document, targetId); }
  async addLocalPresentation(input) {
    if (!this.canonicalIds.includes(input.targetId)) throw new RangeError(`Unknown authored target: ${input.targetId}`);
    this.state = appendOperation(this.state, createAddPresentationOperation(input)); return this.persist();
  }
  async removeLocalPresentation({ presentationId }) {
    const exists = this.view().presentations.some((item) => item.id === presentationId);
    if (!exists) throw new RangeError(`Unknown local presentation: ${presentationId}`);
    this.state = appendOperation(this.state, createRemovePresentationOperation(presentationId)); return this.persist();
  }
  async addLocalBlock(input) {
    if (!this.canonicalIds.includes(input.targetId)) throw new RangeError(`Unknown authored target: ${input.targetId}`);
    this.state = appendOperation(this.state, createAddBlockOperation(input)); return this.persist();
  }
  async removeLocalBlock({ blockId }) { return this.removeLocalPresentation({ presentationId: blockId }); }
  async undo() { this.state = undoWorkspace(this.state); return this.persist(); }
  async redo() { this.state = redoWorkspace(this.state); return this.persist(); }
  async reset({ confirmed = false } = {}) {
    if (!confirmed) throw new Error('Reset requires confirmation');
    this.state = createInitialWorkspace({ explanationId: this.explanationId, baseRevision: this.baseRevision });
    await this.store.clear(this.storageKey); return this.render();
  }
  exportJson() { return JSON.stringify({ exportedAt: new Date().toISOString(), state: this.state }, null, 2); }
}

export async function createExplanationWorkspace(options) {
  const workspace = new ExplanationWorkspace({ ...options, store: options.store || createWorkspaceStore() });
  await workspace.initialize(); return workspace;
}
