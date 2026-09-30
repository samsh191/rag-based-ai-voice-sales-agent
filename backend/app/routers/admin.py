from fastapi import APIRouter, Header, HTTPException
from app.services import excel_store
from app.config import settings

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _check_key(x_admin_key: str | None) -> None:
    if not x_admin_key or x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing admin key.")


@router.get("/leads")
def list_leads(x_admin_key: str | None = Header(default=None)):
    _check_key(x_admin_key)
    return {"rows": excel_store.read_leads()}


@router.get("/conversations")
def list_conversations(x_admin_key: str | None = Header(default=None)):
    _check_key(x_admin_key)
    return {"rows": excel_store.read_conversations()}
