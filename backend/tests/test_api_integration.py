import io
import zipfile


def test_full_analysis_and_report_flow(client, auth_headers):
    token = auth_headers["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a zip with sample vulnerable code
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr(
            "app.py",
            "import os, hashlib\n"
            "password = 'hardcoded_secret_123'\n"
            "os.system('ls')\n"
            "def hash_val(v): return hashlib.md5(v.encode()).hexdigest()\n"
        )
        zf.writestr("requirements.txt", "flask\npyyaml==5.3.1\n")
    zip_buffer.seek(0)

    # 2. Upload
    upload_res = client.post(
        "/projects/upload",
        files={"file": ("integration_test.zip", zip_buffer, "application/zip")},
        headers=headers,
    )
    assert upload_res.status_code == 200
    project_id = upload_res.json()["id"]

    # 3. Trigger Analysis
    run_res = client.post(f"/analysis/{project_id}/run", headers=headers)
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["status"] == "COMPLETE"
    assert run_data["security_findings"] >= 3
    assert run_data["dependencies_count"] == 2
    assert run_data["risk_category"] in ("LOW", "MEDIUM", "HIGH")
    assert run_data["risk_score"] > 0

    # 4. Get Latest Analysis Details
    latest_res = client.get(f"/analysis/{project_id}/latest", headers=headers)
    assert latest_res.status_code == 200
    detail = latest_res.json()
    assert "findings" in detail
    assert "dependencies" in detail
    assert "file_risks" in detail
    assert len(detail["findings"]) >= 3

    # 5. Download Report with Authorization header
    report_res = client.get(f"/analysis/{project_id}/report", headers=headers)
    assert report_res.status_code == 200
    assert report_res.headers["content-type"] == "application/pdf"
    assert len(report_res.content) > 1000

    # 6. Download Report with query param token (browser flow)
    report_query_res = client.get(f"/analysis/{project_id}/report?token={token}")
    assert report_query_res.status_code == 200
    assert report_query_res.headers["content-type"] == "application/pdf"
    assert len(report_query_res.content) > 1000

    # 7. Unauthenticated request to report should fail with 401
    unauth_res = client.get(f"/analysis/{project_id}/report")
    assert unauth_res.status_code == 401


def test_analysis_nonexistent_project(client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    res = client.post("/analysis/999999/run", headers=headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Project not found"


def test_sample_project_end_to_end(client, auth_headers):
    import os
    token = auth_headers["token"]
    headers = {"Authorization": f"Bearer {token}"}

    sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sample-project"))
    assert os.path.exists(sample_dir)

    # Package sample-project into zip in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        for root, _, files in os.walk(sample_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, sample_dir)
                zf.write(full_path, arcname=rel_path)
    zip_buffer.seek(0)

    # Upload sample project
    upload_res = client.post(
        "/projects/upload",
        files={"file": ("ai-chatbot-sample.zip", zip_buffer, "application/zip")},
        headers=headers,
    )
    assert upload_res.status_code == 200
    project_id = upload_res.json()["id"]

    # Run analysis
    run_res = client.post(f"/analysis/{project_id}/run", headers=headers)
    assert run_res.status_code == 200
    data = run_res.json()
    assert data["status"] == "COMPLETE"
    # Sample project has ~15-19 findings as documented
    assert data["security_findings"] >= 15
    assert data["critical_findings"] >= 4
    assert data["high_findings"] >= 5
    assert data["dependencies_count"] == 4
    assert data["risk_category"] in ("MEDIUM", "HIGH")
    assert data["risk_score"] >= 40

    # Fetch latest analysis
    detail_res = client.get(f"/analysis/{project_id}/latest", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["findings"]) >= 15
    assert len(detail["dependencies"]) == 4
    assert len(detail["file_risks"]) >= 3

    # Fetch report
    pdf_res = client.get(f"/analysis/{project_id}/report", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1500
