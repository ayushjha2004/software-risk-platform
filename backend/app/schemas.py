"""Pydantic request/response schemas."""
import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = "DEVELOPER"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    role: str
    email: str


class ProjectOut(BaseModel):
    id: int
    name: str
    uploaded_at: datetime.datetime
    class Config:
        from_attributes = True


class FindingOut(BaseModel):
    id: int
    type: str
    severity: str
    file: str
    line: int
    description: str
    recommendation: str
    source: str
    class Config:
        from_attributes = True


class DependencyOut(BaseModel):
    id: int
    name: str
    version: str
    pinned: str
    risk: str
    reason: str
    ecosystem: str = ""
    manifest: str = ""
    direct: bool = True
    class Config:
        from_attributes = True


class VulnerabilityOut(BaseModel):
    id: int
    vulnerability_id: str
    aliases: List[str] = Field(default_factory=list)
    package_name: str
    installed_version: str
    ecosystem: str
    severity: str
    cvss: Optional[float] = None
    summary: str
    affected_versions: List[str] = Field(default_factory=list)
    fixed_version: Optional[str] = None
    references: List[str] = Field(default_factory=list)
    class Config:
        from_attributes = True


class FileRiskOut(BaseModel):
    file: str
    risk: str
    findings_count: int
    class Config:
        from_attributes = True


class AnalysisRunOut(BaseModel):
    id: int
    project_id: int
    status: str
    created_at: datetime.datetime
    loc: int
    complexity: float
    functions_count: int
    classes_count: int
    files_count: int
    security_findings: int
    critical_findings: int
    high_findings: int
    medium_findings: int
    low_findings: int
    hardcoded_secrets: int
    dependencies_count: int
    outdated_dependencies: int
    risk_score: float
    risk_category: str
    ml_confidence: float
    explanation: str
    class Config:
        from_attributes = True


class AnalysisDetailOut(BaseModel):
    run: AnalysisRunOut
    findings: List[FindingOut]
    dependencies: List[DependencyOut]
    vulnerabilities: List[VulnerabilityOut] = Field(default_factory=list)
    file_risks: List[FileRiskOut]
