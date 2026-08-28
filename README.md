# Explain Him

**Explain Him** — открытый GitHub-backed способ публиковать идею так, чтобы обычный персональный AI-агент пользователя мог понять её, объяснить с нужной глубиной и синхронизировать подготовленную Оригинатором HTML-страницу с разговором.

Этот репозиторий одновременно является:

- самостоятельным публичным объяснением подхода;
- reference package, который можно использовать как образец для другой идеи;
- статическим browser demo с безопасной browser-local персонализацией;
- Obsidian Vault — откройте корень репозитория и начните с [[00 Home]].

## Попробовать

```bash
python -m http.server 8000
```

Откройте `http://localhost:8000/`.

`index.html` — подготовленная Оригинатором explanation page. Чат справа — явно обозначенная детерминированная simulation, а не LLM runtime. Настоящий разговор должен вести персональный агент пользователя.

Можно также передать своему агенту адрес этого репозитория и сказать: «Объясни мне Explain Him». Агенту следует начать с `AGENTS.md` или получить тот же workflow через WebMCP skill descriptor страницы.

## Базовая модель

```text
Оригинатор публикует repository
  ├── authored HTML page
  ├── repository-scoped skill
  ├── knowledge и accepted resolutions
  └── GitHub Issues
          │
          ▼
Пользователь остаётся в своём персональном агенте
          │
          ├── агент читает текущую страницу
          ├── при необходимости читает repository
          ├── формирует grounded answer
          └── через WebMCP добавляет локальное визуальное пояснение
                                      │
                                      ▼
                   authored page + browser-local operation log
```

### Персональный агент отвечает за смысл

Он понимает вопрос, читает страницу и repository, применяет source precedence, различает статусы, формирует ответ и при необходимости работает с GitHub Issues через собственную GitHub integration.

### WebMCP отвечает только за доставку skill и UI

Страница может передать агенту `instructions + structured context + related UI tools`. WebMCP сообщает stable visual targets, фокусирует authored block, добавляет уже сформированный ответ как browser-local block и поддерживает undo/redo.

WebMCP **не** ищет knowledge, не читает repository, не формирует ответы и не создаёт Issues.

## Что здесь реализовано

| Элемент | Статус | Пояснение |
|---|---|---|
| Public repository, authored page, knowledge и skill | `current` | Самостоятельные публичные артефакты. |
| Browser-local typed workspace | `demo-only` | IndexedDB с memory fallback, add/remove, undo/redo, export и confirmed reset. |
| WebMCP UI tools и skill descriptor | `demo-only` | Feature detection; compatibility tool используется без `registerSkill()`. |
| Native WebMCP `registerSkill()` | `target` | API proposal может измениться. |
| Чат внутри страницы | `demo-only` | Детерминированная simulation, не AI runtime. |
| Совместимость с конкретным browser agent | `open` | Требуется E2E для конкретного host/version. |
| GitHub Issues как единственный массовый feedback UX | `hypothesis` | Механика работает, удобство требует проверки. |
| Explain Him Pro | вне этого репозитория | Managed-возможности не нужны для базового подхода. |

## Структура

```text
.
├── index.html                     # authored explanation page
├── AGENTS.md                      # bootstrap для персонального агента
├── explain-him.yaml               # машиночитаемая модель explanation package
├── skills/explain-him/            # repository-scoped skill
├── knowledge/                     # публичные explanatory sources
├── resolutions/                   # принятые уточнения Оригинатора
├── runtime/                       # browser-local workspace и WebMCP boundary
├── assets/                        # UI и browser bootstrap
├── tests/                         # deterministic public checks
├── tools/check_public_demo.py     # static integrity/privacy check
└── .obsidian/                     # корень репозитория как Obsidian Vault
```

## Инварианты

1. Пользователь определяет вопрос и глубину; фиксированный tutorial не обязателен.
2. Authored HTML и канонические материалы неизменяемы для WebMCP mutation path.
3. Browser-local additions визуально и семантически отделены от утверждений Оригинатора.
4. `target`, `hypothesis`, `open` и `demo-only` не выдаются за production facts.
5. GitHub Issue создаётся только после подтверждения пользователя и минимизации персонального контекста.
6. Repository-scoped instructions не становятся глобальным поведением агента.

## Проверки

```bash
python tools/check_public_demo.py
node --test tests/workspace.test.mjs tests/webmcp.test.mjs
```

## Лицензия

Apache License 2.0. См. `LICENSE`.
