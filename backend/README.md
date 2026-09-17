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

The container entrypoint runs `migrate` + `ensure_admin` on start, then (for the
web role) `collectstatic` and Gunicorn.

**Coolify:** deploy from the `Dockerfile` (or this `docker-compose.yml`) and set the same
environment variables in the Coolify UI. The app listens on port `8000`.

### Scheduled jobs (archive expired opportunities)

The public listing already hides opportunities past their deadline. To also flip
them to `archived` in the database, run the `archive_expired` command on a schedule:

```bash
uv run python manage.py archive_expired
```

On **Render**, create a **Cron Job** from the same repo/Dockerfile:

- **Dockerfile Path:** `backend/Dockerfile`, **Root Directory:** *(empty)*
- **Command:** `uv run python manage.py archive_expired`
- **Schedule:** e.g. `0 3 * * *` (daily at 03:00)
- **Env vars:** the same `DJANGO_SETTINGS_MODULE`, `DJANGO_SECRET_KEY`, `DATABASE_URL`
  as the web service

The entrypoint detects a passed command and runs it instead of the web server, so
the same image works for both roles.

### Telegram (channel + subscriber bot)

Optional. When `TELEGRAM_BOT_TOKEN` is unset the integration is completely dormant.

1. Create a bot with **@BotFather** → copy the token into `TELEGRAM_BOT_TOKEN`.
2. Add the bot as an **admin of your channel** and set `TELEGRAM_CHANNEL_ID`
   (e.g. `@darb_channel` or the numeric `-100…` id).
3. Pick any random string for `TELEGRAM_WEBHOOK_SECRET`, set `FRONTEND_BASE_URL`
   (so messages link to opportunities), and redeploy.
4. Register the webhook once (against the **deployed** backend):

```bash
python manage.py set_telegram_webhook --url https://your-backend.onrender.com
```

Behaviour:

- **Publishing an opportunity** (create, or status → published) auto-posts it to
  the channel and DMs every active subscriber whose categories match. Re-editing
  an already-published opportunity does **not** re-post.
- **Bot commands** (users DM the bot): `/start`, `/subscribe [category, …]`
  (no categories = all), `/unsubscribe`, `/latest`, `/categories`, `/help`.
- Broadcasts run on a background thread, so Telegram being slow/down never blocks
  an admin's save. All failures are logged and swallowed.

Manage subscribers in the Django admin (`Telegram subscribers`).

