"""Dependency manifest parsing with normalized ecosystems for OSV queries."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Dict, List


@dataclass
class DependencyResult:
    name: str
    version: str
    pinned: str
    risk: str = "UNKNOWN"
    reason: str = ""
    ecosystem: str = ""
    manifest: str = ""
    direct: bool = True


def _result(name: str, version: str, ecosystem: str, manifest: str, direct: bool = True) -> DependencyResult:
    exact = bool(version and version not in {"unspecified", "*"})
    return DependencyResult(
        name=name.strip(), version=version.strip() or "unspecified", pinned="yes" if exact else "no",
        ecosystem=ecosystem, manifest=manifest, direct=direct,
        reason="OSV lookup pending" if exact else "Version is not exact; OSV requires a concrete version.",
    )


def _clean_version(value: str) -> str:
    value = value.strip().strip('"\'')
    match = re.search(r"\d+(?:\.\d+)+(?:[-+][0-9A-Za-z.-]+)?", value)
    return match.group(0) if match and value[0:1] in "=<>~^v0123456789" else "unspecified"


def parse_requirements_txt(content: str) -> List[DependencyResult]:
    results = []
    for raw in content.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or line.startswith(("-", "git+", "http:", "https:")):
            continue
        # Bare requirements are valid and intentionally remain unpinned. They
        # still count as dependencies, although OSV cannot query them safely.
        bare = re.match(r"^([A-Za-z0-9_.-]+)\s*$", line)
        if bare:
            results.append(_result(bare.group(1), "unspecified", "PyPI", "requirements.txt"))
            continue
        match = re.match(r"^([A-Za-z0-9_.-]+)\s*(?:==|===)\s*([^;\s]+)", line)
        if match:
            results.append(_result(match.group(1), _clean_version(match.group(2)), "PyPI", "requirements.txt"))
            continue
        match = re.match(r"^([A-Za-z0-9_.-]+)\s*(?:[<>=~!]+)\s*([^;\s]+)?", line)
        if match:
            results.append(_result(match.group(1), "unspecified", "PyPI", "requirements.txt"))
    return results


def parse_package_json(content: str) -> List[DependencyResult]:
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return []
    results = []
    for section, direct in (("dependencies", True), ("devDependencies", True)):
        for name, spec in (data.get(section) or {}).items():
            version = _clean_version(str(spec)) if re.match(r"^[=~^]?v?\d", str(spec)) else "unspecified"
            results.append(_result(name, version, "npm", "package.json", direct))
    return results


def parse_package_lock(content: str) -> List[DependencyResult]:
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return []
    results = []
    packages = data.get("packages") or {}
    for path, package in packages.items():
        if not path or not isinstance(package, dict) or not package.get("version"):
            continue
        name = path.rsplit("node_modules/", 1)[-1]
        results.append(_result(name, str(package["version"]), "npm", "package-lock.json", "/node_modules/" not in path))
    return results


def parse_pyproject(content: str) -> List[DependencyResult]:
    results = []
    in_dependencies = False
    for raw in content.splitlines():
        line = raw.strip()
        if line.startswith("dependencies") and "[" in line:
            in_dependencies = True
        if in_dependencies:
            match = re.search(r"[\"']([A-Za-z0-9_.-]+)(?:\s*(?:==|>=|~=)\s*([^\"']+))?[\"']", line)
            if match:
                results.append(_result(match.group(1), _clean_version(match.group(2) or ""), "PyPI", "pyproject.toml"))
            if "]" in line:
                in_dependencies = False
    return results


def parse_pom(content: str) -> List[DependencyResult]:
    results = []
    for block in re.findall(r"<dependency>(.*?)</dependency>", content, flags=re.S):
        group = re.search(r"<groupId>\s*([^<]+)", block)
        artifact = re.search(r"<artifactId>\s*([^<]+)", block)
        version = re.search(r"<version>\s*([^<]+)", block)
        if group and artifact:
            results.append(_result(f"{group.group(1).strip()}:{artifact.group(1).strip()}", _clean_version(version.group(1)) if version else "unspecified", "Maven", "pom.xml"))
    return results


def parse_go_mod(content: str) -> List[DependencyResult]:
    results = []
    for line in content.splitlines():
        match = re.match(r"\s*(?:require\s+)?(\S+)\s+(v\S+)", line)
        if match and not line.strip().startswith("module "):
            results.append(_result(match.group(1), _clean_version(match.group(2)), "Go", "go.mod"))
    return results


def parse_cargo(content: str) -> List[DependencyResult]:
    results = []
    in_deps = False
    for raw in content.splitlines():
        line = raw.strip()
        if line == "[dependencies]":
            in_deps = True
            continue
        if line.startswith("["):
            in_deps = False
        if in_deps and "=" in line and not line.startswith("#"):
            name, spec = line.split("=", 1)
            results.append(_result(name.strip(), _clean_version(spec), "crates.io", "Cargo.toml"))
    return results


def analyze_repository(files: Dict[str, str]) -> List[DependencyResult]:
    parsers = {
        "requirements.txt": parse_requirements_txt, "package.json": parse_package_json,
        "package-lock.json": parse_package_lock, "pyproject.toml": parse_pyproject,
        "pom.xml": parse_pom, "go.mod": parse_go_mod, "Cargo.toml": parse_cargo,
    }
    results: List[DependencyResult] = []
    for path, content in files.items():
        parser = parsers.get(path.rsplit("/", 1)[-1])
        if parser:
            results.extend(parser(content))
    unique = {}
    for item in results:
        unique[(item.name.lower(), item.version, item.ecosystem)] = item
    return list(unique.values())
