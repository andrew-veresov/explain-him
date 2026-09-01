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
  if (heading) heading.textContent = 'WebMCP runtime status';
  if (copy) copy.textContent = 'Protocol v3 exposes exactly two page tools: get_explain_him_answer and apply_explanation. A 2/2 page status confirms registration, not an agent connection.';
}

function installWebMcpDemoCard() {
  if (byId('webmcp-demo-card')) return;
  const anchor = byId('developer-demo-anchor')
    || document.querySelector('[data-eh-local-slot="flow-model"]')
    || document.querySelector('[data-eh-block-id="flow-model"]');
  if (!anchor?.parentNode) return;

  const card = make('section', undefined, 'browser-agent-note');
  card.id = 'webmcp-demo-card';
  card.dataset.webmcpDemo = 'challenge';
  const heading = make('strong', 'WebMCP test prompts');
  const copy = make('p', 'For runtime testing, the agent grounds an answer from the page and repository before WebMCP delivers only the typed visual result.');
  const prompts = make('ol');
  for (const prompt of [
    'Explain this idea, then add a short workflow showing how the explanation is produced.',
    'Compare the authored layer with the personal layer and add that comparison to the page.',
    'Replace the last local block with a simple concept diagram.'
  ]) {
    prompts.append(make('li', prompt));
  }
  const statusLine = make('p');
  statusLine.append(make('strong', 'Page API: '));
  const status = make('span', 'Checking WebMCP registration…');
  status.id = 'webmcp-status-hero';
  statusLine.append(status);
  card.append(heading, copy, prompts, statusLine);
  anchor.parentNode.insertBefore(card, anchor.nextSibling);
}

function setWebMcpStatusText(text) {
  if (byId('webmcp-status-hero')) byId('webmcp-status-hero').textContent = text;
}

function setStatusPart(id, text) {
  if (byId(id)) byId(id).textContent = text;
}

function setWorkspaceRevision(revision, prefix = null) {
  const safeRevision = Number.isInteger(revision) && revision >= 0 ? revision : 0;
  document.documentElement.dataset.webmcpWorkspaceRevision = String(safeRevision);
  setStatusPart('webmcp-revision-status', prefix ? `${prefix} ${safeRevision}` : `Workspace revision – ${safeRevision}`);
}

function publishLifecycle(detail) {
  if (!detail || typeof detail !== 'object') return;
  if (detail.type === 'answer-bootstrap-invoked') {
    document.documentElement.dataset.webmcpAgentState = 'observed';
    document.documentElement.dataset.webmcpContractState = 'activated';
    setStatusPart('webmcp-agent-status', 'Agent connection – observed');
    setStatusPart('webmcp-contract-status', 'Contract – activated');
    setWorkspaceRevision(detail.workspaceRevision);
  } else if (detail.type === 'apply-started') {
    document.documentElement.dataset.webmcpAgentState = 'observed';
    document.documentElement.dataset.webmcpApplyState = 'started';
    setStatusPart('webmcp-agent-status', 'Agent connection – observed');
  } else if (detail.type === 'apply-succeeded') {
    document.documentElement.dataset.webmcpApplyState = 'succeeded';
    setWorkspaceRevision(detail.workspaceRevision, 'Personalized UI updated – workspace revision');
  } else if (detail.type === 'apply-failed') {
    document.documentElement.dataset.webmcpApplyState = 'failed';
    setWorkspaceRevision(detail.workspaceRevision, 'Personalized UI update failed – workspace revision');
  }
  if (typeof globalThis.CustomEvent === 'function' && typeof globalThis.dispatchEvent === 'function') {
    globalThis.dispatchEvent(new CustomEvent('explain-him:webmcp-lifecycle', { detail }));
  }
}

function publishWebMcpStatus(registration) {
  globalThis.explainHimWebMcp = registration;
  document.documentElement.dataset.webmcpState = registration.supported ? 'detected' : 'unavailable';
  document.documentElement.dataset.webmcpPageState = registration.supported ? 'detected' : 'unavailable';
  document.documentElement.dataset.webmcpAgentState = 'not-observed';
  document.documentElement.dataset.webmcpContractState = 'not-activated';
  document.documentElement.dataset.webmcpApplyState = 'not-started';
  document.documentElement.dataset.webmcpWorkspaceRevision = '0';
  document.documentElement.dataset.webmcpHost = registration.hostSource || 'none';
  document.documentElement.dataset.webmcpApi = 'document.modelContext';
  document.documentElement.dataset.webmcpProtocol = '3';
  document.documentElement.dataset.webmcpTools = registration.expectedTools.join(',');
  document.documentElement.dataset.webmcpNativeSkillState = registration.skillRegistrationState || 'unavailable';
  document.documentElement.dataset.webmcpNativeSkillProposal = registration.nativeSkillProposalStatus || 'experimental-open-backlog';
  document.documentElement.dataset.webmcpNativeSkillDigest = registration.nativeSkillDigest || '';
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
      verifiedTools: [...registration.verifiedTools],
      nativeSkillState: registration.skillRegistrationState,
      nativeSkillDigest: registration.nativeSkillDigest,
      nativeSkillProposalStatus: registration.nativeSkillProposalStatus
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
  const workspacePromise = createExplanationWorkspace({
    document,
    explanationId: document.querySelector('meta[name="explain-him-id"]')?.content || 'explain-him-public-demo',
    baseRevision: document.querySelector('meta[name="explain-him-revision"]')?.content || 'public-v1',
    canonicalIds
  });
  const registration = registerWebMcpTools(workspacePromise, null, { environment: globalThis, onLifecycle: publishLifecycle });
  publishWebMcpStatus(registration);
  if (registration.supported) {
    setStatusPart('webmcp-page-status', `Page WebMCP API – registering ${registration.expectedTools.length} tools`);
    setWebMcpStatusText(`registering ${registration.expectedTools.length} tools`);
    setStatusPart('webmcp-native-skill-status', registration.skillApiAvailable ? 'Native skill API – registering (experimental)' : 'Native skill API – unavailable (experimental); pinned fallback active');
  } else {
    setStatusPart('webmcp-page-status', 'Page WebMCP API – unavailable');
    setWebMcpStatusText('unavailable; accessible browser controls remain available');
    setStatusPart('webmcp-native-skill-status', 'Native skill API – unavailable (experimental); pinned fallback active');
  }

  const workspace = await workspacePromise;
  globalThis.explainHimWorkspace = workspace;
  setWorkspaceRevision(workspace.getContext?.().workspaceRevision ?? 0);

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
      setWorkspaceRevision(workspace.getContext?.().workspaceRevision ?? 0);
      feedback.textContent = byId('agent-placement')?.value === 'replace' ? 'Test block replaced the target in the personalized view.' : 'Test block applied to the browser-local workspace.';
    } catch (error) {
      feedback.textContent = String(error?.message || error);
    }
  });

  document.addEventListener('click', async (event) => {
    const remove = event.target.closest?.('[data-eh-remove-local]');
    if (remove) { await workspace.removeLocalBlock({ blockId: remove.dataset.ehRemoveLocal }); setWorkspaceRevision(workspace.getContext?.().workspaceRevision ?? 0); }
    const focus = event.target.closest?.('[data-focus]');
    if (focus) workspace.focusBlock({ targetId: focus.dataset.focus });
  });

  byId('workspace-undo')?.addEventListener('click', async () => { await workspace.undo(); setWorkspaceRevision(workspace.getContext?.().workspaceRevision ?? 0); });
  byId('workspace-redo')?.addEventListener('click', async () => { await workspace.redo(); setWorkspaceRevision(workspace.getContext?.().workspaceRevision ?? 0); });
  for (const button of document.querySelectorAll('[data-workspace-view]')) {
    button.addEventListener('click', () => workspace.setViewMode(button.dataset.workspaceView));
  }
  byId('workspace-export')?.addEventListener('click', () => downloadJson(workspace.exportJson()));
  byId('workspace-reset')?.addEventListener('click', async () => {
    if (globalThis.confirm('Remove all browser-local explanations and restore the original page?')) {
      await workspace.reset({ confirmed: true });
      setWorkspaceRevision(workspace.getContext?.().workspaceRevision ?? 0);
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
    dispatchWebMcpReady(registration);
    return;
  }

  await registration.ready;

  const state = registration.verified ? 'verified' : registration.ok ? 'ready' : 'partial';
  document.documentElement.dataset.webmcpState = state;
  document.documentElement.dataset.webmcpPageState = state;
  document.documentElement.dataset.webmcpVerified = String(registration.verified);
  document.documentElement.dataset.webmcpRegistered = registration.registered.join(',');
  document.documentElement.dataset.webmcpVerifiedTools = registration.verifiedTools.join(',');
  document.documentElement.dataset.webmcpNativeSkillState = registration.skillRegistrationState;

  if (registration.skillRegistrationState === 'registered') {
    setStatusPart('webmcp-native-skill-status', 'Native skill API – registered (experimental)');
  } else if (registration.skillRegistrationState === 'error') {
    setStatusPart('webmcp-native-skill-status', 'Native skill API – registration error (experimental); pinned fallback active');
  } else if (registration.skillRegistrationState === 'blocked-tools') {
    setStatusPart('webmcp-native-skill-status', 'Native skill API – blocked by tool registration (experimental); pinned fallback active');
  } else {
    setStatusPart('webmcp-native-skill-status', 'Native skill API – unavailable (experimental); pinned fallback active');
  }

  if (registration.verified) {
    setStatusPart('webmcp-page-status', `Page WebMCP API – ${registration.verifiedTools.length}/${registration.expectedTools.length} tools registered`);
    setWebMcpStatusText(`${registration.verifiedTools.length}/${registration.expectedTools.length} tools registered`);
  } else if (registration.ok) {
    setStatusPart('webmcp-page-status', `Page WebMCP API – ${registration.registered.length}/${registration.expectedTools.length} tools registered, enumeration unavailable`);
    setWebMcpStatusText(`${registration.registered.length}/${registration.expectedTools.length} tools registered`);
  } else {
    setStatusPart('webmcp-page-status', `Page WebMCP API – partial ${registration.registered.length}/${registration.expectedTools.length}`);
    setWebMcpStatusText(`partial ${registration.registered.length}/${registration.expectedTools.length} registration`);
  }
  dispatchWebMcpReady(registration);
}

main().catch((error) => {
  console.error(error);
  setWebMcpStatusText(`Initialization error: ${error.message}`);
  setStatusPart('webmcp-page-status', 'Page WebMCP API – initialization error');
  setStatusPart('webmcp-native-skill-status', 'Native skill API – not initialized (experimental); pinned fallback active');
  document.documentElement.dataset.webmcpState = 'error';
  document.documentElement.dataset.webmcpPageState = 'error';
});
