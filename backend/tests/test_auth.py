from app.core.security import create_access_token


def test_login_success(client, seed_test_db):
    response = client.post(
        "/api/auth/login",
        json={"email": "student.cse@test.com", "password": "studentpass"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "student.cse@test.com"
    assert data["user"]["role"] == "STUDENT"


def test_login_incorrect_password(client, seed_test_db):
    response = client.post(
        "/api/auth/login",
        json={"email": "student.cse@test.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_login_unknown_user(client, seed_test_db):
    response = client.post(
        "/api/auth/login",
        json={"email": "nonexistent@test.com", "password": "somepassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_get_me_valid_jwt(client, seed_test_db):
    student = seed_test_db["cse_student"]
    token = create_access_token(subject=student.id, role=student.role.value)
    
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == student.id
    assert data["email"] == student.email
    assert data["role"] == "STUDENT"
    assert data["department"]["name"] == "Computer Science & Engineering"


def test_get_me_without_jwt(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 403 or response.status_code == 401
