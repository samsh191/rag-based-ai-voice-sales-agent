import json
import os
import math
from openai import OpenAI
from app.config import settings

_KB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge_base.json")

client = OpenAI(api_key=settings.OPENAI_API_KEY)

_kb_entries: list[dict] = []
_kb_vectors: list[list[float]] = []


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def load_and_embed_kb() -> None:
    """Call once at startup. Loads the knowledge base JSON and embeds every entry."""
    global _kb_entries, _kb_vectors
    with open(_KB_PATH, "r") as f:
        _kb_entries = json.load(f)

    if not settings.OPENAI_API_KEY:
        # No key configured (e.g. local dev without .env yet) - skip embedding, retrieval
        # will fall back to keyword search in retrieve().
        _kb_vectors = []
        return

    texts = [f"{e['title']}. {e['text']}" for e in _kb_entries]
    resp = client.embeddings.create(model=settings.EMBEDDING_MODEL, input=texts)
    _kb_vectors = [d.embedding for d in resp.data]


def _keyword_fallback(query: str, top_k: int) -> list[dict]:
    q = query.lower()
    scored = []
    for e in _kb_entries:
        hay = f"{e['title']} {e['text']}".lower()
        score = sum(hay.count(word) for word in q.split() if len(word) > 2)
        scored.append((score, e))
    scored.sort(key=lambda t: t[0], reverse=True)
    return [e for _, e in scored[:top_k]]


def retrieve(query: str, top_k: int = 4) -> list[dict]:
    """Return the top_k most relevant knowledge base entries for a query."""
    if not _kb_entries:
        load_and_embed_kb()

    if not _kb_vectors:
        return _keyword_fallback(query, top_k)

    q_vec = client.embeddings.create(model=settings.EMBEDDING_MODEL, input=[query]).data[0].embedding
    scored = [
        (_cosine(q_vec, vec), entry) for vec, entry in zip(_kb_vectors, _kb_entries)
    ]
    scored.sort(key=lambda t: t[0], reverse=True)
    return [entry for _, entry in scored[:top_k]]


def format_context(entries: list[dict]) -> str:
    return "\n\n".join(f"[{e['title']}]\n{e['text']}" for e in entries)
