import json
from unittest.mock import patch

from app.analysis.dependency_analyzer import analyze_repository, parse_package_json, parse_requirements_txt
from app.analysis.osv_client import OSVClient


def test_supported_manifests_are_normalized():
    files = {
        "requirements.txt": "requests==2.31.0\nflask>=3.0\n",
        "package.json": json.dumps({"dependencies": {"lodash": "4.17.21"}}),
        "pom.xml": "<dependencies><dependency><groupId>org.example</groupId><artifactId>demo</artifactId><version>1.2.3</version></dependency></dependencies>",
        "go.mod": "module example\n\nrequire example.com/lib v1.2.3",
        "Cargo.toml": "[dependencies]\nserde = \"1.0.0\"",
    }
    dependencies = analyze_repository(files)
    assert {(item.name, item.ecosystem) for item in dependencies} >= {
        ("requests", "PyPI"), ("lodash", "npm"), ("org.example:demo", "Maven"),
        ("example.com/lib", "Go"), ("serde", "crates.io"),
    }
    assert next(item for item in dependencies if item.name == "requests").version == "2.31.0"


def test_invalid_manifests_fail_closed():
    assert parse_package_json("not json") == []
    assert parse_requirements_txt("-r other.txt\ngit+https://example.invalid/pkg") == []


def test_osv_client_normalizes_response_and_caches():
    response = {
        "vulns": [{
            "id": "GHSA-test",
            "aliases": ["CVE-2026-0001"],
            "summary": "Test vulnerability",
            "database_specific": {"severity": "HIGH", "cvss_score": 8.1},
            "affected": [{"ranges": [{"events": [{"introduced": "0"}, {"fixed": "2.0.0"}]}]}],
            "references": [{"url": "https://example.invalid/advisory"}],
        }]
    }

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def read(self):
            return json.dumps(response).encode()

    client = OSVClient(timeout=1, cache_ttl=60)
    with patch("app.analysis.osv_client.urlopen", return_value=FakeResponse()) as request:
        first = client.query_package("requests", "2.31.0", "PyPI")
        second = client.query_package("requests", "2.31.0", "PyPI")
    assert request.call_count == 1
    assert first[0].vulnerability_id == "GHSA-test"
    assert first[0].fixed_version == "2.0.0"
    assert first[0].cvss == 8.1
    assert second == first


def test_osv_failure_does_not_break_scan():
    client = OSVClient(timeout=1)
    with patch("app.analysis.osv_client.urlopen", side_effect=OSError("offline")):
        assert client.query_package("requests", "2.31.0", "PyPI") == []
