# Aporum Internet — AI Sales Agent

A marketing site for a fictional ISP ("Aporum Internet") plus a full-page, voice-driven AI sales
agent ("Mia") that replaces the "call our toll-free number" flow. The agent uses OpenAI tool
calling + RAG over a small knowledge base, and logs leads/signups/conversation summaries to Excel
files on the backend.

```
aporum-internet/
├── frontend/   React (Vite) app → deploy to Vercel
└── backend/    FastAPI app → deploy to Render
```

## What's in the app

- **`/`** — homepage with plans, features, FAQ.
- **`/signup`** — standalone, no-login sign-up wizard: address → plan → first name → last name →
  phone → email → review (with a "demo only, no payment info required" notice) → submit.
- **`/talk-to-sales`** — the voice AI sales agent, Mia. When the visitor tells Mia they want to
  sign up (or clicks the on-screen Sign Up button), the screen splits: the same sign-up wizard
  opens on the left (about 70% of the width) pre-filling whatever details Mia already collected by
  voice, while a condensed version of the avatar/mic/transcript stays on the right (about 30%).
  The wizard step is driven by a **deterministic, backend-tracked state machine**
  (`backend/app/services/signup_state.py`), not by the model narrating a step name - see below.
- **`/admin`** — a lightweight, key-gated dashboard (not real authentication — see "Security note"
  below) showing stats plus tables of every lead/sign-up and logged conversation summary, each with
  a "Download Excel" link.

## How it works

1. The visitor clicks **Talk to Sales Now** on the homepage → routes to `/talk-to-sales`, a
   full-page voice interface showing Mia (your uploaded photo, `frontend/public/mia.jpg`).
2. The page auto-greets the visitor (an initial silent turn asks the LLM to open the call).
3. The visitor clicks **Speak Now** → the browser's Web Speech API (`SpeechRecognition`) listens
   and transcribes speech to text client-side, no audio is sent to the backend.
4. The transcript is sent to `POST /api/chat` on the FastAPI backend along with conversation
   history.
5. The backend:
   - Retrieves the most relevant chunks from `backend/app/data/knowledge_base.json` (RAG, embedded
     with OpenAI embeddings, cosine similarity).
   - Loads that session's sign-up progress from `signup_state.py` (in-memory, keyed by
     `session_id`) and, once started, injects it into the prompt every turn as an explicit
     "ground truth" block — which fields are already done and exactly which one to ask next. This
     is also what stops Mia from re-asking for something the customer already gave her: the model
     doesn't have to remember it from the conversation text, it's handed the answer directly.
   - Calls the OpenAI chat model with tools: `create_lead`, `start_signup`,
     `log_conversation_summary`, `open_signup_form`, `record_signup_field`.
   - Executes any tool calls the model makes and feeds the results back until it returns plain
     text.
   - **After** the model's turn is fully resolved, it recomputes the on-screen step itself as
     "the first field in `[address, plan, first_name, last_name, phone, email]` that's still
     empty" (or `confirmation` once all six are filled) and sends that back as `ui_action`. The
     step shown on screen is never just whatever the model happened to say - it's always
     recalculated from the actual recorded data, so a model that forgets to narrate a transition
     correctly can't leave the display stuck on a stale step.
6. The reply is spoken back with the browser's `SpeechSynthesis` API (no extra API cost) and shown
   in the on-screen transcript. The sign-up wizard on screen mirrors `ui_action` exactly. The
   customer submits the form themselves (client-side `POST /api/signup`); Mia is then told the
   form was submitted so she can wrap up and log a summary.
7. Leads, signups (tagged `source: web_form` or `source: ai_agent`), and conversation summaries all
   land in `backend/app/storage/leads.xlsx` and `conversations.xlsx`, viewable in `/admin` or
   downloadable via `GET /api/leads/export` and `GET /api/conversations/export`.

## Security note

The `/admin` dashboard is gated by a single shared key (`ADMIN_API_KEY`) sent as an `X-Admin-Key`
header — enough to keep casual visitors out for a demo, but **not real authentication**. Before
using this with real customer data, put `/admin` behind proper login (e.g. an identity provider or
your own auth) and consider gating the `/api/leads/export` and `/api/conversations/export`
download endpoints the same way (they're currently open, matching the "no login for now" ask for
the customer-facing sign-up flow, but that openness shouldn't extend to bulk data export).

## Run it locally

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # add your OPENAI_API_KEY and set ADMIN_API_KEY
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:8000
npm run dev
```
Open http://localhost:5173 — use Chrome, Edge, or Safari for voice input (Web Speech API support
varies; Firefox falls back to the "type a message" box automatically).

## Deploy

### Backend → Render
1. Push this repo to GitHub.
2. In Render: **New → Web Service**, point at the repo, root directory `backend`.
3. Render will detect `render.yaml` (or use build command `pip install -r requirements.txt` and
   start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
4. Set the `OPENAI_API_KEY` environment variable in Render's dashboard (kept secret, not in git).
5. Set `ALLOWED_ORIGINS` to your Vercel URL once you have it (comma-separated if you need more
   than one, e.g. your Vercel preview + production domains).
6. Note the deployed URL, e.g. `https://aporum-sales-agent-api.onrender.com`.

### Frontend → Vercel
1. In Vercel: **New Project**, import the repo, root directory `frontend`.
2. Framework preset: Vite. Build command `npm run build`, output directory `dist` (Vercel usually
   detects this automatically).
3. Add environment variable `VITE_API_BASE_URL` = your Render backend URL from above.
4. Deploy. Update `ALLOWED_ORIGINS` on Render with the final Vercel domain and redeploy the
   backend so CORS allows it.

### GitHub
Commit both `frontend/` and `backend/` to one repo (this structure is already a monorepo); each
platform is told to build from its subfolder via the root directory setting above.

## Extending this

- **Swap Excel for a real CRM**: only `backend/app/services/tools.py` and
  `backend/app/services/excel_store.py` need to change — the LLM-facing tool schemas stay the
  same.
- **Swap browser TTS/STT for OpenAI's audio models**: replace the two hooks in
  `frontend/src/hooks/` with calls to a `/api/speech-to-text` / `/api/text-to-speech` backend
  route using OpenAI's `gpt-4o-mini-transcribe` and `gpt-4o-mini-tts` models — the rest of the app
  (tool calling, RAG, UI wizard) is unaffected.
- **Grow the knowledge base**: add entries to `backend/app/data/knowledge_base.json`; they're
  re-embedded automatically on the next backend restart.
- **Add more tools**: add a schema to `TOOL_SCHEMAS` and a branch in `run_tool()` in
  `backend/app/services/tools.py` — for example a real `check_address_coverage` API call.

## Notes and limits

- Voice input relies on the browser's built-in `SpeechRecognition`. It's well supported in Chrome,
  Edge, and Safari; on unsupported browsers the page shows a text input fallback automatically.
- The Excel files are stored on the backend's local disk. Render's free tier disk is ephemeral, so
  for production use, point `excel_store.py` at persistent storage (a mounted disk, S3, or a
  database) instead.
- **Sign-up progress (`signup_state.py`) is also in-memory, single-process.** It resets if the
  backend restarts, and won't stay in sync across multiple Render instances if you scale up. For
  production, back it with Redis or a database, keyed the same way (by `session_id`).
- This is a demo-grade project meant to be extended, not a production ISP billing system.
