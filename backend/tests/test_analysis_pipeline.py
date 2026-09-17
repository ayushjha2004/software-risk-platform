from app.analysis import (
    code_analyzer,
    ast_analyzer,
    dependency_analyzer,
    metrics_analyzer,
    feature_extractor,
    ml_model,
    explain,
)
from app.analysis.pipeline import run_pipeline


def test_code_analyzer_detects_patterns():
    vulnerable_content = """
password = "supersecretpassword123"
os.system(user_cmd)
eval(user_code)
hashlib.md5(data.encode())
debug = True
"""
    findings = code_analyzer.scan_file("test.py", vulnerable_content)
    finding_types = [f.type for f in findings]
    assert any("Credential" in t for t in finding_types)
    assert any("Command Injection" in t for t in finding_types)
    assert any("Dynamic Execution" in t for t in finding_types)
    assert any("Weak Cryptographic Hash" in t for t in finding_types)
    assert any("Debug Mode Enabled" in t for t in finding_types)


def test_ast_analyzer_detects_sql_injection_and_eval():
    py_content = '''
def query_user(user_id, name):
    sql1 = "SELECT * FROM users WHERE id=" + user_id
    sql2 = f"SELECT * FROM users WHERE name='{name}'"
    eval(dynamic_code)
'''
    findings = ast_analyzer.analyze_python_file("service.py", py_content)
    assert len(findings) >= 3
    sources = {f.source for f in findings}
    assert "ast" in sources
    types = [f.type for f in findings]
    assert any("Concatenated" in f.description or "SQL Injection" in t for t, f in zip(types, findings))
    assert any("Dynamic Execution" in t for t in types)


def test_dependency_analyzer():
    reqs = """
flask
pyyaml==5.3.1
requests==2.25.0
safe-custom-pkg
"""
    results = dependency_analyzer.parse_requirements_txt(reqs)
    names = {r.name: r for r in results}
    assert "flask" in names
    assert names["flask"].pinned == "no"
    assert names["flask"].risk in ("MEDIUM", "HIGH")
    assert "pyyaml" in names
    assert names["pyyaml"].pinned == "yes"
    assert names["pyyaml"].risk == "HIGH"


def test_metrics_analyzer():
    py_code = """
class DataService:
    def process(self, x):
        if x > 0:
            return x * 2
        elif x < 0:
            return -x
        return 0
"""
    files = {"service.py": py_code}
    metrics = metrics_analyzer.analyze_repository(files)
    assert metrics.loc > 0
    assert metrics.functions_count >= 1
    assert metrics.classes_count == 1
    assert metrics.complexity >= 1.0


def test_ml_model_prediction_and_scoring():
    prediction = ml_model.predict_risk(
        loc=500,
        complexity=3.5,
        security_findings=8,
        critical_findings=2,
        high_findings=4,
        dependencies_count=5,
        outdated_dependencies=2,
        hardcoded_secrets=1,
    )
    assert prediction.category in ("LOW", "MEDIUM", "HIGH")
    assert 0 <= prediction.score <= 100
    assert 0 <= prediction.confidence <= 1.0


def test_explanation_generation():
    explanation = explain.generate_explanation(
        category="HIGH",
        critical=2,
        high=3,
        medium=1,
        low=0,
        complexity=18.0,
        outdated_dependencies=4,
        hardcoded_secrets=1,
    )
    assert "HIGH" in explanation
    assert "critical-severity" in explanation
