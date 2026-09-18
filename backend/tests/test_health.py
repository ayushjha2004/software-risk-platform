from fastapi import FastAPI


def test_app_starts_without_auth_errors():
    from app.main import app
    assert isinstance(app, FastAPI)
