import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.models import LeadIn, SignupIn, ConversationSummaryIn
from app.services import excel_store
from app.config import settings

router = APIRouter(prefix="/api", tags=["leads"])


@router.post("/leads")
def create_lead(lead: LeadIn):
    data = lead.model_dump(exclude={"session_id"})
    excel_store.save_lead({**data, "session_id": lead.session_id}, record_type="lead", source="web_form")
    return {"status": "ok"}


@router.post("/signup")
def create_signup(signup: SignupIn):
    data = signup.model_dump(exclude={"session_id", "plan"})
    data["plan_interest"] = signup.plan
    excel_store.save_lead({**data, "session_id": signup.session_id}, record_type="signup", source="web_form")
    return {"status": "ok"}


@router.post("/conversation-summary")
def conversation_summary(payload: ConversationSummaryIn):
    excel_store.save_conversation_summary(payload.model_dump(exclude={"session_id"}) | {"session_id": payload.session_id})
    return {"status": "ok"}


@router.get("/leads/export")
def export_leads():
    if not os.path.exists(settings.LEADS_XLSX):
        raise HTTPException(status_code=404, detail="No leads recorded yet.")
    return FileResponse(
        settings.LEADS_XLSX,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="aporum_leads.xlsx",
    )


@router.get("/conversations/export")
def export_conversations():
    if not os.path.exists(settings.CONVERSATIONS_XLSX):
        raise HTTPException(status_code=404, detail="No conversation summaries recorded yet.")
    return FileResponse(
        settings.CONVERSATIONS_XLSX,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="aporum_conversations.xlsx",
    )
