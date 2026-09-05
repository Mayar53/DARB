#!/bin/sh
set -e

# Apply migrations, ensure the admin user, and gather static assets, then serve.
uv run python manage.py migrate --noinput
uv run python manage.py ensure_admin
uv run python manage.py collectstatic --noinput

exec uv run gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --access-logfile - \
    --error-logfile -
