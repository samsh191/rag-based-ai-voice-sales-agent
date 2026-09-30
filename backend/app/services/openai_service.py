import json
import logging
from openai import OpenAI
from app.config import settings
from app.services import rag, tools, signup_state

client = OpenAI(api_key=settings.OPENAI_API_KEY)
logger = logging.getLogger("aporum.agent")

SYSTEM_PROMPT = """You are Mia, a friendly and knowledgeable sales representative for Aporum Internet,
a home internet provider. You are speaking with a customer live, by voice, in place of a call-center
agent. Keep replies short and conversational (1-3 sentences at a time) - you are being read aloud and
the customer is listening, not reading.

Your job:
1. Greet the customer warmly and ask what brings them in today (new service, switching providers,
   upgrading speed, pricing question, etc).
2. Ask short, relevant follow-up questions to understand their household size, current speed
   complaints, and budget before recommending a plan.
3. Answer questions about plans, pricing, install process, and policies using ONLY the context
   provided to you below under "Knowledge base context" - never invent prices or speeds. If the
   context does not cover something, say you'll flag it for a human specialist rather than guessing.
   The four plan names, exactly as they must always be written or recorded, are: Spark 300,
   Surge 600, Quantum 1 Gig, Quantum Pro. Never paraphrase or shorten these.
4. When the customer says they're ready to sign up (or you tell them to click the "Sign Up" button
   below the microphone button), call open_signup_form right away - this opens the on-screen form
   even if they never click the button themselves. The form has exactly 6 fields, always asked in
   this order: address, plan, first_name, last_name, phone, email - followed by a review screen
   where the customer clicks Submit themselves. Ask about ONE field at a time and wait for the
   customer's actual spoken answer before moving on.

   Every turn during sign-up, you'll see a "Sign-up form progress" block below listing which fields
   are already DONE (with their value) and which one to ask about next - treat it as ground truth:
   - Never ask again for a field marked DONE - the form already has it.
   - Only call record_signup_field for a field once the customer has actually told you the answer,
     using exactly what they said. Never guess, invent, or fill in a default value, and never
     record your own name ("Mia") or anything the customer didn't actually say. If you're only
     asking the question this turn and haven't received an answer yet, that's normal - simply don't
     call record_signup_field yet, and wait for their reply.
   - If the customer gives you several fields in one message (e.g. their full name and phone
     together), call record_signup_field once per field, in the right order, in that same turn.
   - Once every field is marked DONE, tell the customer to review their details and click Submit -
     you don't need to do anything further for that step.

   Email formatting: customers will say words like "at" and "dot" instead of symbols (e.g. "jordan
   dot rivera at gmail dot com"). Convert this into a real address with no spaces before calling
   record_signup_field - "at" becomes "@" and "dot" becomes "." - e.g. "jordan.rivera@gmail.com".
5. Call create_lead as soon as you have a first name and a contact method, even if they haven't
   decided on a plan. Call log_conversation_summary when the conversation is wrapping up (goodbye,
   completed signup, or customer needs to think about it).

If you're ever unsure what the customer actually said - a word sounds mis-transcribed, the reply
seems unrelated to what you asked, or it's just unclear - ask them to repeat or clarify rather than
guessing or inventing an answer. It's always better to briefly ask again than to record or act on
something the customer didn't actually say.

Tone: warm, human, a little upbeat, never pushy. Never read out lists of numbers as bullet points -
say them naturally, e.g. "that one's sixty five dollars a month." Do not mention that you are an AI
unless directly asked; if asked, be honest that you're Aporum's AI sales assistant.
"""


def _kb_context_for(user_message: str) -> str:
    entries = rag.retrieve(user_message, top_k=4)
    return rag.format_context(entries)


def _progress_block(state: dict) -> str:
    lines = []
    for f in signup_state.FIELD_ORDER:
        val = state.get(f)
        lines.append(f"- {f}: {'DONE (' + val + ')' if val else 'not yet provided'}")
    next_f = signup_state.next_step(state)
    if next_f == "confirmation":
        tail = "\n\nAll fields are collected. Tell the customer to review and click Submit - do not call record_signup_field again."
    else:
        tail = f"\n\nNext field to ask the customer about: {next_f}. Do not ask about any other field yet."
    return (
        "Sign-up form progress (ground truth - the on-screen form already reflects this exactly):\n"
        + "\n".join(lines)
        + tail
    )


def get_agent_reply(session_id: str, history: list[dict], user_message: str, open_signup: bool = False) -> dict:
    """
    Run one turn of the sales agent: retrieve KB context, call the LLM with tools,
    execute any tool calls, and return the final natural-language reply plus a
    ui_action computed from the authoritative signup_state (not just from whatever
    the model happened to call this turn).
    """
    if open_signup:
        signup_state.open_form(session_id)

    context = _kb_context_for(user_message)
    state = signup_state.get_state(session_id)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.append(
        {
            "role": "system",
            "content": f"Knowledge base context relevant to the customer's latest message:\n\n{context}",
        }
    )
    if state["started"]:
        messages.append({"role": "system", "content": _progress_block(state)})

    for m in history[-12:]:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": user_message})

    reply_text = ""

    # Tool-calling loop: keep resolving tool calls until the model returns plain text. 8 rounds
    # gives headroom for a turn needing several tool calls (e.g. create_lead plus a couple of
    # record_signup_field calls) without looping forever if something goes wrong.
    for _ in range(8):
        completion = client.chat.completions.create(
            model=settings.CHAT_MODEL,
            messages=messages,
            tools=tools.TOOL_SCHEMAS,
            tool_choice="auto",
            temperature=0.4,
        )
        choice = completion.choices[0]
        msg = choice.message

        if not msg.tool_calls:
            reply_text = msg.content or ""
            break

        messages.append(
            {
                "role": "assistant",
                "content": msg.content,
                "tool_calls": [tc.model_dump() for tc in msg.tool_calls],
            }
        )
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments or "{}")
            result = tools.run_tool(tc.function.name, args, session_id)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                }
            )
    else:
        # Loop exhausted without the model ever returning plain text - rare, but worth knowing
        # about if it happens, since to the customer this looks like Mia "not comprehending".
        logger.warning("Tool-calling loop exhausted for session %s without a final reply.", session_id)
        reply_text = "Sorry, I got a little turned around there - could you say that one more time?"

    # Recompute state AFTER the loop - tool calls above may have just updated it, and this
    # is what actually drives the on-screen wizard, independent of what the model narrated.
    final_state = signup_state.get_state(session_id)
    ui_action = None
    if final_state["started"]:
        ui_action = {"step": signup_state.next_step(final_state), **{f: final_state[f] for f in signup_state.FIELD_ORDER}}

    return {"reply": reply_text, "ui_action": ui_action}
