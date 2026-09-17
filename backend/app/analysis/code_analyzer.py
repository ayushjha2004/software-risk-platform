"""Module 3 — Regex/pattern-based source code security scanning.

Flags *potential* findings (static analysis produces false positives — the
platform reports candidates for a human to triage, per the project spec).
"""
import re
from dataclasses import dataclass
from typing import List, Dict

TEXT_EXTENSIONS = {".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".php", ".rb", ".go"}


@dataclass
class RawFinding:
    type: str
    severity: str
    file: str
    line: int
    description: str
    recommendation: str
    source: str = "regex"


# Each rule: (name, severity, compiled regex, description, recommendation)
RULES = [
    (
        "Hardcoded Credential",
        "CRITICAL",
        re.compile(r"""(?i)\b\w*(password|passwd|pwd|secret|api_key|apikey|access_key|token)\w*\s*=\s*["'][^"'\n]{3,}["']"""),
        "A credential-like value appears to be hardcoded directly in source code.",
        "Move secrets to environment variables or a secrets manager (e.g. Vault, AWS Secrets Manager); never commit them.",
    ),
    (
        "Hardcoded AWS Key",
        "CRITICAL",
        re.compile(r"""AKIA[0-9A-Z]{16}"""),
        "A string matching the AWS Access Key ID pattern was found in source.",
        "Revoke this key immediately and load credentials from the environment or an IAM role.",
    ),
    (
        "Command Injection",
        "HIGH",
        re.compile(r"""\bos\.system\s*\(|\bsubprocess\.(call|run|Popen)\([^)]*shell\s*=\s*True"""),
        "User-influenced input may reach a shell command execution sink.",
        "Avoid shell=True; use subprocess with a list of arguments and validate/allowlist input.",
    ),
    (
        "Dangerous Dynamic Execution",
        "HIGH",
        re.compile(r"""\b(eval|exec)\s*\("""),
        "Use of eval()/exec() can allow arbitrary code execution if input is attacker-influenced.",
        "Avoid eval/exec; use safe parsing (json.loads, ast.literal_eval) or explicit dispatch tables.",
    ),
    (
        "Potential SQL Injection (string build)",
        "HIGH",
        re.compile(r"""(?i)(select|insert|update|delete)\s+.*['"]\s*\+|f["']\s*(select|insert|update|delete)"""),
        "A SQL statement appears to be built via string concatenation/f-strings rather than parameters.",
        "Use parameterized queries / prepared statements (e.g. cursor.execute(query, params)).",
    ),
    (
        "Unsafe Deserialization",
        "HIGH",
        re.compile(r"""\bpickle\.loads?\(|\byaml\.load\((?!.*Loader=yaml\.SafeLoader)"""),
        "Deserializing untrusted data with pickle or unsafe yaml.load can lead to code execution.",
        "Use pickle only with trusted data, or switch to json; use yaml.safe_load for YAML.",
    ),
    (
        "Path Traversal Risk",
        "MEDIUM",
        re.compile(r"""open\([^)]*request\.|open\([^)]*\+\s*[a-zA-Z_]+\)"""),
        "A file path built from external/user input is passed to open() without sanitization.",
        "Validate and normalize paths (os.path.abspath) and restrict to an allowed base directory.",
    ),
    (
        "Weak Cryptographic Hash",
        "MEDIUM",
        re.compile(r"""\bhashlib\.(md5|sha1)\("""),
        "MD5/SHA1 are not suitable for security-sensitive hashing (e.g. passwords, integrity checks).",
        "Use hashlib.sha256 or better; for passwords use bcrypt/scrypt/argon2/PBKDF2 with a salt.",
    ),
    (
        "Insecure Random for Security Purpose",
        "MEDIUM",
        re.compile(r"""(?i)(token|secret|password|otp)[^\n]{0,30}random\.(random|randint|choice)\("""),
        "The 'random' module is not cryptographically secure and was used near a security-sensitive value.",
        "Use the 'secrets' module (secrets.token_hex, secrets.choice) for tokens, OTPs, and passwords.",
    ),
    (
        "Missing Input Validation (raw request use)",
        "LOW",
        re.compile(r"""request\.(args|form|GET|POST)\[[^\]]+\]"""),
        "Request parameters are used without visible validation/sanitization nearby.",
        "Validate and sanitize all external input (type, length, allowlist) before use.",
    ),
    (
        "Debug Mode Enabled",
        "MEDIUM",
        re.compile(r"""debug\s*=\s*True"""),
        "Debug mode appears enabled, which can leak stack traces and internals in production.",
        "Disable debug mode in production; drive it from an environment variable.",
    ),
]


def scan_file(rel_path: str, content: str) -> List[RawFinding]:
    findings: List[RawFinding] = []
    for name, severity, pattern, desc, rec in RULES:
        for match in pattern.finditer(content):
            line_no = content.count("\n", 0, match.start()) + 1
            findings.append(
                RawFinding(
                    type=name,
                    severity=severity,
                    file=rel_path,
                    line=line_no,
                    description=desc,
                    recommendation=rec,
                    source="regex",
                )
            )
    return findings


def scan_repository(files: Dict[str, str]) -> List[RawFinding]:
    """files: {relative_path: content} for text files already read from disk."""
    all_findings: List[RawFinding] = []
    for rel_path, content in files.items():
        if not any(rel_path.endswith(ext) for ext in TEXT_EXTENSIONS):
            continue
        all_findings.extend(scan_file(rel_path, content))
    return all_findings
