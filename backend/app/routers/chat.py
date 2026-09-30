from fastapi import APIRouter, HTTPException
from app.models import ChatRequest, ChatResponse
from app.services import openai_service

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        history = [{"role": m.role, "content": m.content} for m in req.messages]
        result = openai_service.get_agent_reply(req.session_id, history, req.message, open_signup=req.open_signup)
        return ChatResponse(reply=result["reply"], ui_action=result.get("ui_action"))
    except Exception as exc:  # surfaced to the frontend as a normal error toast
        raise HTTPException(status_code=500, detail=str(exc))
