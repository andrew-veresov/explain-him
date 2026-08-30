import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLAIN_HIM_WEBMCP_TOOLS,
  createWebMcpTools,
  registerWebMcpTools,
  resolveWebMcpHost
} from '../runtime/webmcp.mjs';

function fakeNode(id, title) {
  const classes = new Set();
  return {
    dataset: { ehBlockId: id },
    textContent: title,
    scrolled: false,
    classList: {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); },
      contains(value) { return classes.has(value); }
    },
    querySelector() { return { textContent: title }; },
    closest() { return null; },
    scrollIntoView() { this.scrolled = true; }
  };
}

function fakeWorkspace() {
  const nodes = [
    fakeNode('flow-model', 'Explain Him mechanism'),
    fakeNode('browser-workspace', 'Adaptive page')
  ];
  let presentations = [];
  let sequence = 0;
  const document = {
    querySelectorAll(selector) {
      if (selector === '[data-eh-block-id]') return nodes;
      return [];
    }
  };

  return {
    document,
    nodes,
    getContext: () => ({
      explanationId: 'explain-him-test',
      baseRevision: 'test-v1',
      authoredTargetIds: nodes.map((node) => node.dataset.ehBlockId)
    }),
    getVisibleState: () => ({ presentations }),
    focusBlock: ({ targetId }) => {
      const target = nodes.find((node) => node.dataset.ehBlockId === targetId);
      if (!target) throw new RangeError(`Unknown authored target: ${targetId}`);
      for (const node of nodes) node.classList.remove('is-focused');
      target.classList.add('is-focused');
      target.scrollIntoView();
      return { targetId };
    },
    addLocalPresentation: async (input) => {
      sequence += 1;
      presentations = [...presentations, {
        id: `local-test-${sequence}`,
        targetId: input.targetId,
        artifact: input.artifact
      }];
    },
    removeLocalPresentation: async ({ presentationId }) => {
      presentations = presentations.filter((item) => item.id !== presentationId);
    }
  };
}

function toolMap(workspace = fakeWorkspace()) {
  return new Map(createWebMcpTools(workspace).map((tool) => [tool.name, tool]));
}

test('public WebMCP surface has exactly two user-intent tools', () => {
  assert.deepEqual(EXPLAIN_HIM_WEBMCP_TOOLS, [
    'get_explanation_contract',
    'apply_explanation'
  ]);
  assert.equal(new Set(EXPLAIN_HIM_WEBMCP_TOOLS).size, 2);
});

test('contract bootstraps repository, both skills, schema, targets and operations', async () => {
  const contract = await toolMap().get('get_explanation_contract').execute({});
  assert.equal(contract.repository.fullName, 'andrew-veresov/explain-him');
  assert.deepEqual(contract.skills.map((skill) => skill.path), [
    'skills/explain-him/SKILL.md',
    'skills/explain-him-presentation/SKILL.md'
  ]);
  assert.equal(contract.blockSchema.path, 'schemas/explanation-block.v1.schema.json');
  assert.deepEqual(contract.targets.map((target) => target.id), ['flow-model', 'browser-workspace']);
  assert.deepEqual(contract.applyOperations, ['add', 'remove', 'focus']);
  assert.equal(contract.repositoryAccessViaWebMcp, false);
});

test('apply_explanation adds a grounded workflow and focuses its authored target', async () => {
  const workspace = fakeWorkspace();
  const result = await toolMap(workspace).get('apply_explanation').execute({
    operations: [
      {
        op: 'add',
        targetId: 'browser-workspace',
        block: {
          type: 'workflow',
          title: 'From idea to explanation',
          steps: [
            { title: 'Prepare the repository', body: 'Publish authored sources and instructions.' },
            { title: 'Open the page', body: 'The personal agent discovers the contract.' },
            { title: 'Ground and present', body: 'Answer in chat and add a typed workflow.' }
          ],
          sources: [{ path: 'knowledge/01-originator-flow.md', status: 'current' }]
        }
      },
      { op: 'focus', targetId: 'browser-workspace' }
    ]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.applied.map((item) => item.op), ['add', 'focus']);
  assert.match(result.applied[0].blockId, /^local-/);
  assert.equal(result.localBlocks[0].type, 'workflow');
  assert.equal(workspace.nodes[1].classList.contains('is-focused'), true);
  assert.equal(workspace.nodes[1].scrolled, true);
});

test('apply_explanation rejects an unknown target before mutating workspace', async () => {
  const workspace = fakeWorkspace();
  await assert.rejects(
    toolMap(workspace).get('apply_explanation').execute({
      operations: [{
        op: 'add',
        targetId: 'missing-target',
        block: { type: 'callout', title: 'Invalid', body: 'Must not be added.' }
      }]
    }),
    /Unknown authored target/
  );
  assert.equal(workspace.getVisibleState().presentations.length, 0);
});

test('typed diagram keeps semantic data and discards executable channels', async () => {
  const workspace = fakeWorkspace();
  await toolMap(workspace).get('apply_explanation').execute({
    operations: [{
      op: 'add',
      targetId: 'flow-model',
      block: {
        type: 'diagram',
        title: 'Safe flow',
        variant: 'flow',
        nodes: [{ id: 'idea', label: 'Idea' }, { id: 'page', label: 'Page' }],
        edges: [{ from: 'idea', to: 'page', label: 'publish' }],
        html: '<script>alert(1)</script>'
      }
    }]
  });
  const payload = workspace.getVisibleState().presentations[0].artifact.content.payload;
  assert.equal(payload.html, undefined);
  assert.equal(payload.nodes.length, 2);
});

test('document.modelContext is preferred and navigator.modelContext is fallback', () => {
  const standard = { registerTool() {} };
  const legacy = { registerTool() {} };
  const preferred = resolveWebMcpHost({
    document: { modelContext: standard },
    navigator: { modelContext: legacy }
  });
  assert.equal(preferred.modelContext, standard);
  assert.equal(preferred.source, 'document.modelContext');
  assert.equal(preferred.standard, true);

  const fallback = resolveWebMcpHost({ document: {}, navigator: { modelContext: legacy } });
  assert.equal(fallback.modelContext, legacy);
  assert.equal(fallback.standard, false);
});

test('standard host registers and verifies both tools', async () => {
  const registered = new Map();
  const standardHost = {
    registerTool: async (tool) => { registered.set(tool.name, tool); },
    getTools: async () => [...registered.values()]
  };
  const status = registerWebMcpTools(fakeWorkspace(), null, {
    environment: { document: { modelContext: standardHost }, navigator: {} }
  });
  await status.ready;
  assert.equal(status.supported, true);
  assert.equal(status.ok, true);
  assert.equal(status.verified, true);
  assert.deepEqual([...registered.keys()], [...EXPLAIN_HIM_WEBMCP_TOOLS]);
});

test('registration reports partial availability without hiding the failure', async () => {
  const host = {
    registerTool: async (tool) => {
      if (tool.name === 'apply_explanation') throw new Error('unsupported test tool');
    }
  };
  const status = registerWebMcpTools(fakeWorkspace(), host, {
    hostSource: 'document.modelContext', standardHost: true
  });
  await status.ready;
  assert.equal(status.ok, false);
  assert.deepEqual(status.registered, ['get_explanation_contract']);
  assert.equal(status.errors[0].name, 'apply_explanation');
});
