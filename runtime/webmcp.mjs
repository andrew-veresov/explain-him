export const EXPLAIN_HIM_UI_TOOLS = Object.freeze([
  'get_explanation_context',
  'get_visible_explanation_state',
  'get_local_change_history',
  'focus_explanation_block',
  'add_local_explanation',
  'remove_local_explanation',
  'undo_last_local_change',
  'redo_local_change'
]);

export function createExplainHimSkillDescriptor(options = {}) {
  return {
    schemaVersion: 'explain-him-webmcp-skill.v1',
    name: 'explain-him',
    description: 'Explain the current Originator-authored page and public repository; use related tools only for browser-local visual adaptation.',
    instructions: [
      'Answer the user question without forcing a walkthrough.',
      'Read the current authored page first; use the personal agent GitHub integration only when deeper evidence is needed.',
      'Apply source precedence: resolutions, authored page/manifest, knowledge, README, inference.',
      'Distinguish current, target, hypothesis, open and demo-only.',
      'Form the answer before calling any related UI tool.',
      'Never treat browser-local blocks as Originator-authored knowledge.',
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
      knowledgeBundle: null,
      repositoryAccessOwner: 'personal-agent'
    },
    relatedTools: [...EXPLAIN_HIM_UI_TOOLS]
  };
}

function readOnlyTool(name, description, execute) {
  return {
    name,
    description,
    annotations: { readOnlyHint: true },
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute
  };
}

function mutationTool(name, description, inputSchema, execute) {
  return { name, description, annotations: { readOnlyHint: false }, inputSchema, execute };
}

function getSkillHost(modelContext) {
  if (modelContext && typeof modelContext.registerSkill === 'function') return modelContext;
  const host = globalThis.navigator?.modelContext;
  return host && typeof host.registerSkill === 'function' ? host : null;
}

export function registerWebMcpTools(workspace, modelContext, options = {}) {
  if (!modelContext || typeof modelContext.registerTool !== 'function') {
    return {
      supported: false,
      registered: [],
      registeredUiTools: [],
      errors: [],
      skill: { mode: 'unavailable', registered: false },
      ready: Promise.resolve()
    };
  }

  const emptyInput = { type: 'object', properties: {}, additionalProperties: false };
  const blockKinds = ['example', 'analogy', 'summary', 'warning', 'comparison', 'diagram'];
  const repositoryRefSchema = {
    type: 'object',
    required: ['path'],
    additionalProperties: false,
    properties: {
      repository: { type: 'string', maxLength: 200 },
      path: { type: 'string', maxLength: 500 },
      ref: { type: 'string', maxLength: 160 },
      section: { type: 'string', maxLength: 300 },
      status: { type: 'string', maxLength: 40 }
    }
  };

  const descriptor = createExplainHimSkillDescriptor({
    pageUrl: options.pageUrl || globalThis.location?.href || null,
    repository: options.repository || 'andrew-veresov/explain-him'
  });

  const tools = [
    readOnlyTool('get_explanation_context', 'Returns stable authored target IDs and browser-local capabilities; no knowledge content.', async () => workspace.getContext()),
    readOnlyTool('get_visible_explanation_state', 'Returns browser-local personalized state; it is not a knowledge-search API.', async () => workspace.getVisibleState()),
    readOnlyTool('get_local_change_history', 'Returns only the local operation history and undo/redo cursor.', async () => workspace.getLocalChangeHistory()),
    mutationTool('focus_explanation_block', 'Focuses an authored target for the current session.', {
      type: 'object', required: ['targetId'], additionalProperties: false,
      properties: { targetId: { type: 'string', maxLength: 120 } }
    }, async (input) => workspace.focusBlock(input)),
    mutationTool('add_local_explanation', 'Displays an already-formed personal-agent answer as a browser-local block.', {
      type: 'object', required: ['targetId', 'kind', 'title', 'body'], additionalProperties: false,
      properties: {
        targetId: { type: 'string', maxLength: 120 },
        kind: { enum: blockKinds },
        title: { type: 'string', maxLength: 160 },
        body: { type: 'string', maxLength: 5000 },
        sourceBlockIds: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 120 } },
        repositoryRefs: { type: 'array', maxItems: 20, items: repositoryRefSchema },
        conversationRef: { type: 'string', maxLength: 300 }
      }
    }, async (input) => workspace.addLocalBlock({
      targetId: input.targetId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      actor: { kind: 'agent', channel: 'webmcp' },
      provenance: {
        sourceBlockIds: input.sourceBlockIds || [input.targetId],
        repositoryRefs: input.repositoryRefs || [],
        conversationRef: input.conversationRef || null
      }
    })),
    mutationTool('remove_local_explanation', 'Removes one local-* block; authored content cannot be removed.', {
      type: 'object', required: ['blockId'], additionalProperties: false,
      properties: { blockId: { type: 'string', pattern: '^local-', maxLength: 120 } }
    }, async (input) => workspace.removeLocalBlock(input)),
    mutationTool('undo_last_local_change', 'Moves the local operation cursor one step backwards.', emptyInput, async () => workspace.undo()),
    mutationTool('redo_local_change', 'Moves the local operation cursor one step forwards.', emptyInput, async () => workspace.redo())
  ];

  const compatibilityTool = readOnlyTool(
    'get_explain_him_skill',
    'Compatibility fallback for hosts without registerSkill(); returns instructions and navigation context, not knowledge.',
    async () => descriptor
  );

  const status = {
    supported: true,
    registered: [],
    registeredUiTools: [],
    errors: [],
    skill: { mode: 'pending', registered: false, name: descriptor.name },
    ready: null
  };

  const register = async (tool) => {
    try {
      await modelContext.registerTool(tool);
      status.registered.push(tool.name);
      if (EXPLAIN_HIM_UI_TOOLS.includes(tool.name)) status.registeredUiTools.push(tool.name);
    } catch (error) {
      status.errors.push({ kind: 'tool', name: tool.name, message: String(error?.message || error) });
      throw error;
    }
  };

  status.ready = (async () => {
    const results = await Promise.allSettled(tools.map(register));
    const allUiRegistered = results.every((result) => result.status === 'fulfilled')
      && status.registeredUiTools.length === EXPLAIN_HIM_UI_TOOLS.length;
    if (!allUiRegistered) {
      status.skill = { mode: 'not-registered', registered: false, name: descriptor.name };
      return status;
    }

    const skillHost = getSkillHost(modelContext);
    if (skillHost) {
      try {
        await skillHost.registerSkill(descriptor);
        status.skill = { mode: 'registerSkill', registered: true, name: descriptor.name };
        return status;
      } catch (error) {
        status.errors.push({ kind: 'skill', name: descriptor.name, message: String(error?.message || error) });
      }
    }

    await register(compatibilityTool).catch(() => undefined);
    status.skill = {
      mode: 'compatibility-tool',
      registered: false,
      name: descriptor.name,
      compatibilityToolRegistered: status.registered.includes('get_explain_him_skill')
    };
    return status;
  })();

  return status;
}
