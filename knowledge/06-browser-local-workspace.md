---
title: Browser-local адаптивное объяснение
status: demo-only
tags: [explain-him, browser, webmcp, indexeddb]
---

# Browser-local адаптивное объяснение

## Модель

```text
immutable authored HTML
        +
typed local operation log
        =
personalized visible DOM
```

Персональный агент не получает произвольный доступ к HTML. Он может добавить typed block, удалить только local block, выполнить undo/redo или временно сфокусировать authored target.

## Persistence

Operation log сохраняется в IndexedDB в пределах origin и browser profile. При недоступной IndexedDB используется memory fallback, поэтому изменения живут только в текущей сессии. JSON export позволяет сохранить локальное состояние вручную.

## Safety

- renderer использует `textContent`;
- arbitrary HTML/JavaScript/CSS mutation запрещена;
- authored blocks нельзя удалить или переписать;
- reset требует подтверждения;
- provenance локального block поставляет персональный агент после собственного retrieval.

## Ограничения

- очистка site data удаляет workspace;
- другой origin или browser profile имеет отдельное состояние;
- обновление base revision может сделать local block orphaned;
- compatibility конкретного browser agent остаётся `open` до E2E;
- cross-device sync относится к Explain Him Pro.

См. [[../resolutions/2026-08-26-browser-local-workspace|принятое решение]] и [[../resolutions/2026-08-27-webmcp-skill-ui-runtime|границу WebMCP]].
