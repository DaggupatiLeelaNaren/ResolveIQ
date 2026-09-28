from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from .config import settings
from .database import Base, engine, get_db
from .models.models import Incident, IncidentLog, ResolutionAttempt
from .schemas import IncidentOut, LogOut, ResolutionIn
from .services.agent_service import investigate, learn_from_resolution
from .services.hindsight_service import hindsight

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ResolveIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "hindsight": hindsight.available,
        "groq": bool(settings.groq_api_key),
    }

@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total = db.query(Incident).count()
    open_count = db.query(Incident).filter(Incident.status != "RESOLVED").count()
    critical = db.query(Incident).filter(Incident.severity == "CRITICAL", Incident.status != "RESOLVED").count()
    resolved = db.query(Incident).filter(Incident.status == "RESOLVED").count()
    avg = db.query(func.avg(Incident.resolution_time_minutes)).filter(
        Incident.resolution_time_minutes.isnot(None)
    ).scalar()
    return {
        "total": total,
        "open": open_count,
        "critical": critical,
        "resolved": resolved,
        "avg_resolution_minutes": round(float(avg or 0), 1),
        "memory": hindsight.stats(),
    }

@app.get("/api/incidents", response_model=list[IncidentOut])
def incidents(db: Session = Depends(get_db)):
    return db.query(Incident).order_by(Incident.detected_at.desc()).all()

@app.get("/api/incidents/{incident_id}")
def incident_detail(incident_id: int, db: Session = Depends(get_db)):
    item = db.query(Incident).options(
        joinedload(Incident.logs),
        joinedload(Incident.attempts),
    ).filter(Incident.id == incident_id).first()
    if not item:
        raise HTTPException(404, "Incident not found")
    return {
        "incident": IncidentOut.model_validate(item),
        "logs": [LogOut.model_validate(x) for x in item.logs],
        "attempts": [
            {
                "id": x.id,
                "action": x.action,
                "result": x.result,
                "notes": x.notes,
                "attempted_at": x.attempted_at,
            } for x in item.attempts
        ],
    }

@app.post("/api/incidents/{incident_id}/investigate")
def investigate_incident(incident_id: int, db: Session = Depends(get_db)):
    item = db.query(Incident).options(joinedload(Incident.logs)).filter(
        Incident.id == incident_id
    ).first()
    if not item:
        raise HTTPException(404, "Incident not found")
    result = investigate(item)
    return result

@app.post("/api/incidents/{incident_id}/resolution")
def record_resolution(incident_id: int, body: ResolutionIn, db: Session = Depends(get_db)):
    item = db.query(Incident).filter(Incident.id == incident_id).first()
    if not item:
        raise HTTPException(404, "Incident not found")

    attempt = ResolutionAttempt(
        incident_id=item.id,
        action=body.action,
        result=body.result,
        notes=body.notes,
    )
    db.add(attempt)
    db.flush()

    if body.result.lower() == "successful":
        item.status = "RESOLVED"
        item.resolution = body.action
        item.root_cause = item.root_cause or "Confirmed through incident investigation"
        item.resolved_at = datetime.now(timezone.utc)
        if not item.resolution_time_minutes:
            item.resolution_time_minutes = max(
                1, int((item.resolved_at - item.detected_at).total_seconds() / 60)
            )

    db.commit()
    db.refresh(attempt)

    try:
        learned = learn_from_resolution(item, attempt)
    except Exception:
        learned = False

    return {"success": True, "learned_to_hindsight": learned}

@app.get("/api/memory/stats")
def memory_stats():
    return hindsight.stats()

@app.get("/api/demo")
def demo(db: Session = Depends(get_db)):
    item = db.query(Incident).filter(Incident.incident_number == "INC-245").first()
    if not item:
        raise HTTPException(404, "Demo incident not found")
    return {"incident_id": item.id, "title": item.title}
