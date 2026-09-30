const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function sendChatMessage(sessionId, history, message, { openSignup = false } = {}) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      message,
      open_signup: openSignup,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Chat request failed: ${detail}`);
  }
  return res.json(); // { reply, ui_action }
}
