"""Module 8 — Machine Learning risk prediction, and Module 14 — rule-based risk scoring.

Per the project spec (section 13-14), the ML classification and the rule-based
risk score are kept as two *distinct* signals rather than conflating them:
  - `rule_based_risk_score()` is a transparent, weighted heuristic (Security 40%,
    Complexity 25%, Dependency 20%, Quality 15%) used for the dashboard's 0-100 score.
  - `predict_risk_category()` is a RandomForest classifier trained on a
    synthetically generated dataset (see `_generate_synthetic_dataset`), used for
    the LOW/MEDIUM/HIGH category and its feature importances.

IMPORTANT for your report: the synthetic training labels are derived from the
same rule-based formula used elsewhere (with noise) — this is a stand-in for a
minor project. For a rigorous evaluation you would need an independently
labeled dataset of real projects (e.g. built from CVE-linked repositories or a
published vulnerability dataset), as the spec doc calls out in section 13.
"""
import os
import random
import numpy as np
from dataclasses import dataclass
from typing import List, Tuple

try:
    import joblib
    from sklearn.ensemble import RandomForestClassifier
    HAVE_SKLEARN = True
except ImportError:
    HAVE_SKLEARN = False

from .feature_extractor import FEATURE_NAMES
from ..database import DATA_DIR

MODEL_DIR = DATA_DIR
MODEL_PATH = os.path.join(MODEL_DIR, "risk_model.joblib")

WEIGHTS = {
    "security": 0.40,
    "complexity": 0.25,
    "dependency": 0.20,
    "quality": 0.15,
}


@dataclass
class RiskPrediction:
    category: str          # LOW | MEDIUM | HIGH
    confidence: float      # 0-1, from the classifier's predicted-class probability
    score: float            # 0-100, rule-based weighted score
    feature_importances: dict


def _normalize(value: float, cap: float) -> float:
    return max(0.0, min(1.0, value / cap)) if cap > 0 else 0.0


def rule_based_risk_score(loc, complexity, security_findings, critical_findings, high_findings,
                           dependencies_count, outdated_dependencies, hardcoded_secrets) -> float:
    """Transparent weighted score, 0-100. See module docstring for the weighting."""
    security_component = _normalize(
        security_findings * 2 + critical_findings * 6 + high_findings * 3 + hardcoded_secrets * 5, 60
    )
    complexity_component = _normalize(complexity, 40) * 0.6 + _normalize(loc, 50000) * 0.4
    dependency_component = _normalize(outdated_dependencies * 3 + dependencies_count * 0.3, 40)
    # "quality" is inverse of the above three combined (fewer other signals => higher quality)
    quality_component = 1 - ((security_component + complexity_component + dependency_component) / 3)
    quality_component = max(0.0, min(1.0, quality_component))

    score = (
        security_component * WEIGHTS["security"]
        + complexity_component * WEIGHTS["complexity"]
        + dependency_component * WEIGHTS["dependency"]
        + (1 - quality_component) * WEIGHTS["quality"]  # low quality raises risk
    )
    return round(score * 100, 1)


def _generate_synthetic_dataset(n_samples: int = 800, seed: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    rng = random.Random(seed)
    X = []
    y = []
    for _ in range(n_samples):
        loc = rng.randint(200, 60000)
        complexity = rng.uniform(1, 45)
        critical = rng.randint(0, 6)
        high = rng.randint(0, 12)
        medium = rng.randint(0, 20)
        security_findings = critical + high + medium + rng.randint(0, 10)
        dependencies = rng.randint(0, 80)
        outdated = rng.randint(0, dependencies) if dependencies else 0
        hardcoded_secrets = rng.randint(0, 5)

        score = rule_based_risk_score(
            loc, complexity, security_findings, critical, high, dependencies, outdated, hardcoded_secrets
        )
        # add label noise so the classifier isn't a trivial mirror of the formula
        score_noisy = max(0, min(100, score + rng.uniform(-8, 8)))

        if score_noisy < 35:
            label = 0  # LOW
        elif score_noisy < 65:
            label = 1  # MEDIUM
        else:
            label = 2  # HIGH

        X.append([loc, complexity, security_findings, critical, high, dependencies, outdated, hardcoded_secrets])
        y.append(label)

    return np.array(X), np.array(y)


_model = None
LABELS = ["LOW", "MEDIUM", "HIGH"]


def _load_or_train_model():
    global _model
    if _model is not None:
        return _model

    if not HAVE_SKLEARN:
        _model = None
        return None

    os.makedirs(MODEL_DIR, exist_ok=True)
    if os.path.exists(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            return _model
        except Exception:
            _model = None

    X, y = _generate_synthetic_dataset()
    clf = RandomForestClassifier(n_estimators=150, max_depth=8, random_state=42)
    clf.fit(X, y)
    try:
        joblib.dump(clf, MODEL_PATH)
    except Exception:
        pass
    _model = clf
    return _model


def predict_risk(loc, complexity, security_findings, critical_findings, high_findings,
                  dependencies_count, outdated_dependencies, hardcoded_secrets) -> RiskPrediction:
    score = rule_based_risk_score(
        loc, complexity, security_findings, critical_findings, high_findings,
        dependencies_count, outdated_dependencies, hardcoded_secrets
    )

    model = _load_or_train_model()
    vector = np.array([[loc, complexity, security_findings, critical_findings, high_findings,
                         dependencies_count, outdated_dependencies, hardcoded_secrets]])

    if model is not None:
        proba = model.predict_proba(vector)[0]
        pred_idx = int(np.argmax(proba))
        category = LABELS[pred_idx]
        confidence = round(float(proba[pred_idx]), 3)
        importances = dict(zip(FEATURE_NAMES, [round(float(v), 3) for v in model.feature_importances_]))
    else:
        # Fallback if scikit-learn isn't installed: derive category straight from the rule score.
        category = "LOW" if score < 35 else ("MEDIUM" if score < 65 else "HIGH")
        confidence = 1.0
        importances = {}

    return RiskPrediction(category=category, confidence=confidence, score=score, feature_importances=importances)
