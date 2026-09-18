from app.analysis import ast_analyzer, code_analyzer, dependency_analyzer, explain, metrics_analyzer, ml_model


def test_dependency_analyzer():
    results = dependency_analyzer.parse_requirements_txt("flask\npyyaml==5.3.1\nrequests==2.25.0\nsafe-custom-pkg\n")
    names = {r.name: r for r in results}
    assert names["flask"].pinned == "no"
    assert names["flask"].risk == "UNKNOWN"
    assert names["pyyaml"].pinned == "yes"
    assert names["pyyaml"].ecosystem == "PyPI"


def test_code_analyzer_detects_patterns():
    findings = code_analyzer.scan_file("test.py", 'password = "supersecretpassword123"\nos.system(user_cmd)\neval(user_code)\nhashlib.md5(data.encode())\ndebug = True')
    types = [f.type for f in findings]
    assert any("Credential" in t for t in types)
    assert any("Command Injection" in t for t in types)
    assert any("Dynamic Execution" in t for t in types)


def test_ast_analyzer_detects_sql_injection_and_eval():
    findings = ast_analyzer.analyze_python_file("service.py", 'sql = "SELECT * FROM users WHERE id=" + user_id\neval(dynamic_code)')
    assert len(findings) >= 2
    assert any(f.source == "ast" for f in findings)


def test_metrics_and_risk():
    metrics = metrics_analyzer.analyze_repository({"service.py": "class X:\n def run(self, x):\n  if x: return x\n  return 0"})
    assert metrics.loc > 0 and metrics.classes_count == 1
    prediction = ml_model.predict_risk(500, 3.5, 8, 2, 4, 5, 2, 1)
    assert prediction.category in ("LOW", "MEDIUM", "HIGH") and 0 <= prediction.score <= 100


def test_explanation_generation():
    explanation = explain.generate_explanation("HIGH", 2, 3, 1, 0, 18.0, 4, 1)
    assert "HIGH" in explanation and "critical-severity" in explanation
