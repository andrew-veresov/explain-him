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
  if (copy) copy.textContent = 'Two tools only: discover the explanation contract, then apply safe typed blocks. Skills own grounding and GitHub retrieval.';
}

function installWebMcpDemoCard() {
  if (byId('webmcp-demo-card')) return;
  const anchor = document.querySelector('[data-eh-local-slot="flow-model"]')
    || document.querySelector('[data-eh-block-id="flow-model"]');
  if (!anchor?.parentNode) return;

  const card = make('section', undefined, 'browser-agent-note');
  card.id = 'webmcp-demo-card';
  card.dataset.webmcpDemo = 'challenge';
  const heading = make('strong', 'Try the skill-driven WebMCP flow');
  const copy = make('p', 'The agent grounds the answer from the page/repository, then WebMCP embeds only the typed result into this shared surface.');
  const prompts = make('ol');
  for (const prompt of [
    'Explain this idea, then add a short workflow showing how the explanation is produced.',
    'Compare the authored layer with the personal layer and add that comparison to the page.',
    'Replace the last local block with a simple concept diagram.'
  ]) {
    prompts.append(make('li', prompt));
  }
  const statusLine = make('p');
  statusLine.append(make('strong', 'Site Tools: '));
  const status = make('span', 'Checking WebMCP host…');
  status.id = 'webmcp-status-hero';
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
  document.documentElement.dataset.webmcpProtocol = '3';
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
  const workspace = await createExplanationWorkspace({
    document,
    explanationId: document.querySelector('meta[name="explain-him-id"]')?.content || 'explain-him-public-demo',
    baseRevision: document.querySelector('meta[name="explain-him-revision"]')?.content || 'public-v1',
    canonicalIds
  });
  globalThis.explainHimWorkspace = workspace;

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
      feedback.textContent = byId('agent-placement')?.value === 'replace' ? 'Replaced locally in the personalized view.' : 'Added to the browser-local workspace.';
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

  const registration = registerWebMcpTools(workspace, null, { environment: globalThis });
  publishWebMcpStatus(registration);

  if (!registration.supported) {
    setWebMcpStatusText('WebMCP host not detected · no Site Tools mutation was performed; accessible browser controls remain available');
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
