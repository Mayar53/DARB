"""Production settings: Postgres, MinIO (S3) storage, Redis cache, hardened."""

from __future__ import annotations

from .base import *  # noqa: F401,F403
from .base import MIDDLEWARE, env  # noqa: F401

DEBUG = False

# Serve compressed, hashed static files via WhiteNoise (right after security).
MIDDLEWARE = MIDDLEWARE.copy()
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")

# Hosts/CSRF must be provided explicitly in production.
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# --- Database: Postgres -----------------------------------------------------
DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

# --- Cache: Redis -----------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL"),
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}

# --- Storage: MinIO / S3-compatible for media, whitenoise for static --------
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": env("S3_BUCKET_NAME"),
            "endpoint_url": env("S3_ENDPOINT_URL"),
            "access_key": env("S3_ACCESS_KEY"),
            "secret_key": env("S3_SECRET_KEY"),
            "region_name": env("S3_REGION", default="us-east-1"),
            "addressing_style": "path",  # required by MinIO
            "file_overwrite": False,
            "querystring_auth": env.bool("S3_QUERYSTRING_AUTH", default=True),
            "url_protocol": env("S3_URL_PROTOCOL", default="https:"),
        },
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# --- Security ---------------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=2592000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# --- Email (password-reset codes) -------------------------------------------
# SMTP config is read in base.py from env (EMAIL_BACKEND/EMAIL_HOST/...).
# Production should set EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# plus host/user/password — otherwise it stays on the console backend.
# DEFAULT_FROM_EMAIL defaults to the Darb contact mailbox in base.py.
