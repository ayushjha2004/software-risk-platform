"""Analysis API routes."""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from .. import models, schemas, auth
from ..database import get_db
from ..analysis.pipeline import run_pipeline
from ..reports.report_generator import build_report_pdf

router = APIRouter(prefix="/analysis", tags=["analysis"])


def _get_owned_project(project_id: int, current_user: models.User, db: Session) -> models.Project:
    project = db.query(models.Project).filter(models.Project.id == project_id, models.Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/{project_id}/run", response_model=schemas.AnalysisRunOut)
def run_analysis(project_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    project = _get_owned_project(project_id, current_user, db)
    run = models.AnalysisRun(project_id=project.id, status="RUNNING")
    db.add(run)
    db.commit()
    db.refresh(run)
    try:
        result = run_pipeline(project.storage_path)
    except Exception:
        run.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=500, detail="Analysis failed while processing the repository")

    run.status = "COMPLETE"
    run.loc, run.complexity, run.functions_count, run.classes_count, run.files_count = result.metrics.loc, result.metrics.complexity, result.metrics.functions_count, result.metrics.classes_count, result.metrics.files_count
    run.security_findings, run.critical_findings, run.high_findings, run.medium_findings, run.low_findings = len(result.findings), result.critical, result.high, result.medium, result.low
    run.hardcoded_secrets = result.hardcoded_secrets
    run.dependencies_count = len(result.dependencies)
    run.outdated_dependencies = sum(1 for dependency in result.dependencies if dependency.pinned == "no")
    run.risk_score, run.risk_category, run.ml_confidence, run.explanation = result.prediction.score, result.prediction.category, result.prediction.confidence, result.explanation
    db.flush()
    dependency_rows = {}
    for dependency in result.dependencies:
        row = models.Dependency(run_id=run.id, name=dependency.name, version=dependency.version, pinned=dependency.pinned, risk=dependency.risk, reason=dependency.reason, ecosystem=dependency.ecosystem, manifest=dependency.manifest, direct=1 if dependency.direct else 0)
        db.add(row)
        dependency_rows[(dependency.name.lower(), dependency.version, dependency.ecosystem)] = row
    db.flush()
    for finding in result.findings:
        db.add(models.Finding(run_id=run.id, type=finding.type, severity=finding.severity, file=finding.file, line=finding.line, description=finding.description, recommendation=finding.recommendation, source=finding.source))
    for vulnerability in result.vulnerabilities:
        dependency = dependency_rows.get((vulnerability.package_name.lower(), vulnerability.installed_version, vulnerability.ecosystem))
        db.add(models.Vulnerability(run_id=run.id, dependency_id=dependency.id if dependency else None, vulnerability_id=vulnerability.vulnerability_id, aliases=json.dumps(vulnerability.aliases), package_name=vulnerability.package_name, installed_version=vulnerability.installed_version, ecosystem=vulnerability.ecosystem, severity=vulnerability.severity, cvss=vulnerability.cvss, summary=vulnerability.summary, affected_versions=json.dumps(vulnerability.affected_versions), fixed_version=vulnerability.fixed_version, references=json.dumps(vulnerability.references)))
    for file_risk in result.file_risks:
        db.add(models.FileRisk(run_id=run.id, file=file_risk["file"], risk=file_risk["risk"], findings_count=file_risk["findings_count"]))
    db.commit()
    db.refresh(run)
    return run


def _vulnerability_out(row: models.Vulnerability) -> schemas.VulnerabilityOut:
    return schemas.VulnerabilityOut(id=row.id, vulnerability_id=row.vulnerability_id, aliases=json.loads(row.aliases or "[]"), package_name=row.package_name, installed_version=row.installed_version, ecosystem=row.ecosystem, severity=row.severity, cvss=row.cvss, summary=row.summary, affected_versions=json.loads(row.affected_versions or "[]"), fixed_version=row.fixed_version, references=json.loads(row.references or "[]"))


@router.get("/{project_id}/latest", response_model=schemas.AnalysisDetailOut)
def latest_analysis(project_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    project = _get_owned_project(project_id, current_user, db)
    run = db.query(models.AnalysisRun).filter(models.AnalysisRun.project_id == project.id).order_by(models.AnalysisRun.created_at.desc()).first()
    if not run:
        raise HTTPException(status_code=404, detail="No analysis run yet for this project")
    return schemas.AnalysisDetailOut(run=run, findings=run.findings, dependencies=run.dependencies, vulnerabilities=[_vulnerability_out(item) for item in run.vulnerabilities], file_risks=[schemas.FileRiskOut(file=item.file, risk=item.risk, findings_count=item.findings_count) for item in run.file_risks])


@router.get("/{project_id}/report")
def download_report(project_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    project = _get_owned_project(project_id, current_user, db)
    run = db.query(models.AnalysisRun).filter(models.AnalysisRun.project_id == project.id).order_by(models.AnalysisRun.created_at.desc()).first()
    if not run or run.status != "COMPLETE":
        raise HTTPException(status_code=404, detail="No completed analysis run yet for this project")
    pdf_bytes = build_report_pdf(project.name, run)
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{project.name}_risk_report.pdf"'})
