from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import importlib.util
import unittest


MODULE_PATH = Path(__file__).with_name("generate_native_skill.py")
SPEC = importlib.util.spec_from_file_location("generate_native_skill", MODULE_PATH)
assert SPEC and SPEC.loader
GENERATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GENERATOR)


class GeneratedNativeSkillTest(unittest.TestCase):
    def test_checked_in_payload_is_deterministic_and_current(self) -> None:
        first = GENERATOR.generated_text()
        second = GENERATOR.generated_text()
        self.assertEqual(first, second)
        self.assertTrue(GENERATOR.is_current())
        payload, digest = GENERATOR.build_payload()
        self.assertEqual(digest, "ba4276347eb79dbde1566d71c1a68027094716a33d69b51d6d26951ac9cadb9c")
        self.assertEqual(payload["tools"], ["explain_tool"])
        self.assertEqual(payload["context"]["protocolVersion"], 5)
        self.assertIn("GitHub repository linked to this page", payload["context"]["answerPolicy"]["additionalInformation"])
        self.assertEqual(payload["context"]["provenance"]["compositeSha256"], digest)

    def test_drift_fails_closed(self) -> None:
        with TemporaryDirectory() as directory:
            stale = Path(directory) / "explain-him-native-skill.mjs"
            stale.write_text("// stale\n", encoding="utf-8")
            self.assertFalse(GENERATOR.is_current(stale))


if __name__ == "__main__":
    unittest.main()
