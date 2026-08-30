import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLAIN_HIM_WEBMCP_TOOLS,
  createWebMcpTools,
  registerWebMcpTools,
  resolveWebMcpHost
} from '../runtime/webmcp.mjs';

function fakeNode(id, title, text) {
  return {
    dataset: { ehBlockId: id },
    textContent: `${title} ${text}`,
    querySelector(selector) {
      if (selector.includes('h1') || selector.includes('h2') || selector.includes('h3')) {
        return { textContent: title };
      }
      return null;
    },
    closest() { return null; }
  };
}

function fakeWorkspace() {
  const nodes = [
    fakeNode('flow-model', 'Explain Him', 'Express your idea once. Your personal AI agent explains it and can personalize the live page.'),
    fakeNode('grounding-contract', 'Adaptation does not rewrite facts', 'Authored meaning remains canonical while local explanations stay separate.')
  ];
  const document = {
    title: 'Explain Him — public demo',
    querySelectorAll(selector) {
      if (selector === '[data-eh-block-id]') return nodes;
      if (selector === '[data-section]') return [];
      return [];
    },
    querySelector(selector) {
      const match = /data-eh-block-id="([^"]+)"/.exec(selector);
      return match ? nodes.find((node) => node.dataset.ehBlockId === match[1]) || null : null;
    }
  };

  let presentations = [];
  let canUndo = false;
  let canRedo = false;
  let sequence = 0;

  return {
    document,
    getContext: () => ({
      explanationId: 'explain-him-test',
      baseRevision: 'test-v1',
      authoredTargetIds: nodes.map((node) => node.dataset.ehBlockId)
    }),
    getVisibleState: () => ({ presentations, canUndo, canRedo }),
    focusBlock: ({ targetId }) => ({ targetId }),
    addLocalBlock: async (input) => {
      sequence += 1;
      presentations = [...presentations, {
        id: `local-test-${sequence}`,
        targetId: input.targetId,
        artifact: {
          type: input.kind,
          fallback: { title: input.title, body: input.body }
        }
      }];
      canUndo = true;
      canRedo = false;
    },
    removeLocalPresentation: async ({ presentationId }) => {
      presentations = presentations.filter((item) => item.id !== presentationId);
      canUndo = true;
      canRedo = false;
    },
    undo: async () => {
      if (presentations.length) presentations = presentations.slice(0, -1);
      canUndo = false;
      canRedo = true;
    },
    redo: async () => {
      canUndo = true;
      canRedo = false;
    }
  };
}

function toolMap(workspace = fakeWorkspace()) {
  return new Map(createWebMcpTools(workspace).map((tool) => [tool.name, tool]));
}

test('challenge surface is small, user-oriented, and non-overlapping', () => {
  assert.deepEqual(EXPLAIN_HIM_WEBMCP_TOOLS, [
    'get_explanation_context',
    'get_personalization_state',
    'focus_explanation',
    'add_personal_explanation',
    'remove_personal_explanation',
    'undo_personalization',
    'redo_personalization'
  ]);
  assert.equal(new Set(EXPLAIN_HIM_WEBMCP_TOOLS).size, EXPLAIN_HIM_WEBMCP_TOOLS.length);
  assert.ok(EXPLAIN_HIM_WEBMCP_TOOLS.every((name) => name.length < 30));
  assert.ok(!EXPLAIN_HIM_WEBMCP_TOOLS.some((name) => /diagnostic|skill|compatibility/.test(name)));
});

test('tool metadata is concise and parameters are described', () => {
  for (const tool of toolMap().values()) {
    assert.ok(tool.description.length <= 500, `${tool.name} description is too long`);
    assert.equal(typeof tool.annotations.readOnlyHint, 'boolean');
    for (const [name, schema] of Object.entries(tool.inputSchema.properties || {})) {
      assert.ok(schema.description, `${tool.name}.${name} needs a description`);
      assert.ok(schema.description.length <= 150, `${tool.name}.${name} description is too long`);
    }
  }
});

test('get_explanation_context exposes authored live-page meaning, not repository retrieval', async () => {
  const tools = toolMap();
  const context = await tools.get('get_explanation_context').execute({ targetId: 'flow-model' });
  assert.equal(context.source, 'current-authored-page');
  assert.equal(context.repository, 'andrew-veresov/explain-him');
  assert.deepEqual(context.availableTargetIds, ['flow-model', 'grounding-contract']);
  assert.equal(context.targets.length, 1);
  assert.equal(context.targets[0].id, 'flow-model');
  assert.match(context.targets[0].text, /personal AI agent/i);
  assert.doesNotMatch(JSON.stringify(context), /search_repository|read_repository|knowledgeBundle/);
});

test('add_personal_explanation performs a visible, verifiable local change', async () => {
  const workspace = fakeWorkspace();
  const tools = toolMap(workspace);
  const result = await tools.get('add_personal_explanation').execute({
    targetId: 'flow-model',
    kind: 'analogy',
    title: 'A score and an arrangement',
    body: 'The authored page is the score; the agent adds a local arrangement without changing the score.'
  });
  assert.equal(result.ok, true);
  assert.equal(result.targetId, 'flow-model');
  assert.match(result.presentationId, /^local-/);
  assert.equal(result.personalizationCount, 1);
  assert.equal(result.canUndo, true);

  const state = await tools.get('get_personalization_state').execute({});
  assert.equal(state.count, 1);
  assert.equal(state.presentations[0].id, result.presentationId);
  assert.equal(state.presentations[0].title, 'A score and an arrangement');
});

test('document.modelContext is the preferred standard host', () => {
  const standard = { registerTool() {} };
  const legacy = { registerTool() {} };
  const resolved = resolveWebMcpHost({
    document: { modelContext: standard },
    navigator: { modelContext: legacy }
  });
  assert.equal(resolved.modelContext, standard);
  assert.equal(resolved.source, 'document.modelContext');
  assert.equal(resolved.standard, true);
});

test('navigator.modelContext remains only a legacy fallback', () => {
  const legacy = { registerTool() {} };
  const resolved = resolveWebMcpHost({ document: {}, navigator: { modelContext: legacy } });
  assert.equal(resolved.modelContext, legacy);
  assert.equal(resolved.source, 'navigator.modelContext');
  assert.equal(resolved.standard, false);
});

test('missing WebMCP host is reported without registration attempts', async () => {
  const status = registerWebMcpTools(fakeWorkspace(), null, { environment: { document: {}, navigator: {} } });
  await status.ready;
  assert.equal(status.supported, false);
  assert.equal(status.ok, false);
  assert.equal(status.hostSource, 'none');
  assert.deepEqual(status.registered, []);
});

test('standard host registers and verifies the complete challenge surface', async () => {
  const registered = new Map();
  const standardHost = {
    registerTool: async (tool) => { registered.set(tool.name, tool); },
    getTools: async () => [...registered.values()]
  };
  let legacyUsed = false;
  const environment = {
    document: { modelContext: standardHost },
    navigator: { modelContext: { registerTool: async () => { legacyUsed = true; } } }
  };

  const status = registerWebMcpTools(fakeWorkspace(), null, { environment });
  await status.ready;
  assert.equal(legacyUsed, false);
  assert.equal(status.supported, true);
  assert.equal(status.ok, true);
  assert.equal(status.verified, true);
  assert.equal(status.hostSource, 'document.modelContext');
  assert.deepEqual([...registered.keys()], [...EXPLAIN_HIM_WEBMCP_TOOLS]);
  assert.deepEqual(status.verifiedTools, [...EXPLAIN_HIM_WEBMCP_TOOLS]);
});

test('registration continues and reports partial availability when one tool fails', async () => {
  const registered = [];
  const host = {
    registerTool: async (tool) => {
      if (tool.name === 'undo_personalization') throw new Error('unsupported test tool');
      registered.push(tool.name);
    }
  };
  const status = registerWebMcpTools(fakeWorkspace(), host, {
    hostSource: 'document.modelContext', standardHost: true
  });
  await status.ready;

  assert.equal(status.supported, true);
  assert.equal(status.ok, false);
  assert.equal(status.errors.length, 1);
  assert.equal(status.errors[0].name, 'undo_personalization');
  assert.ok(registered.includes('get_explanation_context'));
  assert.ok(registered.includes('redo_personalization'));
});
