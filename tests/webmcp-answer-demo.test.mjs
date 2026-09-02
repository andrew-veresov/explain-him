import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../demo/webmcp-answer.html', import.meta.url), 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function runDemo(modelContext) {
  const answer = { textContent: '', style: {}, scrollIntoView() {} };
  const status = { textContent: '' };
  const errors = [];
  const document = {
    modelContext,
    querySelector(selector) {
      if (selector === '#answer') return answer;
      if (selector === '#status') return status;
      return null;
    }
  };
  vm.runInNewContext(script, { console: { error: (...args) => errors.push(args) }, document });
  await flush();
  return { answer, status, errors };
}

test('WebMCP answer demo awaits registration and verifies show_answer through getTools', async () => {
  let registeredTool;
  const result = await runDemo({
    registerTool: async (tool) => { registeredTool = tool; },
    getTools: async () => [registeredTool]
  });

  assert.equal(result.status.textContent, 'WebMCP: show_answer registered and verified');
  assert.equal(registeredTool.name, 'show_answer');
  await registeredTool.execute({ answer: 'Visible answer' });
  assert.equal(result.answer.textContent, 'Visible answer');
  assert.equal(result.answer.style.display, 'block');
});

test('WebMCP answer demo reports a rejected registration without false success', async () => {
  const result = await runDemo({
    registerTool: async () => { throw new Error('host rejected tool'); },
    getTools: async () => []
  });

  assert.equal(result.status.textContent, 'WebMCP: registration failed');
  assert.equal(result.errors.length, 1);
});

test('WebMCP answer demo does not claim success when the tool cannot be enumerated', async () => {
  const absent = await runDemo({
    registerTool: async () => {},
    getTools: async () => []
  });
  const noEnumerator = await runDemo({ registerTool: async () => {} });

  assert.equal(absent.status.textContent, 'WebMCP: show_answer was not found in available tools');
  assert.equal(noEnumerator.status.textContent, 'WebMCP: tool registration cannot be verified because getTools is unavailable');
});
