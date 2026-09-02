from __future__ import annotations

import importlib.util
import contextlib
import base64
import io
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
PAGE_ROOT = ROOT / "demo" if (ROOT / "demo" / "index.html").is_file() else ROOT
SPEC = importlib.util.spec_from_file_location("origin_trial", Path(__file__).with_name("check_webmcp_origin_trial.py"))
assert SPEC and SPEC.loader
origin_trial = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = origin_trial
SPEC.loader.exec_module(origin_trial)
ORIGIN_TRIAL_META_RE = re.compile(r'<meta\s+http-equiv="origin-trial"\s+content="([^"]+)"\s*/?>')


def origin_trial_meta(html: str) -> re.Match[str]:
    match = ORIGIN_TRIAL_META_RE.search(html)
    if match is None:
        raise AssertionError('origin-trial meta is missing')
    return match


class OriginTrialCheckTest(unittest.TestCase):
    def token(self, payload: dict[str, object], version: int = 2, declared_length: int | None = None, payload_bytes: bytes | None = None) -> str:
        encoded_payload = payload_bytes if payload_bytes is not None else json.dumps(payload, separators=(",", ":")).encode("utf-8")
        length = len(encoded_payload) if declared_length is None else declared_length
        raw = bytes((version,)) + (b"\x00" * 64) + length.to_bytes(4, byteorder="big") + encoded_payload
        return base64.b64encode(raw).decode("ascii")

    def payload(self, **overrides: object) -> dict[str, object]:
        value: dict[str, object] = {
            "origin": origin_trial.EXPECTED.origin,
            "feature": origin_trial.EXPECTED.feature,
            "expiry": origin_trial.EXPECTED.expiry,
            "isSubdomain": True,
        }
        value.update(overrides)
        return value

    def assert_token_error(self, subject: str, message: str) -> None:
        with self.assertRaisesRegex(ValueError, message) as raised:
            origin_trial.decode_claims(subject, expected_sha256=None)
        self.assertNotIn(subject, str(raised.exception))

    def test_private_and_public_html_are_exact_valid_mappings(self) -> None:
        private_html = (PAGE_ROOT / "index.html").read_text(encoding="utf-8")
        public_path = ROOT.parent / "public" / "index.html" if PAGE_ROOT != ROOT else PAGE_ROOT / "index.html"
        if not public_path.is_file():
            self.skipTest("paired public facade is not checked out")
        public_html = public_path.read_text(encoding="utf-8")
        origin_trial.validate_html(private_html, 0)
        origin_trial.validate_html(public_html, 0)
        self.assertEqual(private_html, public_html)

    def test_pinned_token_uses_the_exact_supported_binary_layout(self) -> None:
        html = (PAGE_ROOT / "index.html").read_text(encoding="utf-8")
        token = origin_trial_meta(html).group(1)
        payload, version = origin_trial.decode_claims(token)
        self.assertEqual(version, 2)
        self.assertEqual(payload["feature"], "WebMCP")

    def test_trial_after_api_script_fails_without_echoing_content(self) -> None:
        html = (PAGE_ROOT / "index.html").read_text(encoding="utf-8")
        meta_start = origin_trial_meta(html).start()
        moved = html[:meta_start] + '<script src="assets/app.mjs"></script>' + html[meta_start:]
        with self.assertRaisesRegex(ValueError, "precede") as raised:
            origin_trial.validate_html(moved, 0)
        self.assertNotIn("content=", str(raised.exception))

    def test_expiry_fail_window_is_strict(self) -> None:
        html = (PAGE_ROOT / "index.html").read_text(encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "14-day"):
            origin_trial.validate_html(html, origin_trial.EXPECTED.expiry - origin_trial.EXPIRY_FAIL_WINDOW_SECONDS)

    def test_decoder_rejects_invalid_base64_version_length_and_json_without_echoing_token(self) -> None:
        self.assert_token_error("not valid base64!", "strict base64")
        self.assert_token_error(self.token(self.payload(), version=1), "binary version")
        self.assert_token_error(self.token(self.payload(), declared_length=1), "payload length")
        self.assert_token_error(self.token(self.payload(), payload_bytes=b"not-json"), "expected payload")

    def test_claim_validation_exercises_feature_origin_expiry_and_third_party(self) -> None:
        now = 0
        for payload, message in [
            (self.payload(feature="Other"), "feature"),
            (self.payload(origin="https://example.invalid:443"), "origin"),
            (self.payload(expiry=origin_trial.EXPECTED.expiry - 1), "expiry"),
            (self.payload(isThirdParty=True), "third-party"),
        ]:
            with self.subTest(message=message), self.assertRaisesRegex(ValueError, message):
                origin_trial.validate_claims(payload, now)
        with self.assertRaisesRegex(ValueError, "14-day"):
            origin_trial.validate_claims(self.payload(), origin_trial.EXPECTED.expiry - origin_trial.EXPIRY_FAIL_WINDOW_SECONDS)
        self.assertEqual(origin_trial.validate_claims(self.payload(isThirdParty=False), 0)["third_party"], False)

    def test_one_character_token_corruption_is_caught_by_fingerprint_without_echoing_token(self) -> None:
        html = (PAGE_ROOT / "index.html").read_text(encoding="utf-8")
        token = origin_trial_meta(html).group(1)
        replacement = "B" if token[0] != "B" else "C"
        corrupted = replacement + token[1:]
        with self.assertRaisesRegex(ValueError, "SHA-256") as raised:
            origin_trial.decode_claims(corrupted)
        self.assertNotIn(corrupted, str(raised.exception))

    def test_native_chrome_gate_uses_imperative_execute_tool_not_descriptor_execute(self) -> None:
        native_gate = (ROOT / "tools" / "test_native_chrome_webmcp_live.py").read_text(encoding="utf-8")
        self.assertIn("document.modelContext.executeTool", native_gate)
        self.assertIn("JSON.stringify(args)", native_gate)
        self.assertIn("getTools()", native_gate)
        self.assertIn("const normalizeResult", native_gate)
        normalizer = native_gate.split("const normalizeResult", 1)[1].split("const requireArray", 1)[0]
        self.assertEqual(normalizer.count("JSON.parse(raw)"), 1)
        self.assertIn("returned malformed JSON", native_gate)
        self.assertIn("double-encoded result", native_gate)
        self.assertIn("descriptor is missing", native_gate)
        self.assertIn("context does not expose mutable workflow-diagram", native_gate)
        self.assertIn("replace did not advance revision and focus its visible result", native_gate)
        self.assertIn("update result does not preserve the local block ID", native_gate)
        self.assertIn("remove result did not empty the local block list", native_gate)
        self.assertIn("explain-him-webmcp-context.v4", native_gate)
        self.assertIn("context.additionalInformation", native_gate)
        self.assertIn("terminology:user-consumer", native_gate)
        self.assertIn("activationId: context.activationId", native_gate)
        self.assertNotIn("skillDeliveryProof", native_gate)
        self.assertIn("wait_for_function", native_gate)
        self.assertIn("['verified', 'ready', 'partial', 'unavailable', 'error']", native_gate)
        self.assertIn("WebMCP registration was not complete", native_gate)
        self.assertNotIn(".execute(", native_gate)

    def test_main_never_copies_token_into_failure_text(self) -> None:
        html = (PAGE_ROOT / "index.html").read_text(encoding="utf-8")
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "index.html"
            path.write_text(ORIGIN_TRIAL_META_RE.sub(lambda match: match.group(0).replace('origin-trial', 'other-trial'), html, count=1), encoding="utf-8")
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                result = origin_trial.main(["--html", str(path), "--now", "0"])
        self.assertEqual(result, 1)
        self.assertNotIn('AmZTHpY', output.getvalue())


if __name__ == "__main__":
    unittest.main()
