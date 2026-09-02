import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createExplanationWorkspace, MemoryWorkspaceStore } from '../runtime/workspace.mjs';
import { createWebMcpTools } from '../runtime/webmcp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const load = (name) => readFile(join(here, '..', 'schemas', name), 'utf8').then(JSON.parse);
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
function pointer(root, ref) { return ref.slice(2).split('/').reduce((value, key) => value?.[key.replaceAll('~1', '/').replaceAll('~0', '~')], root); }
function validate(root, schema, value) {
  if (!schema || typeof schema !== 'object') return true;
  if (schema.$ref) return validate(root, pointer(root, schema.$ref), value);
  if (schema.oneOf) return schema.oneOf.filter((entry) => validate(root, entry, value)).length === 1;
  if (Object.hasOwn(schema, 'const') && !equal(value, schema.const)) return false;
  if (schema.enum && !schema.enum.some((entry) => equal(value, entry))) return false;
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => type === 'null' ? value === null : type === 'object' ? value && typeof value === 'object' && !Array.isArray(value) : type === 'array' ? Array.isArray(value) : type === 'string' ? typeof value === 'string' : type === 'integer' ? Number.isInteger(value) : type === 'boolean' ? typeof value === 'boolean' : false)) return false;
  }
  if (schema.type === 'object' || (Array.isArray(schema.type) && schema.type.includes('object') && value && typeof value === 'object' && !Array.isArray(value))) {
    if ((schema.required || []).some((key) => !Object.hasOwn(value, key))) return false;
    if (schema.additionalProperties === false && Object.keys(value).some((key) => !Object.hasOwn(schema.properties || {}, key))) return false;
    if (!Object.entries(schema.properties || {}).every(([key, child]) => !Object.hasOwn(value, key) || validate(root, child, value[key]))) return false;
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) return false;
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return false;
    if (schema.items && !value.every((item) => validate(root, schema.items, item))) return false;
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) return false;
    if (schema.maxLength !== undefined && value.length > schema.maxLength) return false;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return false;
  }
  if (Number.isInteger(value) && schema.minimum !== undefined && value < schema.minimum) return false;
  return true;
}

test('checked-in Protocol v5 schema accepts runtime input and rejects removed or unknown fields', async () => {
  const explainSchema = await load('webmcp-explain.v5.schema.json');
  const workspace = await createExplanationWorkspace({ document: null, explanationId: 'checked-schema', baseRevision: 'r1', canonicalIds: ['workflow-diagram'], store: new MemoryWorkspaceStore() });
  workspace.focusBlock = async (request) => ({ ...request, visible: true, focused: true });
  const tools = new Map(createWebMcpTools(workspace).map((tool) => [tool.name, tool]));
  const input = {
    requestId: 'checked-schema-request', topicId: 'terminology:user-consumer', decision: 'inconsistent',
    operations: [{ op: 'replace', targetId: 'workflow-diagram', block: { type: 'diagram', title: 'Terminology', variant: 'flow', nodes: [{ id: 'user', label: 'User' }, { id: 'agent', label: 'Personal agent' }], edges: [{ from: 'user', to: 'agent', label: 'asks' }], sources: [{ path: 'PRODUCT-CONTRACT.md', status: 'current' }] } }]
  };
  assert.equal(validate(explainSchema, explainSchema, input), true);
  assert.equal((await tools.get('explain_tool').execute(input)).ok, true);
  assert.equal(validate(explainSchema, explainSchema, { ...input, activationId: 'removed' }), false);
  assert.equal(validate(explainSchema, explainSchema, { ...input, expectedWorkspaceRevision: 0 }), false);
  assert.equal(validate(explainSchema, explainSchema, { ...input, contractId: 'legacy' }), false);
  assert.equal(validate(explainSchema, explainSchema, { ...input, operations: [{ ...input.operations[0], unknown: true }] }), false);
  assert.equal(validate(explainSchema, explainSchema, { ...input, operations: [{ ...input.operations[0], block: { ...input.operations[0].block, html: '<script />' } }] }), false);
});
