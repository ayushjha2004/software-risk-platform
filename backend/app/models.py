"""SQLAlchemy ORM models — mirrors the schema in the project spec:
users -> projects -> analysis_runs -> (findings, metrics, dependencies) -> risk_predictions -> reports
"""
import datetime
from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, DateTime, Text
)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    salt = Column(String, nullable=False)
    role = Column(String, default="DEVELOPER")  # ADMIN | ANALYST | DEVELOPER
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class Token(Base):
    __tablename__ = "tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="projects")
    analysis_runs = relationship("AnalysisRun", back_populates="project", cascade="all, delete-orphan")


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    status = Column(String, default="PENDING")  # PENDING | RUNNING | COMPLETE | FAILED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # metrics
    loc = Column(Integer, default=0)
    complexity = Column(Float, default=0)
    functions_count = Column(Integer, default=0)
    classes_count = Column(Integer, default=0)
    files_count = Column(Integer, default=0)

    # security findings summary
    security_findings = Column(Integer, default=0)
    critical_findings = Column(Integer, default=0)
    high_findings = Column(Integer, default=0)
    medium_findings = Column(Integer, default=0)
    low_findings = Column(Integer, default=0)
    hardcoded_secrets = Column(Integer, default=0)

    # dependency summary
    dependencies_count = Column(Integer, default=0)
    outdated_dependencies = Column(Integer, default=0)

    # risk prediction
    risk_score = Column(Float, default=0)
    risk_category = Column(String, default="UNKNOWN")  # LOW | MEDIUM | HIGH
    ml_confidence = Column(Float, default=0)
    explanation = Column(Text, default="")

    project = relationship("Project", back_populates="analysis_runs")
    findings = relationship("Finding", back_populates="run", cascade="all, delete-orphan")
    dependencies = relationship("Dependency", back_populates="run", cascade="all, delete-orphan")
    file_risks = relationship("FileRisk", back_populates="run", cascade="all, delete-orphan")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=False)
    type = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # CRITICAL | HIGH | MEDIUM | LOW
    file = Column(String, nullable=False)
    line = Column(Integer, default=0)
    description = Column(Text, default="")
    recommendation = Column(Text, default="")
    source = Column(String, default="regex")  # regex | ast

    run = relationship("AnalysisRun", back_populates="findings")


class Dependency(Base):
    __tablename__ = "dependencies"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=False)
    name = Column(String, nullable=False)
    version = Column(String, default="unspecified")
    pinned = Column(String, default="no")
    risk = Column(String, default="LOW")
    reason = Column(String, default="")

    run = relationship("AnalysisRun", back_populates="dependencies")


class FileRisk(Base):
    __tablename__ = "file_risks"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=False)
    file = Column(String, nullable=False)
    risk = Column(String, default="LOW")
    findings_count = Column(Integer, default=0)

    run = relationship("AnalysisRun", back_populates="file_risks")
