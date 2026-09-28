from datetime import datetime
from pydantic import BaseModel, ConfigDict

class LogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    level: str
    service: str
    message: str
    timestamp: datetime

class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    incident_number: str
    title: str
    description: str
    severity: str
    status: str
    service: str
    environment: str
    error_rate: float
    affected_users: int
    root_cause: str | None
    resolution: str | None
    resolution_time_minutes: int | None
    detected_at: datetime
    resolved_at: datetime | None

class ResolutionIn(BaseModel):
    action: str
    result: str
    notes: str = ""
