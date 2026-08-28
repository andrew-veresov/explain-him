# Contributing

1. Keep the repository self-contained and runnable as a static site.
2. Preserve the boundary: personal agent owns retrieval/answering; WebMCP owns skill delivery and local UI operations only.
3. Add or update a resolution when changing an accepted product rule.
4. Keep Markdown and wiki-links compatible with Obsidian.
5. Do not add private sources, Pro implementation, hidden telemetry or external runtime dependencies.
6. Run:

```bash
python tools/check_public_demo.py
node --test tests/workspace.test.mjs tests/webmcp.test.mjs
```
