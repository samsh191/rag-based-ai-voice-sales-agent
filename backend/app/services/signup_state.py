"""
Ground-truth sign-up progress per conversation. The on-screen wizard step is always
*computed* from this state (first empty field, in order), never just reported by the
LLM - so the display can't drift out of sync even if a model turn forgets to narrate
a transition correctly.

In-memory + single-process only, which is fine for a demo. For real traffic (multiple
Render instances, restarts) swap this for Redis or a database keyed the same way.
"""
import re
import threading

FIELD_ORDER = ["address", "plan", "first_name", "last_name", "phone", "email"]

# Defense in depth: if the model ever slips and hands back its own persona as a customer's
# name (a known failure mode of over-eager tool-calling prompts), reject it here rather than
# silently recording it - the caller sees an error and can prompt the model to ask again.
_PLACEHOLDER_NAME_VALUES = {"mia", "the assistant", "aporum", "ai assistant", "sales agent"}

_lock = threading.Lock()
_sessions: dict[str, dict] = {}


def _blank_state() -> dict:
    return {"started": False, **{f: "" for f in FIELD_ORDER}}


def _normalize(field: str, value: str) -> str:
    value = (value or "").strip()
    if field == "email" and value and "@" not in value:
        # Safety net in case the model didn't already convert spoken "at"/"dot".
        value = re.sub(r"\s+at\s+", "@", value, flags=re.IGNORECASE)
        value = re.sub(r"\s+dot\s+", ".", value, flags=re.IGNORECASE)
        value = value.replace(" ", "")
    return value


def get_state(session_id: str) -> dict:
    with _lock:
        state = _sessions.setdefault(session_id, _blank_state())
        return dict(state)


def open_form(session_id: str) -> dict:
    with _lock:
        state = _sessions.setdefault(session_id, _blank_state())
        state["started"] = True
        return dict(state)


def record_field(session_id: str, field: str, value: str) -> dict:
    if field not in FIELD_ORDER:
        raise ValueError(f"Unknown sign-up field: {field}")
    normalized = _normalize(field, value)
    if field in ("first_name", "last_name") and normalized.strip().lower() in _PLACEHOLDER_NAME_VALUES:
        raise ValueError(
            f"'{value}' looks like the assistant's own name, not the customer's actual {field.replace('_', ' ')}. "
            f"Ask the customer directly for their {field.replace('_', ' ')} and call this again with their answer."
        )
    with _lock:
        state = _sessions.setdefault(session_id, _blank_state())
        state[field] = normalized
        state["started"] = True
        return dict(state)


def next_step(state: dict) -> str:
    for f in FIELD_ORDER:
        if not state.get(f):
            return f
    return "confirmation"
