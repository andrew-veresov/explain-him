import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { EXPLAIN_HIM_WEBMCP_TOOLS, createWebMcpTools } from '../runtime/webmcp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const [cases, groundingSkill, presentationSkill] = await Promise.all([
  readFile(join(here, 'webmcp-eval-cases.json'), 'utf8').then(JSON.parse),
  readFile(join(here, '..', 'skills', 'explain-him', 'SKILL.md'), 'utf8'),
  readFile(join(here, '..', 'skills', 'explain-him-presentation', 'SKILL.md'), 'utf8')
]);

function workspaceStub() {
  return {
    document: { title: 'Explain Him', querySelectorAll: () => [], querySelector: () => null },
    getContext: () => ({ authoredTargetIds: [] }),
    getVisibleState: () => ({ presentations: [], canUndo: false, canRedo: false }),
    focusBlock: ({ targetId }) => ({ targetId }),
    addLocalBlock: async () => {},
    removeLocalPresentation: async () => {},
    undo: async () => {},
    redo: async () => {}
  };
}

test('eval fixture covers every public Site Tool', () => {
  const covered = new Set(cases.map((item) => item.expectedTool));
  assert.deepEqual([...covered].sort(), [...EXPLAIN_HIM_WEBMCP_TOOLS].sort());
});

test('eval fixtures match current tool schemas', () => {
  const tools = new Map(createWebMcpTools(workspaceStub()).map((tool) => [tool.name, tool]));
  const ids = new Set();

  for (const item of cases) {
    assert.ok(item.id && !ids.has(item.id), `duplicate or missing eval id: ${item.id}`);
    ids.add(item.id);
    assert.ok(item.prompt?.trim(), `${item.id}: prompt is required`);
    assert.ok(item.expectedEffect?.trim(), `${item.id}: expectedEffect is required`);

    const tool = tools.get(item.expectedTool);
    assert.ok(tool, `${item.id}: unknown expected tool ${item.expectedTool}`);
    const schema = tool.inputSchema || {};
    const args = item.arguments || {};
    const allowed = new Set(Object.keys(schema.properties || {}));
    const required = new Set(schema.required || []);

    for (const key of Object.keys(args)) {
      assert.ok(allowed.has(key), `${item.id}: unexpected argument ${key}`);
    }
    for (const key of required) {
      assert.ok(Object.hasOwn(args, key), `${item.id}: missing required argument ${key}`);
    }
  }
});

test('A7 skills require Protocol v3 and reject older bootstrap or delivery proof', () => {
  for (const skill of [groundingSkill, presentationSkill]) {
    assert.match(skill, /Select the protocol only from the returned `schemaVersion`/);
    assert.match(skill, /A returned `explain-him-webmcp-contract\.v3` requires/);
    assert.match(skill, /Never downgrade or translate a returned v3 contract to v2/);
    assert.match(skill, /older bootstrap identity or delivery proof cannot authorize `apply_explanation`/i);
    assert.match(skill, /actual older page must use the skill release and protocol contract pinned by that page/i);
    assert.doesNotMatch(skill, /legacy v2 fallback/i);
    assert.doesNotMatch(skill, /The current runtime returns `explain-him-webmcp-contract\.v2`/);
    assert.doesNotMatch(skill, /the present `explain-him-webmcp-contract\.v2` response/i);
  }
});

test('A7 grounding policy requires the semantic answer bootstrap before every Explain Him answer', () => {
  assert.match(groundingSkill, /`get_explain_him_answer`/);
  assert.match(groundingSkill, /before answering any question about Explain Him or the current Explain Him page/i);
  assert.doesNotMatch(groundingSkill, /`get_explanation_contract`/);
});

test('A7 grounding policy requires pinned repository retrieval for every material page gap', () => {
  assert.match(groundingSkill, /If any material part of the answer is not explicit in the visible Personalized UI/);
  assert.match(groundingSkill, /repository retrieval is required in the same turn/i);
  assert.match(groundingSkill, /`groundingSourceIndex`/);
  assert.match(groundingSkill, /minimum pinned source/i);
  assert.match(groundingSkill, /Do not answer from plausible visible-page inference/i);
  assert.match(groundingSkill, /does not document a dedicated authoring tool/i);
  assert.match(groundingSkill, /retrieval failure/i);
});

test('A7 presentation policy keeps conditional same-turn apply and truthful failure behavior', () => {
  assert.match(presentationSkill, /initial `get_explain_him_answer` result/);
  assert.doesNotMatch(presentationSkill, /`get_explanation_contract`/);
  assert.match(presentationSkill, /Missing, partial, or inconsistent visible UI requires a same-turn `apply_explanation`/);
  assert.match(presentationSkill, /reuse the same returned local block ID/i);
  assert.match(presentationSkill, /must explicitly say that the Personalized UI did not change/i);
  assert.match(presentationSkill, /Fully present, correct, and consistent content stays chat-only/i);
});

test('A7 skills define truthful progressive inline delivery and complete fallback', () => {
  for (const skill of [groundingSkill, presentationSkill]) {
    assert.match(skill, /native-inline/);
    assert.match(skill, /pinned-remote-fallback/);
    assert.match(skill, /page-issued registration identity/i);
    assert.match(skill, /does not prove.*model.*read/is);
  }
  assert.match(groundingSkill, /document\.modelContext\.registerSkill/);
  assert.match(groundingSkill, /always registers the two independent tools first/i);
  assert.match(groundingSkill, /never disables `get_explain_him_answer` or `apply_explanation`/i);
});
