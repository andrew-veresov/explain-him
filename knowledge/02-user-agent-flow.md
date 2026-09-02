---
title: User and personal-agent flow
status: current
tags: [explain-him, user, agent, webmcp]
---

# User and personal-agent flow

1. The user opens the authored page or gives the repository/page URL to their browser/personal agent.
2. If Site Tools are available, the agent calls `get_explain_him_context` to inspect the current Original/Personalized UI, repository guidance, target capabilities, local blocks, activation, and revision.
3. The agent answers from the current page when it is sufficient.
4. If version, evidence, or deeper context is needed, the agent follows repository-scoped instructions in `AGENTS.md` / `SKILL.md` and reads the minimum required repository sources through its own GitHub integration.
5. The agent distinguishes `current`, `target`, `hypothesis`, `open`, and `demo-only`.
6. The user receives the explanation in the personal-agent interface they already use. Explain Him does not provide a second chat UI.
7. Unless the user explicitly forbids page changes or scrolling, the agent calls `explain_tool`: focus an existing explanation, or apply a safe typed `add`, `replace`, `update`, or `remove` operation with automatic focus.
8. The human immediately sees the same page mutation; undo/redo remain available through human controls.
9. If evidence is insufficient, the agent offers a minimized Issue draft and waits for user confirmation.

## Why this is not a separate Explain Him agent or chat

The user keeps their own model, memory, settings, conversation history, and familiar interface. Explain Him adds a repository-scoped explanation capability and a shared visual page to the existing agent instead of moving the user into a mandatory new chat.

An embedded chat would duplicate the browser agent, split context between two interfaces, and create unnecessary runtime and product boundaries. Therefore the Explain Him page is the visual explanation surface; conversation belongs to the user's agent.

## Why WebMCP matters in this flow

Without WebMCP the agent may still read and operate a webpage through generic browser interaction, but it must infer semantic targets and local application state. WebMCP makes those concepts explicit and provides safe, narrow operations over the same page the user sees.

```text
User ↔ browser/personal agent
              │
              ├── get_explain_him_context → inspect page and repository guidance
              ├── answer in agent chat
              └── explain_tool → focus or add / replace / update / remove
                           │
                           ▼
Originator-authored page + local operation log = personalized visible page
```

A local explanation may help this user, but it does not become a canonical statement by the Originator.

See [[../resolutions/2026-08-30-skill-driven-webmcp|current WebMCP boundary]].
