from __future__ import annotations

import unittest

from tools.webmcp_host_preflight import classify_preflight


BASE = {
    "page_api_available": True,
    "registered_tools": ["get_explain_him_answer", "apply_explanation"],
    "user_turn_observed": True,
    "agent_connection_observed": True,
    "contract_invoked": True,
    "mutation_required": True,
    "apply_succeeded": True,
    "workspace_revision_before": 0,
    "workspace_revision_after": 1,
    "agent_claimed_success": True,
}


class HostPreflightTest(unittest.TestCase):
    def test_complete_required_adaptation_passes(self) -> None:
        self.assertEqual(classify_preflight(BASE)["code"], "GROUNDED_UI_ADAPTATION_CONFIRMED")

    def test_page_api_and_registration_are_separate_gates(self) -> None:
        self.assertEqual(classify_preflight({**BASE, "page_api_available": False})["code"], "PAGE_API_UNAVAILABLE")
        self.assertEqual(classify_preflight({**BASE, "registered_tools": ["get_explain_him_answer"]})["code"], "PAGE_TOOLS_NOT_REGISTERED")

    def test_absent_agent_capability_is_blocked_external(self) -> None:
        result = classify_preflight({**BASE, "agent_connection_observed": False, "contract_invoked": False, "apply_succeeded": False})
        self.assertEqual(result, {"status": "BLOCKED_EXTERNAL", "code": "AGENT_HOST_WEBMCP_UNAVAILABLE", "phase": "agent-host"})

    def test_page_runtime_only_does_not_claim_agent_acceptance(self) -> None:
        result = classify_preflight({**BASE, "user_turn_observed": False, "agent_connection_observed": None})
        self.assertEqual(result["status"], "NOT_TESTED")
        self.assertEqual(result["code"], "AGENT_HOST_NOT_TESTED")

    def test_missing_contract_or_required_apply_fails(self) -> None:
        self.assertEqual(classify_preflight({**BASE, "contract_invoked": False, "agent_claimed_success": False})["code"], "CONTRACT_NOT_INVOKED")
        self.assertEqual(classify_preflight({**BASE, "apply_succeeded": False, "agent_claimed_success": False})["code"], "REQUIRED_APPLY_NOT_INVOKED")

    def test_false_success_and_failed_apply_are_distinct(self) -> None:
        self.assertEqual(classify_preflight({**BASE, "apply_succeeded": False})["code"], "FALSE_SUCCESS")
        failed = {**BASE, "apply_succeeded": False, "apply_failed": True, "agent_claimed_success": False}
        self.assertEqual(classify_preflight(failed)["code"], "APPLY_REJECTED")

    def test_revision_confirmation_is_required(self) -> None:
        self.assertEqual(classify_preflight({**BASE, "workspace_revision_after": 0})["code"], "UI_CONFIRMATION_MISMATCH")

    def test_chat_only_turn_still_requires_contract(self) -> None:
        result = classify_preflight({**BASE, "mutation_required": False, "apply_succeeded": False, "agent_claimed_success": False})
        self.assertEqual(result["code"], "CONTRACT_BEFORE_GROUNDED_ANSWER")


if __name__ == "__main__":
    unittest.main()
