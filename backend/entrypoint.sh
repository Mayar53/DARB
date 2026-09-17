#!/bin/sh
set -e

# Migrations + admin bootstrap run on every start (both are idempotent).
uv run python manage.py migrate --noinput
uv run python manage.py ensure_admin

# If a command was passed (e.g. a Render cron job), run it and exit.
#   docker run <image> uv run python manage.py archive_expired
if [ "$#" -gt 0 ]; then
    exec "$@"
fi

# Web server path: gather static assets, then serve with Gunicorn.
uv run python manage.py collectstatic --noinput

# Optional first-boot content seed (idempotent — safe to leave on).
# Enable by setting SEED_ON_DEPLOY=true on the host; unset it once the database
# has the content you want, so demo rows are never re-added.
if [ "${SEED_ON_DEPLOY:-}" = "true" ]; then
    uv run python manage.py seed_opportunities
fi

# Bind to the port the host assigns ($PORT — Render sets this, default 10000);
# fall back to 8000 for local/Docker-compose use.
exec uv run gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${GUNICORN_WORKERS:-3}" \
    --access-logfile - \
    --error-logfile -
