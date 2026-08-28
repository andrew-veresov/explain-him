export const WORKSPACE_SCHEMA_VERSION = 'explain-him-local-workspace.v1';
export const ALLOWED_BLOCK_KINDS = Object.freeze([
  'example', 'analogy', 'summary', 'warning', 'comparison', 'diagram'
]);

const MAX_OPERATIONS = 250;
const MAX_TITLE = 160;
const MAX_BODY = 5000;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requireString(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} must be a non-empty string`);
  if (value.length > maxLength) throw new RangeError(`${field} exceeds ${maxLength} characters`);
  return value.trim();
}

function normalizeRefs(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((ref) => ({
    repository: typeof ref?.repository === 'string' ? ref.repository.slice(0, 200) : null,
    path: requireString(ref?.path, 'provenance.path', 500),
    ref: typeof ref?.ref === 'string' ? ref.ref.slice(0, 160) : null,
    section: typeof ref?.section === 'string' ? ref.section.slice(0, 300) : null,
    status: typeof ref?.status === 'string' ? ref.status.slice(0, 40) : null
  }));
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

export function createAddBlockOperation(input, options = {}) {
  const kind = requireString(input.kind, 'kind', 40);
  if (!ALLOWED_BLOCK_KINDS.includes(kind)) throw new TypeError(`Unsupported block kind: ${kind}`);
  const id = options.id || `local-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  if (!/^local-[A-Za-z0-9._:-]+$/.test(id)) throw new TypeError('Local block id must start with local-');

  return {
    type: 'add-block',
    block: {
      id,
      targetId: requireString(input.targetId, 'targetId', 120),
      kind,
      title: requireString(input.title, 'title', MAX_TITLE),
      body: requireString(input.body, 'body', MAX_BODY),
      actor: {
        kind: typeof input.actor?.kind === 'string' ? input.actor.kind.slice(0, 40) : 'agent',
        channel: typeof input.actor?.channel === 'string' ? input.actor.channel.slice(0, 40) : 'browser-control'
      },
      provenance: {
        sourceBlockIds: Array.isArray(input.provenance?.sourceBlockIds)
          ? input.provenance.sourceBlockIds.slice(0, 20).filter((item) => typeof item === 'string')
          : [input.targetId],
        repositoryRefs: normalizeRefs(input.provenance?.repositoryRefs),
        conversationRef: typeof input.provenance?.conversationRef === 'string'
          ? input.provenance.conversationRef.slice(0, 300)
          : null
      },
      createdAt: options.createdAt || new Date().toISOString()
    }
  };
}

export function createRemoveBlockOperation(blockId) {
  const normalized = requireString(blockId, 'blockId', 120);
  if (!normalized.startsWith('local-')) throw new TypeError('Only local-* blocks can be removed');
  return { type: 'remove-block', blockId: normalized };
}

export function appendOperation(state, operation) {
  if (!state || state.schemaVersion !== WORKSPACE_SCHEMA_VERSION) throw new TypeError('Unsupported workspace state');
  if (!operation || !['add-block', 'remove-block'].includes(operation.type)) throw new TypeError('Unsupported operation');
  const next = clone(state);
  next.operations = next.operations.slice(0, next.cursor);
  next.operations.push(clone(operation));
  if (next.operations.length > MAX_OPERATIONS) {
    next.operations = next.operations.slice(next.operations.length - MAX_OPERATIONS);
  }
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

export function materializeWorkspace(state, { canonicalIds = [], baseRevision } = {}) {
  const active = new Map();
  for (const operation of state.operations.slice(0, state.cursor)) {
    if (operation.type === 'add-block') active.set(operation.block.id, clone(operation.block));
    if (operation.type === 'remove-block') active.delete(operation.blockId);
  }
  const canonical = new Set(canonicalIds);
  const blocks = [...active.values()].map((block) => ({
    ...block,
    orphaned: !canonical.has(block.targetId)
  }));
  return {
    schemaVersion: state.schemaVersion,
    explanationId: state.explanationId,
    storedBaseRevision: state.baseRevision,
    currentBaseRevision: baseRevision || state.baseRevision,
    baseRevisionChanged: Boolean(baseRevision && baseRevision !== state.baseRevision),
    cursor: state.cursor,
    operationCount: state.operations.length,
    blocks,
    canUndo: state.cursor > 0,
    canRedo: state.cursor < state.operations.length,
    orphanedBlockCount: blocks.filter((block) => block.orphaned).length
  };
}

export class MemoryWorkspaceStore {
  constructor() {
    this.mode = 'memory';
    this.records = new Map();
  }
  async load(key) { return clone(this.records.get(key) || null); }
  async save(key, value) { this.records.set(key, clone(value)); }
  async clear(key) { this.records.delete(key); }
}

export class IndexedDbWorkspaceStore {
  constructor({ dbName = 'explain-him-public', storeName = 'workspaces' } = {}) {
    this.mode = 'indexeddb';
    this.dbName = dbName;
    this.storeName = storeName;
  }
  async open() {
    return new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.storeName)) {
          request.result.createObjectStore(this.storeName);
        }
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
        const store = tx.objectStore(this.storeName);
        const request = action(store);
        request.onsuccess = () => resolve(clone(request.result ?? null));
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
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

export function renderWorkspace(document, view) {
  const slots = new Map();
  for (const slot of document.querySelectorAll('[data-eh-local-slot]')) {
    slot.replaceChildren();
    slots.set(slot.dataset.ehLocalSlot, slot);
  }

  for (const block of view.blocks) {
    const slot = slots.get(block.targetId);
    if (!slot) continue;
    const article = make(document, 'article', `local-explanation local-${block.kind}`);
    article.dataset.ehLocalBlockId = block.id;
    const header = make(document, 'header', 'local-explanation-header');
    const heading = make(document, 'div');
    heading.append(make(document, 'span', 'local-label', 'Personal explanation'));
    heading.append(make(document, 'h3', null, block.title));
    const remove = make(document, 'button', 'local-remove', 'Remove');
    remove.type = 'button';
    remove.dataset.ehRemoveLocal = block.id;
    header.append(heading, remove);
    article.append(header, make(document, 'p', 'local-body', block.body));

    const meta = make(document, 'div', 'local-meta');
    meta.append(make(document, 'span', null, block.kind));
    meta.append(make(document, 'span', null, block.actor?.channel || 'agent'));
    if (block.orphaned) meta.append(make(document, 'strong', null, 'orphaned target'));
    article.append(meta);

    if (block.provenance?.repositoryRefs?.length) {
      const list = make(document, 'ul', 'local-sources');
      for (const ref of block.provenance.repositoryRefs) {
        const suffix = [ref.section, ref.status, ref.ref].filter(Boolean).join(' · ');
        list.append(make(document, 'li', null, suffix ? `${ref.path} — ${suffix}` : ref.path));
      }
      article.append(list);
    }
    slot.append(article);
  }

  const summary = document.getElementById('workspace-summary');
  if (summary) summary.textContent = `Original · ${view.blocks.length} local explanations`;
  const count = document.getElementById('workspace-count');
  if (count) count.textContent = String(view.blocks.length);
  const undo = document.getElementById('workspace-undo');
  if (undo) undo.disabled = !view.canUndo;
  const redo = document.getElementById('workspace-redo');
  if (redo) redo.disabled = !view.canRedo;
  const stale = document.getElementById('workspace-stale-base');
  if (stale) {
    stale.hidden = !view.baseRevisionChanged;
    stale.textContent = view.baseRevisionChanged
      ? `The page was updated: local blocks were preserved, but ${view.orphanedBlockCount} may require review.`
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
    this.document = document;
    this.store = store;
    this.explanationId = explanationId;
    this.baseRevision = baseRevision;
    this.canonicalIds = [...canonicalIds];
    this.storageKey = `${explanationId}:${globalThis.location?.origin || 'local'}`;
    this.state = createInitialWorkspace({ explanationId, baseRevision });
  }

  async initialize() {
    const loaded = await this.store.load(this.storageKey).catch(() => null);
    if (loaded?.schemaVersion === WORKSPACE_SCHEMA_VERSION && loaded.explanationId === this.explanationId) {
      this.state = loaded;
    }
    this.render();
    return this;
  }

  view() {
    return materializeWorkspace(this.state, {
      canonicalIds: this.canonicalIds,
      baseRevision: this.baseRevision
    });
  }

  render() {
    const view = this.view();
    if (this.document) renderWorkspace(this.document, view);
    return view;
  }

  async persist() {
    await this.store.save(this.storageKey, this.state);
    return this.render();
  }

  getContext() {
    return {
      explanationId: this.explanationId,
      baseRevision: this.baseRevision,
      storageMode: this.store.mode,
      authoredTargetIds: [...this.canonicalIds],
      allowedBlockKinds: [...ALLOWED_BLOCK_KINDS],
      authoredLayerMutable: false,
      capabilities: ['focus', 'add-local-block', 'remove-local-block', 'undo', 'redo', 'export']
    };
  }

  getVisibleState() { return this.view(); }
  getLocalChangeHistory() {
    return {
      schemaVersion: this.state.schemaVersion,
      operations: clone(this.state.operations),
      cursor: this.state.cursor,
      canUndo: this.state.cursor > 0,
      canRedo: this.state.cursor < this.state.operations.length
    };
  }

  focusBlock({ targetId }) {
    if (!this.document) return { targetId };
    return focusAuthoredBlock(this.document, targetId);
  }

  async addLocalBlock(input) {
    if (!this.canonicalIds.includes(input.targetId)) throw new RangeError(`Unknown authored target: ${input.targetId}`);
    this.state = appendOperation(this.state, createAddBlockOperation(input));
    return this.persist();
  }

  async removeLocalBlock({ blockId }) {
    const exists = this.view().blocks.some((block) => block.id === blockId);
    if (!exists) throw new RangeError(`Unknown local block: ${blockId}`);
    this.state = appendOperation(this.state, createRemoveBlockOperation(blockId));
    return this.persist();
  }

  async undo() { this.state = undoWorkspace(this.state); return this.persist(); }
  async redo() { this.state = redoWorkspace(this.state); return this.persist(); }

  async reset({ confirmed = false } = {}) {
    if (!confirmed) throw new Error('Reset requires confirmation');
    this.state = createInitialWorkspace({ explanationId: this.explanationId, baseRevision: this.baseRevision });
    await this.store.clear(this.storageKey);
    return this.render();
  }

  exportJson() {
    return JSON.stringify({ exportedAt: new Date().toISOString(), state: this.state }, null, 2);
  }
}

export async function createExplanationWorkspace(options) {
  const workspace = new ExplanationWorkspace({
    ...options,
    store: options.store || createWorkspaceStore()
  });
  await workspace.initialize();
  return workspace;
}
