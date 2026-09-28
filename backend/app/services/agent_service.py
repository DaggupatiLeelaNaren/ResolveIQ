from .hindsight_service import hindsight
from .llm_service import investigate as llm_investigate

def incident_to_memory(incident, logs):
    log_text = "\n".join(f"{x.level}: {x.message}" for x in logs)
    return f"""
Incident {incident.incident_number}
Service: {incident.service}
Severity: {incident.severity}
Title: {incident.title}
Description: {incident.description}
Error rate: {incident.error_rate}%
Affected users: {incident.affected_users}
Logs:
{log_text}
""".strip()

def investigate(incident):
    memories = hindsight.recall(
        f"""
        Find previous production incidents similar to:
        Service {incident.service}
        Title {incident.title}
        Description {incident.description}
        Error rate {incident.error_rate}
        Look for root causes, successful fixes, failed fixes, and post-mortem lessons.
        """
    )
    analysis = llm_investigate(incident, incident.logs, memories)
    return {"analysis": analysis, "memories": memories}

def learn_from_resolution(incident, attempt):
    content = f"""
ResolveIQ learning from incident {incident.incident_number}.
Service: {incident.service}
Problem: {incident.title}
Root cause: {incident.root_cause or "not confirmed"}
Resolution attempt: {attempt.action}
Result: {attempt.result}
Notes: {attempt.notes}
Lesson: This outcome should be considered when investigating future incidents involving {incident.service}.
""".strip()
    return hindsight.retain(
        content,
        document_id=f"incident-{incident.incident_number}-resolution-{attempt.id}",
    )
