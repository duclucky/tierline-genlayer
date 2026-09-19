from __future__ import annotations

import json
import sys
from datetime import datetime, timezone

GEN = 10**18
BUDGET = 2 * GEN
BASE_TIME = 1893456000
RAT_DEADLINE = BASE_TIME + 3600
REVIEW_DEADLINE = BASE_TIME + 7200
SOURCE_VERSION = "EC-AI-RISK-2026-08-03"
EC_URL_PATTERN = r".*digital-strategy\.ec\.europa\.eu/en/policies/regulatory-framework-ai.*"
LLM_PATTERN = r"(?s).*co-ratified AI use profile.*"
CONTRACT_PATH = "contracts/tierline.py"

SPONSOR_PROFILE = {
    "system_name": "ApplicantRank Hiring Assistant",
    "purpose": "Rank job applicants for entry-level engineering roles from resumes.",
    "affected_people": "Job applicants aged 18-67 in the European Union.",
    "decision_role": "The tool ranks candidates; a human recruiter makes the final hiring decision.",
}


def view(value) -> dict:
    if isinstance(value, str):
        return json.loads(value)
    return json.loads(str(value))


def raw_text(value) -> str:
    if isinstance(value, bytes):
        return value.decode("utf-8")
    if isinstance(value, str):
        text = value
        if len(text) >= 2 and text[0] == '"' and text[-1] == '"':
            text = json.loads(text)
        return text
    return str(value)


def set_time(vm, timestamp: int) -> None:
    text = datetime.fromtimestamp(timestamp, timezone.utc).isoformat().replace("+00:00", "Z")
    vm.warp(text)
    gl_module = sys.modules.get("genlayer.gl")
    if gl_module is not None and getattr(gl_module, "message_raw", None) is not None:
        gl_module.message_raw["datetime"] = text


def ec_page() -> str:
    return (
        "AI Act | Shaping Europe's digital future. European AI Act - Regulatory "
        "framework overview. Page id: regulatory-framework-ai. "
        "The AI Act follows a risk-based approach with four categories. "
        "Unacceptable risk: AI practices that are banned, including manipulation, social "
        "scoring, and real-time biometric identification by law enforcement. "
        "High risk: AI systems in critical infrastructure, education, employment, essential "
        "services, law enforcement, migration, justice and democracy. "
        "Transparency risk: AI systems that interact with people must disclose the AI "
        "interaction, label synthetic content and deepfakes. "
        "Minimal or no risk: most AI systems such as spam filters fall here. "
        "Last update 3 August 2026"
    )


def mock_source(vm, body: str | None = None, status: int = 200) -> None:
    if status == 200 and body is None:
        body = ec_page()
    vm.mock_web(EC_URL_PATTERN, {"method": "GET", "status": status, "body": body or ""})


def mock_verdict(
    vm,
    tier: str,
    codes=None,
    aid: str = "A-1",
    tid: str = "A-1-T-1",
    reason: str = "The guide supports this classification for the profile.",
) -> None:
    vm.mock_llm(
        LLM_PATTERN,
        json.dumps(
            {
                "assessment_id": aid,
                "attempt_id": tid,
                "source_version": SOURCE_VERSION,
                "source_coverage": "FULL",
                "tier": tier,
                "basis_codes": codes or [],
                "reason": reason,
            }
        ),
    )


def create_assessment(
    contract,
    vm,
    sponsor,
    operator,
    steward,
    aid: str = "A-1",
    ratification_deadline: int = RAT_DEADLINE,
    review_deadline: int = REVIEW_DEADLINE,
    profile: dict | None = None,
) -> None:
    profile = profile or SPONSOR_PROFILE
    set_time(vm, BASE_TIME)
    vm.sender = sponsor
    vm.value = BUDGET
    contract.create_assessment(
        operator,
        steward,
        profile["system_name"],
        profile["purpose"],
        profile["affected_people"],
        profile["decision_role"],
        ratification_deadline,
        review_deadline,
    )
    vm.value = 0


def ratify_all(contract, vm, operator, steward, aid: str = "A-1") -> None:
    set_time(vm, BASE_TIME + 60)
    digest = raw_text(contract.get_profile_digest(aid))
    vm.sender = operator
    contract.ratify_assessment(aid, digest)
    vm.sender = steward
    contract.ratify_assessment(aid, digest)


def create_ready_assessment(contract, vm, sponsor, operator, steward, aid: str = "A-1") -> None:
    create_assessment(contract, vm, sponsor, operator, steward, aid)
    ratify_all(contract, vm, operator, steward, aid)


def accounting_invariant_holds(accounting: dict) -> bool:
    funded = int(accounting["total_funded"])
    locked = int(accounting["total_locked"])
    outstanding = int(accounting["total_outstanding_credit"])
    withdrawn = int(accounting["total_withdrawn"])
    return funded == locked + outstanding + withdrawn
