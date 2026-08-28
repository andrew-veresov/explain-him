# Explain Him

**Explain Him** — способ публиковать идею так, чтобы персональный AI-агент пользователя мог понять её, объяснить с нужной глубиной и синхронизировать подготовленную Оригинатором HTML-страницу с разговором.

Этот репозиторий — самостоятельный публичный demo/reference package базового подхода. Он не требует отдельного hosted runtime Explain Him.

## Быстрый старт

```bash
python -m http.server 8000
```

Откройте `http://localhost:8000/`.

`index.html` — подготовленная Оригинатором двухпанельная explanation page. Чат справа является явно обозначенной детерминированной simulation; настоящий разговор должен вести персональный агент пользователя.

## Как использовать с персональным агентом

Передайте агенту ссылку на репозиторий и попросите объяснить идею. Агент должен:

1. прочитать `AGENTS.md` и repository-scoped skill;
2. прочитать текущую HTML-страницу;
3. при необходимости углубиться в минимально нужные repository sources;
4. различать `current`, `target`, `hypothesis`, `open` и `demo-only`;
5. сформировать ответ в обычном чате;
6. использовать WebMCP только для синхронизации визуального/browser-local слоя;
7. при недостатке evidence предложить минимизированный Issue draft и получить подтверждение перед write.

## Модель

```text
Оригинатор
    ↓ публикует
GitHub repository
    ├── authored HTML page
    ├── repository-scoped instructions / skill
    ├── versioned knowledge / resolutions
    └── Issues
           │
           ▼
Пользователь открывает страницу и разговаривает со своим агентом
           │
           ├── WebMCP → skill/context + UI-only tools
           ├── page first, repository deeper when needed
           └── grounded answer в обычном чате
                         │
                         ▼
          browser-local typed visual additions
```

## Разделение ответственности

### Персональный агент

- понимает вопрос и желаемую глубину;
- читает authored page и при необходимости repository;
- применяет source precedence и статусы;
- формирует grounded answer и provenance;
- выполняет GitHub Issue flow после подтверждения пользователя;
- решает, полезна ли визуальная адаптация.

### WebMCP

- поставляет Explain Him skill/context;
- сообщает stable visual targets и local workspace state;
- фокусирует authored block;
- добавляет уже сформированный ответ как локальный typed block;
- поддерживает remove, undo и redo.

WebMCP **не** ищет knowledge, не читает repository, не формирует ответы и не создаёт Issues.

## Browser-local workspace

Authored HTML остаётся immutable. Персонализация хранится в браузере как typed operation log:

```text
Originator-authored HTML + browser-local operations = personalized visible page
```

Реализация включает:

- add/remove локальных блоков;
- IndexedDB с memory fallback;
- undo/redo;
- JSON export;
- confirmed reset;
- safe DOM rendering через `textContent`;
- WebMCP tools и accessible browser controls поверх одного workspace API.

Cross-device sync, collaboration, private hosted storage и эксплуатационные гарантии относятся к **Explain Him Pro**.

## Что реально, а что является целью

| Элемент | Статус |
|---|---|
| Публичный repository, authored page, skill, knowledge и resolutions | `current` artifacts |
| Browser-local workspace и WebMCP UI tools в этой странице | `demo-only` implementation |
| Native WebMCP `registerSkill()` | `target`, пока proposal не стабилизирован |
| Чат внутри страницы | `demo-only` deterministic simulation |
| Совместимость с конкретным browser agent | `open` до реального E2E |
| GitHub Issues как единственный массовый feedback UX | `hypothesis` |
| A2UI | optional target, не требование web flow |

## Структура

```text
index.html                     authored explanation page
AGENTS.md                      repository-scoped bootstrap
explain-him.yaml               machine-readable manifest
skills/explain-him/            repository skill
knowledge/                     public explanatory sources
resolutions/                   accepted public decisions
runtime/                       browser-local + WebMCP runtime
assets/                        UI styles and orchestration
question-template.md           safe Issue draft
00 Home.md + .obsidian/        Obsidian Vault entrypoint
```

## Проверки

```bash
python tools/check_public_demo.py
node --test tests/workspace.test.mjs tests/webmcp.test.mjs
```

Проверки запрещают private dependencies, внутренние product contours, arbitrary HTML injection, WebMCP retrieval/answer tools и ошибки root scope.

## Лицензия

Apache License 2.0. См. `LICENSE`.
