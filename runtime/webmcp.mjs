export const EXPLAIN_HIM_WEBMCP_TOOLS = Object.freeze([
  'get_explanation_context',
  'get_personalization_state',
  'focus_explanation',
  'add_personal_explanation',
  'remove_personal_explanation',
  'undo_personalization',
  'redo_personalization'
]);

// Kept as an export alias for code that treats these as UI tools.
export const EXPLAIN_HIM_UI_TOOLS = EXPLAIN_HIM_WEBMCP_TOOLS;

const EMPTY_INPUT = Object.freeze({ type: 'object', properties: {}, additionalProperties: false });
const PERSONAL_EXPLANATION_KINDS = Object.freeze(['example', 'analogy', 'summary', 'warning', 'comparison']);

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

function normalizeText(value, maxLength = 180) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function authoredTargetFromNode(node, detailed = false) {
  const heading = node.querySelector?.('h1,h2,h3,h4,[data-eh-title]')?.textContent
    || node.querySelector?.('strong')?.textContent
    || node.dataset?.ehBlockId
    || 'Explanation section';
  return {
    id: node.dataset.ehBlockId,
    title: normalizeText(heading, 100),
    text: normalizeText(node.textContent, detailed ? 700 : 150)
  };
}

function getAuthoredPageContext(workspace, input = {}) {
  const base = typeof workspace.getContext === 'function' ? workspace.getContext() : {};
  const document = workspace.document;
  const targetId = typeof input.targetId === 'string' && input.targetId.trim() ? input.targetId.trim() : null;

  if (!document?.querySelectorAll) {
    return {
      schemaVersion: 'explain-him-page-context.v1',
      explanationId: base.explanationId || null,
      baseRevision: base.baseRevision || null,
      source: 'current-authored-page',
      availableTargetIds: [...(base.authoredTargetIds || [])],
      targets: []
    };
  }

  const allNodes = [...document.querySelectorAll('[data-eh-block-id]')];
  if (targetId && !allNodes.some((node) => node.dataset.ehBlockId === targetId)) {
    throw new RangeError(`Unknown authored target: ${targetId}`);
  }
  const selected = targetId
    ? allNodes.filter((node) => node.dataset.ehBlockId === targetId)
    : allNodes.slice(0, 10);

  return {
    schemaVersion: 'explain-him-page-context.v1',
    explanationId: base.explanationId || null,
    baseRevision: base.baseRevision || null,
    pageTitle: normalizeText(document.title || 'Explain Him', 120),
    source: 'current-authored-page',
    repository: 'andrew-veresov/explain-him',
    targetCount: allNodes.length,
    availableTargetIds: allNodes.map((node) => node.dataset.ehBlockId),
    targets: selected.map((node) => authoredTargetFromNode(node, Boolean(targetId)))
  };
}

function summarizePersonalization(workspace) {
  const view = typeof workspace.getVisibleState === 'function' ? workspace.getVisibleState() : {};
  const presentations = Array.isArray(view.presentations) ? view.presentations : [];
  return {
    schemaVersion: 'explain-him-personalization-state.v1',
    count: presentations.length,
    canUndo: Boolean(view.canUndo),
    canRedo: Boolean(view.canRedo),
    presentations: presentations.slice(-20).map((item) => ({
      id: item.id,
      targetId: item.targetId,
      type: item.artifact?.type || null,
      title: normalizeText(item.artifact?.fallback?.title || 'Personal explanation', 120)
    }))
  };
}

function revealTarget(document, targetId) {
  if (!document?.querySelector) return;
  const target = document.querySelector(`[data-eh-block-id="${CSS?.escape ? CSS.escape(targetId) : targetId}"]`);
  if (!target) return;
  const panel = target.closest?.('[data-section-panel]');
  const section = panel?.dataset?.sectionPanel;
  if (section && panel.hidden) {
    const tab = [...document.querySelectorAll('[data-section]')].find((item) => item.dataset.section === section);
    tab?.click?.();
  }
}

function stateAfterMutation(workspace, extra = {}) {
  const state = summarizePersonalization(workspace);
  return {
    ok: true,
    ...extra,
    personalizationCount: state.count,
    canUndo: state.canUndo,
    canRedo: state.canRedo
  };
}

function findCreatedPresentation(beforeIds, workspace) {
  const view = workspace.getVisibleState?.() || {};
  return (view.presentations || []).find((item) => !beforeIds.has(item.id)) || null;
}

export function resolveWebMcpHost(environment = globalThis) {
  const standardHost = environment?.document?.modelContext;
  if (standardHost && typeof standardHost.registerTool === 'function') {
    return { modelContext: standardHost, source: 'document.modelContext', standard: true };
  }

  // Legacy fallback for older experimental hosts. The challenge path uses document.modelContext.
  const legacyHost = environment?.navigator?.modelContext;
  if (legacyHost && typeof legacyHost.registerTool === 'function') {
    return { modelContext: legacyHost, source: 'navigator.modelContext', standard: false };
  }

  return { modelContext: null, source: 'none', standard: false };
}

export function createWebMcpTools(workspace) {
  const targetSchema = {
    type: 'object',
    required: ['targetId'],
    additionalProperties: false,
    properties: {
      targetId: {
        type: 'string',
        maxLength: 120,
        description: 'Authored explanation target ID returned by get_explanation_context.'
      }
    }
  };

  return [
    readOnlyTool(
      'get_explanation_context',
      'Read structured meaning from the current authored Explain Him page. Use before explaining the idea or choosing where to focus or personalize. This reads the live page, not repository knowledge.',
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          targetId: {
            type: 'string',
            maxLength: 120,
            description: 'Optional target ID for a deeper view of one authored explanation block.'
          }
        }
      },
      async (input = {}) => getAuthoredPageContext(workspace, input)
    ),
    readOnlyTool(
      'get_personalization_state',
      'Inspect the browser-local personal explanations and whether undo or redo is available. Use when the user asks what the agent changed on this page.',
      EMPTY_INPUT,
      async () => summarizePersonalization(workspace)
    ),
    mutationTool(
      'focus_explanation',
      'Bring one authored explanation block into view and visually focus it. Use when the user asks to show, point to, or concentrate on a specific part of the explanation.',
      targetSchema,
      async ({ targetId }) => {
        revealTarget(workspace.document, targetId);
        const result = workspace.focusBlock({ targetId });
        return { ok: true, focusedTargetId: result?.targetId || targetId };
      }
    ),
    mutationTool(
      'add_personal_explanation',
      'Add a safe browser-local explanation next to an authored block without modifying the Originator content. Use for a user-requested analogy, example, summary, warning, or comparison.',
      {
        type: 'object',
        required: ['targetId', 'kind', 'title', 'body'],
        additionalProperties: false,
        properties: {
          targetId: {
            type: 'string',
            maxLength: 120,
            description: 'Authored target ID returned by get_explanation_context.'
          },
          kind: {
            enum: PERSONAL_EXPLANATION_KINDS,
            description: 'Presentation form that best matches the user request.'
          },
          title: {
            type: 'string',
            maxLength: 120,
            description: 'Short heading for the personal explanation.'
          },
          body: {
            type: 'string',
            maxLength: 2000,
            description: 'Grounded plain-text explanation to add beside the target.'
          }
        }
      },
      async (input) => {
        revealTarget(workspace.document, input.targetId);
        const beforeIds = new Set((workspace.getVisibleState?.().presentations || []).map((item) => item.id));
        await workspace.addLocalBlock({
          targetId: input.targetId,
          kind: input.kind,
          title: input.title,
          body: input.body,
          actor: { kind: 'agent', channel: 'webmcp' },
          provenance: { sourceBlockIds: [input.targetId], repositoryRefs: [] }
        });
        const created = findCreatedPresentation(beforeIds, workspace);
        return stateAfterMutation(workspace, {
          presentationId: created?.id || null,
          targetId: input.targetId,
          kind: input.kind,
          title: normalizeText(input.title, 120)
        });
      }
    ),
    mutationTool(
      'remove_personal_explanation',
      'Remove one browser-local personal explanation while leaving authored content untouched. Use when the user asks to remove a specific local explanation.',
      {
        type: 'object',
        required: ['presentationId'],
        additionalProperties: false,
        properties: {
          presentationId: {
            type: 'string',
            pattern: '^local-',
            maxLength: 120,
            description: 'Local presentation ID returned by get_personalization_state.'
          }
        }
      },
      async ({ presentationId }) => {
        await workspace.removeLocalPresentation({ presentationId });
        return stateAfterMutation(workspace, { removedPresentationId: presentationId });
      }
    ),
    mutationTool(
      'undo_personalization',
      'Undo the most recent browser-local personalization change. Use when the user says undo, revert that change, or go back one personalization step.',
      EMPTY_INPUT,
      async () => {
        await workspace.undo();
        return stateAfterMutation(workspace, { action: 'undo' });
      }
    ),
    mutationTool(
      'redo_personalization',
      'Redo the next browser-local personalization change after an undo. Use when the user asks to redo or restore the reverted personalization.',
      EMPTY_INPUT,
      async () => {
        await workspace.redo();
        return stateAfterMutation(workspace, { action: 'redo' });
      }
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
        status.errors.push({ name: 'getTools', message: String(error?.message || error) });
      }
    }

    return status;
  })();

  return status;
}
