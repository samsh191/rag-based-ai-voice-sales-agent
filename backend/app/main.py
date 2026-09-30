from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import chat, leads, admin
from app.services import rag

app = FastAPI(title="Aporum Internet - AI Sales Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(leads.router)
app.include_router(admin.router)


@app.on_event("startup")
def startup():
    # Pre-embed the knowledge base once so the first chat request isn't slow.
    rag.load_and_embed_kb()


@app.get("/")
def health():
    return {"status": "ok", "service": "aporum-sales-agent-api"}
