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

    # Register
    reg_resp = client.post("/auth/register", json={"email": email, "password": password, "role": "DEVELOPER"})
    assert reg_resp.status_code == 200
    data = reg_resp.json()
    assert "access_token" in data
    assert data["email"] == email
    assert data["role"] == "DEVELOPER"

    # Duplicate registration should fail
    dup_resp = client.post("/auth/register", json={"email": email, "password": password})
    assert dup_resp.status_code == 400

    # Login with valid credentials
    login_resp = client.post("/auth/login", json={"email": email, "password": password})
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data

    # Login with invalid password
    bad_login = client.post("/auth/login", json={"email": email, "password": "wrongpassword"})
    assert bad_login.status_code == 401


def test_me_endpoint_authenticated_and_unauthenticated(client, auth_headers):
    # With token
    res = client.get("/auth/me", headers={"Authorization": auth_headers["Authorization"]})
    assert res.status_code == 200
    assert res.json()["email"] == auth_headers["email"]
    assert res.json()["role"] == "ANALYST"

    # Without token
    unauth = client.get("/auth/me")
    assert unauth.status_code == 401
