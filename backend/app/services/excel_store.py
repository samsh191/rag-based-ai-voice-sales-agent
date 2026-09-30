import os
import threading
from datetime import datetime, timezone
from openpyxl import Workbook, load_workbook
from app.config import settings

_lock = threading.Lock()

_LEAD_HEADERS = [
    "timestamp", "session_id", "type", "source", "first_name", "last_name",
    "email", "phone", "address", "plan_interest", "install_preference", "notes",
]
_CONVO_HEADERS = ["timestamp", "session_id", "summary", "outcome"]


def _ensure_workbook(path: str, headers: list[str]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        wb = Workbook()
        ws = wb.active
        ws.title = "Sheet1"
        ws.append(headers)
        wb.save(path)


def _append_row(path: str, headers: list[str], row: dict) -> None:
    with _lock:
        _ensure_workbook(path, headers)
        wb = load_workbook(path)
        ws = wb.active
        ws.append([row.get(h, "") for h in headers])
        wb.save(path)


def _read_rows(path: str, headers: list[str]) -> list[dict]:
    with _lock:
        _ensure_workbook(path, headers)
        wb = load_workbook(path)
        ws = wb.active
        rows = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            if row is None or all(v is None for v in row):
                continue
            rows.append({h: (v if v is not None else "") for h, v in zip(headers, row)})
    rows.reverse()  # most recent first
    return rows


def save_lead(data: dict, record_type: str = "lead", source: str = "web_form") -> None:
    row = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": record_type,
        "source": source,
        **data,
    }
    _append_row(settings.LEADS_XLSX, _LEAD_HEADERS, row)


def save_conversation_summary(data: dict) -> None:
    row = {"timestamp": datetime.now(timezone.utc).isoformat(), **data}
    _append_row(settings.CONVERSATIONS_XLSX, _CONVO_HEADERS, row)


def read_leads() -> list[dict]:
    return _read_rows(settings.LEADS_XLSX, _LEAD_HEADERS)


def read_conversations() -> list[dict]:
    return _read_rows(settings.CONVERSATIONS_XLSX, _CONVO_HEADERS)
