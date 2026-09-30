import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    CHAT_MODEL: str = os.getenv("CHAT_MODEL", "gpt-4o-mini")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    # Comma separated list of origins allowed to call this API (your Vercel URL, localhost, etc.)
    ALLOWED_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", os.path.join(os.path.dirname(__file__), "storage"))
    LEADS_XLSX: str = os.path.join(STORAGE_DIR, "leads.xlsx")
    CONVERSATIONS_XLSX: str = os.path.join(STORAGE_DIR, "conversations.xlsx")

    # Simple shared-secret gate for the admin dashboard. NOT real auth - replace with a proper
    # login system before handling real customer data.
    ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", "change-me-admin-key")


settings = Settings()
