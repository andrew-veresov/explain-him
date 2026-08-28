---
title: Grounding, provenance и статусы
status: current
tags: [explain-him, grounding, provenance]
---

# Grounding, provenance и статусы

## Source precedence

1. accepted resolutions;
2. authored page и explicit manifest claims;
3. knowledge notes;
4. README/navigation;
5. отдельно обозначенный вывод агента.

Нижестоящий источник не должен молча отменять вышестоящий.

## Словарь статусов

| Статус | Значение |
|---|---|
| `current` | Принятое и актуальное свойство модели или существующий artifact. |
| `target` | Желаемое целевое поведение, которое ещё не гарантировано. |
| `hypothesis` | Проверяемое предположение. |
| `open` | Решение или доказательство отсутствует. |
| `demo-only` | Реализовано для демонстрации, но не заявляется как production contract. |
| `deprecated` | Более не применимо; должен быть указан replacement. |

## Provenance

Материальный ответ должен позволять понять, откуда взят claim: page/path, section, status и по возможности commit/ref. Browser-local block может хранить эти ссылки, но сам workspace state не является доказательством факта.

## Безопасная адаптация

- authored blocks immutable;
- local blocks рендерятся через `textContent`;
- local analogy не меняет source of truth;
- inference явно отделяется от repository-backed statements;
- при недостатке evidence ответ становится `open`, а не правдоподобной выдумкой.
