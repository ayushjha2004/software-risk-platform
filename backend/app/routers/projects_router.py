import os
import shutil
import uuid
import zipfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from .. import database
from ..database import get_db

router = APIRouter(prefix="/projects", tags=["projects"])


def get_storage_root() -> str:
    path = os.path.join(database.DATA_DIR, "projects")
    os.makedirs(path, exist_ok=True)
    return path


def _safe_extract(zip_path: str, dest_dir: str):
    """Extract a zip while guarding against path traversal ('zip slip')."""
    dest_dir_resolved = os.path.realpath(os.path.abspath(dest_dir))
    with zipfile.ZipFile(zip_path) as zf:
        safe_members = []
        for member in zf.infolist():
            # Disallow absolute paths in member filenames or traversing outside dest_dir
            normalized = os.path.normpath(member.filename)
            if normalized.startswith("..") or os.path.isabs(normalized):
                continue
            target_path = os.path.realpath(os.path.abspath(os.path.join(dest_dir_resolved, normalized)))
            if target_path == dest_dir_resolved or target_path.startswith(dest_dir_resolved + os.sep):
                safe_members.append(member)
        zf.extractall(dest_dir_resolved, members=safe_members)


@router.post("/upload", response_model=schemas.ProjectOut)
async def upload_project(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip uploads are supported in this build")

    project_uid = str(uuid.uuid4())
    project_dir = os.path.join(get_storage_root(), project_uid)
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
    except Exception as exc:
        shutil.rmtree(project_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=f"Failed to extract uploaded archive: {exc}")

    project_name = file.filename.rsplit(".", 1)[0] or "uploaded-project"
    project = models.Project(
        user_id=current_user.id,
        name=project_name,
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
