---
title: Поток Пользователя и персонального агента
status: current
tags: [explain-him, user, agent]
---

# Поток Пользователя и персонального агента

1. Пользователь открывает authored page или передаёт агенту URL repository.
2. Агент получает repository-scoped instructions из WebMCP descriptor либо `AGENTS.md`/`SKILL.md`.
3. Агент читает текущую страницу.
4. Если страницы достаточно, формирует ответ без лишнего retrieval.
5. Если нужны версия, evidence или более глубокий контекст, читает минимально необходимые repository files через собственную GitHub integration.
6. Различает `current`, `target`, `hypothesis`, `open` и `demo-only`.
7. Отвечает в обычном чате персонального агента.
8. При пользе визуального сопровождения фокусирует authored block или добавляет typed browser-local block через WebMCP.
9. Если evidence недостаточно, предлагает минимизированный Issue draft и ждёт подтверждения пользователя.

## Почему это не отдельный Explain Him agent

Пользователь сохраняет собственную модель, память, настройки и привычный интерфейс. Explain Him добавляет к существующему агенту repository-scoped capability, а не переносит пользователя в новый обязательный чат.

## Визуальный результат

```text
Originator-authored page + local operation log = personalized visible page
```

Локальное пояснение помогает этому пользователю, но не становится каноническим утверждением Оригинатора.
