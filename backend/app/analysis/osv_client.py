"""OSV vulnerability intelligence client.

The client is deliberately independent of the analysis pipeline so it can be
reused by CLI/API integrations and tested without making network calls. OSV is
an enhancement: a failed or unavailable query never prevents a source scan
from completing.
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

OSV_QUERY_URL = os.getenv("OSV_QUERY_URL", "https://api.osv.dev/v1/query")
OSV_TIMEOUT_SECONDS = float(os.getenv("OSV_TIMEOUT_SECONDS", "8"))
OSV_CACHE_TTL_SECONDS = int(os.getenv("OSV_CACHE_TTL_SECONDS", "3600"))


@dataclass
class VulnerabilityResult:
    vulnerability_id: str
    summary: str = ""
    severity: str = "UNKNOWN"
    cvss: Optional[float] = None
    affected_versions: list[str] = field(default_factory=list)
    fixed_version: Optional[str] = None
    references: list[str] = field(default_factory=list)
    aliases: list[str] = field(default_factory=list)
    ecosystem: str = ""
    package_name: str = ""
    installed_version: str = ""


class OSVClient:
    """Small OSV v1 client with bounded timeout and process-local caching."""

    def __init__(self, timeout: float = OSV_TIMEOUT_SECONDS, cache_ttl: int = OSV_CACHE_TTL_SECONDS):
        self.timeout = timeout
        self.cache_ttl = cache_ttl
        self._cache: Dict[str, tuple[float, list[VulnerabilityResult]]] = {}

    @staticmethod
    def _key(name: str, version: str, ecosystem: str) -> str:
        return f"{ecosystem.lower()}:{name.lower()}:{version}"

    @staticmethod
    def _severity(vulnerability: dict[str, Any]) -> tuple[str, Optional[float]]:
        database = vulnerability.get("database_specific") or {}
        severity = str(database.get("severity") or "").upper()
        cvss: Optional[float] = None
        for item in vulnerability.get("severity") or []:
            score = str(item.get("score") or "")
            if score.upper().startswith("CVSS"):
                try:
                    # CVSS vectors do not contain a score; preserve UNKNOWN unless
                    # OSV supplied a numeric database_specific score.
                    cvss = float(database.get("cvss_score")) if database.get("cvss_score") is not None else None
                except (TypeError, ValueError):
                    cvss = None
        if not severity and cvss is not None:
            severity = "CRITICAL" if cvss >= 9 else "HIGH" if cvss >= 7 else "MEDIUM" if cvss >= 4 else "LOW"
        return severity or "UNKNOWN", cvss

    @staticmethod
    def _fixed_version(vulnerability: dict[str, Any]) -> Optional[str]:
        versions: list[str] = []
        for affected in vulnerability.get("affected") or []:
            for event in (affected.get("ranges") or []):
                for event_item in event.get("events") or []:
                    if event_item.get("fixed"):
                        versions.append(str(event_item["fixed"]))
        return versions[0] if versions else None

    def query_package(self, name: str, version: str, ecosystem: str) -> list[VulnerabilityResult]:
        if not name or not version or version in {"unspecified", "*"}:
            return []
        key = self._key(name, version, ecosystem)
        cached = self._cache.get(key)
        if cached and time.time() - cached[0] < self.cache_ttl:
            return cached[1]

        payload = json.dumps({"package": {"name": name, "ecosystem": ecosystem}, "version": version}).encode()
        request = Request(OSV_QUERY_URL, data=payload, headers={"Content-Type": "application/json", "Accept": "application/json"}, method="POST")
        try:
            with urlopen(request, timeout=self.timeout) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, OSError, ValueError):
            # A vulnerability feed outage must not make static analysis unavailable.
            return []

        results: list[VulnerabilityResult] = []
        for item in data.get("vulns") or []:
            severity, cvss = self._severity(item)
            results.append(VulnerabilityResult(
                vulnerability_id=str(item.get("id") or "UNKNOWN"),
                summary=str(item.get("summary") or item.get("details") or ""),
                severity=severity,
                cvss=cvss,
                affected_versions=[str(r.get("events") or r.get("introduced") or "") for a in item.get("affected") or [] for r in a.get("ranges") or []],
                fixed_version=self._fixed_version(item),
                references=[str(ref.get("url")) for ref in item.get("references") or [] if ref.get("url")],
                aliases=[str(alias) for alias in item.get("aliases") or []],
                ecosystem=ecosystem,
                package_name=name,
                installed_version=version,
            ))
        self._cache[key] = (time.time(), results)
        return results

    def query_packages(self, packages: Iterable[Any]) -> list[VulnerabilityResult]:
        findings: list[VulnerabilityResult] = []
        seen: set[tuple[str, str, str]] = set()
        for package in packages:
            ecosystem = getattr(package, "ecosystem", "") or ""
            key = (getattr(package, "name", ""), getattr(package, "version", ""), ecosystem)
            if key in seen:
                continue
            seen.add(key)
            findings.extend(self.query_package(*key))
        return findings
