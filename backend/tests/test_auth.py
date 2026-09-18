"""Auth tests for valid, expired, revoked, logout, refresh, rotation, and cleanup flows."""
from datetime import datetime, timedelta, timezone

from app import models
from app.auth import hash_password, verify_password


def test_password_hashing():
    password = "secret_password"
    pwd_hash, salt = hash_password(password)
    assert pwd_hash is not None
    assert salt is not None
    assert verify_password(password, salt, pwd_hash) is True
    assert verify_password("wrong_password", salt, pwd_hash) is False


def test_register_and_login(client):
    email = "newuser@example.com"
    password = "validpassword123"
    reg_resp = client.post("/auth/register", json={"email": email, "password": password, "role": "DEVELOPER"})
    assert reg_resp.status_code == 200
    body = reg_resp.json()
    assert "access_token" in body and "refresh_token" in body
    assert body["email"] == email
    assert body["role"] == "DEVELOPER"

    login_resp = client.post("/auth/login", json={"email": email, "password": password})
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    bad_login = client.post("/auth/login", json={"email": email, "password": "wrongpassword"})
    assert bad_login.status_code == 401


def test_me_endpoint_authenticated_and_unauthenticated(client, auth_headers):
    res = client.get("/auth/me", headers={"Authorization": auth_headers["Authorization"]})
    assert res.status_code == 200
    assert res.json()["email"] == auth_headers["email"]
    assert res.json()["role"] == "ANALYST"

    unauth = client.get("/auth/me")
    assert unauth.status_code == 401


def test_expired_token_is_rejected(client, db_session):
    user = models.User(email="expired@example.com", password_hash="hash", salt="salt", role="DEVELOPER")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    token = models.Token(token="expired-token", token_hash="expired-hash", user_id=user.id, kind="access", expires_at=datetime.now(timezone.utc) - timedelta(minutes=5), revoked=False)
    db_session.add(token)
    db_session.commit()
    res = client.get("/auth/me", headers={"Authorization": "Bearer expired-token"})
    assert res.status_code == 401


def test_revoked_token_is_rejected(client, db_session):
    user = models.User(email="revoked@example.com", password_hash="hash", salt="salt", role="DEVELOPER")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    token = models.Token(token="revoked-token", token_hash="revoked-hash", user_id=user.id, kind="access", expires_at=datetime.now(timezone.utc) + timedelta(minutes=30), revoked=True)
    db_session.add(token)
    db_session.commit()
    res = client.get("/auth/me", headers={"Authorization": "Bearer revoked-token"})
    assert res.status_code == 401


def test_logout_revokes_current_session(client):
    reg = client.post("/auth/register", json={"email": "logout@example.com", "password": "pw123456"})
    token = reg.json()["access_token"]
    logout = client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout.status_code == 200
    assert logout.json()["message"] == "Logged out successfully"
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 401


def test_refresh_rotates_token(client):
    reg = client.post("/auth/register", json={"email": "refresh@example.com", "password": "pw123456"})
    refresh_token = reg.json()["refresh_token"]
    res = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["refresh_token"] != refresh_token

    reused = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert reused.status_code == 401


def test_refresh_token_expiration_and_revocation(client, db_session):
    user = models.User(email="tokenflow@example.com", password_hash="hash", salt="salt", role="DEVELOPER")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    expired = models.Token(token="expired-refresh", token_hash="expired-refresh-hash", user_id=user.id, kind="refresh", expires_at=datetime.now(timezone.utc) - timedelta(days=1), revoked=False)
    db_session.add(expired)
    revoked = models.Token(token="revoked-refresh", token_hash="revoked-refresh-hash", user_id=user.id, kind="refresh", expires_at=datetime.now(timezone.utc) + timedelta(days=1), revoked=True)
    db_session.add(revoked)
    db_session.commit()
    expired_res = client.post("/auth/refresh", json={"refresh_token": "expired-refresh"})
    revoked_res = client.post("/auth/refresh", json={"refresh_token": "revoked-refresh"})
    assert expired_res.status_code == 401
    assert revoked_res.status_code == 401


def test_cleanup_removes_expired_and_revoked_tokens(client, db_session):
    user = models.User(email="cleanup@example.com", password_hash="hash", salt="salt", role="DEVELOPER")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    db_session.add(models.Token(token="valid-token", token_hash="valid-hash", user_id=user.id, kind="access", expires_at=datetime.now(timezone.utc) + timedelta(minutes=30), revoked=False))
    db_session.add(models.Token(token="expired-token", token_hash="expired-hash", user_id=user.id, kind="access", expires_at=datetime.now(timezone.utc) - timedelta(minutes=1), revoked=False))
    db_session.add(models.Token(token="revoked-token", token_hash="revoked-hash", user_id=user.id, kind="access", expires_at=datetime.now(timezone.utc) + timedelta(minutes=30), revoked=True))
    db_session.commit()
    deleted = client.app.dependency_overrides.get(None)
    from app.auth import cleanup_expired_tokens
    count = cleanup_expired_tokens(db_session)
    assert count >= 2
    remaining = db_session.query(models.Token).all()
    assert any(row.token == "valid-token" for row in remaining)


def test_multiple_sessions_are_independent(client):
    reg_a = client.post("/auth/register", json={"email": "multi-a@example.com", "password": "pw123456"})
    reg_b = client.post("/auth/register", json={"email": "multi-b@example.com", "password": "pw123456"})
    token_a = reg_a.json()["access_token"]
    token_b = reg_b.json()["access_token"]
    client.post("/auth/logout", headers={"Authorization": f"Bearer {token_a}"})
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {token_a}"}).status_code == 401
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {token_b}"}).status_code == 200
