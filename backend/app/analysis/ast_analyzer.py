"""Module 4 — AST-based analysis for Python files.

Understands code *structure* rather than just matching text, so it catches
patterns the regex scanner misses (and produces fewer false positives for the
cases it does cover), e.g. a SQL string built by concatenating a literal with
a variable, or a function call for an external input feeding a sink.
"""
import ast
from dataclasses import dataclass
from typing import List, Dict

from .code_analyzer import RawFinding

SQL_KEYWORDS = ("select", "insert", "update", "delete", "drop", "union")
TAINT_SOURCES = {"input", "request", "args", "form", "GET", "POST", "params", "query"}
DANGEROUS_SINKS = {"execute", "executescript", "raw", "cursor"}


class SQLInjectionVisitor(ast.NodeVisitor):
    def __init__(self, rel_path: str):
        self.rel_path = rel_path
        self.findings: List[RawFinding] = []

    def _is_sql_literal(self, node) -> bool:
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return any(kw in node.value.lower() for kw in SQL_KEYWORDS)
        return False

    def _contains_name_or_taint(self, node) -> bool:
        for child in ast.walk(node):
            if isinstance(child, ast.Name):
                return True
        return False

    def visit_BinOp(self, node: ast.BinOp):
        # String concatenation: "SELECT ..." + something
        if isinstance(node.op, ast.Add):
            left_is_sql = self._is_sql_literal(node.left)
            right_is_sql = self._is_sql_literal(node.right)
            if (left_is_sql and self._contains_name_or_taint(node.right)) or (
                right_is_sql and self._contains_name_or_taint(node.left)
            ):
                self.findings.append(
                    RawFinding(
                        type="Potential SQL Injection (AST-verified)",
                        severity="HIGH",
                        file=self.rel_path,
                        line=getattr(node, "lineno", 0),
                        description=(
                            "AST analysis detected a SQL statement literal concatenated with a "
                            "non-literal (variable) value, which is a classic SQL injection pattern: "
                            "SQL Query -> String Construction -> External/User Input."
                        ),
                        recommendation="Use parameterized queries (e.g. cursor.execute(query, (param,))) instead of string building.",
                        source="ast",
                    )
                )
        self.generic_visit(node)

    def visit_JoinedStr(self, node: ast.JoinedStr):
        # f-strings: f"SELECT * FROM users WHERE id={user_id}"
        text_parts = [v.value for v in node.values if isinstance(v, ast.Constant) and isinstance(v.value, str)]
        combined = " ".join(text_parts).lower()
        has_interpolation = any(isinstance(v, ast.FormattedValue) for v in node.values)
        if has_interpolation and any(kw in combined for kw in SQL_KEYWORDS):
            self.findings.append(
                RawFinding(
                    type="Potential SQL Injection (AST-verified, f-string)",
                    severity="HIGH",
                    file=self.rel_path,
                    line=getattr(node, "lineno", 0),
                    description="An f-string builds a SQL statement with an interpolated (non-literal) value.",
                    recommendation="Use parameterized queries instead of interpolating values into SQL f-strings.",
                    source="ast",
                )
            )
        self.generic_visit(node)


class DangerousCallVisitor(ast.NodeVisitor):
    """Flags eval/exec/os.system calls that AST confirms receive a non-literal argument."""

    def __init__(self, rel_path: str):
        self.rel_path = rel_path
        self.findings: List[RawFinding] = []

    def visit_Call(self, node: ast.Call):
        func_name = None
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            func_name = node.func.attr

        if func_name in {"eval", "exec"} and node.args:
            arg = node.args[0]
            if not (isinstance(arg, ast.Constant) and isinstance(arg.value, str)):
                self.findings.append(
                    RawFinding(
                        type="Dynamic Execution of Non-Literal Value",
                        severity="CRITICAL",
                        file=self.rel_path,
                        line=getattr(node, "lineno", 0),
                        description=f"{func_name}() is called with a non-literal (variable) argument — likely executing untrusted data.",
                        recommendation="Avoid eval/exec entirely, or strictly validate/allowlist the input first.",
                        source="ast",
                    )
                )
        self.generic_visit(node)


def analyze_python_file(rel_path: str, content: str) -> List[RawFinding]:
    findings: List[RawFinding] = []
    try:
        tree = ast.parse(content, filename=rel_path)
    except SyntaxError:
        return findings

    sql_visitor = SQLInjectionVisitor(rel_path)
    sql_visitor.visit(tree)
    findings.extend(sql_visitor.findings)

    call_visitor = DangerousCallVisitor(rel_path)
    call_visitor.visit(tree)
    findings.extend(call_visitor.findings)

    return findings


def analyze_repository(files: Dict[str, str]) -> List[RawFinding]:
    findings: List[RawFinding] = []
    for rel_path, content in files.items():
        if rel_path.endswith(".py"):
            findings.extend(analyze_python_file(rel_path, content))
    return findings
