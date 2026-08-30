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

async function main() {
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

  const registration = registerWebMcpTools(workspace, globalThis.navigator?.modelContext, {
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
}

main().catch((error) => {
  console.error(error);
  const status = byId('webmcp-status');
  if (status) status.textContent = `Initialization error: ${error.message}`;
});
