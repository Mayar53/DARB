# Project Template — Backend + Frontend

Two production-ready starter templates that new projects are built on top of.

| | Backend | Frontend |
| --- | --- | --- |
| **Framework** | Django 6 + django-ninja | Next.js 16 (App Router) + React 19 |
| **Architecture** | Hexagonal (Ports & Adapters) | Feature-based + DRY |
| **State / Data** | Postgres (prod) / SQLite (dev), Redis | Zustand |
| **Auth** | JWT (PyJWT) | JWT in persisted store |
| **UI / Viz** | — | shadcn (RTL), ApexCharts, GSAP, three.js, reactbits |
| **Packages** | uv | npm |
| **Deploy** | Docker Compose → Coolify | Vercel / Netlify |

The frontend is **Arabic-first (RTL, ar/en toggle)** and ships as a full app shell (sidebar + topbar);
after login it shows an **account** page describing the signed-in user. The backend ships a working
**JWT auth** feature (`accounts`) plus a **django-unfold** themed admin at `/admin`. The two are wired
together: the frontend login calls the backend and stores the session.

## Repository layout

```
backend/    Django + ninja, hexagonal — see backend/README.md and backend/AGENTS.md
frontend/   Next.js + shadcn, feature-based — see frontend/README.md and frontend/AGENTS.md
ARCHITECTURE.md   layers, the dependency rule, and how to add a feature on each side
PROMPT.md         a reusable prompt to plan a new system on these templates
```

## Run it locally

**Backend** (SQLite, no Docker):

```bash
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py runserver          # http://localhost:8000/api/docs
```

**Frontend** (in another terminal):

```bash
cd frontend
npm install
npm run dev                                 # http://localhost:3000
```

Open <http://localhost:3000> and sign up (or use the auto-created admin **`admin@admin.com` /
`admin123`**). Toggle language (ar ⇄ en) and theme from the app top bar.

## Deploy

- **Backend → Coolify:** build from `backend/Dockerfile` (or `backend/docker-compose.yml`, which also
  brings up Postgres + Redis + MinIO). Fill `backend/.env.example` values in Coolify.
- **Frontend → Vercel/Netlify:** Vercel is zero-config; Netlify uses the included `netlify.toml`.
  Set `NEXT_PUBLIC_API_URL` to the deployed backend's `/api`.

## Verified

Backend: `uv run pytest` → 4 passing (auth use cases + HTTP flow). Frontend: `npm run build` and
`npm run lint` pass with the React Compiler enabled.
