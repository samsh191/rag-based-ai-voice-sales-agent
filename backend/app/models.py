from typing import Literal, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Random id the frontend generates per conversation")
    messages: list[ChatMessage] = Field(default_factory=list, description="Prior turns, oldest first")
    message: str = Field(..., description="The latest user utterance (transcribed speech or typed text)")
    open_signup: bool = Field(
        default=False,
        description="Set true when the customer clicks the on-screen Sign Up button, so the form opens immediately without waiting on a tool call.",
    )


class ChatResponse(BaseModel):
    reply: str
    # Structured UI hints the frontend can act on, e.g. highlight a step, open the plan picker
    ui_action: Optional[dict] = None


class LeadIn(BaseModel):
    session_id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    plan_interest: Optional[str] = None
    notes: Optional[str] = None


class SignupIn(BaseModel):
    session_id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    address: str
    plan: str
    install_preference: Optional[str] = "self-install"


class ConversationSummaryIn(BaseModel):
    session_id: str
    summary: str
    outcome: Optional[str] = None
