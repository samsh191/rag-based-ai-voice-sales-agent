"""
Backend tools the sales-agent LLM can call (OpenAI tool calling / function calling).
create_lead / start_signup / log_conversation_summary write to the Excel-based store.
open_signup_form / record_signup_field write to the in-memory signup_state tracker,
which is the deterministic source of truth for what the on-screen wizard shows -
see signup_state.py for why that split exists.
"""
from app.services import excel_store, signup_state

_PLAN_NAMES = "Spark 300, Surge 600, Quantum 1 Gig, Quantum Pro"

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "create_lead",
            "description": (
                "Save a sales lead as soon as you learn the customer's name and at least one "
                "contact method (email or phone). Call this even if the customer hasn't decided "
                "on a plan yet - capture interest early so a human can follow up if the call drops."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "email": {"type": "string", "description": "Real email address using @ and . symbols, e.g. name@example.com - never the spoken words at/dot."},
                    "phone": {"type": "string"},
                    "address": {"type": "string"},
                    "plan_interest": {"type": "string", "description": f"Exact plan name if known: {_PLAN_NAMES}."},
                    "notes": {"type": "string", "description": "Anything useful for a human rep: needs, objections, timeline"},
                },
                "required": ["first_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "start_signup",
            "description": (
                "Kick off the actual sign-up workflow once the customer has confirmed a plan and "
                "given their contact + address details and explicitly agreed to proceed by voice "
                "alone, without using the on-screen form's own Submit button. If the customer is "
                "going to click Submit on the form themselves, you don't need to call this - the "
                "form submission handles it."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "email": {"type": "string", "description": "Real email address using @ and . symbols, e.g. name@example.com - never the spoken words at/dot."},
                    "phone": {"type": "string"},
                    "address": {"type": "string"},
                    "plan": {"type": "string", "description": f"Exact plan name: {_PLAN_NAMES}."},
                    "install_preference": {
                        "type": "string",
                        "enum": ["self-install", "professional-install"],
                    },
                },
                "required": ["first_name", "last_name", "email", "phone", "address", "plan"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "log_conversation_summary",
            "description": (
                "Call this once near the end of the conversation to log a short summary for the sales "
                "team, e.g. when the customer says goodbye, completes sign-up, or the conversation "
                "clearly wraps up."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string", "description": "2-4 sentence summary of what the customer needed and what happened"},
                    "outcome": {
                        "type": "string",
                        "enum": ["signed_up", "lead_captured", "info_only", "not_eligible", "abandoned"],
                    },
                },
                "required": ["summary"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "open_signup_form",
            "description": (
                "Call this the moment the customer says they want to sign up, agrees to sign up, or "
                "you tell them to click the Sign Up button. Opens the on-screen sign-up form "
                "immediately, before any details are collected. Safe to call even if it's already open."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "record_signup_field",
            "description": (
                "Call this immediately every time the customer gives you one piece of sign-up info - "
                "this single call is what keeps the on-screen form in sync with the conversation, so "
                "never skip it. One field per call. If the customer gives several details in one "
                "message, call this multiple times in the same turn, once per field, in this order: "
                "address, plan, first_name, last_name, phone, email."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "field": {
                        "type": "string",
                        "enum": signup_state.FIELD_ORDER,
                    },
                    "value": {
                        "type": "string",
                        "description": (
                            f"The value for this field. For 'plan' use the exact catalog name: {_PLAN_NAMES}. "
                            "For 'email' use a real address with @ and . symbols, never the spoken words "
                            "at/dot."
                        ),
                    },
                },
                "required": ["field", "value"],
            },
        },
    },
]


def run_tool(name: str, args: dict, session_id: str) -> dict:
    """Execute a tool call and return a small JSON-serializable result for the model."""
    if name == "create_lead":
        excel_store.save_lead({**args, "session_id": session_id}, record_type="lead", source="ai_agent")
        return {"status": "ok", "message": "Lead saved."}

    if name == "start_signup":
        data = {
            "first_name": args.get("first_name"),
            "last_name": args.get("last_name"),
            "email": args.get("email"),
            "phone": args.get("phone"),
            "address": args.get("address"),
            "plan_interest": args.get("plan"),
            "install_preference": args.get("install_preference", "self-install"),
        }
        excel_store.save_lead({**data, "session_id": session_id}, record_type="signup", source="ai_agent")
        return {
            "status": "ok",
            "message": "Signup created and saved. Give the customer their next steps (confirmation email, install date).",
        }

    if name == "log_conversation_summary":
        excel_store.save_conversation_summary(
            {"session_id": session_id, "summary": args.get("summary", ""), "outcome": args.get("outcome", "")}
        )
        return {"status": "ok", "message": "Conversation summary logged."}

    if name == "open_signup_form":
        signup_state.open_form(session_id)
        return {"status": "ok", "message": "Form opened."}

    if name == "record_signup_field":
        try:
            signup_state.record_field(session_id, args.get("field", ""), args.get("value", ""))
            return {"status": "ok", "message": f"{args.get('field')} recorded."}
        except ValueError as exc:
            return {"status": "error", "message": str(exc)}

    return {"status": "error", "message": f"Unknown tool {name}"}
