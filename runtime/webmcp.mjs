import { getDefaultPresentationCapabilities } from './presentation/registry.mjs';

export const EXPLAIN_HIM_UI_TOOLS = Object.freeze([
  'get_explanation_context',
  'get_presentation_context',
  'get_visible_explanation_state',
  'get_local_change_history',
  'focus_explanation_block',
  'add_local_presentation',
  'remove_local_presentation',
  'add_local_explanation',
  'remove_local_explanation',
  'undo_last_local_change',
  'redo_local_change'
]);

export const EXPLAIN_HIM_DIAGNOSTIC_TOOL = 'get_webmcp_status';
export const EXPLAIN_HIM_BOOTSTRAP_TOOL = 'get_explain_him_skill';
export const EXPLAIN_HIM_WEBMCP_TOOLS = Object.freeze([
  ...EXPLAIN_HIM_UI_TOOLS,
  EXPLAIN_HIM_DIAGNOSTIC_TOOL,
  EXPLAIN_HIM_BOOTSTRAP_TOOL
]);

export function createExplainHimSkillDescriptor(options = {}) {
  return {
    schemaVersion: 'explain-him-webmcp-skill.v3',
    name: 'explain-him',
    description: 'Explain the current Originator-authored page and public repository; use related tools only for browser-local presentation adaptation.',
    instructions: [
      'Answer the user question without forcing a walkthrough.',
      'Read the current authored page first; use the personal agent GitHub integration only when deeper evidence is needed.',
      'Apply source precedence: resolutions, authored page/manifest, knowledge, README, inference.',
      'Distinguish current, target, hypothesis, open and demo-only.',
      'Form and ground meaning before invoking a Presentation Capability.',
      'Use Presentation Capabilities only when they materially improve understanding.',
      'Honor an explicit consumer presentation request when policy and availability allow it; otherwise prefer Originator recommendations and safe fallbacks.',
      'External Presentation Capabilities receive bounded typed artifacts, never unrestricted repository context through WebMCP.',
      'Never inject arbitrary HTML or JavaScript into the Explain Him page.',
      'Never treat browser-local presentations as Originator-authored knowledge or as new evidence.',
      'GitHub Issue writes require explicit user confirmation and personal-context minimization.'
    ].join('\n'),
    structuredContext: {
      pageUrl: options.pageUrl || null,
      repository: options.repository || 'andrew-veresov/explain-him',
      root: '.',
      authoredPagePath: 'index.html',
      manifestPath: 'explain-him.yaml',
      repositorySkillPath: 'skills/explain-him/SKILL.md',
      sourcePrecedence: ['resolutions', 'index.html', 'explain-him.yaml', 'knowledge', 'README.md'],
      excludedPaths: ['tests', 'tools', '.github'],
      statusVocabulary: ['current', 'target', 'hypothesis', 'open', 'demo-only', 'deprecated'],
      webmcpRole: 'skill-delivery-and-ui-only',
      webmcpApi: 'document.modelContext',
      webmcpBootstrapTool: EXPLAIN_HIM_BOOTSTRAP_TOOL,
      knowledgeBundle: null,
      repositoryAccessOwner: 'personal-agent',
      presentationArtifactSchema: 'explain-him-presentation.v1',
      presentationCapabilities: getDefaultPresentationCapabilities()
    },
    relatedTools: [...EXPLAIN_HIM_UI_TOOLS, EXPLAIN_HIM_DIAGNOSTIC_TOOL]
  };
}

function toolTitle(name) {
  return name.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function readOnlyTool(name, description, execute) {
  return {
    name,
    title: toolTitle(name),
    description,
    annotations: { readOnlyHint: true },
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
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

export function registerWebMcpTools(workspace, modelContext = null, options = {}) {
  const resolved = modelContext && typeof modelContext.registerTool === 'function'
    ? {
        modelContext,
        source: options.hostSource || 'explicit',
        standard: options.standardHost ?? options.hostSource === 'document.modelContext'
      }
    : resolveWebMcpHost(options.environment || globalThis);

  const descriptor = createExplainHimSkillDescriptor({
    pageUrl: options.pageUrl || options.environment?.location?.href || globalThis.location?.href || null,
    repository: options.repository || 'andrew-veresov/explain-him'
  });

  if (!resolved.modelContext) {
    return {
      supported: false,
      ok: false,
      hostSource: resolved.source,
      standardHost: false,
      expectedTools: [...EXPLAIN_HIM_WEBMCP_TOOLS],
      registered: [],
      registeredUiTools: [],
      errors: [],
      skill: { mode: 'unavailable', registered: false, name: descriptor.name },
      ready: Promise.resolve()
    };
  }

  const emptyInput = { type: 'object', properties: {}, additionalProperties: false };
  const blockKinds = ['example', 'analogy', 'summary', 'warning', 'comparison', 'diagram'];
  const repositoryRefSchema = {
    type: 'object', required: ['path'], additionalProperties: false,
    properties: {
      repository: { type: 'string', maxLength: 200 }, path: { type: 'string', maxLength: 500 },
      ref: { type: 'string', maxLength: 160 }, section: { type: 'string', maxLength: 300 }, status: { type: 'string', maxLength: 40 }
    }
  };
  const artifactSchema = {
    type: 'object', required: ['type', 'capability', 'content', 'fallback'], additionalProperties: false,
    properties: {
      type: { type: 'string', maxLength: 80 },
      capability: {
        type: 'object', required: ['id', 'trust', 'execution'], additionalProperties: false,
        properties: {
          id: { type: 'string', maxLength: 120 }, version: { type: 'string', maxLength: 80 },
          trust: { enum: ['builtin', 'originator-approved', 'consumer-local'] },
          execution: { enum: ['embedded', 'personal-agent', 'consumer-local'] }
        }
      },
      content: {
        type: 'object', required: ['schema', 'payload'], additionalProperties: false,
        properties: { schema: { type: 'string', maxLength: 160 }, payload: { type: 'object' } }
      },
      fallback: {
        type: 'object', required: ['title', 'body'], additionalProperties: false,
        properties: { title: { type: 'string', maxLength: 160 }, body: { type: 'string', maxLength: 5000 } }
      },
      provenance: {
        type: 'object', additionalProperties: false,
        properties: {
          sourceBlockIds: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 120 } },
          repositoryRefs: { type: 'array', maxItems: 20, items: repositoryRefSchema },
          conversationRef: { type: 'string', maxLength: 300 }
        }
      },
      authorship: {
        type: 'object', additionalProperties: false,
        properties: {
          meaning: { type: 'string', maxLength: 80 }, presentation: { type: 'string', maxLength: 120 },
          requestedBy: { enum: ['originator', 'consumer', 'agent'] }
        }
      }
    }
  };

  const status = {
    supported: true,
    ok: false,
    hostSource: resolved.source,
    standardHost: resolved.standard,
    expectedTools: [...EXPLAIN_HIM_WEBMCP_TOOLS],
    registered: [],
    registeredUiTools: [],
    errors: [],
    skill: { mode: 'webmcp-tool', registered: false, name: descriptor.name, tool: EXPLAIN_HIM_BOOTSTRAP_TOOL },
    ready: null
  };

  const tools = [
    readOnlyTool('get_explanation_context', 'WebMCP Site Tool: returns stable authored target IDs and browser-local capabilities; no knowledge content.', async () => workspace.getContext()),
    readOnlyTool('get_presentation_context', 'WebMCP Site Tool: returns Presentation Capability descriptors and trust/execution metadata; no idea knowledge.', async () => ({
      schemaVersion: 'explain-him-presentation-context.v1', artifactSchema: 'explain-him-presentation.v1',
      capabilities: getDefaultPresentationCapabilities(), arbitraryHtml: 'forbidden', arbitraryJavascript: 'forbidden'
    })),
    readOnlyTool('get_visible_explanation_state', 'WebMCP Site Tool: returns browser-local personalized state; it is not a knowledge-search API.', async () => workspace.getVisibleState()),
    readOnlyTool('get_local_change_history', 'WebMCP Site Tool: returns only the local operation history and undo/redo cursor.', async () => workspace.getLocalChangeHistory()),
    mutationTool('focus_explanation_block', 'WebMCP Site Tool: focuses an authored target for the current session.', {
      type: 'object', required: ['targetId'], additionalProperties: false, properties: { targetId: { type: 'string', maxLength: 120 } }
    }, async (input) => workspace.focusBlock(input)),
    mutationTool('add_local_presentation', 'WebMCP Site Tool: adds an already-grounded typed Presentation Artifact to the browser-local layer. Arbitrary HTML/JS is forbidden.', {
      type: 'object', required: ['targetId', 'artifact'], additionalProperties: false,
      properties: { targetId: { type: 'string', maxLength: 120 }, artifact: artifactSchema }
    }, async (input) => workspace.addLocalPresentation({
      targetId: input.targetId, artifact: input.artifact, actor: { kind: 'agent', channel: 'webmcp' }
    })),
    mutationTool('remove_local_presentation', 'WebMCP Site Tool: removes one local-* presentation; authored content cannot be removed.', {
      type: 'object', required: ['presentationId'], additionalProperties: false,
      properties: { presentationId: { type: 'string', pattern: '^local-', maxLength: 120 } }
    }, async (input) => workspace.removeLocalPresentation(input)),
    mutationTool('add_local_explanation', 'WebMCP Site Tool compatibility wrapper: adds an already-formed answer as a safe-text browser-local presentation.', {
      type: 'object', required: ['targetId', 'kind', 'title', 'body'], additionalProperties: false,
      properties: {
        targetId: { type: 'string', maxLength: 120 }, kind: { enum: blockKinds }, title: { type: 'string', maxLength: 160 },
        body: { type: 'string', maxLength: 5000 }, sourceBlockIds: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 120 } },
        repositoryRefs: { type: 'array', maxItems: 20, items: repositoryRefSchema }, conversationRef: { type: 'string', maxLength: 300 }
      }
    }, async (input) => workspace.addLocalBlock({
      targetId: input.targetId, kind: input.kind, title: input.title, body: input.body,
      actor: { kind: 'agent', channel: 'webmcp' },
      provenance: { sourceBlockIds: input.sourceBlockIds || [input.targetId], repositoryRefs: input.repositoryRefs || [], conversationRef: input.conversationRef || null }
    })),
    mutationTool('remove_local_explanation', 'WebMCP Site Tool compatibility wrapper for removing one local-* presentation.', {
      type: 'object', required: ['blockId'], additionalProperties: false, properties: { blockId: { type: 'string', pattern: '^local-', maxLength: 120 } }
    }, async (input) => workspace.removeLocalBlock(input)),
    mutationTool('undo_last_local_change', 'WebMCP Site Tool: moves the local operation cursor one step backwards.', emptyInput, async () => workspace.undo()),
    mutationTool('redo_local_change', 'WebMCP Site Tool: moves the local operation cursor one step forwards.', emptyInput, async () => workspace.redo()),
    readOnlyTool(EXPLAIN_HIM_DIAGNOSTIC_TOOL,
      'Reports whether this page exposes Explain Him through WebMCP/Site Tools and lists the registered tool surface. Use for questions about WebMCP or Site Tool availability.',
      async () => ({
        schemaVersion: 'explain-him-webmcp-status.v1',
        available: true,
        hostSource: status.hostSource,
        standardHost: status.standardHost,
        expectedTools: [...status.expectedTools],
        registeredTools: [...status.registered],
        errors: [...status.errors]
      })),
    readOnlyTool(EXPLAIN_HIM_BOOTSTRAP_TOOL,
      'Explain Him WebMCP/Site Tool bootstrap. Returns the repository-scoped explanation instructions and navigation context; call it when you need to understand how to explain this page.',
      async () => descriptor)
  ];

  const register = async (tool) => {
    try {
      await resolved.modelContext.registerTool(tool);
      status.registered.push(tool.name);
      if (EXPLAIN_HIM_UI_TOOLS.includes(tool.name)) status.registeredUiTools.push(tool.name);
    } catch (error) {
      status.errors.push({ kind: 'tool', name: tool.name, message: String(error?.message || error) });
    }
  };

  status.ready = (async () => {
    for (const tool of tools) await register(tool);
    status.skill.registered = status.registered.includes(EXPLAIN_HIM_BOOTSTRAP_TOOL);
    status.ok = status.errors.length === 0
      && status.expectedTools.every((name) => status.registered.includes(name));
    return status;
  })();

  return status;
}
