from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
from urllib.error import URLError
from urllib.request import Request


SPEC = importlib.util.spec_from_file_location("live_pages", Path(__file__).with_name("check_live_pages.py"))
assert SPEC and SPEC.loader
live_pages = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = live_pages
SPEC.loader.exec_module(live_pages)


BASE = "https://example.github.io/explain-him/"
PROJECT_ROOT = Path(__file__).resolve().parents[1]
CANONICAL_PAGE = PROJECT_ROOT / 'demo' / 'index.html'
if not CANONICAL_PAGE.is_file():
    CANONICAL_PAGE = PROJECT_ROOT / 'index.html'
CANONICAL_TRIAL_META = __import__('re').search(r'<meta http-equiv="origin-trial" content="[^"]+">', CANONICAL_PAGE.read_text(encoding='utf-8')).group(0)
CANONICAL_TRIAL_TOKEN = CANONICAL_TRIAL_META.split('content="', 1)[1].removesuffix('">')


class LivePagesSmokeTest(unittest.TestCase):
    def materialize(self, root: Path, extra_root: str = '') -> None:
        content = {
            'index.html': f'<head>{CANONICAL_TRIAL_META}</head><meta name="explain-him-repository" content="andrew-veresov/explain-him"><meta name="explain-him-skill" content="skills/explain-him/SKILL.md"><meta name="explain-him-presentation-skill" content="skills/explain-him-presentation/SKILL.md"><section data-eh-block-id="workflow-diagram"></section><script src="assets/app.mjs"></script>' + extra_root,
            'assets/app.mjs': "import '../runtime/workspace.mjs'; registerWebMcpTools();",
            'assets/styles.css': 'body { color: #111; }',
            'runtime/workspace.mjs': 'explain-him-local-workspace.v3',
            'runtime/webmcp.mjs': "explain-him-webmcp-contract.v2 get_explanation_contract apply_explanation andrew-veresov/explain-him skills/explain-him/SKILL.md skills/explain-him-presentation/SKILL.md name: 'get_explanation_contract' name: 'apply_explanation' workflow-diagram",
            'explain-him.yaml': 'repository: andrew-veresov/explain-him\nentrypoint: skills/explain-him/SKILL.md\nentrypoint: skills/explain-him-presentation/SKILL.md\nstate_model: transactional-typed-presentation-operation-log\n- get_explanation_contract\n- apply_explanation\n',
            'schemas/explanation-block.v1.schema.json': '{}',
            'resolutions/2026-08-30-user-consumer-terminology.md': 'Status: accepted\n`User` and `Consumer` refer to the same participant\n`User` is the preferred term\n',
            'skills/explain-him/SKILL.md': '---\nname: explain-him\n---\n',
            'skills/explain-him-presentation/SKILL.md': '---\nname: explain-him-presentation\n---\n',
        }
        for relative, text in content.items():
            path = root / relative; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(text, encoding='utf-8')
    def test_safe_url_rejects_cross_origin_and_base_escape(self) -> None:
        self.assertEqual(live_pages.safe_url(BASE, "assets/app.mjs"), BASE + "assets/app.mjs")
        with self.assertRaises(ValueError): live_pages.safe_url(BASE, "https://evil.example/app.mjs")
        with self.assertRaises(ValueError): live_pages.safe_url(BASE, "/other/index.html")
        with self.assertRaises(ValueError): live_pages.safe_url(BASE, "../SKILL.md")

    def test_malformed_base_fails_before_any_network_request(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, patch.object(live_pages, 'fetch') as mocked:
            with self.assertRaises(ValueError):
                live_pages.smoke(Path(temporary), 'https://example.github.io/../explain-him/', 'a' * 40, 'owner/repo', '', 1, 1, False)
            mocked.assert_not_called()

    def test_foreign_or_out_of_base_redirect_is_rejected(self) -> None:
        redirect = live_pages.SafeRedirect(BASE)
        for target in ('https://evil.example/explain-him/', 'https://example.github.io/other/'):
            with self.assertRaises(ValueError):
                redirect.redirect_request(Request(BASE), None, 302, 'Found', {}, target)

    def test_graph_extracts_html_and_static_imports(self) -> None:
        self.assertEqual(live_pages.graph_links(BASE, "text/html", b'<script src="assets/app.mjs"></script><link rel="stylesheet" href="assets/styles.css"><a href="README.md">ignored</a><img src="logo.svg">'), ["assets/app.mjs", "assets/styles.css"])
        self.assertEqual(live_pages.graph_links(BASE + "assets/app.mjs", "text/javascript", b"import '../runtime/workspace.mjs'; import { x } from './local.mjs'; import('./lazy.mjs');"), ["../runtime/workspace.mjs", "./local.mjs", "./lazy.mjs"])

    def test_smoke_reports_missing_raw_skill_html_and_hash_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.materialize(root)
            original_fetch = live_pages.fetch
            try:
                def fake_fetch(url: str, base: str, timeout: float, retries: int, cache_bust: str):
                    if url.endswith('SKILL.html'):
                        return live_pages.FetchResult(url, 200, url, b'converted', 'text/html')
                    body = b'wrong' if url.endswith('assets/app.mjs') else (root / live_pages.local_path(root, base, url).relative_to(root)).read_bytes()
                    return live_pages.FetchResult(url, 200, url, body, 'text/html' if url.endswith('index.html') else 'text/plain')
                live_pages.fetch = fake_fetch
                report = live_pages.smoke(root, BASE, 'a' * 40, 'owner/repo', '', 1, 1, False)
            finally:
                live_pages.fetch = original_fetch
            self.assertFalse(report['ok'])
            self.assertTrue(any('SHA-256 mismatch' in error for error in report['errors']))
            self.assertEqual(sum('expected strict direct HTTP 404' in error for error in report['errors']), 2)

    def test_smoke_rejects_graph_resource_404(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.materialize(root, '<script src="missing.mjs"></script>')
            with patch.object(live_pages, 'fetch') as mocked:
                def fake_fetch(url: str, *args: object):
                    if url.endswith('SKILL.html') or url.endswith('missing.mjs'):
                        return live_pages.FetchResult(url, 404, url, b'', 'text/plain')
                    return live_pages.FetchResult(url, 200, url, live_pages.local_path(root, BASE, url).read_bytes(), 'text/html' if url.endswith('index.html') else 'text/plain')
                mocked.side_effect = fake_fetch
                report = live_pages.smoke(root, BASE, 'a' * 40, 'owner/repo', '', 1, 1, False)
            self.assertFalse(report['ok'])
            self.assertTrue(any('missing.mjs: expected HTTP 200, got 404' in error for error in report['errors']))

    def test_smoke_accepts_matching_same_origin_static_facade(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.materialize(root)
            original_fetch = live_pages.fetch
            try:
                def fake_fetch(url: str, base: str, timeout: float, retries: int, cache_bust: str):
                    if url.endswith('SKILL.html'):
                        return live_pages.FetchResult(url, 404, url, b'', 'text/plain')
                    body = live_pages.local_path(root, base, url).read_bytes()
                    return live_pages.FetchResult(url, 200, url, body, 'text/html' if url.endswith('index.html') else 'text/javascript')
                live_pages.fetch = fake_fetch
                report = live_pages.smoke(root, BASE, 'b' * 40, 'owner/repo', '', 1, 1, False)
            finally:
                live_pages.fetch = original_fetch
            self.assertTrue(report['ok'], report['errors'])

    def test_stale_first_snapshot_retries_full_graph_with_unique_cache_busts(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); self.materialize(root); calls: list[tuple[str, str]] = []
            with patch.object(live_pages, 'fetch') as mocked, patch.object(live_pages.time, 'sleep'):
                def fake_fetch(url: str, base: str, timeout: float, retries: int, cache_bust: str):
                    calls.append((url, cache_bust))
                    if url.endswith('SKILL.html'): return live_pages.FetchResult(url, 404, url, b'', 'text/plain')
                    body = b'stale' if '-attempt-1-' in cache_bust else live_pages.local_path(root, base, url).read_bytes()
                    return live_pages.FetchResult(url, 200, url, body, 'text/html' if url == BASE else 'text/javascript')
                mocked.side_effect = fake_fetch
                report = live_pages.smoke(root, BASE, 'a' * 40, 'owner/repo', '', 1, 2, False)
            self.assertTrue(report['ok'], report['errors']); self.assertEqual(report['attempt_count'], 2)
            self.assertEqual(len({cache_bust for _, cache_bust in calls}), len(calls))
            self.assertGreaterEqual(sum('-attempt-1-' in item for _, item in calls), len(live_pages.REQUIRED) + len(live_pages.SKILLS))
            self.assertGreaterEqual(sum('-attempt-2-' in item for _, item in calls), len(live_pages.REQUIRED) + len(live_pages.SKILLS))

    def test_skill_html_404_redirect_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); self.materialize(root)
            with patch.object(live_pages, 'fetch') as mocked:
                def fake_fetch(url: str, base: str, timeout: float, retries: int, cache_bust: str):
                    if url.endswith('SKILL.html'): return live_pages.FetchResult(url, 404, BASE + 'index.html', b'', 'text/plain')
                    return live_pages.FetchResult(url, 200, url, live_pages.local_path(root, base, url).read_bytes(), 'text/html' if url == BASE else 'text/javascript')
                mocked.side_effect = fake_fetch
                report = live_pages.smoke(root, BASE, 'a' * 40, 'owner/repo', '', 1, 1, False)
            self.assertFalse(report['ok']); self.assertTrue(any('strict direct HTTP 404' in error for error in report['errors']))

    def test_reports_are_json_and_markdown_without_credentials(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            secret = 'secret-token'
            report = {'ok': True, 'expected_sha': 'b' * 40, 'resources': {}, 'provenance': None, 'errors': ["Authorization: Bearer secret-token body='secret-body' body=other-secret"]}
            live_pages.write_reports(report, root / 'report.json', root / 'report.md', secret)
            self.assertIn('"ok": true', (root / 'report.json').read_text(encoding='utf-8'))
            written = (root / 'report.json').read_text(encoding='utf-8') + (root / 'report.md').read_text(encoding='utf-8')
            self.assertNotIn(secret, written); self.assertNotIn('secret-body', written); self.assertNotIn('other-secret', written); self.assertNotIn('Authorization:', written)

    def test_snapshot_records_sanitized_origin_trial_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); self.materialize(root)
            with patch.object(live_pages, 'fetch') as mocked:
                def fake_fetch(url: str, *args: object):
                    if url.endswith('SKILL.html'): return live_pages.FetchResult(url, 404, url, b'', 'text/plain')
                    body = live_pages.local_path(root, BASE, url).read_bytes()
                    return live_pages.FetchResult(url, 200, url, body, 'text/html' if url == BASE else 'text/javascript')
                mocked.side_effect = fake_fetch
                report = live_pages.smoke(root, BASE, 'a' * 40, 'owner/repo', '', 1, 1, False)
            self.assertTrue(report['ok'], report['errors'])
            self.assertEqual(report['origin_trial']['status'], 'valid')
            serialized = json.dumps(live_pages.redact(report, ''), ensure_ascii=False)
            self.assertNotIn(CANONICAL_TRIAL_TOKEN, serialized)
            self.assertNotIn('"body"', serialized)

    def test_snapshot_origin_trial_error_is_sanitized(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); self.materialize(root)
            index = root / 'index.html'; index.write_text(index.read_text(encoding='utf-8').replace('http-equiv="origin-trial"', 'http-equiv="not-origin-trial"'), encoding='utf-8')
            with patch.object(live_pages, 'fetch') as mocked:
                def fake_fetch(url: str, *args: object):
                    if url.endswith('SKILL.html'): return live_pages.FetchResult(url, 404, url, b'', 'text/plain')
                    body = live_pages.local_path(root, BASE, url).read_bytes()
                    return live_pages.FetchResult(url, 200, url, body, 'text/html' if url == BASE else 'text/javascript')
                mocked.side_effect = fake_fetch
                report = live_pages.smoke(root, BASE, 'a' * 40, 'owner/repo', '', 1, 1, False)
            self.assertFalse(report['ok'])
            self.assertEqual(report['origin_trial']['status'], 'invalid')
            self.assertNotIn(CANONICAL_TRIAL_TOKEN, json.dumps(report, ensure_ascii=False))

    def test_retry_uses_cache_bust_for_every_attempt(self) -> None:
        attempts: list[str] = []
        class Response:
            status = 200
            headers = {'Content-Type': 'text/plain'}
            def __enter__(self): return self
            def __exit__(self, *args: object): return False
            def geturl(self): return BASE + 'assets/app.mjs'
            def read(self): return b'ok'
        class Opener:
            def open(self, request, timeout: float):
                attempts.append(request.full_url)
                if len(attempts) < 3: raise URLError('temporary')
                return Response()
        with patch.object(live_pages, 'build_opener', return_value=Opener()), patch.object(live_pages.time, 'sleep'):
            result = live_pages.fetch(BASE + 'assets/app.mjs', BASE, 1, 3, 'snapshot-sha')
        self.assertEqual(result.status, 200); self.assertEqual(len(attempts), 3)
        self.assertTrue(all('live-smoke=snapshot-sha' in item for item in attempts))

    def test_provenance_requires_latest_success_and_exact_base(self) -> None:
        deployment = {'id': 9, 'sha': 'a' * 40, 'environment': 'github-pages', 'created_at': '2026-08-31T10:00:00Z', 'statuses_url': 'https://api.github.com/repos/owner/repo/deployments/9/statuses'}
        with patch.object(live_pages, 'api_json', side_effect=[[deployment], [{'state': 'success', 'created_at': '2026-08-31T10:00:00Z', 'environment_url': BASE}, {'state': 'inactive', 'created_at': '2026-08-31T11:00:00Z', 'environment_url': BASE}]]):
            with self.assertRaisesRegex(RuntimeError, 'latest'):
                live_pages.deployment_provenance('owner/repo', 'a' * 40, BASE, '', 1)
        with patch.object(live_pages, 'api_json', return_value=[{**deployment, 'sha': 'b' * 40}]):
            with self.assertRaisesRegex(RuntimeError, 'expected SHA'):
                live_pages.deployment_provenance('owner/repo', 'a' * 40, BASE, '', 1)
        with patch.object(live_pages, 'api_json', side_effect=[[deployment], [{'state': 'success', 'created_at': '2026-08-31T11:00:00Z', 'environment_url': 'https://example.github.io/other/'}]]):
            with self.assertRaisesRegex(RuntimeError, 'exactly'):
                live_pages.deployment_provenance('owner/repo', 'a' * 40, BASE, '', 1)

    def test_main_writes_failure_report_after_exhausted_retries(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, patch.object(live_pages, 'fetch', side_effect=RuntimeError('exhausted retry')):
            root = Path(temporary); json_path = root / 'report.json'; markdown_path = root / 'report.md'
            result = live_pages.main(['--expected-sha', 'a' * 40, '--local-root', str(root), '--report', str(json_path), '--markdown-report', str(markdown_path), '--skip-deployment-provenance'])
            self.assertEqual(result, 1); self.assertIn('exhausted retry', json_path.read_text(encoding='utf-8')); self.assertIn('FAIL', markdown_path.read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
