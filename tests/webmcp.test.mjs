import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLAIN_HIM_BOOTSTRAP_TOOL,
  EXPLAIN_HIM_DIAGNOSTIC_TOOL,
  EXPLAIN_HIM_UI_TOOLS,
  EXPLAIN_HIM_WEBMCP_TOOLS,
  createExplainHimSkillDescriptor,
  registerWebMcpTools,
  resolveWebMcpHost
} from '../runtime/webmcp.mjs';

function fakeWorkspace() {
  return {
    getContext: () => ({ authoredTargetIds: ['flow-model'] }), getVisibleState: () => ({ presentations: [] }),
    getLocalChangeHistory: () => ({ operations: [], cursor: 0 }), focusBlock: (input) => input,
    addLocalPresentation: async (input) => input, removeLocalPresentation: async (input) => input,
    addLocalBlock: async (input) => input, removeLocalBlock: async (input) => input,
    undo: async () => ({ ok: true }), redo: async () => ({ ok: true })
  };
}

test('descriptor uses the standard WebMCP API and tool-delivered bootstrap', () => {
  const descriptor = createExplainHimSkillDescriptor({ pageUrl: 'https://example.test/' });
  assert.equal(descriptor.structuredContext.knowledgeBundle, null);
  assert.equal(descriptor.structuredContext.repositoryAccessOwner, 'personal-agent');
  assert.equal(descriptor.structuredContext.presentationArtifactSchema, 'explain-him-presentation.v1');
  assert.equal(descriptor.structuredContext.webmcpApi, 'document.modelContext');
  assert.equal(descriptor.structuredContext.webmcpBootstrapTool, EXPLAIN_HIM_BOOTSTRAP_TOOL);
  assert.ok(descriptor.structuredContext.presentationCapabilities.some((item) => item.id === 'archify'));
  assert.deepEqual(descriptor.relatedTools, [...EXPLAIN_HIM_UI_TOOLS, EXPLAIN_HIM_DIAGNOSTIC_TOOL]);
  assert.doesNotMatch(JSON.stringify(descriptor), /search_knowledge|resolve_answer|create_issue|registerSkill/);
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

test('navigator.modelContext remains a legacy fallback', () => {
  const legacy = { registerTool() {} };
  const resolved = resolveWebMcpHost({ document: {}, navigator: { modelContext: legacy } });
  assert.equal(resolved.modelContext, legacy);
  assert.equal(resolved.source, 'navigator.modelContext');
  assert.equal(resolved.standard, false);
});

test('missing host is reported without registration attempts', async () => {
  const status = registerWebMcpTools(fakeWorkspace(), null, { environment: { document: {}, navigator: {} } });
  await status.ready;
  assert.equal(status.supported, false);
  assert.equal(status.ok, false);
  assert.equal(status.hostSource, 'none');
  assert.deepEqual(status.registered, []);
});

test('standard host discovery registers the complete Site Tool surface', async () => {
  const registered = new Map();
  const standardHost = {
    registerTool: async (tool) => { registered.set(tool.name, tool); }
  };
  let legacyUsed = false;
  const legacyHost = {
    registerTool: async () => { legacyUsed = true; }
  };
  const environment = {
    document: { modelContext: standardHost },
    navigator: { modelContext: legacyHost },
    location: { href: 'https://example.test/' }
  };

  const status = registerWebMcpTools(fakeWorkspace(), null, { environment });
  await status.ready;

  assert.equal(legacyUsed, false);
  assert.equal(status.supported, true);
  assert.equal(status.ok, true);
  assert.equal(status.hostSource, 'document.modelContext');
  assert.equal(status.standardHost, true);
  assert.deepEqual([...registered.keys()].sort(), [...EXPLAIN_HIM_WEBMCP_TOOLS].sort());
  assert.deepEqual(status.registeredUiTools.sort(), [...EXPLAIN_HIM_UI_TOOLS].sort());
  assert.equal(status.skill.mode, 'webmcp-tool');
  assert.equal(status.skill.registered, true);

  const diagnostic = await registered.get(EXPLAIN_HIM_DIAGNOSTIC_TOOL).execute({});
  assert.equal(diagnostic.available, true);
  assert.equal(diagnostic.hostSource, 'document.modelContext');
  assert.equal(diagnostic.standardHost, true);
  assert.ok(diagnostic.registeredTools.includes(EXPLAIN_HIM_BOOTSTRAP_TOOL));

  const bootstrap = await registered.get(EXPLAIN_HIM_BOOTSTRAP_TOOL).execute({});
  assert.equal(bootstrap.name, 'explain-him');
  assert.equal(bootstrap.structuredContext.webmcpApi, 'document.modelContext');
});

test('registration continues and reports partial availability when one tool fails', async () => {
  const registered = [];
  const host = {
    registerTool: async (tool) => {
      if (tool.name === 'undo_last_local_change') throw new Error('unsupported test tool');
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
  assert.equal(status.errors[0].name, 'undo_last_local_change');
  assert.ok(registered.includes(EXPLAIN_HIM_BOOTSTRAP_TOOL));
  assert.ok(registered.includes(EXPLAIN_HIM_DIAGNOSTIC_TOOL));
});
