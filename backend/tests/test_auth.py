"""End-to-end tests for the accounts feature (use cases + HTTP API)."""

import pytest
from django.test import Client

from src.accounts.application.use_cases import LoginCommand, RegisterCommand
from src.accounts.container import container
from src.accounts.domain.exceptions import EmailAlreadyUsed, InvalidCredentials


@pytest.mark.django_db
def test_register_then_authenticate():
    c = container()
    user = c.register_user.execute(
        RegisterCommand(email="A@Example.com", password="supersecret1", full_name="Ada")
    )
    assert user.id is not None
    assert user.email == "a@example.com"  # normalised

    result = c.authenticate_user.execute(
        LoginCommand(email="a@example.com", password="supersecret1")
    )
    assert result.user.id == user.id
    assert result.tokens.access_token and result.tokens.refresh_token


@pytest.mark.django_db
def test_duplicate_email_rejected():
    c = container()
    c.register_user.execute(
        RegisterCommand(email="dup@example.com", password="supersecret1", full_name="X")
    )
    with pytest.raises(EmailAlreadyUsed):
        c.register_user.execute(
            RegisterCommand(email="DUP@example.com", password="supersecret1", full_name="Y")
        )


@pytest.mark.django_db
def test_wrong_password_rejected():
    c = container()
    c.register_user.execute(
        RegisterCommand(email="p@example.com", password="rightpass123", full_name="X")
    )
    with pytest.raises(InvalidCredentials):
        c.authenticate_user.execute(LoginCommand(email="p@example.com", password="wrongpass123"))


@pytest.mark.django_db
def test_api_register_login_me_refresh_flow():
    client = Client()

    reg = client.post(
        "/api/auth/register",
        data={"email": "api@example.com", "password": "supersecret1", "full_name": "Api User"},
        content_type="application/json",
    )
    assert reg.status_code == 201, reg.content

    login = client.post(
        "/api/auth/login",
        data={"email": "api@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    assert login.status_code == 200, login.content
    tokens = login.json()["tokens"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "api@example.com"

    # No / bad token -> 401
    assert client.get("/api/auth/me").status_code == 401

    refreshed = client.post(
        "/api/auth/refresh",
        data={"refresh_token": tokens["refresh_token"]},
        content_type="application/json",
    )
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]
