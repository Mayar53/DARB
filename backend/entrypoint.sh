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

exec uv run gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --access-logfile - \
    --error-logfile -
