# Backend conventions — Django + django-ninja, Hexagonal (Ports & Adapters)

> ⚠️ **Django 6 + django-ninja are newer than most training data.** Verify APIs against the
> installed packages (`.venv/`) and the official docs before relying on memory. Heed deprecations
> (e.g. ninja now wants `Status(code, body)` instead of returning a `(code, body)` tuple).

## Stack
- **Django 6** + **django-ninja** (API), **uv** (packages), **PyJWT** (auth).
- **SQLite** in dev, **Postgres** in prod. **Redis** cache (prod), **MinIO/S3** media (prod).
- **Docker Compose** for deploy/prod-like; run locally **without Docker** for dev.
- Server: **Coolify** (Dockerfile + compose). Ruff for lint/format, pytest for tests.

## The dependency rule (most important)
Dependencies point **inward only**: `adapters → application → domain`.
- `src/<feature>/domain/` — pure Python: entities, value objects, and **ports** (ABCs). No Django, no HTTP, no SQL.
- `src/<feature>/application/` — use cases that orchestrate the domain through ports. No framework imports.
- `src/<feature>/adapters/inbound/` — django-ninja router + Pydantic schemas (HTTP adapter).
- `src/<feature>/adapters/outbound/` — Django ORM models + repositories, hashers, token services (port implementations).
- `src/<feature>/container.py` — composition root: the **only** place that wires concrete adapters to ports.
- `src/shared/` — cross-cutting domain base classes, shared exceptions, and reusable infrastructure
  (`JwtCodec`, `JWTAuth` bearer). `config/` is the Django project (settings, `api.py`, urls, wsgi/asgi).

Reference feature to copy: **`src/accounts/`** (users + JWT auth).

## How to add a feature `<x>`
1. `src/<x>/domain/` — `entities.py`, `ports.py` (repository/service interfaces), `exceptions.py` (subclass `src.shared.domain.exceptions`).
2. `src/<x>/application/use_cases.py` — one class per operation, deps injected via `__init__`.
3. `src/<x>/adapters/outbound/` — `orm_models.py` (Django model), `repositories.py` (maps ORM ⇄ entity), other adapters.
4. `src/<x>/adapters/inbound/` — `schemas.py` (ninja Schemas) + `router.py` (thin: validate → call use case → return).
5. `src/<x>/container.py` — wire adapters to use cases.
6. `src/<x>/apps.py` (`label="<x>"`), and `src/<x>/models.py` that **re-exports** the ORM model (Django autodiscovery).
7. Register the app in `config/settings/base.py` `INSTALLED_APPS` and mount the router in `config/api.py`.
8. `uv run python manage.py makemigrations <x> && uv run python manage.py migrate`. Add tests under `tests/`.

## Rules
- Routers stay thin; **business logic lives in use cases**, not routers or models.
- Domain raises `DomainError` subclasses; `config/api.py` maps them to HTTP status codes in one place — don't catch-and-format in routers.
- Read config from the environment via `django-environ` (see `.env.example`); never hardcode secrets. dev defaults to SQLite + local storage so it runs with zero env.
- Protect routes with `auth=JWTAuth()` from `src/shared/infrastructure/auth.py`.

## Commands
```bash
uv sync                                   # install
uv run python manage.py migrate           # db
uv run python manage.py runserver         # dev (http://localhost:8000/api/docs)
uv run python manage.py createsuperuser   # admin
uv run pytest                             # tests
uv run ruff check . && uv run ruff format .
```
Settings module: `config.settings.dev` (default) / `config.settings.prod`.
