import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EXPLAIN_HIM_NATIVE_SKILL,
  EXPLAIN_HIM_NATIVE_SKILL_DIGEST,
} from '../runtime/generated/explain-him-native-skill.mjs';
import {
  EXPLAIN_HIM_WEBMCP_TOOLS,
  registerWebMcpTools,
} from '../runtime/webmcp.mjs';

function workspace() {
  return {
    document: { querySelectorAll: () => [] },
    getContext: () => ({ explanationId: 'native-skill-test', baseRevision: 'r1', workspaceRevision: 0, authoredTargetIds: [] }),
    getVisibleState: () => ({ presentations: [] }),
  };
}

test('progressive host registers exactly two tools and one composite inline skill', async () => {
  const tools = new Map();
  const skills = [];
  const host = {
    registerTool: async (tool) => tools.set(tool.name, tool),
    getTools: async () => [...tools.values()],
    registerSkill: async (skill) => skills.push(skill),
  };

  const status = registerWebMcpTools(workspace(), host, { standardHost: true });
  await status.ready;

  assert.deepEqual([...tools.keys()], [...EXPLAIN_HIM_WEBMCP_TOOLS]);
  assert.equal(skills.length, 1);
  assert.equal(skills[0].name, 'explain_him');
  assert.deepEqual(skills[0].tools, [...EXPLAIN_HIM_WEBMCP_TOOLS]);
  assert.equal(skills[0].instructions, EXPLAIN_HIM_NATIVE_SKILL.instructions);
  assert.match(skills[0].instructions, /Mandatory activation bootstrap/);
  assert.match(skills[0].instructions, /Supported typed blocks/);
  assert.equal(skills[0].context.provenance.compositeSha256, EXPLAIN_HIM_NATIVE_SKILL_DIGEST);
  assert.equal(skills[0].context.proposal.issue, 161);
  assert.equal(skills[0].context.proposal.status, 'experimental-open-backlog');
  assert.equal(status.skillApiAvailable, true);
  assert.equal(status.skillRegistrationState, 'registered');
  assert.equal(status.registeredSkill.name, 'explain_him');
  assert.equal(status.registeredSkill.digest, EXPLAIN_HIM_NATIVE_SKILL_DIGEST);
  const contract = await tools.get('get_explain_him_answer').execute({});
  assert.equal(contract.skillDelivery.mode, 'native-inline');
  assert.equal(contract.skillDelivery.remoteVerificationRequiredForApply, false);
  const forgedProof = { ...contract.skillDelivery.proof, deliveryId: `delivery-${'0'.repeat(36)}` };
  await assert.rejects(tools.get('apply_explanation').execute({
    requestId: 'forged-native-proof',
    expectedWorkspaceRevision: 0,
    explanationId: contract.explanationId,
    topicId: 'native:proof',
    operations: [{ op: 'focus', targetId: 'missing' }],
    handshake: {
      bootstrapTool: contract.bootstrapTool,
      contractId: contract.contractId,
      activationId: contract.activation.id,
      nonce: contract.activation.nonce,
      baseRevision: contract.baseRevision,
      skillProof: contract.skillProof,
      skillDeliveryProof: forgedProof,
    },
  }), /stale, forged/);
});

test('hosts without registerSkill keep both A7 fallback tools operational', async () => {
  const tools = new Map();
  const host = {
    registerTool: async (tool) => tools.set(tool.name, tool),
    getTools: async () => [...tools.values()],
  };

  const status = registerWebMcpTools(workspace(), host, { standardHost: true });
  await status.ready;

  assert.equal(status.ok, true);
  assert.equal(status.verified, true);
  assert.equal(status.skillApiAvailable, false);
  assert.equal(status.skillRegistrationState, 'unavailable');
  assert.deepEqual([...tools.keys()], [...EXPLAIN_HIM_WEBMCP_TOOLS]);
  const contract = await tools.get('get_explain_him_answer').execute({});
  assert.equal(contract.skillDelivery.mode, 'pinned-remote-fallback');
  assert.equal(contract.skillDelivery.remoteVerificationRequiredForApply, true);
});

for (const [label, registerSkill] of [
  ['synchronous throw', () => { throw new Error('sync failure with private details'); }],
  ['asynchronous rejection', async () => { throw new Error('async failure with private details'); }],
]) {
  test(`skill registration ${label} does not disable tools or report native success`, async () => {
    const tools = new Map();
    const host = {
      registerTool: async (tool) => tools.set(tool.name, tool),
      getTools: async () => [...tools.values()],
      registerSkill,
    };
    const status = registerWebMcpTools(workspace(), host, { standardHost: true });
    await status.ready;
    assert.equal(status.ok, true);
    assert.equal(status.verified, true);
    assert.equal(status.skillRegistrationState, 'error');
    assert.equal(status.registeredSkill, null);
    assert.equal(status.skillRegistrationError, 'registration-failed');
    const contract = await tools.get('get_explain_him_answer').execute({});
    assert.equal(contract.skillDelivery.mode, 'pinned-remote-fallback');
  });
}
