from __future__ import annotations

"""Classify Explain Him WebMCP evidence without conflating page and agent hosts."""

import argparse
import json
from pathlib import Path
from typing import Any, Mapping


EXPECTED_TOOLS = {"get_explain_him_answer", "apply_explanation"}


def _result(status: str, code: str, phase: str) -> dict[str, str]:
    return {"status": status, "code": code, "phase": phase}


def classify_preflight(evidence: Mapping[str, Any]) -> dict[str, str]:
    """Return a fail-closed host classification from non-secret observable evidence."""

    if evidence.get("page_api_available") is not True:
        return _result("BLOCKED_EXTERNAL", "PAGE_API_UNAVAILABLE", "page-api")

    registered = evidence.get("registered_tools")
    if not isinstance(registered, list) or set(registered) != EXPECTED_TOOLS:
        return _result("FAILED", "PAGE_TOOLS_NOT_REGISTERED", "page-registration")

    user_turn_observed = evidence.get("user_turn_observed") is True
    connection = evidence.get("agent_connection_observed")
    if not user_turn_observed or connection is None:
        return _result("NOT_TESTED", "AGENT_HOST_NOT_TESTED", "agent-host")
    if connection is not True:
        return _result("BLOCKED_EXTERNAL", "AGENT_HOST_WEBMCP_UNAVAILABLE", "agent-host")

    contract_invoked = evidence.get("contract_invoked") is True
    if not contract_invoked:
        if evidence.get("agent_claimed_success") is True:
            return _result("FAILED", "FALSE_SUCCESS", "agent-response")
        return _result("FAILED", "CONTRACT_NOT_INVOKED", "agent-tool-choice")

    if evidence.get("mutation_required") is not True:
        return _result("PASS", "CONTRACT_BEFORE_GROUNDED_ANSWER", "agent-contract")

    apply_succeeded = evidence.get("apply_succeeded") is True
    if evidence.get("apply_failed") is True:
        if evidence.get("agent_claimed_success") is True:
            return _result("FAILED", "FALSE_SUCCESS", "agent-response")
        return _result("FAILED", "APPLY_REJECTED", "page-apply")
    if not apply_succeeded:
        if evidence.get("agent_claimed_success") is True:
            return _result("FAILED", "FALSE_SUCCESS", "agent-response")
        return _result("FAILED", "REQUIRED_APPLY_NOT_INVOKED", "agent-tool-choice")

    before = evidence.get("workspace_revision_before")
    after = evidence.get("workspace_revision_after")
    if not isinstance(before, int) or isinstance(before, bool) or not isinstance(after, int) or isinstance(after, bool) or after <= before:
        return _result("FAILED", "UI_CONFIRMATION_MISMATCH", "page-confirmation")
    return _result("PASS", "GROUNDED_UI_ADAPTATION_CONFIRMED", "page-confirmation")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("evidence", type=Path, help="JSON evidence file without prompts, tokens, nonces, or credentials")
    args = parser.parse_args()
    try:
        evidence = json.loads(args.evidence.read_text(encoding="utf-8"))
        if not isinstance(evidence, dict):
            raise ValueError("evidence must be a JSON object")
        result = classify_preflight(evidence)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        result = _result("FAILED", "INVALID_EVIDENCE", "input")
        result["error_type"] = type(error).__name__
    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "PASS" else 2 if result["status"] in {"NOT_TESTED", "BLOCKED_EXTERNAL"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
