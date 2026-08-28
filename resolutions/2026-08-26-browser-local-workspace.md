---
title: Browser-local адаптация объяснения
status: accepted
date: 2026-08-26
tags: [resolution, browser, adaptive-explanation]
---

# Browser-local адаптация объяснения

Explain Him использует immutable authored UI и browser-local персональный слой.

Персональный агент изменяет видимую страницу только через типизированные операции. Локальные дополнения сохраняются в IndexedDB, воспроизводятся после повторного открытия и поддерживают undo/redo. Исходный HTML и канонические claims не изменяются.

WebMCP используется, когда доступен. Accessible controls являются fallback; оба интерфейса вызывают один workspace API.

Минимальный demo contract: add, remove, undo, redo, confirmed reset и export. Visual focus временный и не входит в operation log. Compatibility конкретного browser agent остаётся `open`; cross-device sync относится к Explain Him Pro.
