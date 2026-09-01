from __future__ import annotations

from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
import json
import os
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_DEMO = os.environ.get('EXPLAIN_HIM_PRIVATE_DEMO') == '1'
PRIVATE_ONLY_PREFIXES = {
    'evaluation', 'assets/workspace',
}
PRIVATE_ONLY_FILES = {
    'assets/app.js', 'assets/workspace.css',
    'knowledge/05-boundaries.md', 'knowledge/06-open-questions.md', 'knowledge/07-browser-local-workspace.md',
    'tests/browser_workspace_test.py', 'tests/webmcp-runtime.test.mjs', 'tests/workspace-core.test.mjs',
}
TEXT_SUFFIXES = {'.md', '.html', '.css', '.js', '.mjs', '.json', '.yaml', '.yml', '.py', '.txt'}
CYRILLIC_RE = re.compile(r'[\u0400-\u04FF]')
REQUIRED = [
    'LICENSE', 'README.md', 'AGENTS.md', '00 Home.md', 'index.html', 'explain-him.yaml', '.nojekyll',
    'WEBMCP_CHALLENGE.md',
    'skills/explain-him/SKILL.md', 'skills/explain-him/skill.yaml',
    'skills/explain-him-presentation/SKILL.md', 'schemas/explanation-block.v1.schema.json', 'schemas/webmcp-contract.v3.schema.json', 'schemas/webmcp-apply.v3.schema.json',
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
    'get_explanation_contract',
    'apply_explanation',
]
OBSOLETE_PUBLIC_TOOLS = {
    'get_explanation_context', 'get_personalization_state', 'focus_explanation',
    'add_personal_explanation', 'remove_personal_explanation',
    'undo_personalization', 'redo_personalization',
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
        if not path.is_file() or '.git' in path.parts or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        relative = path.relative_to(ROOT).as_posix()
        if PRIVATE_DEMO and (relative in PRIVATE_ONLY_FILES or any(relative == prefix or relative.startswith(prefix + '/') for prefix in PRIVATE_ONLY_PREFIXES)):
            continue
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

    deployment_required = ['tools/check_live_pages.py', 'tools/check_webmcp_origin_trial.py', 'tools/webmcp_host_preflight.py', 'tools/test_webmcp_host_preflight.py', '.github/workflows/live-pages-smoke.yml', '.github/workflows/public-demo-check.yml', '.github/workflows/webmcp-origin-trial.yml']
    if PRIVATE_DEMO:
        deployment_required = ['../tools/check_live_pages.py', '../tools/check_webmcp_origin_trial.py', '../tools/webmcp_host_preflight.py', '../tools/test_webmcp_host_preflight.py', '../distribution/public-workflows/live-pages-smoke.yml', '../distribution/public-workflows/public-demo-check.yml', '../distribution/public-workflows/webmcp-origin-trial.yml']
    for item in [*REQUIRED, *deployment_required]:
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
        forbidden = FORBIDDEN_CONTENT if not PRIVATE_DEMO else [marker for marker in FORBIDDEN_CONTENT if marker not in {'community/evaluation', 'demo/evaluation'}]
        for marker in forbidden:
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
    for expected in ['class="section-nav"', 'aria-label="Explanation sections"', 'data-scroll-section="how-it-works"', 'data-scroll-section="how-to-express"', 'id="how-it-works"', 'class="continuous-section"', 'id="how-to-express"', 'class="continuous-section continuous-section-expression"', 'Express your idea once. Explain Him explains it to everyone.', 'Ask your agent how to express your own idea with Explain Him.', 'id="developer-details"', '<summary>For developers: how it works internally</summary>', 'role="group"', 'aria-label="Explanation view"', 'id="webmcp-status"', 'role="status"', 'aria-live="polite"', 'id="webmcp-page-status"', 'Page WebMCP API – checking', 'id="webmcp-agent-status"', 'Agent connection – not observed', 'id="webmcp-contract-status"', 'Contract – not activated', 'id="webmcp-revision-status"', 'Workspace revision – 0', 'id="source-toggle"', 'aria-controls="source-drawer"', 'id="source-drawer"', 'class="source-drawer"', 'role="region"', 'aria-labelledby="source-drawer-title"']:
        if expected not in html:
            errors.append(f'index.html: missing accessible UI invariant {expected!r}')
    if len(re.findall(r'<h1(?:\s|>)', html)) != 1:
        errors.append('index.html: exactly one h1 is required')
    if html.count('class="action-step"') != 6:
        errors.append('index.html: the reader story must contain exactly six steps')
    header_css = (ROOT / 'assets/header.css').read_text(encoding='utf-8')
    for obsolete in ['.action-sequence::after', '.action-sequence .action-steps']:
        if obsolete in header_css:
            errors.append(f'assets/header.css: six-step reader story must remain visible; found {obsolete!r}')
    for obsolete in ['role="tablist"', 'role="tab"', 'role="tabpanel"', 'data-section-panel=', 'data-section="flow"', 'Local explanation', 'Who does what', 'Three roles']:
        if obsolete in html:
            errors.append(f'index.html: obsolete primary-story UI remains {obsolete!r}')
    for expected in [
        'name="explain-him-repository"', 'content="andrew-veresov/explain-him"',
        'name="explain-him-skill"', 'content="skills/explain-him/SKILL.md"',
        'name="explain-him-presentation-skill"', 'content="skills/explain-him-presentation/SKILL.md"'
    ]:
        if expected not in html:
            errors.append(f'index.html: missing machine-readable bootstrap {expected!r}')
    for skill_path in ['skills/explain-him/SKILL.md', 'skills/explain-him-presentation/SKILL.md']:
        if skill_path not in html or not (ROOT / skill_path).is_file():
            errors.append(f'index.html: missing raw skill bootstrap path {skill_path!r}')
        if (ROOT / skill_path).with_suffix('.html').exists():
            errors.append(f'{skill_path}: generated HTML substitute is forbidden; GitHub Pages must expose the raw Markdown route')
    bootstrap_match = re.search(r'<script id="explain-him-agent-bootstrap" type="application/json">([\s\S]*?)</script>', html)
    if not bootstrap_match:
        errors.append('index.html: pinned machine-readable agent bootstrap is missing')
    else:
        try:
            bootstrap = json.loads(bootstrap_match.group(1))
        except json.JSONDecodeError as error:
            errors.append(f'index.html: agent bootstrap is not valid JSON: {error.msg}')
        else:
            expected_skills = [
                {'id': 'explain-him', 'commit': '054bbf4e4c2f121bf6066ef7d1ae961c7c7a0aef', 'sha256': '9929a94b87ed243b6bc81e43950b027d06f0cff4f4c2bb6cabe7de82ca9d99f2', 'rawUrl': 'https://raw.githubusercontent.com/andrew-veresov/explain-him/054bbf4e4c2f121bf6066ef7d1ae961c7c7a0aef/skills/explain-him/SKILL.md'},
                {'id': 'explain-him-presentation', 'commit': '054bbf4e4c2f121bf6066ef7d1ae961c7c7a0aef', 'sha256': '975647e1e1a509068770eb7c5ef172dc7c7ea57a4f6b4a32ac99da7b71ec2122', 'rawUrl': 'https://raw.githubusercontent.com/andrew-veresov/explain-him/054bbf4e4c2f121bf6066ef7d1ae961c7c7a0aef/skills/explain-him-presentation/SKILL.md'},
            ]
            expected_sources = [{
                'topic': 'originator-publishing',
                'path': 'knowledge/01-originator-flow.md',
                'section': 'Basic flow',
                'status': 'current',
                'rawUrl': 'https://raw.githubusercontent.com/andrew-veresov/explain-him/054bbf4e4c2f121bf6066ef7d1ae961c7c7a0aef/knowledge/01-originator-flow.md',
                'commit': '054bbf4e4c2f121bf6066ef7d1ae961c7c7a0aef',
                'sha256': 'cf7a396231a50a18c37a9c52ddc7c7315c07cf4107b6dea524760eaa630f3659',
            }, {
                'topic': 'originator-publishing',
                'path': 'PRODUCT-CONTRACT.md',
                'section': 'Authoring and publishing reality',
                'status': 'current',
                'rawUrl': 'https://raw.githubusercontent.com/andrew-veresov/explain-him/054bbf4e4c2f121bf6066ef7d1ae961c7c7a0aef/PRODUCT-CONTRACT.md',
                'commit': '054bbf4e4c2f121bf6066ef7d1ae961c7c7a0aef',
                'sha256': 'accf552b100c1acdd056f166e26c1579f0b55048bc4c67b35f16272af344f4d7',
            }]
            expected_bootstrap = {
                'schemaVersion': 'explain-him-agent-bootstrap.v1',
                'protocolVersion': 3,
                'repository': {'fullName': 'andrew-veresov/explain-him', 'url': 'https://github.com/andrew-veresov/explain-him', 'skillsCommit': '054bbf4e4c2f121bf6066ef7d1ae961c7c7a0aef'},
                'tools': PUBLIC_WEBMCP_TOOLS,
                'repositoryRetrievalRequiredWhenPageInsufficient': True,
                'skillLoadOrder': [item['id'] for item in expected_skills],
                'skills': expected_skills,
                'groundingSourceIndex': expected_sources,
            }
            if bootstrap != expected_bootstrap:
                errors.append('index.html: agent bootstrap does not exactly match the pinned Protocol v3 runtime contract')
            source_path = ROOT / expected_sources[0]['path']
            if source_path.is_file() and sha256(source_path.read_bytes()).hexdigest() != expected_sources[0]['sha256']:
                errors.append('knowledge/01-originator-flow.md: content does not match the pinned grounding source SHA-256')
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
        'state_model: transactional-typed-presentation-operation-log', 'confirmation_before_write: true',
        'api: document.modelContext', 'registration: imperative-top-level-javascript',
        'purpose: typed-result-delivery-to-shared-page', 'presentation-skill-location',
        '- focus', 'feature: WebMCP', 'canonical_origin: https://andrew-veresov.github.io:443',
        'is_subdomain: true', 'third_party: false', 'expiry_unix: 1794873600',
        'token_sha256: 7f151bb88d4636beb26c991c2853d6a43b1b50f23ea9860b3a6658553912f2e2',
        'fail_window_days: 14', 'validation: tools/check_webmcp_origin_trial.py',
        'live_validation: tools/check_live_pages.py', 'native_live_validation: tools/test_native_chrome_webmcp_live.py',
        'host_guarantee: false', 'protocol_version: 3', 'contract_schema: schemas/webmcp-contract.v3.schema.json',
        'apply_schema: schemas/webmcp-apply.v3.schema.json', 'schema_version: explain-him-local-workspace.v4',
        'release: A5', 'commit: 054bbf4e4c2f121bf6066ef7d1ae961c7c7a0aef',
        'sha256: 9929a94b87ed243b6bc81e43950b027d06f0cff4f4c2bb6cabe7de82ca9d99f2',
        'sha256: 975647e1e1a509068770eb7c5ef172dc7c7ea57a4f6b4a32ac99da7b71ec2122',
        'activation_handshake: fail-closed',
        'revision: A5', 'repositoryRetrievalRequiredWhenPageInsufficient: true',
        'groundingSourceIndex:', 'topic: originator-publishing', 'path: knowledge/01-originator-flow.md',
        'section: Basic flow', 'status: current',
        'sha256: cf7a396231a50a18c37a9c52ddc7c7315c07cf4107b6dea524760eaa630f3659',
        'path: PRODUCT-CONTRACT.md', 'section: Authoring and publishing reality',
        'sha256: accf552b100c1acdd056f166e26c1579f0b55048bc4c67b35f16272af344f4d7',
        'decisionPrecedence: [explicitNoPageChange, restore, terminologyConsistency, answerPresence]',
        'equivalenceNoteDoesNotMakeMixedLabelsConsistent: true',
        'presentationDecision:', 'alwaysProvideChatAnswer: true',
        'assessAnswerAndRequestedRepresentationInPersonalizedUi: true',
        'fullyPresent: {ordinaryQuestion: chat-only, showOrWalkthrough: focus-only}',
        'failure: {applyFailure: honest-acknowledgement-no-false-success}',
        'rawUrl: https://raw.githubusercontent.com/andrew-veresov/explain-him/054bbf4e4c2f121bf6066ef7d1ae961c7c7a0aef/',
        'schema_version: explain-him-agent-bootstrap.v1', 'page_activation_effect: discovery-hint-only',
        'page_api: data-webmcp-page-state', 'agent_connection: data-webmcp-agent-state',
        'contract: data-webmcp-contract-state', 'workspace_revision: data-webmcp-workspace-revision',
        'classifier: tools/webmcp_host_preflight.py', 'absent_agent_capability: BLOCKED_EXTERNAL',
        'page_runtime_is_agent_evidence: false', 'false_success_allowed: false',
        'official_chatgpt_chrome_extension:', 'observed_result: BLOCKED_EXTERNAL',
        'model_context_tool_inspector:', 'production_flow: false',
        'chrome_builtin_ai_epp:', 'guarantees_openai_extension_capability: false',
        'primary_source: https://github.com/webmachinelearning/webmcp/blob/main/index.bs',
        'imperative_callback_accepts_abort_signal: true', 'draft_execute_tool_input: object',
        'chrome_151_execute_tool_input: serialized-json-string', 'draft_to_shipped_divergence_retest_required: true',
        'toolchange_owner: browser',
        'descriptions_state_what_and_when: true', 'probabilistic_semantic_choice_gate: real-host-model-only'
    ]:
        if expected not in manifest:
            errors.append(f'explain-him.yaml: missing invariant {expected!r}')
    for stale in ['layout: two-panel', 'right_panel:', 'chat_runtime:', 'preferred: registerSkill']:
        if stale in manifest:
            errors.append(f'explain-him.yaml: stale marker {stale!r}')
    for name in PUBLIC_WEBMCP_TOOLS:
        if f'- {name}' not in manifest:
            errors.append(f'explain-him.yaml: missing public WebMCP tool {name}')

    if PRIVATE_DEMO:
        distribution = ROOT.parent / 'distribution' / 'public-facade.yml'
        if not distribution.is_file():
            errors.append('distribution/public-facade.yml: missing private-to-public publication policy')
        else:
            policy = distribution.read_text(encoding='utf-8')
            for expected in ['source: demo/.nojekyll', 'target: .nojekyll', 'source: demo/tests/**', 'target: tests/**', 'source: demo/tools/check_public_demo.py', 'target: tools/check_public_demo.py', 'source: tools/check_live_pages.py', 'target: tools/check_live_pages.py', 'source: tools/check_webmcp_origin_trial.py', 'target: tools/check_webmcp_origin_trial.py', 'source: tools/test_check_live_pages.py', 'target: tools/test_check_live_pages.py', 'source: tools/test_native_chrome_webmcp_live.py', 'target: tools/test_native_chrome_webmcp_live.py', 'source: tools/webmcp_host_preflight.py', 'target: tools/webmcp_host_preflight.py', 'source: tools/test_webmcp_host_preflight.py', 'target: tools/test_webmcp_host_preflight.py', 'source: distribution/public-workflows/live-pages-smoke.yml', 'target: .github/workflows/live-pages-smoke.yml', 'source: distribution/public-workflows/public-demo-check.yml', 'target: .github/workflows/public-demo-check.yml', 'source: distribution/public-workflows/webmcp-origin-trial.yml', 'target: .github/workflows/webmcp-origin-trial.yml', 'transactional-typed-presentation-operation-log', 'github-pages-preserves-raw-skill-markdown', 'deployed-pages-matches-exact-public-sha', 'origin-trial-is-pinned-decoded-and-checked-before-webmcp-api', 'current_public_skill_release:', 'protocol-v3-contract-binds-current-public-skill-release', 'pinned-grounding-source-index-matches-public-content', 'page-api-and-agent-host-evidence-are-distinct']:
                if expected not in policy:
                    errors.append(f'distribution/public-facade.yml: missing controlled facade rule {expected!r}')

    workflow_path = ROOT / '.github' / 'workflows' / 'live-pages-smoke.yml'
    if PRIVATE_DEMO:
        workflow_path = ROOT.parent / 'distribution' / 'public-workflows' / 'live-pages-smoke.yml'
    live_workflow = workflow_path.read_text(encoding='utf-8')
    for expected in ['workflow_run:', 'pages-build-deployment', 'workflow_dispatch:', 'head_branch == \'main\'', 'contents: read', 'deployments: read', 'WORKFLOW_RUN_SHA:', 'DISPATCH_SHA:', '[[ "$candidate" =~ ^[0-9a-f]{40}$ ]]', 'printf \'sha=%s\\n\' "$candidate" >> "$GITHUB_OUTPUT"', 'ref: ${{ steps.revision.outputs.sha }}', 'EXPECTED_SHA:', 'tools/check_live_pages.py', '--expected-sha "$EXPECTED_SHA"', 'GITHUB_STEP_SUMMARY', 'actions/upload-artifact@v4']:
        if expected not in live_workflow:
            errors.append(f'.github/workflows/live-pages-smoke.yml: missing deployment smoke invariant {expected!r}')
    for unsafe in ['echo "sha=${{', '--expected-sha "${{', 'candidate="${{']:
        if unsafe in live_workflow:
            errors.append(f'.github/workflows/live-pages-smoke.yml: unsafe direct shell interpolation {unsafe!r}')

    public_check_path = ROOT / '.github' / 'workflows' / 'public-demo-check.yml'
    if PRIVATE_DEMO:
        public_check_path = ROOT.parent / 'distribution' / 'public-workflows' / 'public-demo-check.yml'
    public_check = public_check_path.read_text(encoding='utf-8')
    for expected in ['python tools/check_public_demo.py', 'node --test tests/*.test.mjs', 'python -m unittest tools/test_webmcp_host_preflight.py']:
        if expected not in public_check:
            errors.append(f'.github/workflows/public-demo-check.yml: missing public regression marker {expected!r}')

    origin_trial_workflow = ROOT / '.github' / 'workflows' / 'webmcp-origin-trial.yml'
    if PRIVATE_DEMO:
        origin_trial_workflow = ROOT.parent / 'distribution' / 'public-workflows' / 'webmcp-origin-trial.yml'
    origin_trial_text = origin_trial_workflow.read_text(encoding='utf-8')
    for expected in ["schedule:", "cron: '17 6 * * 1'", 'tools/check_webmcp_origin_trial.py --html index.html', 'tools/check_webmcp_origin_trial.py --url https://andrew-veresov.github.io/explain-him/']:
        if expected not in origin_trial_text:
            errors.append(f'.github/workflows/webmcp-origin-trial.yml: missing expiry gate invariant {expected!r}')

    agents = (ROOT / 'AGENTS.md').read_text(encoding='utf-8')
    for expected in [
        'Do not persist these skills', 'explicit user confirmation', 'Repository-authored content must be English',
        'Never inject external generated HTML or JavaScript', 'guided walkthrough'
    ]:
        if expected not in agents:
            errors.append(f'AGENTS.md: missing invariant {expected!r}')

    skill = (ROOT / 'skills/explain-him/SKILL.md').read_text(encoding='utf-8')
    if not skill.startswith('---\nname: explain-him\n'):
        errors.append('SKILL.md: invalid portable frontmatter')
    for expected in [
        'Repository-authored artifacts are English', 'provenance', 'Archify', 'Never present',
        'Mandatory activation bootstrap', 'make one initial `get_explain_him_answer` call for this activation',
        'before answering any question about Explain Him or the current Explain Him page',
        'Additional contract calls are allowed only for a confirmed stale-workspace or session-conflict refresh',
        'Protocol v3 and release binding', 'Select the protocol only from the returned `schemaVersion`',
        'Never downgrade or translate a returned v3 contract to v2', 'an older bootstrap identity or proof cannot authorize `apply_explanation`',
        'Page-adaptation decision policy', 'apply_explanation` in the same turn is mandatory',
        'call `apply_explanation` in the same turn with a focus-only operation',
        'chat only for a simple, correct answer', 'requested local page change was not applied',
        'Terminology consistency precedes fully-present',
        'An equivalence note does not make mixed labels consistent',
        'An explicit no-page-change instruction still wins',
        'Do not normalize labels that denote distinct roles',
        'use `replace` on `workflow-diagram`',
        'same returned local block ID',
        'If any material part of the answer is not explicit in the visible Personalized UI',
        'repository retrieval is required in the same turn',
        '`groundingSourceIndex`', 'minimum pinned source',
        'Do not answer from plausible visible-page inference',
        'does not document a dedicated authoring tool', 'retrieval failure'
    ]:
        if expected not in skill:
            errors.append(f'SKILL.md: missing presentation/grounding rule {expected!r}')

    presentation_skill = (ROOT / 'skills/explain-him-presentation/SKILL.md').read_text(encoding='utf-8')
    if not presentation_skill.startswith('---\nname: explain-him-presentation\n'):
        errors.append('presentation SKILL.md: invalid portable frontmatter')
    for expected in [
        'Mandatory activation bootstrap', 'reuse the initial `get_explain_him_answer` result for this activation',
        'confirmed stale-workspace or session-conflict refresh',
        'Protocol v3 and release binding', 'Select the protocol only from the returned `schemaVersion`',
        'Never downgrade or translate a returned v3 contract to v2', 'an older bootstrap identity or proof cannot authorize `apply_explanation`', 'Same-turn decision and topic reuse',
        'Treat a topic as the stable semantic subject', 'Use `update` for a same-topic refinement',
        'Batch any other affected equivalent-label targets in the same transaction',
        'same-turn `apply_explanation` call with a focus-only operation',
        'requested local page change was not applied',
        'An equivalence note does not make mixed labels consistent',
        'explicit no-page-change instruction still wins',
        'Do not normalize labels that denote distinct roles',
        '`replace` for `workflow-diagram`',
        'same returned local block ID',
        'Missing, partial, or inconsistent visible UI requires a same-turn `apply_explanation`',
        'reuse the same returned local block ID',
        'must explicitly say that the Personalized UI did not change',
        'Fully present, correct, and consistent content stays chat-only'
    ]:
        if expected not in presentation_skill:
            errors.append(f'presentation SKILL.md: missing Protocol v3 policy {expected!r}')
    for skill_name, skill_text in [('SKILL.md', skill), ('presentation SKILL.md', presentation_skill)]:
        for stale in ['The current runtime returns `explain-him-webmcp-contract.v2`', 'the present `explain-him-webmcp-contract.v2` response']:
            if stale in skill_text:
                errors.append(f'{skill_name}: stale current-runtime v2 assertion {stale!r}')

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
    for expected in ['explain-him-webmcp-contract.v3', 'IMMUTABLE_SKILL_PROOF', 'GROUNDING_SOURCE_INDEX', '054bbf4e4c2f121bf6066ef7d1ae961c7c7a0aef', "revision: 'A5'", 'repositoryRetrievalRequiredWhenPageInsufficient: true', 'originator-publishing', 'knowledge/01-originator-flow.md', 'cf7a396231a50a18c37a9c52ddc7c7315c07cf4107b6dea524760eaa630f3659', 'decisionPrecedence', 'terminologyConsistency', 'Call this first, before answering any question about this page or loading Explain Him skills', 'pinned grounding source index', 'visible page is insufficient', 'Keep Personalized UI Consistent', 'same turn whenever that answer reveals missing, partial, or inconsistent visible Personalized UI', 'Activation handshake is stale', 'topicId', 'presentationDecision', 'alwaysProvideChatAnswer: true', 'honest-acknowledgement-no-false-success', 'focusOnlyChangesRevision: false']:
        if expected not in webmcp:
            errors.append(f'runtime/webmcp.mjs: missing Protocol v3 invariant {expected!r}')
    for name in OBSOLETE_PUBLIC_TOOLS:
        if re.search(rf"(?:readOnlyTool|mutationTool)\(\s*['\"]{re.escape(name)}['\"]", webmcp):
            errors.append(f'runtime/webmcp.mjs: obsolete/overlapping public tool {name}')
    for name in FORBIDDEN_TOOL_NAMES:
        if re.search(rf"(?:readOnlyTool|mutationTool)\(\s*['\"]{re.escape(name)}['\"]", webmcp):
            errors.append(f'runtime/webmcp.mjs: forbidden registered tool {name}')

    app = (ROOT / 'assets/app.mjs').read_text(encoding='utf-8')
    for expected in ['environment: globalThis', 'onLifecycle: publishLifecycle', 'webmcp-status-hero', 'webmcpVerifiedTools', 'webmcpProtocol', 'webmcpPageState', 'webmcpAgentState', 'webmcpContractState', 'webmcpWorkspaceRevision', 'contract-invoked', 'apply-started', 'apply-succeeded', 'apply-failed', 'Page WebMCP API –', 'Agent connection – observed', 'Personalized UI updated – workspace revision', 'Personalized UI update failed – workspace revision']:
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

