import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLAIN_HIM_UI_TOOLS,
  createExplainHimSkillDescriptor,
  registerWebMcpTools
} from '../runtime/webmcp.mjs';

function fakeWorkspace() {
  return {
    getContext: () => ({ authoredTargetIds: ['flow-model'] }),
    getVisibleState: () => ({ blocks: [] }),
    getLocalChangeHistory: () => ({ operations: [], cursor: 0 }),
    focusBlock: (input) => input,
    addLocalBlock: async (input) => input,
    removeLocalBlock: async (input) => input,
    undo: async () => ({ ok: true }),
    redo: async () => ({ ok: true })
  };
}

test('descriptor contains navigation instructions but no knowledge bundle', () => {
  const descriptor = createExplainHimSkillDescriptor({ pageUrl: 'https://example.test/' });
  assert.equal(descriptor.structuredContext.knowledgeBundle, null);
  assert.equal(descriptor.structuredContext.repositoryAccessOwner, 'personal-agent');
  assert.deepEqual(descriptor.relatedTools, [...EXPLAIN_HIM_UI_TOOLS]);
  assert.doesNotMatch(JSON.stringify(descriptor), /search_knowledge|resolve_answer|create_issue/);
});

test('all UI tools register before native skill', async () => {
  const events = [];
  const host = {
    registerTool: async (tool) => { events.push(`tool:${tool.name}`); },
    registerSkill: async (skill) => { events.push(`skill:${skill.name}`); }
  };
  const status = registerWebMcpTools(fakeWorkspace(), host);
  await status.ready;
  assert.equal(status.skill.mode, 'registerSkill');
  assert.deepEqual(status.registeredUiTools.sort(), [...EXPLAIN_HIM_UI_TOOLS].sort());
  const skillIndex = events.findIndex((event) => event.startsWith('skill:'));
  assert.ok(skillIndex > -1);
  assert.ok(events.slice(0, skillIndex).every((event) => event.startsWith('tool:')));
});

test('compatibility tool is used without registerSkill', async () => {
  const registered = [];
  const host = { registerTool: async (tool) => registered.push(tool.name) };
  const status = registerWebMcpTools(fakeWorkspace(), host);
  await status.ready;
  assert.equal(status.skill.mode, 'compatibility-tool');
  assert.equal(status.skill.compatibilityToolRegistered, true);
  assert.ok(registered.includes('get_explain_him_skill'));
});
