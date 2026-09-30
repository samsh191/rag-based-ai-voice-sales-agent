const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function adminGet(path, adminKey) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "X-Admin-Key": adminKey },
  });
  if (res.status === 401) {
    const err = new Error("Invalid admin key.");
    err.unauthorized = true;
    throw err;
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const getLeads = (adminKey) => adminGet("/api/admin/leads", adminKey);
export const getConversations = (adminKey) => adminGet("/api/admin/conversations", adminKey);

export const leadsExportUrl = () => `${API_BASE}/api/leads/export`;
export const conversationsExportUrl = () => `${API_BASE}/api/conversations/export`;
