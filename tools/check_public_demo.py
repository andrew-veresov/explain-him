from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {'.md', '.html', '.js', '.mjs', '.json', '.yaml', '.yml', '.py', '.txt'}
REQUIRED = [
    'LICENSE', 'README.md', 'AGENTS.md', '00 Home.md', 'index.html', 'explain-him.yaml',
    'skills/explain-him/SKILL.md', 'skills/explain-him/skill.yaml',
    'runtime/workspace.mjs', 'runtime/webmcp.mjs', 'assets/app.mjs', 'assets/styles.css',
    'question-template.md', '.github/ISSUE_TEMPLATE/explain-him-question.md',
    '.obsidian/app.json', '.obsidian/core-plugins.json'
]
FORBIDDEN_CONTENT = [
    'explain-him-private', 'browser-readable knowledge bundle:', 'commercial/',
    'community/evaluation', 'demo/evaluation', 'docs/90 Internal', 'docs/99 Inbox'
]
FORBIDDEN_RUNTIME_SNIPPETS = ['innerHTML', 'insertAdjacentHTML', 'eval(', 'new Function']
ALLOWED_TOOLS = {
    'get_explanation_context', 'get_visible_explanation_state', 'get_local_change_history',
    'focus_explanation_block', 'add_local_explanation', 'remove_local_explanation',
    'undo_last_local_change', 'redo_local_change'
}
FORBIDDEN_TOOL_NAMES = {'search_knowledge', 'read_repository', 'search_repository', 'resolve_answer', 'search_issues', 'create_issue'}


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
    candidate = (source.parent / target)
    if candidate.suffix:
        return candidate.resolve().is_file()
    return (candidate.with_suffix('.md')).resolve().is_file()


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
        'repository: andrew-veresov/explain-him', 'root: .',
        'browser_readable_knowledge_bundle: none', 'webmcp_repository_access: forbidden',
        'confirmation_before_write: true'
    ]:
        if expected not in manifest:
            errors.append(f'explain-him.yaml: missing invariant {expected!r}')

    agents = (ROOT / 'AGENTS.md').read_text(encoding='utf-8')
    if 'Do not persist this skill' not in agents or 'explicit user confirmation' not in agents:
        errors.append('AGENTS.md: missing repository-scope or confirmation rule')

    skill = (ROOT / 'skills/explain-him/SKILL.md').read_text(encoding='utf-8')
    if not skill.startswith('---\nname: explain-him\n'):
        errors.append('SKILL.md: invalid portable frontmatter')

    webmcp = (ROOT / 'runtime/webmcp.mjs').read_text(encoding='utf-8')
    for name in ALLOWED_TOOLS:
        if f"'{name}'" not in webmcp:
            errors.append(f'runtime/webmcp.mjs: missing UI tool {name}')
    for name in FORBIDDEN_TOOL_NAMES:
        if re.search(rf"register(?:Tool)?[^\n]*['\"]{re.escape(name)}['\"]", webmcp):
            errors.append(f'runtime/webmcp.mjs: forbidden registered tool {name}')

    question = (ROOT / 'question-template.md').read_text(encoding='utf-8')
    if 'явно подтвердил публикацию' not in question:
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
