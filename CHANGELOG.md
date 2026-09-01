# Changelog

## 0.5.0 – 2026-09-01

- Registered the two Protocol v3 tools before asynchronous workspace initialization.
- Added immutable machine-readable skill pins and split page API, agent connection, contract, and workspace revision status.
- Added safe lifecycle evidence, host-preflight classification, and current WebMCP callback cancellation support.
- Separated native Chrome page-runtime validation from real agent-host/model compatibility claims.

## 0.4.0 – 2026-08-30

- Replaced the seven-operation WebMCP surface with `get_explanation_contract` and `apply_explanation`.
- Added repository and skill discovery metadata for browser agents.
- Added safe typed explanation blocks, guided focus, and an Originator workflow scenario.
- Added deterministic contract, presentation, and AI-eval fixture tests.

## 0.1.1 – 2026-08-28

- Migrated all repository-authored content and demo UI copy to English.
- Set the manifest language to `en` and added an accepted project-language resolution.
- Added a deterministic check that rejects Cyrillic text in project text files.

## 0.1.0 – 2026-08-28

- Created the standalone public Explain Him demo/reference repository.
- Added authored two-panel explanation page and repository-scoped agent bootstrap.
- Added browser-local typed workspace with IndexedDB fallback, undo/redo, export and confirmed reset.
- Added WebMCP skill descriptor and UI-only tools with a compatibility fallback.
- Added public knowledge, accepted resolutions, Issue flow and deterministic CI checks.
