# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json

from genlayer import *


URL = "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai"
MARKERS = (
    "unacceptable risk",
    "high risk",
    "transparency risk",
    "minimal or no risk",
    "regulation (eu) 2024/1689",
    "shaping europe",
)


def normalize(page: str) -> str:
    return " ".join(page.lower().split())


def bucket(length: int) -> str:
    if length == 0:
        return "0"
    if length < 50000:
        return "<50k"
    if length < 100000:
        return "<100k"
    if length < 200000:
        return "<200k"
    return ">=200k"


class TierlineSourceProbe(gl.Contract):
    last: str

    def __init__(self) -> None:
        pass

    @gl.public.view
    def get_last_probe(self) -> str:
        return self.last

    @gl.public.write
    def probe(self) -> None:
        def leader_fn():
            out = {"text": {"stage": "not_run", "length_bucket": "0", "markers": {}}, "html": {"stage": "not_run", "length_bucket": "0", "markers": {}}}
            for mode in ("text", "html"):
                try:
                    page = gl.nondet.web.render(URL, mode=mode)
                except Exception:
                    out[mode]["stage"] = "render_error"
                    continue
                if not isinstance(page, str) or len(page) == 0:
                    out[mode]["stage"] = "empty_or_not_string"
                    continue
                out[mode]["stage"] = "ok"
                out[mode]["length_bucket"] = bucket(len(page))
                normalized = normalize(page)
                out[mode]["markers"] = {marker: (marker in normalized) for marker in MARKERS}
            return out

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            mine = leader_fn()
            return (
                mine["text"]["stage"] == leader_res.calldata["text"]["stage"]
                and mine["html"]["stage"] == leader_res.calldata["html"]["stage"]
                and mine["text"]["length_bucket"] == leader_res.calldata["text"]["length_bucket"]
                and mine["html"]["length_bucket"] == leader_res.calldata["html"]["length_bucket"]
                and mine["text"]["markers"] == leader_res.calldata["text"]["markers"]
                and mine["html"]["markers"] == leader_res.calldata["html"]["markers"]
            )

        result = gl.vm.run_nondet(leader_fn, validator_fn)
        self.last = json.dumps(result)
