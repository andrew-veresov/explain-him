import { createExplanationWorkspace } from '../runtime/workspace.mjs';
import { registerWebMcpTools } from '../runtime/webmcp.mjs';

const sectionLabels = {
  flow: 'Механика', roles: 'Роли', workspace: 'Адаптивная страница',
  grounding: 'Контроль знаний', boundaries: 'Продуктовая линейка'
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
  label.textContent = role === 'user' ? 'Вы' : 'Demo simulation';
  const body = document.createElement('p');
  body.textContent = text;
  item.append(label, body);
  list.append(item);
  list.scrollTop = list.scrollHeight;
}

function simulatedAnswer(question) {
  const q = question.toLowerCase();
  if (q.includes('webmcp')) {
    return 'WebMCP здесь доставляет repository-scoped skill и управляет только browser-local UI. Ответ формирует персональный агент после чтения страницы или repository.';
  }
  if (q.includes('репозитор') || q.includes('github')) {
    return 'Repository — публичный адрес, source of truth, history и feedback loop. Агент читает его собственной GitHub integration, а не через WebMCP tools страницы.';
  }
  if (q.includes('pro') || q.includes('плат')) {
    return 'Explain Him работает без обязательного hosted service. Explain Him Pro может добавить privacy, sync, collaboration, analytics и эксплуатационные гарантии.';
  }
  if (q.includes('issue') || q.includes('вопрос') || q.includes('не знает')) {
    return 'При недостатке evidence агент помечает пробел open, готовит минимизированный Issue draft и публикует его только после вашего подтверждения.';
  }
  if (q.includes('меня') || q.includes('локаль') || q.includes('страниц')) {
    return 'Authored HTML остается неизменным. Персональный агент добавляет typed local block, который хранится в IndexedDB и поддерживает undo/redo.';
  }
  return 'Это детерминированная demo-only simulation. Настоящий персональный агент должен прочитать authored page, а при необходимости public repository, сформировать grounded answer и только затем адаптировать визуальную страницу.';
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
      feedback.textContent = 'Добавлено в browser-local workspace.';
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
    if (globalThis.confirm('Удалить все browser-local пояснения и вернуться к оригиналу?')) {
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
    status.textContent = 'WebMCP host не обнаружен · browser controls доступны';
  } else {
    status.textContent = 'Регистрация WebMCP…';
    await registration.ready;
    status.textContent = registration.skill.mode === 'registerSkill'
      ? 'Skill и UI tools зарегистрированы'
      : registration.skill.compatibilityToolRegistered
        ? 'UI tools + compatibility skill tool'
        : 'Часть WebMCP tools недоступна';
  }

  appendMessage('agent', 'Это demo-only deterministic simulation. Задайте вопрос о механике Explain Him или используйте свой персональный агент с этим repository.');
}

main().catch((error) => {
  console.error(error);
  const status = byId('webmcp-status');
  if (status) status.textContent = `Ошибка инициализации: ${error.message}`;
});
