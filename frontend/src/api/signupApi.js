const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function submitSignup(payload) {
  const res = await fetch(`${API_BASE}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Signup failed: ${detail}`);
  }
  return res.json();
}
