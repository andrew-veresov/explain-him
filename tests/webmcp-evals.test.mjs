import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { EXPLAIN_HIM_WEBMCP_TOOLS, createWebMcpTools } from '../runtime/webmcp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(await readFile(join(here, 'webmcp-eval-cases.json'), 'utf8'));

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
