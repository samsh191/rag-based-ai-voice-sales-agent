import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLeads, getConversations, leadsExportUrl, conversationsExportUrl } from "../api/adminApi.js";
import "../styles/admin.css";

const STORAGE_KEY = "aporum_admin_key";

export default function AdminDashboard() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(STORAGE_KEY) || "");
  const [keyInput, setKeyInput] = useState("");
  const [leads, setLeads] = useState(null);
  const [conversations, setConversations] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (key) => {
    setLoading(true);
    setError("");
    try {
      const [leadsRes, convosRes] = await Promise.all([getLeads(key), getConversations(key)]);
      setLeads(leadsRes.rows);
      setConversations(convosRes.rows);
      sessionStorage.setItem(STORAGE_KEY, key);
      setAdminKey(key);
    } catch (e) {
      setError(e.unauthorized ? "That admin key isn't correct." : "Couldn't reach the backend API.");
      if (e.unauthorized) sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) load(adminKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    load(keyInput.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setAdminKey("");
    setLeads(null);
    setConversations(null);
  };

  if (!adminKey || (!leads && error)) {
    return (
      <div className="admin-gate">
        <div className="admin-gate__card">
          <h1>Aporum Admin</h1>
          <p>Enter the admin key to view leads, sign-ups, and conversation logs.</p>
          <form onSubmit={handleUnlock}>
            <input
              type="password"
              placeholder="Admin key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn--amber" disabled={loading}>
              {loading ? "Checking..." : "Enter"}
            </button>
          </form>
          {error && <p className="admin-gate__error">{error}</p>}
          <Link to="/" className="admin-gate__back">
            ← Back to Aporum
          </Link>
        </div>
      </div>
    );
  }

  const signups = leads?.filter((r) => r.type === "signup") || [];
  const rawLeads = leads?.filter((r) => r.type === "lead") || [];

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>Aporum Admin</h1>
          <p>Live view of sign-ups, leads, and AI sales-agent conversations.</p>
        </div>
        <div className="admin-page__header-actions">
          <button className="btn btn--ghost" onClick={() => load(adminKey)} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="btn btn--ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <div className="admin-stats">
        <StatCard label="Signups" value={signups.length} />
        <StatCard label="Leads (no signup yet)" value={rawLeads.length} />
        <StatCard label="Logged conversations" value={conversations?.length || 0} />
      </div>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Leads & sign-ups</h2>
          <a className="admin-download" href={leadsExportUrl()}>
            Download Excel
          </a>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>Source</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Plan</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {leads?.length ? (
                leads.map((r, i) => (
                  <tr key={i}>
                    <td>{formatTime(r.timestamp)}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${r.type}`}>{r.type}</span>
                    </td>
                    <td>{r.source}</td>
                    <td>{[r.first_name, r.last_name].filter(Boolean).join(" ")}</td>
                    <td>{r.email}</td>
                    <td>{r.phone}</td>
                    <td>{r.address}</td>
                    <td>{r.plan_interest}</td>
                    <td className="admin-table__notes">{r.notes}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="admin-table__empty">
                    No leads or sign-ups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Conversation summaries</h2>
          <a className="admin-download" href={conversationsExportUrl()}>
            Download Excel
          </a>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Outcome</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {conversations?.length ? (
                conversations.map((r, i) => (
                  <tr key={i}>
                    <td>{formatTime(r.timestamp)}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${r.outcome}`}>{r.outcome || "—"}</span>
                    </td>
                    <td>{r.summary}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="admin-table__empty">
                    No conversation summaries logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat__value">{value}</div>
      <div className="admin-stat__label">{label}</div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
