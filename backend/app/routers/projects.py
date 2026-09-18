from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.models import Project, Site, User
from app.models.schemas import ProjectCreate, ProjectOut

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = Project(name=payload.name, description=payload.description or "", owner_id=user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectOut(id=project.id, name=project.name, description=project.description, site_count=0)


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    projects = db.query(Project).filter(Project.owner_id == user.id).all()
    out = []
    for p in projects:
        count = db.query(Site).filter(Site.project_id == p.id).count()
        out.append(ProjectOut(id=p.id, name=p.name, description=p.description, site_count=count))
    return out


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    count = db.query(Site).filter(Site.project_id == project.id).count()
    return ProjectOut(id=project.id, name=project.name, description=project.description, site_count=count)
