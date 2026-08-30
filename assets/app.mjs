import { createExplanationWorkspace } from '../runtime/workspace.mjs';
import { registerWebMcpTools } from '../runtime/webmcp.mjs';

const sectionLabels = {
  flow: 'Mechanism', roles: 'Roles', workspace: 'Adaptive page', grounding: 'Knowledge control'
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

function make(tag, text, className = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function refreshWebMcpCopy() {
  const status = byId('webmcp-status');
  const card = status?.closest?.('.contract-card');
  const heading = card?.querySelector?.('h3');
  const copy = card?.querySelector?.('p');
  if (heading) heading.textContent = 'WebMCP Site Tools';
  if (copy) copy.textContent = 'Authored-page context, personalization state, focus, add/remove, undo/redo.';
}

function installWebMcpDemoCard() {
  if (byId('webmcp-demo-card')) return;
  const anchor = document.querySelector('[data-eh-local-slot="flow-model"]')
    || document.querySelector('[data-eh-block-id="flow-model"]');
  if (!anchor?.parentNode) return;

  const card = make('section', undefined, 'browser-agent-note');
  card.id = 'webmcp-demo-card';
  card.dataset.webmcpDemo = 'challenge';
  const heading = make('strong', 'Try the WebMCP human–agent flow');
  const copy = make('p', 'In a WebMCP-capable browser, ask your agent to use the page itself as a shared explanation surface.');
  const prompts = make('ol');
  for (const prompt of [
    'Explain this idea in one paragraph, then add a short analogy next to the mechanism.',
    'Focus the part about grounding.',
    'Undo my last personalization.'
  ]) {
    prompts.append(make('li', prompt));
  }
  const statusLine = make('p');
  statusLine.append(make('strong', 'Site Tools: '));
  const status = make('span', 'Checking WebMCP host…');
  status.id = 'webmcp-status-hero';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  statusLine.append(status);
  card.append(heading, copy, prompts, statusLine);
  anchor.parentNode.insertBefore(card, anchor.nextSibling);
}

function setWebMcpStatusText(text) {
  if (byId('webmcp-status')) byId('webmcp-status').textContent = text;
  if (byId('webmcp-status-hero')) byId('webmcp-status-hero').textContent = text;
}

function publishWebMcpStatus(registration) {
  globalThis.explainHimWebMcp = registration;
  document.documentElement.dataset.webmcpState = registration.supported ? 'detected' : 'unavailable';
  document.documentElement.dataset.webmcpHost = registration.hostSource || 'none';
  document.documentElement.dataset.webmcpApi = 'document.modelContext';
  document.documentElement.dataset.webmcpTools = registration.expectedTools.join(',');
}

function dispatchWebMcpReady(registration) {
  if (typeof globalThis.CustomEvent !== 'function' || typeof globalThis.dispatchEvent !== 'function') return;
  globalThis.dispatchEvent(new CustomEvent('explain-him:webmcp-ready', {
    detail: {
      supported: registration.supported,
      ok: registration.ok,
      verified: registration.verified,
      hostSource: registration.hostSource,
      registeredTools: [...registration.registered],
      verifiedTools: [...registration.verifiedTools]
    }
  }));
}

async function main() {
  refreshWebMcpCopy();
  installWebMcpDemoCard();

  for (const tab of document.querySelectorAll('[data-section]')) {
    tab.addEventListener('click', () => activateSection(tab.dataset.section));
  }
  for (const button of document.querySelectorAll('[data-open-section]')) {
    button.addEventListener('click', () => activateSection(button.dataset.openSection));
  }

  const sourceToggle = byId('source-toggle');
  function setSourceDrawerOpen(open) {
    const drawer = byId('source-drawer');
    drawer.hidden = !open;
    sourceToggle?.setAttribute('aria-expanded', String(open));
  }
  sourceToggle?.addEventListener('click', () => setSourceDrawerOpen(byId('source-drawer')?.hidden));
  byId('source-close')?.addEventListener('click', () => setSourceDrawerOpen(false));

  const canonicalIds = [...document.querySelectorAll('[data-eh-block-id]')].map((node) => node.dataset.ehBlockId);
  const workspace = await createExplanationWorkspace({
    document,
    explanationId: document.querySelector('meta[name="explain-him-id"]')?.content || 'explain-him-public-demo',
    baseRevision: document.querySelector('meta[name="explain-him-revision"]')?.content || 'public-v1',
    canonicalIds
  });
  globalThis.explainHimWorkspace = workspace;

  byId('agent-action-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = byId('agent-action-feedback');
    try {
      const targetId = byId('agent-target').value;
      await workspace.addLocalBlock({
        targetId,
        kind: byId('agent-kind').value,
        title: byId('agent-title').value,
        body: byId('agent-body').value,
        actor: { kind: 'agent', channel: 'browser-control' },
        provenance: { sourceBlockIds: [targetId], repositoryRefs: [] }
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
    byId('history-output').textContent = JSON.stringify(workspace.getLocalChangeHistory(), null, 2);
    byId('history-dialog').showModal();
  });
  byId('history-close')?.addEventListener('click', () => byId('history-dialog').close());

  const registration = registerWebMcpTools(workspace, null, { environment: globalThis });
  publishWebMcpStatus(registration);

  if (!registration.supported) {
    setWebMcpStatusText('WebMCP host not detected · accessible browser controls remain available');
    dispatchWebMcpReady(registration);
    return;
  }

  setWebMcpStatusText(`WebMCP detected via ${registration.hostSource} · registering ${registration.expectedTools.length} Site Tools…`);
  await registration.ready;

  const state = registration.verified ? 'verified' : registration.ok ? 'ready' : 'partial';
  document.documentElement.dataset.webmcpState = state;
  document.documentElement.dataset.webmcpVerified = String(registration.verified);
  document.documentElement.dataset.webmcpRegistered = registration.registered.join(',');
  document.documentElement.dataset.webmcpVerifiedTools = registration.verifiedTools.join(',');

  if (registration.verified) {
    setWebMcpStatusText(`WebMCP verified · ${registration.verifiedTools.length}/${registration.expectedTools.length} Site Tools · ${registration.hostSource}`);
  } else if (registration.ok) {
    setWebMcpStatusText(`WebMCP ready · ${registration.registered.length} Site Tools · ${registration.hostSource}`);
  } else {
    setWebMcpStatusText(`WebMCP partial · ${registration.registered.length}/${registration.expectedTools.length} Site Tools · ${registration.hostSource}`);
  }
  dispatchWebMcpReady(registration);
}

main().catch((error) => {
  console.error(error);
  setWebMcpStatusText(`Initialization error: ${error.message}`);
  document.documentElement.dataset.webmcpState = 'error';
});
