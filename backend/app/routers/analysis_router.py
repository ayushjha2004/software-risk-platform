from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db
from ..analysis.pipeline import run_pipeline
from ..reports.report_generator import build_report_pdf

router = APIRouter(prefix="/analysis", tags=["analysis"])


def _get_owned_project(project_id: int, current_user: models.User, db: Session) -> models.Project:
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id, models.Project.user_id == current_user.id)
        .first()
    )
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
    except Exception as exc:  # keep the platform usable even if one repo trips an edge case
        run.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

    run.status = "COMPLETE"
    run.loc = result.metrics.loc
    run.complexity = result.metrics.complexity
    run.functions_count = result.metrics.functions_count
    run.classes_count = result.metrics.classes_count
    run.files_count = result.metrics.files_count

    run.security_findings = len(result.findings)
    run.critical_findings = result.critical
    run.high_findings = result.high
    run.medium_findings = result.medium
    run.low_findings = result.low
    run.hardcoded_secrets = result.hardcoded_secrets

    run.dependencies_count = len(result.dependencies)
    run.outdated_dependencies = sum(1 for d in result.dependencies if d.pinned == "no")

    run.risk_score = result.prediction.score
    run.risk_category = result.prediction.category
    run.ml_confidence = result.prediction.confidence
    run.explanation = result.explanation

    for f in result.findings:
        db.add(models.Finding(
            run_id=run.id, type=f.type, severity=f.severity, file=f.file,
            line=f.line, description=f.description, recommendation=f.recommendation, source=f.source,
        ))

    for d in result.dependencies:
        db.add(models.Dependency(
            run_id=run.id, name=d.name, version=d.version, pinned=d.pinned, risk=d.risk, reason=d.reason,
        ))

    for fr in result.file_risks:
        db.add(models.FileRisk(run_id=run.id, file=fr["file"], risk=fr["risk"], findings_count=fr["findings_count"]))

    db.commit()
    db.refresh(run)
    return run


@router.get("/{project_id}/latest", response_model=schemas.AnalysisDetailOut)
def latest_analysis(project_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    project = _get_owned_project(project_id, current_user, db)
    run = (
        db.query(models.AnalysisRun)
        .filter(models.AnalysisRun.project_id == project.id)
        .order_by(models.AnalysisRun.created_at.desc())
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="No analysis run yet for this project")

    return schemas.AnalysisDetailOut(
        run=run,
        findings=run.findings,
        dependencies=run.dependencies,
        file_risks=[schemas.FileRiskOut(file=fr.file, risk=fr.risk, findings_count=fr.findings_count) for fr in run.file_risks],
    )


@router.get("/{project_id}/report")
def download_report(project_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    project = _get_owned_project(project_id, current_user, db)
    run = (
        db.query(models.AnalysisRun)
        .filter(models.AnalysisRun.project_id == project.id)
        .order_by(models.AnalysisRun.created_at.desc())
        .first()
    )
    if not run or run.status != "COMPLETE":
        raise HTTPException(status_code=404, detail="No completed analysis run yet for this project")

    pdf_bytes = build_report_pdf(project.name, run)
    headers = {"Content-Disposition": f'attachment; filename="{project.name}_risk_report.pdf"'}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
