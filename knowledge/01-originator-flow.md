---
title: Originator flow
status: current
tags: [explain-him, originator]
---

# Originator flow

The Originator does not write one "perfect text for everyone." The Originator creates a **versioned explanation environment** from which personal agents assemble answers for specific questions.

## Basic flow

1. Create or choose the GitHub repository for the idea.
2. Prepare an HTML page that explains the core model without a specialized runtime.
3. Add the bootstrap and repository-scoped skill.
4. Separate confirmed state, targets, hypotheses, and open questions.
5. Publish the repository or GitHub Pages link.
6. Receive new questions through Issues.
7. Answer them and move durable clarifications into `resolutions/`, knowledge, or the authored page.
8. Verify that the new version improves future explanations.

## Why the repository is the address of the idea

GitHub already provides a stable URL, history, commits, permissions, Issues, and integrations with AI agents. Explain Him uses this infrastructure instead of duplicating it.

## What must be explicit

- semantic invariants and interpretation boundaries;
- source precedence;
- claim statuses;
- how unknown questions are handled;
- data that must not be transferred into public Issues;
- accepted resolutions that supersede earlier text.

The Originator does not need to design a fixed question sequence. The user's personal agent constructs the concrete explanation path.
