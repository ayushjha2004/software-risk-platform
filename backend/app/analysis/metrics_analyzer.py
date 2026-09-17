"""Module 6 — Software complexity / size metrics.

Tries to use `radon` for accurate cyclomatic complexity on Python files if it
is installed; otherwise falls back to a simple branch-counting heuristic so
the platform still works with zero extra dependencies.
"""
import ast
import re
from dataclasses import dataclass
from typing import Dict

try:
    from radon.complexity import cc_visit  # type: ignore
    HAVE_RADON = True
except ImportError:
    HAVE_RADON = False


@dataclass
class RepoMetrics:
    loc: int
    complexity: float          # average cyclomatic complexity across functions
    functions_count: int
    classes_count: int
    files_count: int


def _heuristic_complexity(content: str) -> int:
    """Approximate cyclomatic complexity: 1 + count of branch/loop keywords."""
    branch_pattern = re.compile(
        r"\b(if|elif|for|while|except|and|or|case)\b|\?\s*[^:]+:"
    )
    return 1 + len(branch_pattern.findall(content))


def _python_metrics(content: str):
    functions = 0
    classes = 0
    complexities = []

    if HAVE_RADON:
        try:
            for block in cc_visit(content):
                functions += 1
                complexities.append(block.complexity)
        except Exception:
            pass

    try:
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                classes += 1
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and not HAVE_RADON:
                functions += 1
                func_src = ast.get_source_segment(content, node) or ""
                complexities.append(_heuristic_complexity(func_src))
    except SyntaxError:
        pass

    return functions, classes, complexities


def _generic_metrics(content: str):
    functions = len(re.findall(r"\bfunction\s+\w+\s*\(|=>\s*{|\bdef\s+\w+\s*\(", content))
    classes = len(re.findall(r"\bclass\s+\w+", content))
    complexity = _heuristic_complexity(content) if functions else 1
    return functions, classes, [complexity] if functions else []


def analyze_repository(files: Dict[str, str]) -> RepoMetrics:
    total_loc = 0
    total_functions = 0
    total_classes = 0
    all_complexities = []
    files_count = 0

    for rel_path, content in files.items():
        files_count += 1
        total_loc += len([ln for ln in content.splitlines() if ln.strip()])

        if rel_path.endswith(".py"):
            functions, classes, complexities = _python_metrics(content)
        elif rel_path.endswith((".js", ".ts", ".jsx", ".tsx", ".java", ".php", ".rb", ".go")):
            functions, classes, complexities = _generic_metrics(content)
        else:
            continue

        total_functions += functions
        total_classes += classes
        all_complexities.extend(complexities)

    avg_complexity = round(sum(all_complexities) / len(all_complexities), 2) if all_complexities else 1.0

    return RepoMetrics(
        loc=total_loc,
        complexity=avg_complexity,
        functions_count=total_functions,
        classes_count=total_classes,
        files_count=files_count,
    )
