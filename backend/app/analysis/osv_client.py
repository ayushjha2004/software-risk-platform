"""OSV vulnerability intelligence client."""
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
        cvss: Optional[float] = None
        # OSV records commonly expose a numeric score in database_specific.
        # Some feeds use cvss_score, others use cvss or a nested score object.
        for candidate in (database.get("cvss_score"), database.get("cvss"), database.get("cvssV3Score")):
            if isinstance(candidate, (int, float)):
                cvss = float(candidate)
                break
            if isinstance(candidate, str):
                try:
                    cvss = float(candidate)
                    break
                except ValueError:
                    pass
        severity = str(database.get("severity") or "").upper()
        if not severity and cvss is not None:
            severity = "CRITICAL" if cvss >= 9 else "HIGH" if cvss >= 7 else "MEDIUM" if cvss >= 4 else "LOW"
        return severity or "UNKNOWN", cvss

    @staticmethod
    def _fixed_version(vulnerability: dict[str, Any]) -> Optional[str]:
        for affected in vulnerability.get("affected") or []:
            for version_range in affected.get("ranges") or []:
                for event in version_range.get("events") or []:
                    if event.get("fixed"):
                        return str(event["fixed"])
        return None

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
            return []
        results: list[VulnerabilityResult] = []
        for item in data.get("vulns") or []:
            severity, cvss = self._severity(item)
            events = [event for affected in item.get("affected") or [] for version_range in affected.get("ranges") or [] for event in version_range.get("events") or []]
            results.append(VulnerabilityResult(
                vulnerability_id=str(item.get("id") or "UNKNOWN"), summary=str(item.get("summary") or item.get("details") or ""), severity=severity, cvss=cvss,
                affected_versions=[str(event) for event in events], fixed_version=self._fixed_version(item),
                references=[str(ref.get("url")) for ref in item.get("references") or [] if ref.get("url")], aliases=[str(alias) for alias in item.get("aliases") or []],
                ecosystem=ecosystem, package_name=name, installed_version=version,
            ))
        self._cache[key] = (time.time(), results)
        return results

    def query_packages(self, packages: Iterable[Any]) -> list[VulnerabilityResult]:
        findings: list[VulnerabilityResult] = []
        seen: set[tuple[str, str, str]] = set()
        for package in packages:
            key = (getattr(package, "name", ""), getattr(package, "version", ""), getattr(package, "ecosystem", "") or "")
            if key in seen:
                continue
            seen.add(key)
            findings.extend(self.query_package(*key))
        return findings
