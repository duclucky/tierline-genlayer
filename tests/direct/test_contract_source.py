from __future__ import annotations

import ast
from pathlib import Path


CONTRACT = Path(__file__).parents[2] / "contracts" / "tierline.py"
PINNED_HEADER = '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }'
WRITE_METHODS = {
    "create_assessment",
    "ratify_assessment",
    "request_review",
    "retry_review",
    "cancel_unratified",
    "recover_expired",
    "withdraw_credit",
}


def source() -> str:
    return CONTRACT.read_text(encoding="ascii")


def test_contract_is_ascii_pinned_and_has_one_contract_class() -> None:
    text = source()
    assert text.splitlines()[0] == PINNED_HEADER
    assert "py-genlayer:test" not in text
    assert "py-genlayer:latest" not in text
    tree = ast.parse(text)
    visible = [
        node
        for node in tree.body
        if isinstance(node, ast.ClassDef)
        and any(
            isinstance(base, ast.Attribute)
            and isinstance(base.value, ast.Name)
            and base.value.id == "gl"
            and base.attr == "Contract"
            for base in node.bases
        )
    ]
    assert [node.name for node in visible] == ["Tierline"]


def test_every_specified_write_exists_and_only_creation_is_payable() -> None:
    tree = ast.parse(source())
    methods = {
        node.name: node
        for cls in tree.body
        if isinstance(cls, ast.ClassDef) and cls.name == "Tierline"
        for node in cls.body
        if isinstance(node, ast.FunctionDef)
    }
    assert WRITE_METHODS <= methods.keys()

    def decorators(node: ast.FunctionDef) -> set[str]:
        return {ast.unparse(item) for item in node.decorator_list}

    assert "gl.public.write.payable" in decorators(methods["create_assessment"])
    for name in WRITE_METHODS - {"create_assessment"}:
        assert "gl.public.write" in decorators(methods[name])
        assert "gl.public.write.payable" not in decorators(methods[name])


def test_value_and_recovery_guards_are_present_in_public_methods() -> None:
    tree = ast.parse(source())
    tierline = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "Tierline")
    methods = {node.name: ast.unparse(node) for node in tierline.body if isinstance(node, ast.FunctionDef)}
    assert "gl.message.value" in methods["create_assessment"]
    assert "BUDGET" in methods["create_assessment"]
    assert "ratification_deadline" in methods["ratify_assessment"]
    assert "review_deadline" in methods["request_review"]
    assert "review_deadline" in methods["retry_review"]
    assert "ratification_deadline" in methods["cancel_unratified"]
    assert "review_deadline" in methods["recover_expired"]
    assert "emit_transfer" in methods["withdraw_credit"]
    assert methods["withdraw_credit"].find("credit.amount = bigint(0)") < methods["withdraw_credit"].find("emit_transfer")


def test_consensus_and_settlement_are_contract_owned() -> None:
    text = source()
    assert "gl.vm.run_nondet" in text
    assert "gl.nondet.web.render" in text
    assert "gl.nondet.exec_prompt" in text
    assert "SOURCE_VERSION" in text
    assert "_validate_verdict" in text
    assert "_settle" in text
    for launch_mode in ("ALLOW", "REQUIRE_DISCLOSURE", "REQUIRE_SAFEGUARDS", "BLOCK"):
        assert launch_mode in text

