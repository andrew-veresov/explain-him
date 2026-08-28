import { createExplanationWorkspace } from '../runtime/workspace.mjs';
import { registerWebMcpTools } from '../runtime/webmcp.mjs';

const sectionLabels = {
  flow: 'Mechanism', roles: 'Roles', workspace: 'Adaptive page',
  grounding: 'Knowledge control', boundaries: 'Product line'
};

function byId(id) { return document.getElementById(id); }

function activateSection(name) {
  for (const tab of document.querySelectorAll('[data-section]')) {
    const active = tab.dataset.section === name;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  }
  for (const panel of document.querySelectorAll('[data-section-panel]')) {
    const active = panel.dataset.sectionPanel === name;
    panel.hidden = !active;
    panel.classList.toggle('is-active', active);
  }
  if (byId('current-focus')) byId('current-focus').textContent = sectionLabels[name] || name;
}

function appendMessage(role, text) {
  const list = byId('chat-messages');
  const item = document.createElement('article');
  item.className = `message message-${role}`;
  const label = document.createElement('strong');
  label.textContent = role === 'user' ? 'You' : 'Demo simulation';
  const body = document.createElement('p');
  body.textContent = text;
  item.append(label, body);
  list.append(item);
  list.scrollTop = list.scrollHeight;
}

function simulatedAnswer(question) {
  const q = question.toLowerCase();
  if (q.includes('webmcp')) {
    return 'WebMCP delivers the repository-scoped skill and controls only the browser-local UI. The personal agent forms the answer after reading the page or repository.';
  }
  if (q.includes('repository') || q.includes('github')) {
    return 'The repository is the public address, source of truth, history, and feedback loop. The agent reads it through its own GitHub integration, not through the page WebMCP tools.';
  }
  if (q.includes('pro') || q.includes('paid')) {
    return 'Explain Him works without a mandatory hosted service. Explain Him Pro may add privacy, sync, collaboration, analytics, and operational guarantees.';
  }
  if (q.includes('issue') || q.includes('question') || q.includes('unknown') || q.includes("doesn't know")) {
    return 'When evidence is insufficient, the agent marks the gap open, prepares a minimized Issue draft, and publishes it only after your confirmation.';
  }
  if (q.includes('local') || q.includes('page') || q.includes('personal')) {
    return 'The authored HTML remains unchanged. The personal agent adds a typed local block stored in IndexedDB with undo/redo support.';
  }
  return 'This is a deterministic demo-only simulation. A real personal agent should read the authored page, inspect the public repository only when needed, form a grounded answer, and only then adapt the visual page.';
}

function downloadJson(text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'explain-him-local-workspace.json';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function main() {
  for (const tab of document.querySelectorAll('[data-section]')) {
    tab.addEventListener('click', () => activateSection(tab.dataset.section));
  }
  for (const button of document.querySelectorAll('[data-open-section]')) {
    button.addEventListener('click', () => activateSection(button.dataset.openSection));
  }

  const sourceToggle = byId('source-toggle');
  sourceToggle?.addEventListener('click', () => {
    const drawer = byId('source-drawer');
    drawer.hidden = !drawer.hidden;
    sourceToggle.setAttribute('aria-expanded', String(!drawer.hidden));
  });

  const canonicalIds = [...document.querySelectorAll('[data-eh-block-id]')]
    .map((node) => node.dataset.ehBlockId);
  const workspace = await createExplanationWorkspace({
    document,
    explanationId: document.querySelector('meta[name="explain-him-id"]')?.content || 'explain-him-public-demo',
    baseRevision: document.querySelector('meta[name="explain-him-revision"]')?.content || 'public-v1',
    canonicalIds
  });
  globalThis.explainHimWorkspace = workspace;

  const actionForm = byId('agent-action-form');
  actionForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = byId('agent-action-feedback');
    try {
      await workspace.addLocalBlock({
        targetId: byId('agent-target').value,
        kind: byId('agent-kind').value,
        title: byId('agent-title').value,
        body: byId('agent-body').value,
        actor: { kind: 'agent', channel: 'browser-control' },
        provenance: { sourceBlockIds: [byId('agent-target').value], repositoryRefs: [] }
      });
      feedback.textContent = 'Added to the browser-local workspace.';
    } catch (error) {
      feedback.textContent = String(error?.message || error);
    }
  });

  document.addEventListener('click', async (event) => {
    const remove = event.target.closest?.('[data-eh-remove-local]');
    if (remove) await workspace.removeLocalBlock({ blockId: remove.dataset.ehRemoveLocal });
    const focus = event.target.closest?.('[data-focus]');
    if (focus) workspace.focusBlock({ targetId: focus.dataset.focus });
    const ask = event.target.closest?.('[data-ask]');
    if (ask) {
      byId('chat-input').value = ask.dataset.ask;
      byId('chat-input').focus();
    }
  });

  byId('workspace-undo')?.addEventListener('click', () => workspace.undo());
  byId('workspace-redo')?.addEventListener('click', () => workspace.redo());
  byId('workspace-export')?.addEventListener('click', () => downloadJson(workspace.exportJson()));
  byId('workspace-reset')?.addEventListener('click', async () => {
    if (globalThis.confirm('Remove all browser-local explanations and restore the original page?')) {
      await workspace.reset({ confirmed: true });
    }
  });

  byId('workspace-history-open')?.addEventListener('click', () => {
    const history = workspace.getLocalChangeHistory();
    const output = byId('history-output');
    output.textContent = JSON.stringify(history, null, 2);
    byId('history-dialog').showModal();
  });
  byId('history-close')?.addEventListener('click', () => byId('history-dialog').close());

  byId('chat-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = byId('chat-input');
    const value = input.value.trim();
    if (!value) return;
    appendMessage('user', value);
    input.value = '';
    appendMessage('agent', simulatedAnswer(value));
  });

  const modelContext = globalThis.navigator?.modelContext;
  const registration = registerWebMcpTools(workspace, modelContext, {
    pageUrl: globalThis.location?.href,
    repository: 'andrew-veresov/explain-him'
  });
  const status = byId('webmcp-status');
  if (!registration.supported) {
    status.textContent = 'WebMCP host not detected · browser controls available';
  } else {
    status.textContent = 'Registering WebMCP…';
    await registration.ready;
    status.textContent = registration.skill.mode === 'registerSkill'
      ? 'Skill and UI tools registered'
      : registration.skill.compatibilityToolRegistered
        ? 'UI tools + compatibility skill tool'
        : 'Some WebMCP tools are unavailable';
  }

  appendMessage('agent', 'This is a demo-only deterministic simulation. Ask a question about Explain Him mechanics or use your own personal agent with this repository.');
}

main().catch((error) => {
  console.error(error);
  const status = byId('webmcp-status');
  if (status) status.textContent = `Initialization error: ${error.message}`;
});
