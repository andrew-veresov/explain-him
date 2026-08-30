export const EXPLAIN_HIM_WEBMCP_TOOLS = Object.freeze([
  'get_explanation_contract',
  'apply_explanation'
]);

// Compatibility export for tests/code that groups the public WebMCP surface as UI tools.
export const EXPLAIN_HIM_UI_TOOLS = EXPLAIN_HIM_WEBMCP_TOOLS;

export const EXPLANATION_BLOCK_TYPES = Object.freeze([
  'callout', 'comparison', 'workflow', 'timeline', 'diagram'
]);

const REPOSITORY = 'andrew-veresov/explain-him';
const REPOSITORY_URL = `https://github.com/${REPOSITORY}`;
const SKILL_PATH = 'skills/explain-him/SKILL.md';
const SKILL_URL = `${REPOSITORY_URL}/blob/main/${SKILL_PATH}`;
const PRESENTATION_SKILL_PATH = 'skills/explain-him-presentation/SKILL.md';
const PRESENTATION_SKILL_URL = `${REPOSITORY_URL}/blob/main/${PRESENTATION_SKILL_PATH}`;
const BLOCK_SCHEMA_PATH = 'schemas/explanation-block.v1.schema.json';
const BLOCK_SCHEMA_URL = `${REPOSITORY_URL}/blob/main/${BLOCK_SCHEMA_PATH}`;
const EMPTY_INPUT = Object.freeze({ type: 'object', properties: {}, additionalProperties: false });

function toolTitle(name) {
  return name.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function readOnlyTool(name, description, inputSchema, execute) {
  return {
    name,
    title: toolTitle(name),
    description,
    annotations: { readOnlyHint: true },
    inputSchema,
    execute
  };
}

function mutationTool(name, description, inputSchema, execute) {
  return {
    name,
    title: toolTitle(name),
    description,
    annotations: { readOnlyHint: false },
    inputSchema,
    execute
  };
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stringValue(value, field, maxLength = 500) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} must be a non-empty string`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new RangeError(`${field} exceeds ${maxLength} characters`);
  return normalized;
}

function optionalString(value, maxLength = 500) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new TypeError('Optional text field must be a string');
  return value.trim().slice(0, maxLength) || null;
}

function nodeTitle(node) {
  return String(
    node.querySelector?.('h1,h2,h3,h4,[data-eh-title]')?.textContent
      || node.querySelector?.('strong')?.textContent
      || node.dataset?.ehBlockId
      || 'Explanation target'
  ).replace(/\s+/g, ' ').trim().slice(0, 120);
}

function targetDescriptors(workspace) {
  const document = workspace.document;
  if (!document?.querySelectorAll) {
    return (workspace.getContext?.().authoredTargetIds || []).map((id) => ({ id, title: id }));
  }
  return [...document.querySelectorAll('[data-eh-block-id]')].map((node) => ({
    id: node.dataset.ehBlockId,
    title: nodeTitle(node)
  }));
}

function localBlockDescriptors(workspace) {
  const presentations = workspace.getVisibleState?.().presentations || [];
  return presentations.slice(-30).map((presentation) => ({
    id: presentation.id,
    targetId: presentation.targetId,
    type: presentation.artifact?.type || null,
    title: presentation.artifact?.fallback?.title || 'Personal explanation'
  }));
}

function contractFor(workspace) {
  const base = workspace.getContext?.() || {};
  return {
    schemaVersion: 'explain-him-webmcp-contract.v1',
    explanationId: base.explanationId || null,
    baseRevision: base.baseRevision || null,
    repository: {
      fullName: REPOSITORY,
      url: REPOSITORY_URL
    },
    skills: [
      {
        id: 'explain-him',
        responsibility: 'grounding-and-repository-retrieval',
        path: SKILL_PATH,
        url: SKILL_URL
      },
      {
        id: 'explain-him-presentation',
        responsibility: 'typed-page-presentation-and-guided-focus',
        path: PRESENTATION_SKILL_PATH,
        url: PRESENTATION_SKILL_URL
      }
    ],
    instruction: 'Load both repository-scoped skills before grounding, presenting, or guiding the user through this explanation.',
    blockSchema: {
      path: BLOCK_SCHEMA_PATH,
      url: BLOCK_SCHEMA_URL,
      types: [...EXPLANATION_BLOCK_TYPES]
    },
    targets: targetDescriptors(workspace),
    localBlocks: localBlockDescriptors(workspace),
    applyOperations: ['add', 'remove', 'focus'],
    authoredLayerMutable: false,
    repositoryAccessViaWebMcp: false
  };
}

function sourceSchema() {
  return {
    type: 'object',
    required: ['path'],
    additionalProperties: false,
    properties: {
      repository: { type: 'string', maxLength: 200, description: 'Repository full name. Defaults to andrew-veresov/explain-him.' },
      path: { type: 'string', maxLength: 500, description: 'Repository path supporting this explanation block.' },
      ref: { type: 'string', maxLength: 160, description: 'Optional branch, tag, or commit reference.' },
      section: { type: 'string', maxLength: 300, description: 'Optional heading or section within the source.' },
      status: { type: 'string', maxLength: 40, description: 'Optional claim status such as current, target, hypothesis, open, or demo-only.' }
    }
  };
}

function blockSchema() {
  const sources = {
    type: 'array',
    maxItems: 20,
    description: 'Repository provenance collected by the personal agent while grounding this block.',
    items: sourceSchema()
  };
  return {
    oneOf: [
      {
        title: 'Callout',
        type: 'object',
        required: ['type', 'title', 'body'],
        additionalProperties: false,
        properties: {
          type: { const: 'callout' },
          title: { type: 'string', maxLength: 160 },
          body: { type: 'string', maxLength: 5000 },
          tone: { type: 'string', enum: ['neutral', 'example', 'warning', 'insight'] },
          sources
        }
      },
      {
        title: 'Comparison',
        type: 'object',
        required: ['type', 'title', 'columns'],
        additionalProperties: false,
        properties: {
          type: { const: 'comparison' },
          title: { type: 'string', maxLength: 160 },
          columns: {
            type: 'array', minItems: 2, maxItems: 4,
            items: {
              type: 'object', required: ['title', 'items'], additionalProperties: false,
              properties: {
                title: { type: 'string', maxLength: 120 },
                items: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'string', maxLength: 500 } }
              }
            }
          },
          sources
        }
      },
      {
        title: 'Workflow',
        type: 'object',
        required: ['type', 'title', 'steps'],
        additionalProperties: false,
        properties: {
          type: { const: 'workflow' },
          title: { type: 'string', maxLength: 160 },
          steps: {
            type: 'array', minItems: 2, maxItems: 12,
            items: {
              type: 'object', required: ['title'], additionalProperties: false,
              properties: {
                title: { type: 'string', maxLength: 120 },
                body: { type: 'string', maxLength: 800 }
              }
            }
          },
          sources
        }
      },
      {
        title: 'Timeline',
        type: 'object',
        required: ['type', 'title', 'items'],
        additionalProperties: false,
        properties: {
          type: { const: 'timeline' },
          title: { type: 'string', maxLength: 160 },
          items: {
            type: 'array', minItems: 2, maxItems: 16,
            items: {
              type: 'object', required: ['label', 'body'], additionalProperties: false,
              properties: {
                label: { type: 'string', maxLength: 100 },
                body: { type: 'string', maxLength: 800 }
              }
            }
          },
          sources
        }
      },
      {
        title: 'Diagram',
        type: 'object',
        required: ['type', 'title', 'variant', 'nodes'],
        additionalProperties: false,
        properties: {
          type: { const: 'diagram' },
          title: { type: 'string', maxLength: 160 },
          variant: { type: 'string', enum: ['concept', 'architecture', 'sequence', 'flow'] },
          nodes: {
            type: 'array', minItems: 2, maxItems: 16,
            items: {
              type: 'object', required: ['id', 'label'], additionalProperties: false,
              properties: {
                id: { type: 'string', maxLength: 80 },
                label: { type: 'string', maxLength: 140 },
                body: { type: 'string', maxLength: 600 }
              }
            }
          },
          edges: {
            type: 'array', maxItems: 30,
            items: {
              type: 'object', required: ['from', 'to'], additionalProperties: false,
              properties: {
                from: { type: 'string', maxLength: 80 },
                to: { type: 'string', maxLength: 80 },
                label: { type: 'string', maxLength: 120 }
              }
            }
          },
          sources
        }
      }
    ]
  };
}

function applySchema(workspace) {
  const targetIds = targetDescriptors(workspace).map((target) => target.id);
  return {
    type: 'object',
    required: ['operations'],
    additionalProperties: false,
    properties: {
      operations: {
        type: 'array',
        minItems: 1,
        maxItems: 8,
        description: 'Typed explanation changes to apply to the browser-local layer in order.',
        items: {
          oneOf: [
            {
              title: 'Add typed explanation block',
              type: 'object',
              required: ['op', 'targetId', 'block'],
              additionalProperties: false,
              properties: {
                op: { const: 'add' },
                targetId: {
                  type: 'string',
                  enum: targetIds,
                  description: 'Authored target where the grounded explanation block should appear.'
                },
                block: blockSchema()
              }
            },
            {
              title: 'Remove browser-local explanation block',
              type: 'object',
              required: ['op', 'blockId'],
              additionalProperties: false,
              properties: {
                op: { const: 'remove' },
                blockId: {
                  type: 'string',
                  pattern: '^local-',
                  maxLength: 120,
                  description: 'Browser-local block ID returned by get_explanation_contract.'
                }
              }
            },
            {
              title: 'Focus authored explanation target',
              type: 'object',
              required: ['op', 'targetId'],
              additionalProperties: false,
              properties: {
                op: { const: 'focus' },
                targetId: {
                  type: 'string',
                  enum: targetIds,
                  description: 'Authored target to reveal, highlight, and scroll into view during a guided explanation.'
                }
              }
            }
          ]
        }
      }
    }
  };
}

function normalizeSources(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((source) => ({
    repository: optionalString(source?.repository, 200) || REPOSITORY,
    path: stringValue(source?.path, 'sources.path', 500),
    ref: optionalString(source?.ref, 160),
    section: optionalString(source?.section, 300),
    status: optionalString(source?.status, 40)
  }));
}

function validateBlock(block) {
  if (!block || typeof block !== 'object') throw new TypeError('block must be an object');
  const type = stringValue(block.type, 'block.type', 40);
  if (!EXPLANATION_BLOCK_TYPES.includes(type)) throw new TypeError(`Unsupported explanation block type: ${type}`);
  const title = stringValue(block.title, 'block.title', 160);
  const sources = normalizeSources(block.sources);

  if (type === 'callout') {
    return { type, title, body: stringValue(block.body, 'block.body', 5000), tone: block.tone || 'neutral', sources };
  }

  if (type === 'comparison') {
    if (!Array.isArray(block.columns) || block.columns.length < 2 || block.columns.length > 4) {
      throw new TypeError('comparison.columns must contain 2 to 4 columns');
    }
    return {
      type, title, sources,
      columns: block.columns.map((column) => ({
        title: stringValue(column?.title, 'comparison.columns.title', 120),
        items: (column?.items || []).map((item) => stringValue(item, 'comparison.columns.items', 500))
      }))
    };
  }

  if (type === 'workflow') {
    if (!Array.isArray(block.steps) || block.steps.length < 2 || block.steps.length > 12) {
      throw new TypeError('workflow.steps must contain 2 to 12 steps');
    }
    return {
      type, title, sources,
      steps: block.steps.map((step) => ({
        title: stringValue(step?.title, 'workflow.steps.title', 120),
        body: optionalString(step?.body, 800)
      }))
    };
  }

  if (type === 'timeline') {
    if (!Array.isArray(block.items) || block.items.length < 2 || block.items.length > 16) {
      throw new TypeError('timeline.items must contain 2 to 16 items');
    }
    return {
      type, title, sources,
      items: block.items.map((item) => ({
        label: stringValue(item?.label, 'timeline.items.label', 100),
        body: stringValue(item?.body, 'timeline.items.body', 800)
      }))
    };
  }

  if (!Array.isArray(block.nodes) || block.nodes.length < 2 || block.nodes.length > 16) {
    throw new TypeError('diagram.nodes must contain 2 to 16 nodes');
  }
  const nodes = block.nodes.map((node) => ({
    id: stringValue(node?.id, 'diagram.nodes.id', 80),
    label: stringValue(node?.label, 'diagram.nodes.label', 140),
    body: optionalString(node?.body, 600)
  }));
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodeIds.size !== nodes.length) throw new TypeError('diagram node IDs must be unique');
  const edges = Array.isArray(block.edges) ? block.edges.map((edge) => {
    const from = stringValue(edge?.from, 'diagram.edges.from', 80);
    const to = stringValue(edge?.to, 'diagram.edges.to', 80);
    if (!nodeIds.has(from) || !nodeIds.has(to)) throw new TypeError('diagram edges must reference existing node IDs');
    return { from, to, label: optionalString(edge?.label, 120) };
  }) : [];
  return {
    type, title, sources,
    variant: ['concept', 'architecture', 'sequence', 'flow'].includes(block.variant) ? block.variant : 'concept',
    nodes,
    edges
  };
}

function fallbackBody(block) {
  if (block.type === 'callout') return block.body;
  if (block.type === 'comparison') {
    return block.columns.map((column) => `${column.title}: ${column.items.join('; ')}`).join('\n');
  }
  if (block.type === 'workflow') {
    return block.steps.map((step, index) => `${index + 1}. ${step.title}${step.body ? ` – ${step.body}` : ''}`).join('\n');
  }
  if (block.type === 'timeline') {
    return block.items.map((item) => `${item.label}: ${item.body}`).join('\n');
  }
  const lines = block.nodes.map((node) => `${node.id}: ${node.label}${node.body ? ` – ${node.body}` : ''}`);
  for (const edge of block.edges) lines.push(`${edge.from} -> ${edge.to}${edge.label ? ` (${edge.label})` : ''}`);
  return lines.join('\n');
}

function artifactFor(block, targetId) {
  const normalized = validateBlock(block);
  const { sources, ...payload } = normalized;
  return {
    type: normalized.type,
    capability: {
      id: 'explain-him-safe-block',
      trust: 'builtin',
      execution: 'embedded'
    },
    content: {
      schema: `explain-him.block.${normalized.type}.v1`,
      payload
    },
    fallback: {
      title: normalized.title,
      body: fallbackBody(normalized)
    },
    provenance: {
      sourceBlockIds: [targetId],
      repositoryRefs: sources
    },
    authorship: {
      meaning: 'personal-agent',
      presentation: 'explain-him-safe-block',
      requestedBy: 'agent'
    }
  };
}

function prepareOperations(workspace, input) {
  if (!Array.isArray(input?.operations) || input.operations.length < 1 || input.operations.length > 8) {
    throw new TypeError('operations must contain 1 to 8 items');
  }
  const targetIds = new Set(targetDescriptors(workspace).map((target) => target.id));
  const localIds = new Set(localBlockDescriptors(workspace).map((block) => block.id));
  return input.operations.map((operation) => {
    if (operation?.op === 'add') {
      const targetId = stringValue(operation.targetId, 'operation.targetId', 120);
      if (!targetIds.has(targetId)) throw new RangeError(`Unknown authored target: ${targetId}`);
      return { op: 'add', targetId, artifact: artifactFor(operation.block, targetId) };
    }
    if (operation?.op === 'remove') {
      const blockId = stringValue(operation.blockId, 'operation.blockId', 120);
      if (!blockId.startsWith('local-') || !localIds.has(blockId)) throw new RangeError(`Unknown local explanation block: ${blockId}`);
      localIds.delete(blockId);
      return { op: 'remove', blockId };
    }
    if (operation?.op === 'focus') {
      const targetId = stringValue(operation.targetId, 'operation.targetId', 120);
      if (!targetIds.has(targetId)) throw new RangeError(`Unknown authored target: ${targetId}`);
      return { op: 'focus', targetId };
    }
    throw new TypeError('operation.op must be add, remove, or focus');
  });
}

function createdBlock(beforeIds, workspace) {
  return (workspace.getVisibleState?.().presentations || []).find((item) => !beforeIds.has(item.id)) || null;
}

async function applyOperations(workspace, input) {
  const plan = prepareOperations(workspace, input);
  const applied = [];
  for (const operation of plan) {
    if (operation.op === 'focus') {
      const focused = workspace.focusBlock({ targetId: operation.targetId });
      applied.push({ op: 'focus', targetId: focused?.targetId || operation.targetId });
      continue;
    }
    if (operation.op === 'remove') {
      await workspace.removeLocalPresentation({ presentationId: operation.blockId });
      applied.push({ op: 'remove', blockId: operation.blockId });
      continue;
    }
    const beforeIds = new Set((workspace.getVisibleState?.().presentations || []).map((item) => item.id));
    await workspace.addLocalPresentation({
      targetId: operation.targetId,
      artifact: clone(operation.artifact),
      actor: { kind: 'agent', channel: 'webmcp' }
    });
    const created = createdBlock(beforeIds, workspace);
    applied.push({
      op: 'add',
      blockId: created?.id || null,
      targetId: operation.targetId,
      type: operation.artifact.type,
      title: operation.artifact.fallback.title
    });
  }
  return {
    ok: true,
    applied,
    localBlocks: localBlockDescriptors(workspace)
  };
}

export function resolveWebMcpHost(environment = globalThis) {
  const standardHost = environment?.document?.modelContext;
  if (standardHost && typeof standardHost.registerTool === 'function') {
    return { modelContext: standardHost, source: 'document.modelContext', standard: true };
  }

  const legacyHost = environment?.navigator?.modelContext;
  if (legacyHost && typeof legacyHost.registerTool === 'function') {
    return { modelContext: legacyHost, source: 'navigator.modelContext', standard: false };
  }

  return { modelContext: null, source: 'none', standard: false };
}

export function createWebMcpTools(workspace) {
  return [
    readOnlyTool(
      'get_explanation_contract',
      'Call first on an Explain Him page. Returns the repository and both repository-scoped skills, typed block schema, authored targets, and existing browser-local blocks. Skills – not WebMCP – define grounding, repository retrieval, presentation, and guided focus.',
      EMPTY_INPUT,
      async () => contractFor(workspace)
    ),
    mutationTool(
      'apply_explanation',
      'Apply already-grounded results to the page: add safe typed browser-local blocks, remove earlier local blocks, or focus authored targets for a guided walkthrough. Load the skills returned by get_explanation_contract first. WebMCP does not retrieve GitHub knowledge or generate answers.',
      applySchema(workspace),
      async (input) => applyOperations(workspace, input)
    )
  ];
}

export function registerWebMcpTools(workspace, modelContext = null, options = {}) {
  const resolved = modelContext && typeof modelContext.registerTool === 'function'
    ? {
        modelContext,
        source: options.hostSource || 'explicit',
        standard: options.standardHost ?? options.hostSource === 'document.modelContext'
      }
    : resolveWebMcpHost(options.environment || globalThis);

  const status = {
    supported: Boolean(resolved.modelContext),
    ok: false,
    verified: false,
    verificationError: null,
    hostSource: resolved.source,
    standardHost: resolved.standard,
    expectedTools: [...EXPLAIN_HIM_WEBMCP_TOOLS],
    registered: [],
    verifiedTools: [],
    errors: [],
    ready: null
  };

  if (!resolved.modelContext) {
    status.ready = Promise.resolve(status);
    return status;
  }

  const tools = createWebMcpTools(workspace);
  status.ready = (async () => {
    for (const tool of tools) {
      try {
        await resolved.modelContext.registerTool(tool);
        status.registered.push(tool.name);
      } catch (error) {
        status.errors.push({ name: tool.name, message: String(error?.message || error) });
      }
    }

    status.ok = status.errors.length === 0
      && status.expectedTools.every((name) => status.registered.includes(name));

    if (typeof resolved.modelContext.getTools === 'function') {
      try {
        const available = await resolved.modelContext.getTools();
        const names = Array.isArray(available)
          ? available.map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean)
          : [];
        status.verifiedTools = status.expectedTools.filter((name) => names.includes(name));
        status.verified = status.expectedTools.every((name) => status.verifiedTools.includes(name));
      } catch (error) {
        status.verificationError = String(error?.message || error);
      }
    }

    return status;
  })();

  return status;
}
