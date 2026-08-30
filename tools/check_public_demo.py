from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {'.md', '.html', '.css', '.js', '.mjs', '.json', '.yaml', '.yml', '.py', '.txt'}
CYRILLIC_RE = re.compile(r'[\u0400-\u04FF]')
REQUIRED = [
    'LICENSE', 'README.md', 'AGENTS.md', '00 Home.md', 'index.html', 'explain-him.yaml',
    'WEBMCP_CHALLENGE.md',
    'skills/explain-him/SKILL.md', 'skills/explain-him/skill.yaml',
    'schemas/presentation-capability.v1.schema.json', 'schemas/presentation-artifact.v1.schema.json',
    'runtime/presentation/registry.mjs', 'runtime/presentation/artifact.mjs',
    'runtime/workspace.mjs', 'runtime/webmcp.mjs', 'assets/app.mjs', 'assets/styles.css',
    'knowledge/07-presentation-capabilities.md', 'resolutions/2026-08-29-presentation-capabilities.md',
    'resolutions/2026-08-30-webmcp-challenge-surface.md',
    'tests/webmcp-eval-cases.json', 'tests/webmcp-evals.test.mjs',
    'question-template.md', '.github/ISSUE_TEMPLATE/explain-him-question.md',
    '.obsidian/app.json', '.obsidian/core-plugins.json'
]
FORBIDDEN_CONTENT = [
    'explain-him-private', 'browser-readable knowledge bundle:', 'commercial/',
    'community/evaluation', 'demo/evaluation', 'docs/90 Internal', 'docs/99 Inbox'
]
FORBIDDEN_RUNTIME_SNIPPETS = ['innerHTML', 'insertAdjacentHTML', 'eval(', 'new Function']
PUBLIC_WEBMCP_TOOLS = [
    'get_explanation_context',
    'get_personalization_state',
    'focus_explanation',
    'add_personal_explanation',
    'remove_personal_explanation',
    'undo_personalization',
    'redo_personalization',
]
OBSOLETE_PUBLIC_TOOLS = {
    'get_presentation_context', 'get_visible_explanation_state', 'get_local_change_history',
    'focus_explanation_block', 'add_local_presentation', 'remove_local_presentation',
    'add_local_explanation', 'remove_local_explanation', 'undo_last_local_change', 'redo_local_change',
    'get_webmcp_status', 'get_explain_him_skill'
}
FORBIDDEN_TOOL_NAMES = {
    'search_knowledge', 'read_repository', 'search_repository', 'resolve_answer',
    'resolve_presentation', 'search_issues', 'create_issue'
}


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references: list[str] = []
        self.block_ids: list[str] = []
        self.slot_ids: list[str] = []

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        for name in ('href', 'src'):
            value = data.get(name)
            if value:
                self.references.append(value)
        if data.get('data-eh-block-id'):
            self.block_ids.append(data['data-eh-block-id'])
        if data.get('data-eh-local-slot'):
            self.slot_ids.append(data['data-eh-local-slot'])


def text_files():
    for path in ROOT.rglob('*'):
        if path.is_file() and '.git' not in path.parts and path.suffix.lower() in TEXT_SUFFIXES:
            yield path


def resolve_wikilink(source: Path, raw: str) -> bool:
    target = raw.split('|', 1)[0].split('#', 1)[0].strip()
    if not target:
        return True
    candidate = source.parent / target
    if candidate.suffix:
        return candidate.resolve().is_file()
    return candidate.with_suffix('.md').resolve().is_file()


def main() -> int:
    errors: list[str] = []

    for item in REQUIRED:
        if not (ROOT / item).is_file():
            errors.append(f'Missing required file: {item}')

    for path in text_files():
        if path.resolve() == Path(__file__).resolve():
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        rel = path.relative_to(ROOT)
        if CYRILLIC_RE.search(text):
            errors.append(f'{rel}: project text must be English; Cyrillic content found')
        for marker in FORBIDDEN_CONTENT:
            if marker in text:
                errors.append(f'{rel}: forbidden public content marker {marker!r}')
        if path.is_relative_to(ROOT / 'runtime') or path == ROOT / 'assets' / 'app.mjs':
            for snippet in FORBIDDEN_RUNTIME_SNIPPETS:
                if snippet in text:
                    errors.append(f'{rel}: unsafe DOM/runtime snippet {snippet!r}')
        for match in re.finditer(r'\[\[([^\]]+)\]\]', text):
            if not resolve_wikilink(path, match.group(1)):
                errors.append(f'{rel}: unresolved wiki-link [[{match.group(1)}]]')

    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    parser = PageParser()
    parser.feed(html)
    if '<html lang="en">' not in html:
        errors.append('index.html: project page language must be English')
    if len(parser.block_ids) != len(set(parser.block_ids)):
        errors.append('index.html: duplicate data-eh-block-id values')
    unknown_slots = sorted(set(parser.slot_ids) - set(parser.block_ids))
    if unknown_slots:
        errors.append(f'index.html: local slots without authored targets: {unknown_slots}')
    for ref in parser.references:
        if ref.startswith(('#', 'http://', 'https://', 'mailto:', 'data:')):
            continue
        target = ref.split('#', 1)[0].split('?', 1)[0]
        if target and not (ROOT / target).is_file():
            errors.append(f'index.html: missing local reference {ref!r}')

    manifest = (ROOT / 'explain-him.yaml').read_text(encoding='utf-8')
    for expected in [
        'repository: andrew-veresov/explain-him', 'root: .', 'language: en',
        'browser_readable_knowledge_bundle: none', 'webmcp_repository_access: forbidden',
        'consumer_local_capabilities: allowed', 'arbitrary_html: forbidden',
        'state_model: typed-presentation-operation-log', 'confirmation_before_write: true',
        'api: document.modelContext', 'registration: imperative-top-level-javascript'
    ]:
        if expected not in manifest:
            errors.append(f'explain-him.yaml: missing invariant {expected!r}')
    for stale in ['layout: two-panel', 'right_panel:', 'chat_runtime:', 'preferred: registerSkill']:
        if stale in manifest:
            errors.append(f'explain-him.yaml: stale marker {stale!r}')
    for name in PUBLIC_WEBMCP_TOOLS:
        if f'- {name}' not in manifest:
            errors.append(f'explain-him.yaml: missing public WebMCP tool {name}')

    agents = (ROOT / 'AGENTS.md').read_text(encoding='utf-8')
    for expected in [
        'Do not persist this skill', 'explicit user confirmation', 'Repository-authored content must be English',
        'Never inject arbitrary HTML or JavaScript', 'Consumer-local capabilities'
    ]:
        if expected not in agents:
            errors.append(f'AGENTS.md: missing invariant {expected!r}')

    skill = (ROOT / 'skills/explain-him/SKILL.md').read_text(encoding='utf-8')
    if not skill.startswith('---\nname: explain-him\n'):
        errors.append('SKILL.md: invalid portable frontmatter')
    for expected in ['Repository-authored artifacts are English', 'Presentation Artifact', 'Archify', 'Never present']:
        if expected not in skill:
            errors.append(f'SKILL.md: missing presentation/grounding rule {expected!r}')

    webmcp = (ROOT / 'runtime/webmcp.mjs').read_text(encoding='utf-8')
    if 'environment?.document?.modelContext' not in webmcp or "source: 'document.modelContext'" not in webmcp:
        errors.append('runtime/webmcp.mjs: standard document.modelContext host must be primary')
    if 'registerSkill' in webmcp:
        errors.append('runtime/webmcp.mjs: non-standard registerSkill dependency is forbidden')
    if 'getTools' not in webmcp:
        errors.append('runtime/webmcp.mjs: optional host verification through getTools is required')
    for name in PUBLIC_WEBMCP_TOOLS:
        if f"'{name}'" not in webmcp:
            errors.append(f'runtime/webmcp.mjs: missing public WebMCP tool {name}')
    for name in OBSOLETE_PUBLIC_TOOLS:
        if re.search(rf"(?:readOnlyTool|mutationTool)\(\s*['\"]{re.escape(name)}['\"]", webmcp):
            errors.append(f'runtime/webmcp.mjs: obsolete/overlapping public tool {name}')
    for name in FORBIDDEN_TOOL_NAMES:
        if re.search(rf"(?:readOnlyTool|mutationTool)\(\s*['\"]{re.escape(name)}['\"]", webmcp):
            errors.append(f'runtime/webmcp.mjs: forbidden registered tool {name}')

    app = (ROOT / 'assets/app.mjs').read_text(encoding='utf-8')
    for expected in ['environment: globalThis', 'data', 'webmcp-status-hero', 'webmcpVerifiedTools']:
        if expected not in app:
            errors.append(f'assets/app.mjs: missing WebMCP runtime/judge signal {expected!r}')

    challenge = (ROOT / 'WEBMCP_CHALLENGE.md').read_text(encoding='utf-8')
    for expected in [
        'Why WebMCP is essential', 'Judge flow', 'Challenge-period work and provenance',
        'document.modelContext', 'public demo video under three minutes'
    ]:
        if expected not in challenge:
            errors.append(f'WEBMCP_CHALLENGE.md: missing challenge evidence {expected!r}')

    eval_cases = json.loads((ROOT / 'tests/webmcp-eval-cases.json').read_text(encoding='utf-8'))
    covered = {item.get('expectedTool') for item in eval_cases}
    missing_eval_tools = sorted(set(PUBLIC_WEBMCP_TOOLS) - covered)
    if missing_eval_tools:
        errors.append(f'tests/webmcp-eval-cases.json: missing tool coverage {missing_eval_tools}')

    artifact = (ROOT / 'runtime/presentation/artifact.mjs').read_text(encoding='utf-8')
    for expected in ['DANGEROUS_KEYS', 'content.payload', 'explain-him-presentation.v1']:
        if expected not in artifact:
            errors.append(f'runtime/presentation/artifact.mjs: missing validation invariant {expected!r}')

    question = (ROOT / 'question-template.md').read_text(encoding='utf-8')
    if 'explicitly approved publication' not in question:
        errors.append('question-template.md: user confirmation checkbox is required')

    if errors:
        print('Explain Him public demo check failed:')
        for error in errors:
            print(f'- {error}')
        return 1

    print('Explain Him public demo check: OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
