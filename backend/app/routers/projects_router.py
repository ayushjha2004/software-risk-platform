import os
import shutil
import uuid
import zipfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/projects", tags=["projects"])

STORAGE_ROOT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "projects"
)
os.makedirs(STORAGE_ROOT, exist_ok=True)


def _safe_extract(zip_path: str, dest_dir: str):
    """Extract a zip while guarding against path traversal ('zip slip')."""
    with zipfile.ZipFile(zip_path) as zf:
        for member in zf.infolist():
            member_path = os.path.normpath(os.path.join(dest_dir, member.filename))
            if not member_path.startswith(os.path.normpath(dest_dir) + os.sep) and member_path != os.path.normpath(dest_dir):
                continue  # skip suspicious entries
        zf.extractall(dest_dir)


@router.post("/upload", response_model=schemas.ProjectOut)
async def upload_project(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip uploads are supported in this build")

    project_uid = str(uuid.uuid4())
    project_dir = os.path.join(STORAGE_ROOT, project_uid)
    os.makedirs(project_dir, exist_ok=True)

    zip_path = os.path.join(project_dir, "upload.zip")
    with open(zip_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    extract_dir = os.path.join(project_dir, "source")
    os.makedirs(extract_dir, exist_ok=True)
    try:
        _safe_extract(zip_path, extract_dir)
    except zipfile.BadZipFile:
        shutil.rmtree(project_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid ZIP archive")

    project = models.Project(
        user_id=current_user.id,
        name=file.filename.rsplit(".", 1)[0],
        storage_path=extract_dir,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=list[schemas.ProjectOut])
def list_projects(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(models.Project)
        .filter(models.Project.user_id == current_user.id)
        .order_by(models.Project.uploaded_at.desc())
        .all()
    )


@router.get("/{project_id}", response_model=schemas.ProjectOut)
def get_project(project_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id, models.Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
