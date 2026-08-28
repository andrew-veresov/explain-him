# Contributing

1. Keep the repository self-contained and runnable as a static site.
2. Preserve the boundary: personal agent owns retrieval/answering; WebMCP owns skill delivery and local UI operations only.
3. Add or update a resolution when changing an accepted product rule.
4. Keep Markdown and wiki-links compatible with Obsidian.
5. Keep repository-authored content in English, including UI copy, manifests, templates, resolutions, examples, code-facing text, tests, and Issue drafts created for the repository.
6. Do not add private sources, Pro implementation, hidden telemetry or external runtime dependencies.
7. Run:

```bash
python tools/check_public_demo.py
node --test tests/workspace.test.mjs tests/webmcp.test.mjs
```
