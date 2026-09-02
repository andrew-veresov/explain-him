import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ADDITIONAL_INFORMATION, EXPLAIN_HIM_WEBMCP_TOOLS, createWebMcpTools } from '../runtime/webmcp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const [cases, groundingSkill, presentationSkill] = await Promise.all([
  readFile(join(here, 'webmcp-eval-cases.json'), 'utf8').then(JSON.parse),
  readFile(join(here, '..', 'skills', 'explain-him', 'SKILL.md'), 'utf8'),
  readFile(join(here, '..', 'skills', 'explain-him-presentation', 'SKILL.md'), 'utf8')
]);

test('prompt eval matrix covers Russian, English, focus, mutation, repository grounding, opt-out, and false positives', () => {
  assert.ok(cases.some(({ prompt }) => /[А-Яа-я]/.test(prompt)));
  assert.ok(cases.some(({ prompt }) => /clarify|walk me through/i.test(prompt)));
  assert.ok(cases.some(({ expectedDecision }) => expectedDecision === 'existing'));
  assert.ok(cases.some(({ expectedDecision }) => expectedDecision === 'missing'));
  assert.ok(cases.some(({ expectedDecision }) => expectedDecision === 'partial'));
  assert.ok(cases.some(({ expectedDecision }) => expectedDecision === 'inconsistent'));
  assert.ok(cases.some(({ expectedDecision }) => expectedDecision === 'chat-only'));
  assert.ok(cases.some(({ expectedDecision }) => expectedDecision === 'none'));
  assert.ok(cases.some(({ expectedSequence }) => expectedSequence.includes('repository')));
});

test('every explanation eval starts with context and ends with explain_tool unless explicitly opted out', () => {
  for (const item of cases.filter(({ expectedDecision }) => !['none', 'chat-only'].includes(expectedDecision))) {
    assert.equal(item.expectedSequence[0], 'get_explain_him_context', item.id);
    assert.equal(item.expectedSequence.at(-1), 'explain_tool', item.id);
  }
  assert.deepEqual(EXPLAIN_HIM_WEBMCP_TOOLS, ['get_explain_him_context', 'explain_tool']);
});

test('tool descriptors enumerate the intended trigger language and explain same-turn display behavior', () => {
  const descriptors = createWebMcpTools({ document: { querySelectorAll: () => [] }, getContext: () => ({ workspaceRevision: 0, authoredTargetIds: [] }), getVisibleState: () => ({ presentations: [], viewMode: 'original' }) });
  const context = descriptors[0].description;
  for (const trigger of ['explain', 'clarify', 'why', 'how', 'compare', 'show', 'walk through']) assert.match(context, new RegExp(trigger, 'i'));
  assert.match(descriptors[1].description, /for every request/i);
  assert.match(descriptors[1].description, /explicitly forbids page changes/i);
  assert.match(descriptors[1].description, /automatically focus/i);
});

test('grounding skill defines Protocol v4, repository navigation, and the full decision matrix', () => {
  assert.match(groundingSkill, /`get_explain_him_context`/);
  assert.match(groundingSkill, /`explain_tool`/);
  assert.match(groundingSkill, /protocolVersion` is `4`/);
  assert.match(groundingSkill, new RegExp(ADDITIONAL_INFORMATION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(groundingSkill, /Fully present and correct[\s\S]*`existing`/i);
  assert.match(groundingSkill, /Missing[\s\S]*`missing`/i);
  assert.match(groundingSkill, /Partial[\s\S]*`partial`/i);
  assert.match(groundingSkill, /Inconsistent[\s\S]*`inconsistent`/i);
  assert.match(groundingSkill, /Explicit no-page-change request[\s\S]*Chat only/i);
  assert.doesNotMatch(groundingSkill, /navigator\.modelContext/);
  assert.doesNotMatch(groundingSkill, /Protocol v3/);
});

test('presentation skill requires target capabilities, auto-focus, topic reuse, and truthful failures', () => {
  assert.match(presentationSkill, /hasInsertionSlot: true/);
  assert.match(presentationSkill, /automatically focuses/i);
  assert.match(presentationSkill, /Reuse the returned local block ID/i);
  assert.match(presentationSkill, /workspaceRevision/);
  assert.match(presentationSkill, /Personalized UI did not change or focus/i);
  assert.doesNotMatch(presentationSkill, /chat-only/i, 'fully-present behavior must not be described as chat-only');
  assert.doesNotMatch(presentationSkill, /Protocol v3/);
});

test('issue 161 remains isolated, experimental, and non-normative', () => {
  assert.match(groundingSkill, /document\.modelContext\.registerSkill/);
  assert.match(groundingSkill, /Issue 161 is experimental and adds no third tool/i);
  assert.match(groundingSkill, /Failure of `registerSkill` must never disable the two standard tools/i);
  assert.match(groundingSkill, /not that the model read or followed the skill/i);
});
