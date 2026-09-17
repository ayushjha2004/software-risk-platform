import io
import os
import zipfile
import pytest
from app.routers.projects_router import _safe_extract


def test_safe_extract_rejects_zip_slip(tmp_path):
    dest = tmp_path / "extracted"
    dest.mkdir()
    outside_file = tmp_path / "escaped.txt"

    # Create a malicious zip with traversal path
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("valid.txt", "safe content")
        # Attempt to write outside dest dir
        zf.writestr("../escaped.txt", "malicious payload")
    zip_buffer.seek(0)

    zip_file_path = tmp_path / "test_slip.zip"
    with open(zip_file_path, "wb") as f:
        f.write(zip_buffer.getvalue())

    _safe_extract(str(zip_file_path), str(dest))

    assert (dest / "valid.txt").exists()
    assert (dest / "valid.txt").read_text() == "safe content"
    assert not outside_file.exists()


def test_upload_requires_zip_extension(client, auth_headers):
    file_content = b"plain text content"
    res = client.post(
        "/projects/upload",
        files={"file": ("readme.txt", io.BytesIO(file_content), "text/plain")},
        headers={"Authorization": auth_headers["Authorization"]},
    )
    assert res.status_code == 400
    assert "Only .zip uploads are supported" in res.json()["detail"]


def test_upload_rejects_corrupt_zip(client, auth_headers):
    corrupt_content = b"this is not a zip file at all"
    res = client.post(
        "/projects/upload",
        files={"file": ("test.zip", io.BytesIO(corrupt_content), "application/zip")},
        headers={"Authorization": auth_headers["Authorization"]},
    )
    assert res.status_code == 400


def test_upload_valid_zip(client, auth_headers):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("main.py", "print('hello world')\n")
    zip_buffer.seek(0)

    res = client.post(
        "/projects/upload",
        files={"file": ("my-project.zip", zip_buffer, "application/zip")},
        headers={"Authorization": auth_headers["Authorization"]},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "my-project"
    assert "id" in data
