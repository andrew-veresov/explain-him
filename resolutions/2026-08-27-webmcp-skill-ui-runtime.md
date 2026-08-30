---
title: WebMCP delivers the skill and mutates only local UI
status: superseded
date: 2026-08-27
tags: [explain-him, resolution, webmcp, skills]
---

# WebMCP delivers the skill and mutates only local UI

This decision is superseded by [[2026-08-30-webmcp-challenge-surface]].

The original decision treated WebMCP primarily as skill delivery plus browser-local UI synchronization. That created two problems in the real Site Tools environment: it depended on a non-standard `registerSkill()` idea and exposed too much internal/compatibility plumbing as agent tools.

The retained part of this decision is the security boundary: WebMCP does not search the repository, generate claims, inject arbitrary HTML/JavaScript, or write GitHub Issues. The Originator-authored layer remains immutable.
