import json
from unittest.mock import patch

from app.analysis.osv_client import OSVClient
from app.analysis.pipeline import run_pipeline


def test_pipeline_includes_osv_vulnerabilities(tmp_path):
    (tmp_path / "requirements.txt").write_text("demo==1.0.0\n")
    vulnerability = {
        "vulnerability_id": "CVE-2026-0001",
        "package_name": "demo",
        "installed_version": "1.0.0",
        "ecosystem": "PyPI",
        "severity": "CRITICAL",
        "summary": "Demo issue",
        "affected_versions": ["introduced:0"],
        "fixed_version": "1.0.1",
        "references": [],
        "aliases": [],
    }
    class StubClient(OSVClient):
        def query_packages(self, packages):
            from app.analysis.osv_client import VulnerabilityResult
            return [VulnerabilityResult(**vulnerability)]

    result = run_pipeline(str(tmp_path), osv_client=StubClient())
    assert len(result.vulnerabilities) == 1
    assert result.vulnerabilities[0].vulnerability_id == "CVE-2026-0001"
    assert result.dependencies[0].risk == "HIGH"
