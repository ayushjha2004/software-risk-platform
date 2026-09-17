"""Module 5 — Dependency analysis.

Parses common manifest files (requirements.txt, package.json) and assigns a
heuristic risk rating. This ships with a small offline table of packages that
have had notable historical CVEs, purely so the demo has something to show —
for a real deployment, wire this up to a live source such as the OSV API
(https://osv.dev) or GitHub Advisory Database instead of the static table.
"""
import json
import re
from dataclasses import dataclass
from typing import List, Dict

# Small illustrative table: package -> (risk, reason). NOT a live vulnerability feed.
KNOWN_RISK_PACKAGES = {
    "flask": ("MEDIUM", "Historical CVEs in older versions; keep pinned to a recent release."),
    "django": ("MEDIUM", "Historical CVEs in older versions; keep pinned to a recent release."),
    "requests": ("LOW", "Generally well-maintained; check version for CVE-2023-32681 class issues."),
    "pyyaml": ("HIGH", "Older versions vulnerable to unsafe yaml.load code execution (CVE-2020-1747/14343)."),
    "urllib3": ("MEDIUM", "Several historical CVEs around redirect/auth handling; keep current."),
    "pillow": ("MEDIUM", "Frequent historical CVEs in image parsing; keep current."),
    "lodash": ("MEDIUM", "Historical prototype-pollution CVEs in older versions."),
    "express": ("LOW", "Generally well-maintained; verify middleware versions."),
    "log4j": ("HIGH", "Log4Shell (CVE-2021-44228) class of critical RCE issues in old versions."),
    "jquery": ("MEDIUM", "Historical XSS CVEs in versions < 3.5.0."),
    "numpy": ("LOW", "Generally well-maintained."),
    "cryptography": ("LOW", "Actively maintained; verify version currency."),
    "paramiko": ("MEDIUM", "Historical CVEs around auth bypass; keep current."),
    "jinja2": ("LOW", "Generally well-maintained; verify autoescape settings."),
}


@dataclass
class DependencyResult:
    name: str
    version: str
    pinned: str
    risk: str
    reason: str


def _classify(name: str, pinned: bool) -> DependencyResult:
    key = name.lower()
    risk, reason = KNOWN_RISK_PACKAGES.get(key, ("LOW", "No known-risk entry found (checked against an offline reference table only)."))
    if not pinned:
        # Bump risk one level and note the reason if unpinned
        bump = {"LOW": "MEDIUM", "MEDIUM": "HIGH", "HIGH": "HIGH"}
        risk = bump.get(risk, risk)
        reason = (reason + " Version is unpinned, which makes the effective risk unpredictable.").strip()
    return DependencyResult(name=name, version="unspecified" if not pinned else "pinned", pinned="yes" if pinned else "no", risk=risk, reason=reason)


def parse_requirements_txt(content: str) -> List[DependencyResult]:
    results = []
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        match = re.match(r"^([A-Za-z0-9_.\-]+)\s*(==|>=|<=|~=|>|<)?\s*([A-Za-z0-9_.\-]*)$", line)
        if not match:
            continue
        name, operator, version = match.groups()
        pinned = operator == "==" and bool(version)
        result = _classify(name, pinned)
        if pinned:
            result.version = version
        results.append(result)
    return results


def parse_package_json(content: str) -> List[DependencyResult]:
    results = []
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return results
    deps = {}
    deps.update(data.get("dependencies", {}) or {})
    deps.update(data.get("devDependencies", {}) or {})
    for name, version_spec in deps.items():
        pinned = bool(re.match(r"^\d+\.\d+\.\d+$", str(version_spec)))
        result = _classify(name, pinned)
        result.version = str(version_spec)
        results.append(result)
    return results


def analyze_repository(files: Dict[str, str]) -> List[DependencyResult]:
    results: List[DependencyResult] = []
    for rel_path, content in files.items():
        base = rel_path.split("/")[-1]
        if base == "requirements.txt":
            results.extend(parse_requirements_txt(content))
        elif base == "package.json":
            results.extend(parse_package_json(content))
    return results
