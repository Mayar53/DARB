"""End-to-end tests for self-service password recovery:

forgot-password (emails a 6-digit code) -> reset-password (verify + set new
password) -> log in with the new password. Codes are single-use and expire.
"""

import pytest
from django.core import mail
from django.test import Client

from src.accounts.adapters.outbound.password_reset_models import (
    PasswordResetCode as PasswordResetCodeModel,
)


def _register(client, email="reset@example.com", password="supersecret1", full_name="Reset User"):
    return client.post(
        "/api/auth/register",
        data={"email": email, "password": password, "full_name": full_name},
        content_type="application/json",
    )


def _extract_code(outbox) -> str:
    """The code is the 6-digit group in the email body."""
    import re

    body = outbox[0].body
    match = re.search(r"\b(\d{6})\b", body)
    assert match, f"no 6-digit code found in email: {body!r}"
    return match.group(1)


@pytest.mark.django_db
def test_forgot_password_emails_code():
    client = Client()
    _register(client)
    res = client.post(
        "/api/auth/forgot-password",
        data={"email": "reset@example.com"},
        content_type="application/json",
    )
    assert res.status_code == 202, res.content
    assert len(mail.outbox) == 1
    code = _extract_code(mail.outbox)
    assert len(code) == 6 and code.isdigit()

    # The stored code is hashed, never plaintext.
    row = PasswordResetCodeModel.objects.get(email="reset@example.com")
    assert row.code_hash != code
    assert row.used is False


@pytest.mark.django_db
def test_forgot_password_unknown_email_no_leak():
    client = Client()
    res = client.post(
        "/api/auth/forgot-password",
        data={"email": "nobody@example.com"},
        content_type="application/json",
    )
    assert res.status_code == 202, res.content
    assert len(mail.outbox) == 0
    assert PasswordResetCodeModel.objects.count() == 0


@pytest.mark.django_db
def test_reset_password_full_flow():
    client = Client()
    _register(client)

    client.post(
        "/api/auth/forgot-password",
        data={"email": "reset@example.com"},
        content_type="application/json",
    )
    code = _extract_code(mail.outbox)

    res = client.post(
        "/api/auth/reset-password",
        data={"email": "reset@example.com", "code": code, "new_password": "newpass12345"},
        content_type="application/json",
    )
    assert res.status_code == 200, res.content

    # Old password no longer works; new one does.
    old = client.post(
        "/api/auth/login",
        data={"email": "reset@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    assert old.status_code == 401
    new = client.post(
        "/api/auth/login",
        data={"email": "reset@example.com", "password": "newpass12345"},
        content_type="application/json",
    )
    assert new.status_code == 200
    assert new.json()["user"]["email"] == "reset@example.com"


@pytest.mark.django_db
def test_reset_code_is_single_use():
    client = Client()
    _register(client)
    client.post(
        "/api/auth/forgot-password",
        data={"email": "reset@example.com"},
        content_type="application/json",
    )
    code = _extract_code(mail.outbox)

    first = client.post(
        "/api/auth/reset-password",
        data={"email": "reset@example.com", "code": code, "new_password": "newpass12345"},
        content_type="application/json",
    )
    assert first.status_code == 200

    # Reusing the same code fails.
    second = client.post(
        "/api/auth/reset-password",
        data={"email": "reset@example.com", "code": code, "new_password": "anotherpass123"},
        content_type="application/json",
    )
    assert second.status_code == 404, second.content


@pytest.mark.django_db
def test_reset_code_wrong_code_rejected():
    client = Client()
    _register(client)
    client.post(
        "/api/auth/forgot-password",
        data={"email": "reset@example.com"},
        content_type="application/json",
    )
    res = client.post(
        "/api/auth/reset-password",
        data={"email": "reset@example.com", "code": "000000", "new_password": "newpass12345"},
        content_type="application/json",
    )
    assert res.status_code == 404, res.content
    # Password unchanged.
    login = client.post(
        "/api/auth/login",
        data={"email": "reset@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    assert login.status_code == 200


@pytest.mark.django_db
def test_requesting_new_code_invalidates_old():
    client = Client()
    _register(client)
    client.post(
        "/api/auth/forgot-password",
        data={"email": "reset@example.com"},
        content_type="application/json",
    )
    old_code = _extract_code(mail.outbox)
    mail.outbox.clear()

    # Request again -> previous codes are invalidated.
    client.post(
        "/api/auth/forgot-password",
        data={"email": "reset@example.com"},
        content_type="application/json",
    )
    new_code = _extract_code(mail.outbox)

    # The old code no longer works.
    res = client.post(
        "/api/auth/reset-password",
        data={"email": "reset@example.com", "code": old_code, "new_password": "firstpass123"},
        content_type="application/json",
    )
    assert res.status_code == 404, res.content

    # The new code works.
    res2 = client.post(
        "/api/auth/reset-password",
        data={"email": "reset@example.com", "code": new_code, "new_password": "secondpass123"},
        content_type="application/json",
    )
    assert res2.status_code == 200, res2.content
