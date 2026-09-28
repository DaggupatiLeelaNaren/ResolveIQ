from datetime import datetime, timezone, timedelta
from app.database import Base, engine, SessionLocal
from app.models.models import Incident, IncidentLog
from app.services.hindsight_service import hindsight

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Avoid duplicate seed data.
if db.query(Incident).count() > 0:
    print("Database already seeded.")
    db.close()
    raise SystemExit

historical = [
    ("INC-101", "Payment database timeout", "Payment Service", "CRITICAL",
     "ConnectionPoolTimeoutException during peak traffic.",
     "Database connection pool exhausted.", "Increase pool from 40 to 100.", 21),
    ("INC-127", "Payment API failures", "Payment Service", "CRITICAL",
     "HTTP 500 with database connection acquisition timeout.",
     "Database connection pool exhausted.", "Increase connection pool from 50 to 100.", 18),
    ("INC-152", "Checkout latency spike", "Order Service", "HIGH",
     "Database queries waiting for available connections.",
     "Connection saturation caused by long-running queries.", "Kill long-running queries and increase pool.", 27),
    ("INC-198", "Redis memory pressure", "Notification Service", "HIGH",
     "Redis OOM command rejected.",
     "Redis memory limit reached.", "Change eviction policy and increase memory.", 34),
    ("INC-211", "Authentication outage", "Authentication Service", "CRITICAL",
     "JWT verification failures after deployment.",
     "Configuration mismatch in deployment.", "Restore missing environment variable.", 14),
]

now = datetime.now(timezone.utc)

for i, (num, title, service, severity, desc, root, fix, mins) in enumerate(historical):
    inc = Incident(
        incident_number=num, title=title, description=desc,
        severity=severity, status="RESOLVED", service=service,
        environment="production", error_rate=18 + i * 4,
        affected_users=2000 + i * 700,
        root_cause=root, resolution=fix,
        resolution_time_minutes=mins,
        detected_at=now - timedelta(days=120-i*20),
        resolved_at=now - timedelta(days=120-i*20) + timedelta(minutes=mins),
    )
    db.add(inc)
    db.flush()
    db.add(IncidentLog(
        incident_id=inc.id, level="ERROR", service=service,
        message=desc, timestamp=inc.detected_at
    ))

# Current demo incident.
demo = Incident(
    incident_number="INC-245",
    title="Payment Service — HTTP 500 spike",
    description="Payment API is returning HTTP 500 errors. Database connection acquisition is timing out and the connection pool appears saturated.",
    severity="CRITICAL",
    status="INVESTIGATING",
    service="Payment Service",
    environment="production",
    error_rate=35,
    affected_users=12430,
    detected_at=now,
)
db.add(demo)
db.flush()

messages = [
    ("ERROR", "ConnectionPoolTimeoutException: unable to acquire database connection"),
    ("ERROR", "Database: maximum connection pool size reached"),
    ("WARN", "PaymentService: retry threshold exceeded"),
    ("ERROR", "POST /payments returned HTTP 500"),
]
for level, message in messages:
    db.add(IncidentLog(
        incident_id=demo.id, level=level,
        service="Payment Service", message=message, timestamp=now
    ))

db.commit()

# Seed Hindsight with organizational experience.
if hindsight.available:
    for num, title, service, severity, desc, root, fix, mins in historical:
        content = f"""
Historical production incident {num}
Service: {service}
Severity: {severity}
Problem: {title}
Symptoms: {desc}
Root cause: {root}
Successful resolution: {fix}
Resolution time: {mins} minutes.
Lesson: This incident is useful historical experience for diagnosing future incidents involving {service}.
""".strip()
        try:
            hindsight.retain(content, document_id=f"historical-{num}")
        except Exception as e:
            print("Hindsight seed warning:", e)

print("Seed complete. Demo incident:", demo.id)
db.close()
