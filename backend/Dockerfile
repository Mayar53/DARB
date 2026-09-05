# syntax=docker/dockerfile:1
# Built from the REPO ROOT (Render's default context). The backend lives in
# backend/; all COPY paths below are relative to the repo root.
FROM python:3.13-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    DJANGO_SETTINGS_MODULE=config.settings.prod

WORKDIR /app

# uv binary
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install dependencies first (better layer caching).
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# App source (backend/ contains manage.py, config/, src/, entrypoint.sh).
COPY backend/ ./
RUN uv sync --frozen --no-dev && chmod +x entrypoint.sh

# Run as non-root
RUN useradd --create-home --uid 1000 app && chown -R app:app /app
USER app

EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
