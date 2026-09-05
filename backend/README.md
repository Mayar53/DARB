# Karkh Backend

Django 6 + django-ninja API in a **Hexagonal (Ports & Adapters)** architecture, managed with **uv**.

- SQLite (dev) / Postgres (prod) · Redis cache · MinIO/S3 media · JWT auth · Docker + Coolify

See [`AGENTS.md`](./AGENTS.md) for architecture conventions and how to add a feature, and the
repo-root `ARCHITECTURE.md` for the full picture.

## Quickstart (dev, no Docker)

```bash
uv sync
uv run python manage.py migrate            # also auto-creates the default admin
uv run python manage.py runserver
```

- API + interactive docs: <http://localhost:8000/api/docs>
- Admin: <http://localhost:8000/admin/>

Dev uses SQLite and local file storage — no env file required.

**Default admin** (created on `migrate`, configurable via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env):
`admin@admin.com` / `admin123`. Re-ensure any time with `uv run python manage.py ensure_admin`.

### Auth endpoints (reference feature)

| Method | Path                 | Auth   | Description                |
| ------ | -------------------- | ------ | -------------------------- |
| POST   | `/api/auth/register` | public | Create a user              |
| POST   | `/api/auth/login`    | public | Returns `{ user, tokens }` |
| POST   | `/api/auth/refresh`  | public | Exchange a refresh token   |
| GET    | `/api/auth/me`       | bearer | Current user               |

## Tests & lint

```bash
uv run pytest
uv run ruff check . && uv run ruff format .
```

## Optional: real infra in dev

`dev` settings default to SQLite. To develop against Postgres/Redis/MinIO, start the infra:

```bash
docker compose -f docker-compose.dev.yml up -d
```

## Production / Coolify

Production uses `config.settings.prod` (Postgres, Redis, MinIO/S3, hardened security).

1. Copy `.env.example` → `.env` and fill in every value (`DJANGO_SECRET_KEY`, `DATABASE_URL`,
   `REDIS_URL`, `S3_*`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, …).
2. Build & run the full stack (web + postgres + redis + minio):

```bash
docker compose up --build
```

The container entrypoint runs `migrate` + `collectstatic` then starts Gunicorn.

**Coolify:** deploy from the `Dockerfile` (or this `docker-compose.yml`) and set the same
environment variables in the Coolify UI. The app listens on port `8000`.
