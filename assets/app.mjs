import { createExplanationWorkspace } from '../runtime/workspace.mjs';
import { registerWebMcpTools } from '../runtime/webmcp.mjs';

function byId(id) { return document.getElementById(id); }

function installContinuousNavigation() {
  const links = [...document.querySelectorAll('[data-scroll-section]')];
  const sections = links.map((link) => byId(link.dataset.scrollSection)).filter(Boolean);
  if (!links.length || !sections.length) return;

  const setActive = (id) => {
    for (const link of links) {
      const active = link.dataset.scrollSection === id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    const activeLink = links.find((link) => link.dataset.scrollSection === id);
    if (activeLink && byId('current-focus')) byId('current-focus').textContent = activeLink.textContent.trim();
  };

  for (const link of links) {
    link.addEventListener('click', (event) => {
      const section = byId(link.dataset.scrollSection);
      if (!section) return;
      event.preventDefault();
      setActive(section.id);
      section.focus({ preventScroll: true });
      section.scrollIntoView({ behavior: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      globalThis.history?.replaceState?.(null, '', `#${section.id}`);
    });
  }

  if (typeof globalThis.IntersectionObserver === 'function') {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-18% 0px -62% 0px', threshold: [0.1, 0.45, 0.75] });
    for (const section of sections) observer.observe(section);
  }

  const fromHash = globalThis.location?.hash.slice(1);
  if (sections.some((section) => section.id === fromHash)) setActive(fromHash);
  else setActive(sections[0].id);
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

function setStatusPart(id, text) {
  if (byId(id)) byId(id).textContent = text;
}

async function main() {
  installContinuousNavigation();

  const sourceToggle = byId('source-toggle');
  let sourceOpener = null;
  function setSourceDrawerOpen(open, { restoreFocus = false } = {}) {
    const drawer = byId('source-drawer');
    if (!drawer) return;
    drawer.hidden = !open;
    sourceToggle?.setAttribute('aria-expanded', String(open));
    if (open) {
      sourceOpener = sourceToggle;
      queueMicrotask(() => byId('source-close')?.focus());
    } else if (restoreFocus) {
      sourceOpener?.focus();
      sourceOpener = null;
    }
  }
  sourceToggle?.addEventListener('click', () => {
    const opening = byId('source-drawer')?.hidden;
    setSourceDrawerOpen(opening, { restoreFocus: !opening });
  });
  byId('source-close')?.addEventListener('click', () => setSourceDrawerOpen(false, { restoreFocus: true }));
  byId('source-drawer')?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setSourceDrawerOpen(false, { restoreFocus: true });
    }
  });

  const canonicalIds = [...document.querySelectorAll('[data-eh-block-id]')].map((node) => node.dataset.ehBlockId);
  const workspacePromise = createExplanationWorkspace({
    document,
    explanationId: document.querySelector('meta[name="explain-him-id"]')?.content || 'explain-him-public-demo',
    baseRevision: document.querySelector('meta[name="explain-him-revision"]')?.content || 'public-v1',
    canonicalIds
  });
  const registration = registerWebMcpTools(workspacePromise, null, { environment: globalThis });
  document.documentElement.dataset.webmcpState = registration.supported ? 'registering' : 'unavailable';
  if (registration.supported) {
    setStatusPart('webmcp-page-status', `Page WebMCP API – registering ${registration.expectedTools.length} tools`);
  } else {
    setStatusPart('webmcp-page-status', 'Page WebMCP API – unavailable');
  }

  const workspace = await workspacePromise;

  if (!byId('agent-placement')) {
    const kindLabel = byId('agent-kind')?.closest('label');
    if (kindLabel?.parentNode) {
      const label = document.createElement('label');
      label.textContent = 'Placement';
      const select = document.createElement('select');
      select.id = 'agent-placement';
      for (const [value, text] of [['after', 'Add beside'], ['replace', 'Replace locally']]) {
        const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
      }
      label.append(select); kindLabel.parentNode.insertBefore(label, kindLabel);
    }
  }

  byId('agent-action-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = byId('agent-action-feedback');
    try {
      const targetId = byId('agent-target').value;
      await workspace.addLocalBlock({
        targetId,
        placement: byId('agent-placement')?.value || 'after',
        kind: byId('agent-kind').value,
        title: byId('agent-title').value,
        body: byId('agent-body').value,
        actor: { kind: 'agent', channel: 'browser-control' },
        provenance: { sourceBlockIds: [targetId], repositoryRefs: [] }
      });
      feedback.textContent = byId('agent-placement')?.value === 'replace' ? 'Test block replaced the target in the personalized view.' : 'Test block applied to the browser-local workspace.';
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
  for (const button of document.querySelectorAll('[data-workspace-view]')) {
    button.addEventListener('click', () => workspace.setViewMode(button.dataset.workspaceView));
  }
  byId('workspace-export')?.addEventListener('click', () => downloadJson(workspace.exportJson()));
  byId('workspace-reset')?.addEventListener('click', async () => {
    if (globalThis.confirm('Remove all browser-local explanations and restore the original page?')) {
      await workspace.reset({ confirmed: true });
    }
  });

  let historyOpener = null;
  const historyDialog = byId('history-dialog');
  byId('workspace-history-open')?.addEventListener('click', (event) => {
    historyOpener = event.currentTarget;
    byId('history-output').textContent = JSON.stringify(workspace.getLocalChangeHistory(), null, 2);
    historyDialog?.showModal();
    queueMicrotask(() => byId('history-close')?.focus());
  });
  byId('history-close')?.addEventListener('click', () => historyDialog?.close());
  historyDialog?.addEventListener('close', () => { historyOpener?.focus(); historyOpener = null; });

  if (!registration.supported) {
    return;
  }

  await registration.ready;

  const state = registration.verified ? 'verified' : registration.ok ? 'unverified' : 'error';
  document.documentElement.dataset.webmcpState = state;
  if (new URLSearchParams(globalThis.location?.search || '').get('webmcp-debug') === '1') {
    document.documentElement.dataset.webmcpHost = registration.hostSource;
    document.documentElement.dataset.webmcpProtocol = '4';
    document.documentElement.dataset.webmcpRegistered = registration.registered.join(',');
    document.documentElement.dataset.webmcpVerifiedTools = registration.verifiedTools.join(',');
    document.documentElement.dataset.webmcpNativeSkillState = registration.skillRegistrationState;
  }

  if (registration.verified) {
    setStatusPart('webmcp-page-status', `Page WebMCP API – ${registration.verifiedTools.length}/${registration.expectedTools.length} tools registered`);
  } else if (registration.ok) {
    setStatusPart('webmcp-page-status', `Page WebMCP API – registered, verification unavailable`);
  } else {
    setStatusPart('webmcp-page-status', 'Page WebMCP API – registration failed');
  }
}

main().catch((error) => {
  console.error(error);
  setStatusPart('webmcp-page-status', 'Page WebMCP API – initialization error');
  document.documentElement.dataset.webmcpState = 'error';
});
