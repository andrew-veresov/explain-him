---
title: User and personal-agent flow
status: current
tags: [explain-him, user, agent]
---

# User and personal-agent flow

1. The user opens the authored page or gives the repository URL to their agent.
2. The agent receives repository-scoped instructions from the WebMCP descriptor or `AGENTS.md`/`SKILL.md`.
3. The agent reads the current page.
4. If the page is sufficient, the agent forms the answer without unnecessary retrieval.
5. If version, evidence, or deeper context is needed, the agent reads the minimum required repository files through its own GitHub integration.
6. The agent distinguishes `current`, `target`, `hypothesis`, `open`, and `demo-only`.
7. The agent answers in its normal personal-agent chat.
8. When visual support helps, the agent focuses an authored block or adds a typed browser-local block through WebMCP.
9. If evidence is insufficient, the agent offers a minimized Issue draft and waits for user confirmation.

## Why this is not a separate Explain Him agent

The user keeps their own model, memory, settings, and familiar interface. Explain Him adds a repository-scoped capability to the existing agent instead of moving the user into a mandatory new chat.

## Visual result

```text
Originator-authored page + local operation log = personalized visible page
```

A local explanation may help this user, but it does not become a canonical statement by the Originator.
