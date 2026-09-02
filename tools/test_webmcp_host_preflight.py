from __future__ import annotations

import unittest

from tools.webmcp_host_preflight import classify_preflight


BASE = {
    "page_api_available": True,
    "registered_tools": ["get_explain_him_context", "explain_tool"],
    "user_turn_observed": True,
    "agent_connection_observed": True,
    "context_invoked": True,
    "explain_required": True,
    "explain_succeeded": True,
    "changed_expected": True,
    "focused_visible": True,
    "workspace_revision_before": 0,
    "workspace_revision_after": 1,
    "agent_claimed_success": True,
}


class HostPreflightTest(unittest.TestCase):
    def test_complete_required_adaptation_passes(self) -> None:
        self.assertEqual(classify_preflight(BASE)["code"], "GROUNDED_UI_ADAPTATION_CONFIRMED")

    def test_page_api_and_registration_are_separate_gates(self) -> None:
        self.assertEqual(classify_preflight({**BASE, "page_api_available": False})["code"], "PAGE_API_UNAVAILABLE")
        self.assertEqual(classify_preflight({**BASE, "registered_tools": ["get_explain_him_context"]})["code"], "PAGE_TOOLS_NOT_REGISTERED")

    def test_absent_agent_capability_is_blocked_external(self) -> None:
        result = classify_preflight({**BASE, "agent_connection_observed": False, "context_invoked": False, "explain_succeeded": False})
        self.assertEqual(result, {"status": "BLOCKED_EXTERNAL", "code": "AGENT_HOST_WEBMCP_UNAVAILABLE", "phase": "agent-host"})

    def test_page_runtime_only_does_not_claim_agent_acceptance(self) -> None:
        result = classify_preflight({**BASE, "user_turn_observed": False, "agent_connection_observed": None})
        self.assertEqual(result["status"], "NOT_TESTED")
        self.assertEqual(result["code"], "AGENT_HOST_NOT_TESTED")

    def test_missing_context_or_required_explain_fails(self) -> None:
        self.assertEqual(classify_preflight({**BASE, "context_invoked": False, "agent_claimed_success": False})["code"], "CONTEXT_NOT_INVOKED")
        self.assertEqual(classify_preflight({**BASE, "explain_succeeded": False, "agent_claimed_success": False})["code"], "REQUIRED_EXPLAIN_NOT_INVOKED")

    def test_false_success_and_failed_apply_are_distinct(self) -> None:
        self.assertEqual(classify_preflight({**BASE, "explain_succeeded": False})["code"], "FALSE_SUCCESS")
        failed = {**BASE, "explain_succeeded": False, "explain_failed": True, "agent_claimed_success": False}
        self.assertEqual(classify_preflight(failed)["code"], "EXPLAIN_REJECTED")

    def test_revision_confirmation_is_required(self) -> None:
        self.assertEqual(classify_preflight({**BASE, "workspace_revision_after": 0})["code"], "UI_CONFIRMATION_MISMATCH")

    def test_explicit_opt_out_still_requires_context(self) -> None:
        result = classify_preflight({**BASE, "explain_required": False, "explain_succeeded": False, "agent_claimed_success": False})
        self.assertEqual(result["code"], "EXPLICIT_PAGE_OPT_OUT_HONORED")

    def test_existing_explanation_requires_focus_without_revision_change(self) -> None:
        result = classify_preflight({**BASE, "changed_expected": False, "workspace_revision_after": 0})
        self.assertEqual(result["code"], "EXISTING_EXPLANATION_FOCUSED")
        self.assertEqual(classify_preflight({**BASE, "changed_expected": False})["code"], "EXISTING_REVISION_MISMATCH")

    def test_visible_focus_confirmation_is_required(self) -> None:
        self.assertEqual(classify_preflight({**BASE, "focused_visible": False})["code"], "FOCUS_CONFIRMATION_MISMATCH")


if __name__ == "__main__":
    unittest.main()
