"""End-to-end tests for the admin-application flow:

general user -> apply (linked to their existing account) -> owner sees it ->
owner waitlists or approves -> approve upgrades the SAME user in place ->
the user logs back in with the same email/password and is now an admin.

No second account is ever created, and applications are never deleted.
"""

import pytest
from django.test import Client

from src.accounts.container import container as accounts_container
from src.accounts.domain.admin_application import AdminApplicationStatus


@pytest.fixture
def owner_tokens():
    """Bootstrap the OWNER via the repository (no seeded demo admin)."""
    from src.accounts.adapters.outbound.hasher import DjangoPasswordHasher
    from src.accounts.domain.permissions import OWNER_PERMISSIONS
    c = accounts_container()
    user = c.users.add_admin(
        email="boss@example.com",
        full_name="Boss Admin",
        password_hash=DjangoPasswordHasher().hash("supersecret1"),
    )
    c.users.set_role(user.id, role="owner", permissions=OWNER_PERMISSIONS)
    client = Client()
    login = client.post(
        "/api/auth/login",
        data={"email": "boss@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    assert login.status_code == 200, login.content
    return login.json()["tokens"]


@pytest.fixture
def admin_tokens():
    """A regular admin (no owner powers) for permission tests."""
    from src.accounts.adapters.outbound.hasher import DjangoPasswordHasher
    c = accounts_container()
    c.users.add_admin(
        email="admin1@example.com",
        full_name="Admin One",
        password_hash=DjangoPasswordHasher().hash("supersecret1"),
    )
    client = Client()
    login = client.post(
        "/api/auth/login",
        data={"email": "admin1@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    assert login.status_code == 200, login.content
    return login.json()["tokens"]


@pytest.fixture
def user_headers():
    """Register a normal personal user and return the auth header."""
    client = Client()
    reg = client.post(
        "/api/auth/register",
        data={"email": "app-user@example.com", "password": "supersecret1", "full_name": "App User"},
        content_type="application/json",
    )
    assert reg.status_code == 201, reg.content
    login = client.post(
        "/api/auth/login",
        data={"email": "app-user@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    assert login.status_code == 200, login.content
    return {"Authorization": f"Bearer {login.json()['tokens']['access_token']}"}


@pytest.fixture
def user_tokens():
    """A normal personal user's tokens (no staff powers)."""
    client = Client()
    reg = client.post(
        "/api/auth/register",
        data={"email": "plain-user@example.com", "password": "supersecret1", "full_name": "Plain User"},
        content_type="application/json",
    )
    assert reg.status_code == 201, reg.content
    login = client.post(
        "/api/auth/login",
        data={"email": "plain-user@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    assert login.status_code == 200, login.content
    return login.json()["tokens"]


def _h(tokens): return {"Authorization": f"Bearer {tokens['access_token']}"}


def _register(client, email="mayar@example.com", password="supersecret1", full_name="Mayar Ali"):
    return client.post(
        "/api/auth/register",
        data={"email": email, "password": password, "full_name": full_name},
        content_type="application/json",
    )


def _login(client, email, password="supersecret1"):
    return client.post(
        "/api/auth/login",
        data={"email": email, "password": password},
        content_type="application/json",
    )


@pytest.mark.django_db
def test_existing_user_applies_admin_linked_to_same_account():
    client = Client()
    _register(client)
    headers = _h(_login(client, "mayar@example.com").json()["tokens"])

    res = client.post(
        "/api/auth/admin-apply",
        data={"email": "mayar@example.com", "full_name": "Mayar Ali",
              "organization": "Youth NGO", "reason": "We run training programs"},
        content_type="application/json",
        headers=headers,
    )
    assert res.status_code == 201, res.content
    body = res.json()
    assert body["status"] == AdminApplicationStatus.PENDING.value
    assert body["email"] == "mayar@example.com"
    assert body["full_name"] == "Mayar Ali"

    # The application is linked to the existing user — same account, no duplicate.
    from src.accounts.adapters.outbound.admin_application_models import AdminApplication
    from src.accounts.adapters.outbound.orm_models import UserModel
    assert UserModel.objects.filter(email="mayar@example.com").count() == 1
    row = AdminApplication.objects.get(email="mayar@example.com")
    assert row.user_id == UserModel.objects.get(email="mayar@example.com").id

    # The user can still log in with the same credentials (account unchanged).
    login = _login(client, "mayar@example.com")
    assert login.status_code == 200
    assert login.json()["user"]["role"] == "user"


@pytest.mark.django_db
def test_apply_requires_existing_account():
    client = Client()
    res = client.post(
        "/api/auth/admin-apply",
        data={"email": "noaccount@example.com", "full_name": "Nobody"},
        content_type="application/json",
    )
    assert res.status_code == 404, res.content  # no user -> cannot apply


@pytest.mark.django_db
def test_duplicate_application_returns_existing():
    client = Client()
    _register(client)
    headers = _h(_login(client, "mayar@example.com").json()["tokens"])
    first = client.post(
        "/api/auth/admin-apply",
        data={"email": "mayar@example.com", "full_name": "Mayar Ali", "reason": "one"},
        content_type="application/json",
        headers=headers,
    )
    assert first.status_code == 201
    second = client.post(
        "/api/auth/admin-apply",
        data={"email": "mayar@example.com", "full_name": "Mayar Ali", "reason": "two"},
        content_type="application/json",
        headers=headers,
    )
    assert second.status_code == 201  # returns the existing application, not an error
    assert second.json()["id"] == first.json()["id"]

    from src.accounts.adapters.outbound.admin_application_models import AdminApplication
    assert AdminApplication.objects.filter(email="mayar@example.com").count() == 1


@pytest.mark.django_db
def test_owner_waitlists_then_approves(owner_tokens):
    client = Client()
    _register(client)
    headers = _h(_login(client, "mayar@example.com").json()["tokens"])
    client.post("/api/auth/admin-apply",
                data={"email": "mayar@example.com", "full_name": "Mayar Ali"},
                content_type="application/json", headers=headers)

    listing = client.get("/api/auth/admin-applications", headers=_h(owner_tokens))
    assert listing.status_code == 200
    apps = listing.json()
    assert len(apps) == 1
    app_id = apps[0]["id"]

    # Owner keeps the applicant waitlisted — user stays a normal user.
    wait = client.post(f"/api/auth/admin-applications/{app_id}/waitlist", headers=_h(owner_tokens))
    assert wait.status_code == 200
    assert wait.json()["status"] == "waitlisted"
    login = _login(client, "mayar@example.com")
    assert login.json()["user"]["role"] == "user"
    assert login.json()["user"]["is_staff"] is False

    # The application remains visible to the owner.
    listing2 = client.get("/api/auth/admin-applications", headers=_h(owner_tokens))
    assert listing2.status_code == 200
    assert len(listing2.json()) == 1
    assert listing2.json()[0]["status"] == "waitlisted"

    # Owner can approve later — same user is upgraded in place.
    approved = client.post(f"/api/auth/admin-applications/{app_id}/approve", headers=_h(owner_tokens))
    assert approved.status_code == 200, approved.content
    assert approved.json()["status"] == "approved"
    assert approved.json()["id"] == app_id  # SAME record, no duplicate
    login2 = _login(client, "mayar@example.com")
    assert login2.json()["user"]["role"] == "admin"
    assert login2.json()["user"]["is_staff"] is True


@pytest.mark.django_db
def test_owner_can_move_waitlisted_back_to_pending(owner_tokens):
    """A waitlisted application can be returned to Pending (same record)."""
    client = Client()
    _register(client)
    headers = _h(_login(client, "mayar@example.com").json()["tokens"])
    client.post("/api/auth/admin-apply",
                data={"email": "mayar@example.com", "full_name": "Mayar Ali"},
                content_type="application/json", headers=headers)
    app_id = client.get("/api/auth/admin-applications", headers=_h(owner_tokens)).json()[0]["id"]

    # Waitlist it.
    wait = client.post(f"/api/auth/admin-applications/{app_id}/waitlist", headers=_h(owner_tokens))
    assert wait.status_code == 200
    assert wait.json()["status"] == "waitlisted"

    # Move it back to pending — same id, no duplicate record.
    reopened = client.post(f"/api/auth/admin-applications/{app_id}/pending", headers=_h(owner_tokens))
    assert reopened.status_code == 200, reopened.content
    assert reopened.json()["status"] == "pending"
    assert reopened.json()["id"] == app_id

    # Only one record exists for this email.
    from src.accounts.adapters.outbound.admin_application_models import AdminApplication
    assert AdminApplication.objects.filter(email="mayar@example.com").count() == 1

    # The user is still a normal user (move-back does not promote).
    login = _login(client, "mayar@example.com")
    assert login.json()["user"]["role"] == "user"


@pytest.mark.django_db
def test_status_flow_persists_same_record(owner_tokens):
    """pending -> approved stays approved after refresh; the record id never changes."""
    client = Client()
    _register(client)
    headers = _h(_login(client, "mayar@example.com").json()["tokens"])
    client.post("/api/auth/admin-apply",
                data={"email": "mayar@example.com", "full_name": "Mayar Ali"},
                content_type="application/json", headers=headers)
    app_id = client.get("/api/auth/admin-applications", headers=_h(owner_tokens)).json()[0]["id"]

    approved = client.post(f"/api/auth/admin-applications/{app_id}/approve", headers=_h(owner_tokens))
    assert approved.status_code == 200
    assert approved.json()["id"] == app_id
    assert approved.json()["status"] == "approved"

    # "Refresh": re-list from the API — same id, still approved (not pending).
    listing = client.get("/api/auth/admin-applications", headers=_h(owner_tokens))
    assert listing.status_code == 200
    rows = listing.json()
    assert len(rows) == 1
    assert rows[0]["id"] == app_id
    assert rows[0]["status"] == "approved"

    # The approved user appears in the separate Admins section.
    admins = client.get("/api/auth/admins", headers=_h(owner_tokens))
    assert any(a["email"] == "mayar@example.com" for a in admins.json())

    login2 = _login(client, "mayar@example.com")
    assert login2.status_code == 200
    assert login2.json()["user"]["role"] == "admin"
    assert login2.json()["user"]["is_staff"] is True
    assert login2.json()["user"]["email"] == "mayar@example.com"

    # Still exactly one user record.
    from src.accounts.adapters.outbound.orm_models import UserModel
    assert UserModel.objects.filter(email="mayar@example.com").count() == 1


@pytest.mark.django_db
def test_approve_upgrades_existing_user_no_second_account(owner_tokens):
    client = Client()
    _register(client)
    headers = _h(_login(client, "mayar@example.com").json()["tokens"])
    client.post("/api/auth/admin-apply",
                data={"email": "mayar@example.com", "full_name": "Mayar Ali"},
                content_type="application/json", headers=headers)
    app_id = client.get("/api/auth/admin-applications", headers=_h(owner_tokens)).json()[0]["id"]
    approved = client.post(f"/api/auth/admin-applications/{app_id}/approve", headers=_h(owner_tokens))
    assert approved.status_code == 200
    assert approved.json()["user_id"] is not None

    from src.accounts.adapters.outbound.orm_models import UserModel
    users = list(UserModel.objects.filter(email="mayar@example.com"))
    assert len(users) == 1
    assert users[0].role == "admin"
    assert users[0].is_staff is True


@pytest.mark.django_db
def test_list_applications_owner_only(user_tokens):
    client = Client()
    _register(client)
    headers = _h(_login(client, "mayar@example.com").json()["tokens"])
    client.post("/api/auth/admin-apply",
                data={"email": "mayar@example.com", "full_name": "Mayar Ali"},
                content_type="application/json", headers=headers)
    denied = client.get("/api/auth/admin-applications", headers=_h(user_tokens))
    assert denied.status_code == 403


@pytest.mark.django_db
def test_waitlist_owner_only(user_tokens):
    client = Client()
    _register(client)
    headers = _h(_login(client, "mayar@example.com").json()["tokens"])
    client.post("/api/auth/admin-apply",
                data={"email": "mayar@example.com", "full_name": "Mayar Ali"},
                content_type="application/json", headers=headers)
    denied = client.post("/api/auth/admin-applications/1/waitlist", headers=_h(user_tokens))
    assert denied.status_code == 403


@pytest.mark.django_db
def test_my_admin_application_endpoint():
    client = Client()
    _register(client)
    tokens = _login(client, "mayar@example.com").json()["tokens"]
    headers = _h(tokens)
    # No application yet -> null
    res = client.get("/api/auth/my-admin-application", headers=headers)
    assert res.status_code == 200
    assert res.json() is None

    client.post("/api/auth/admin-apply",
                data={"email": "mayar@example.com", "full_name": "Mayar Ali"},
                content_type="application/json", headers=headers)
    res = client.get("/api/auth/my-admin-application", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "pending"


@pytest.mark.django_db
def test_register_always_personal():
    client = Client()
    res = client.post(
        "/api/auth/register",
        data={"email": "plain@example.com", "password": "supersecret1", "full_name": "Plain User"},
        content_type="application/json",
    )
    assert res.status_code == 201
    assert res.json()["is_staff"] is False


@pytest.mark.django_db
def test_admin_register_requires_valid_input():
    """The admin-register endpoint validates input (bad email / short password)."""
    client = Client()
    res = client.post(
        "/api/auth/admin-register",
        data={"email": "not-an-email", "password": "short", "full_name": "X"},
        content_type="application/json",
    )
    assert res.status_code == 422


# --------------------------------------------------------------------------- #
# Two request types: research admin vs organization admin
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_org_request_created_with_request_type():
    client = Client()
    _register(client, email="org@example.com", full_name="Org Rep")
    headers = _h(_login(client, "org@example.com").json()["tokens"])
    res = client.post(
        "/api/auth/admin-apply",
        data={"email": "org@example.com", "full_name": "Org Rep",
              "organization": "Example Youth NGO", "website": "", "request_type": "org",
              "reason": "We want to publish opportunities"},
        content_type="application/json",
        headers=headers,
    )
    assert res.status_code == 201, res.content
    body = res.json()
    assert body["request_type"] == "org"
    assert body["organization"] == "Example Youth NGO"
    assert body["website"] == ""  # optional website stays empty
    assert body["status"] == "pending"

    # A separate research request for the same email returns the existing one.
    res2 = client.post(
        "/api/auth/admin-apply",
        data={"email": "org@example.com", "full_name": "Org Rep", "request_type": "admin"},
        content_type="application/json",
        headers=headers,
    )
    assert res2.status_code == 201
    assert res2.json()["id"] == res.json()["id"]


@pytest.mark.django_db
def test_owner_lists_request_types_separately(owner_tokens):
    client = Client()
    # Researcher application
    _register(client, email="res@example.com", full_name="Researcher")
    h_res = _h(_login(client, "res@example.com").json()["tokens"])
    client.post("/api/auth/admin-apply",
                data={"email": "res@example.com", "full_name": "Researcher",
                      "request_type": "admin"},
                content_type="application/json", headers=h_res)
    # Org application
    _register(client, email="org2@example.com", full_name="Org Rep")
    h_org = _h(_login(client, "org2@example.com").json()["tokens"])
    client.post("/api/auth/admin-apply",
                data={"email": "org2@example.com", "full_name": "Org Rep",
                      "organization": "Green NGO", "request_type": "org"},
                content_type="application/json", headers=h_org)

    owner = _h(owner_tokens)
    all_apps = client.get("/api/auth/admin-applications", headers=owner).json()
    assert len(all_apps) == 2
    admin_apps = client.get("/api/auth/admin-applications?request_type=admin", headers=owner).json()
    org_apps = client.get("/api/auth/admin-applications?request_type=org", headers=owner).json()
    assert len(admin_apps) == 1 and admin_apps[0]["email"] == "res@example.com"
    assert len(org_apps) == 1 and org_apps[0]["email"] == "org2@example.com"


@pytest.mark.django_db
def test_org_approval_makes_org_admin_and_creates_org(owner_tokens):
    client = Client()
    _register(client, email="org3@example.com", full_name="Org Rep")
    headers = _h(_login(client, "org3@example.com").json()["tokens"])
    client.post("/api/auth/admin-apply",
                data={"email": "org3@example.com", "full_name": "Org Rep",
                      "organization": "Example Youth NGO", "request_type": "org"},
                content_type="application/json", headers=headers)
    app_id = client.get(
        "/api/auth/admin-applications?request_type=org",
        headers=_h(owner_tokens),
    ).json()[0]["id"]

    approved = client.post(
        f"/api/auth/admin-applications/{app_id}/approve",
        headers=_h(owner_tokens),
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    # The same account becomes an org admin.
    login = _login(client, "org3@example.com")
    assert login.status_code == 200
    user = login.json()["user"]
    assert user["role"] == "org_admin"
    assert user["is_staff"] is True

    # The organization was created and linked.
    from src.accounts.adapters.outbound.organization_models import Organization
    org = Organization.objects.get(name="Example Youth NGO")
    assert org.website == ""  # optional website stored empty
    from src.accounts.adapters.outbound.orm_models import UserModel
    u = UserModel.objects.get(email="org3@example.com")
    assert org in u.organizations.all()
    # Exactly one user record.
    assert UserModel.objects.filter(email="org3@example.com").count() == 1


@pytest.mark.django_db
def test_research_approval_makes_admin(owner_tokens):
    client = Client()
    _register(client, email="res2@example.com", full_name="Researcher")
    headers = _h(_login(client, "res2@example.com").json()["tokens"])
    client.post("/api/auth/admin-apply",
                data={"email": "res2@example.com", "full_name": "Researcher",
                      "request_type": "admin"},
                content_type="application/json", headers=headers)
    app_id = client.get(
        "/api/auth/admin-applications?request_type=admin",
        headers=_h(owner_tokens),
    ).json()[0]["id"]

    approved = client.post(
        f"/api/auth/admin-applications/{app_id}/approve",
        headers=_h(owner_tokens),
    )
    assert approved.status_code == 200

    login = _login(client, "res2@example.com")
    user = login.json()["user"]
    assert user["role"] == "admin"
    assert user["is_staff"] is True


@pytest.mark.django_db
def test_permissions_catalog_endpoint(owner_tokens, user_tokens):
    client = Client()
    # Regular user cannot read the catalog.
    denied = client.get("/api/auth/permissions", headers=_h(user_tokens))
    assert denied.status_code == 403
    # Owner can.
    res = client.get("/api/auth/permissions", headers=_h(owner_tokens))
    assert res.status_code == 200
    keys = [p["key"] for p in res.json()]
    assert "create_opportunity" in keys
    assert "edit_any_opportunity" in keys
    assert "manage_admins" in keys
    assert "approve_admin_applications" in keys


@pytest.mark.django_db
def test_owner_sets_admin_permissions(owner_tokens):
    from src.accounts.adapters.outbound.hasher import DjangoPasswordHasher
    from src.accounts.adapters.outbound.orm_models import UserModel
    admin = UserModel.objects.create(
        email="perm@example.com",
        full_name="Perm Admin",
        password=DjangoPasswordHasher().hash("supersecret1"),
        is_staff=True,
        role="admin",
    )
    client = Client()
    updated = client.patch(
        f"/api/auth/admins/{admin.id}",
        data={"permissions": ["create_opportunity", "edit_own_opportunity"]},
        content_type="application/json",
        headers=_h(owner_tokens),
    )
    assert updated.status_code == 200, updated.content
    assert set(updated.json()["permissions"]) == {"create_opportunity", "edit_own_opportunity"}

    # The changed permissions take effect on login (no code edit needed).
    login = _login(client, "perm@example.com")
    assert login.json()["user"]["permissions"] == ["create_opportunity", "edit_own_opportunity"]


@pytest.mark.django_db
def test_unapplied_staff_listed_and_creatable(owner_tokens):
    """A staff/admin user with NO application surfaces to the owner; the owner
    can create a pending application record for them and then act on it."""
    from src.accounts.adapters.outbound.admin_application_models import AdminApplication
    from src.accounts.adapters.outbound.hasher import DjangoPasswordHasher
    from src.accounts.adapters.outbound.orm_models import UserModel

    staff = UserModel.objects.create(
        email="direct@example.com",
        full_name="Direct Admin",
        password=DjangoPasswordHasher().hash("supersecret1"),
        is_staff=True,
        role="admin",
    )
    client = Client()
    owner = _h(owner_tokens)

    # Owner sees them as unapplied.
    unapplied = client.get("/api/auth/admin-applications/unapplied", headers=owner)
    assert unapplied.status_code == 200
    assert any(u["email"] == "direct@example.com" for u in unapplied.json())

    # Owner creates an application record for them (pending, linked).
    created = client.post(
        "/api/auth/admin-applications/create-for-user",
        data={"user_id": staff.id, "request_type": "admin"},
        content_type="application/json",
        headers=owner,
    )
    assert created.status_code == 201, created.content
    assert created.json()["status"] == "pending"
    assert created.json()["user_id"] == staff.id
    assert AdminApplication.objects.filter(user_id=staff.id).count() == 1

    # Now it appears in the normal applications list (no longer "unapplied").
    unapplied2 = client.get("/api/auth/admin-applications/unapplied", headers=owner)
    assert not any(u["email"] == "direct@example.com" for u in unapplied2.json())
    listing = client.get("/api/auth/admin-applications", headers=owner)
    assert any(a["email"] == "direct@example.com" for a in listing.json())


@pytest.mark.django_db
def test_owner_can_decline_application(owner_tokens):
    """Decline keeps the record (status=rejected) and does NOT promote the user."""
    client = Client()
    _register(client)
    headers = _h(_login(client, "mayar@example.com").json()["tokens"])
    client.post("/api/auth/admin-apply",
                data={"email": "mayar@example.com", "full_name": "Mayar Ali"},
                content_type="application/json", headers=headers)
    app_id = client.get("/api/auth/admin-applications", headers=_h(owner_tokens)).json()[0]["id"]

    declined = client.post(f"/api/auth/admin-applications/{app_id}/decline", headers=_h(owner_tokens))
    assert declined.status_code == 200, declined.content
    assert declined.json()["status"] == "rejected"
    assert declined.json()["id"] == app_id  # SAME record

    # User is NOT promoted.
    login = _login(client, "mayar@example.com")
    assert login.json()["user"]["role"] == "user"
    assert login.json()["user"]["is_staff"] is False

    # Record still exists (not deleted).
    from src.accounts.adapters.outbound.admin_application_models import AdminApplication
    assert AdminApplication.objects.filter(pk=app_id).exists()


@pytest.mark.django_db
def test_admin_register_creates_account_and_pending_request():
    """Admin Registration creates a normal account + a PENDING application.
    Website is optional (empty is fine). The user has NO admin access yet."""
    client = Client()
    res = client.post(
        "/api/auth/admin-register",
        data={"email": "reg@example.com", "password": "supersecret1",
              "full_name": "Reg User", "nickname": "reg", "organization": "Example NGO",
              "website": "", "request_type": "org"},
        content_type="application/json",
    )
    assert res.status_code == 201, res.content
    body = res.json()
    assert body["status"] == "pending"
    assert body["organization"] == "Example NGO"
    assert body["website"] == ""  # empty website stored safely
    assert body["request_type"] == "org"

    from src.accounts.adapters.outbound.admin_application_models import AdminApplication
    from src.accounts.adapters.outbound.orm_models import UserModel
    # One user, one application, linked.
    assert UserModel.objects.filter(email="reg@example.com").count() == 1
    assert AdminApplication.objects.filter(email="reg@example.com").count() == 1
    row = AdminApplication.objects.get(email="reg@example.com")
    assert row.user_id == UserModel.objects.get(email="reg@example.com").id

    # The user can log in (account exists) but is NOT an admin yet.
    login = client.post(
        "/api/auth/login",
        data={"email": "reg@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    assert login.status_code == 200
    assert login.json()["user"]["role"] == "user"
    assert login.json()["user"]["is_staff"] is False


@pytest.mark.django_db
def test_admin_register_reuses_existing_user():
    """If the email already exists, admin-register links to that user — no duplicate."""
    client = Client()
    _register(client, email="existing@example.com", full_name="Existing User")
    res = client.post(
        "/api/auth/admin-register",
        data={"email": "existing@example.com", "password": "supersecret1",
              "full_name": "Existing User", "nickname": "", "organization": "NGO",
              "website": "", "request_type": "admin"},
        content_type="application/json",
    )
    assert res.status_code == 201, res.content
    assert res.json()["status"] == "pending"

    from src.accounts.adapters.outbound.orm_models import UserModel
    assert UserModel.objects.filter(email="existing@example.com").count() == 1


@pytest.mark.django_db
def test_approved_admin_registration_becomes_admin(owner_tokens):
    """Approve an admin-registration request -> same user becomes admin."""
    client = Client()
    client.post(
        "/api/auth/admin-register",
        data={"email": "reg2@example.com", "password": "supersecret1",
              "full_name": "Reg Two", "nickname": "r2", "organization": "Green NGO",
              "website": "", "request_type": "org"},
        content_type="application/json",
    )
    app_id = client.get("/api/auth/admin-applications", headers=_h(owner_tokens)).json()[0]["id"]

    approved = client.post(f"/api/auth/admin-applications/{app_id}/approve", headers=_h(owner_tokens))
    assert approved.status_code == 200, approved.content
    assert approved.json()["status"] == "approved"
    assert approved.json()["id"] == app_id  # SAME record

    login = client.post(
        "/api/auth/login",
        data={"email": "reg2@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    assert login.status_code == 200
    assert login.json()["user"]["role"] == "org_admin"
    assert login.json()["user"]["is_staff"] is True

    # Appears in Admins.
    admins = client.get("/api/auth/admins", headers=_h(owner_tokens))
    assert any(a["email"] == "reg2@example.com" for a in admins.json())
