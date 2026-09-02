import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPLAIN_HIM_NATIVE_SKILL, EXPLAIN_HIM_NATIVE_SKILL_DIGEST } from '../runtime/generated/explain-him-native-skill.mjs';
import { ADDITIONAL_INFORMATION, EXPLAIN_HIM_WEBMCP_TOOLS, registerWebMcpTools } from '../runtime/webmcp.mjs';

function workspace() {
  return {
    document: { querySelectorAll: () => [] },
    getContext: () => ({ workspaceRevision: 0, authoredTargetIds: [] }),
    getVisibleState: () => ({ presentations: [], viewMode: 'original' })
  };
}

test('issue 161 host registers exactly one tool and one generated composite skill', async () => {
  const tools = new Map(); const skills = [];
  const host = { registerTool: async (tool) => tools.set(tool.name, tool), getTools: async () => [...tools.values()], registerSkill: async (skill) => skills.push(skill) };
  const status = registerWebMcpTools(workspace(), host, { standardHost: true, hostSource: 'document.modelContext' });
  await status.ready;
  assert.deepEqual([...tools.keys()], EXPLAIN_HIM_WEBMCP_TOOLS);
  assert.equal(skills.length, 1);
  assert.equal(skills[0].name, 'explain_him');
  assert.deepEqual(skills[0].tools, EXPLAIN_HIM_WEBMCP_TOOLS);
  assert.equal(skills[0].instructions, EXPLAIN_HIM_NATIVE_SKILL.instructions);
  assert.match(skills[0].instructions, /Protocol v5/);
  assert.match(skills[0].instructions, /Supported typed blocks/);
  assert.equal(skills[0].context.answerPolicy.additionalInformation, ADDITIONAL_INFORMATION);
  assert.equal(skills[0].context.provenance.compositeSha256, EXPLAIN_HIM_NATIVE_SKILL_DIGEST);
  assert.equal(skills[0].context.proposal.issue, 161);
  assert.equal(skills[0].context.proposal.normative, false);
  assert.equal(status.skillRegistrationState, 'registered');
  assert.deepEqual([...tools.keys()], ['explain_tool']);
});

test('host without registerSkill keeps the standard fallback tool operational', async () => {
  const tools = new Map();
  const host = { registerTool: async (tool) => tools.set(tool.name, tool), getTools: async () => [...tools.values()] };
  const status = registerWebMcpTools(workspace(), host, { standardHost: true });
  await status.ready;
  assert.equal(status.ok, true); assert.equal(status.verified, true);
  assert.equal(status.skillApiAvailable, false);
  assert.equal(status.skillRegistrationState, 'unavailable');
  assert.equal(tools.has('explain_tool'), true);
});

for (const [label, registerSkill] of [
  ['synchronous throw', () => { throw new Error('sync failure'); }],
  ['asynchronous rejection', async () => { throw new Error('async failure'); }]
]) {
  test(`skill registration ${label} does not disable tools`, async () => {
    const tools = new Map();
    const host = { registerTool: async (tool) => tools.set(tool.name, tool), getTools: async () => [...tools.values()], registerSkill };
    const status = registerWebMcpTools(workspace(), host, { standardHost: true });
    await status.ready;
    assert.equal(status.ok, true); assert.equal(status.verified, true);
    assert.equal(status.skillRegistrationState, 'error');
    assert.match(status.skillRegistrationError, /failure/);
    assert.equal(tools.has('explain_tool'), true);
  });
}

test('registerSkill is not called on a non-standard explicit host', async () => {
  let calls = 0; const tools = [];
  const host = { registerTool: async (tool) => tools.push(tool), getTools: async () => tools, registerSkill: async () => { calls += 1; } };
  const status = registerWebMcpTools(workspace(), host);
  await status.ready;
  assert.equal(calls, 0);
  assert.equal(status.skillApiAvailable, false);
});
