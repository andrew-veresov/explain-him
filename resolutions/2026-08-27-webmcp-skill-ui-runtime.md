---
title: WebMCP поставляет skill и мутирует только локальный UI
status: accepted
date: 2026-08-27
tags: [explain-him, resolution, webmcp, skills]
---

# WebMCP поставляет skill и мутирует только локальный UI

## Решение

В browser flow Explain Him использует WebMCP для двух задач:

1. передать персональному агенту Explain Him skill как instructions, structured context и связанные UI tools;
2. отобразить уже сформированный агентом ответ в authored page через typed visual/workspace operations.

WebMCP не является knowledge/retrieval layer и не требует browser-readable knowledge bundle.

Персональный агент читает текущую страницу и при необходимости repository через собственную GitHub integration, применяет source precedence, формирует grounded answer и provenance, отвечает пользователю, а затем опционально вызывает UI tool.

WebMCP может передать descriptor, сообщить stable targets, фокусировать authored block, добавить/remove local block, читать local state/history и поддерживать undo/redo.

WebMCP не предоставляет tools для knowledge search, repository read/search, claim resolution, answer generation или GitHub Issues. Authored HTML остаётся immutable.

При наличии `registerSkill()` descriptor регистрируется напрямую. Иначе read-only `get_explain_him_skill` возвращает тот же descriptor; repository `SKILL.md` остаётся non-WebMCP fallback.
