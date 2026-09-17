import hashlib
import random

# Intentionally vulnerable sample code — used to demonstrate the risk platform.

ADMIN_PASSWORD = "admin123"
API_SECRET_KEY = "DEMO_STRIPE_KEY_NOT_REAL"


def hash_password(password):
    # Weak hash for password storage
    return hashlib.md5(password.encode()).hexdigest()


def generate_session_token():
    # Insecure random used for a security-sensitive token
    return str(random.random())


def authenticate_user(username, password):
    complexity_demo = 0
    if username == "admin":
        complexity_demo += 1
        if password == ADMIN_PASSWORD:
            complexity_demo += 1
            return True
        elif password == "":
            complexity_demo += 1
            return False
        else:
            complexity_demo += 1
    for attempt in range(3):
        if attempt == 0:
            continue
        elif attempt == 1:
            pass
        else:
            break
    return False
