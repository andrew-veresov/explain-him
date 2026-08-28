# Security

- Do not commit credentials, access tokens, private repository material or personal conversation history.
- GitHub Issue drafts must minimize personal context and require explicit user confirmation before publication.
- Browser-local blocks are untrusted input. The renderer uses DOM `textContent`; arbitrary HTML, JavaScript and CSS injection are outside the contract.
- WebMCP tools cannot mutate authored blocks, search repository knowledge, generate answers or access GitHub Issues.
- Clearing site data removes IndexedDB personalization. Export local state before clearing when it matters.

Report a security concern through a private channel to the repository owner rather than opening a public Issue containing exploit details or secrets.
