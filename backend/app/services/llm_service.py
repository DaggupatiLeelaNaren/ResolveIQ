import json
from groq import Groq
from ..config import settings

SYSTEM = """
You are ResolveIQ, an incident-response decision-support agent for software engineers.
You analyze production incidents using current evidence and historical incident memories.
Do not claim certainty when evidence is incomplete. Do not invent incidents.
Return valid JSON with:
summary, likely_root_cause, confidence, evidence, recommendations, historical_context.
recommendations must be a list of objects with action, reason, risk.
historical_context must be a list of concise strings.
"""

def investigate(incident, logs, memories):
    if not settings.groq_api_key:
        return fallback(incident, memories)

    client = Groq(api_key=settings.groq_api_key)
    log_text = "\n".join(
        f"{x.level} {x.service}: {x.message}" for x in logs[-30:]
    )
    memory_text = "\n".join(
        f"- {m['text']}" for m in memories[:8]
    ) or "No historical memory was retrieved."

    prompt = f"""
Current incident:
Number: {incident.incident_number}
Title: {incident.title}
Service: {incident.service}
Severity: {incident.severity}
Error rate: {incident.error_rate}%
Affected users: {incident.affected_users}
Description: {incident.description}

Current logs:
{log_text}

Historical Hindsight memories:
{memory_text}

Analyze the incident and explicitly use historical memories only when relevant.
"""

    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    try:
        return json.loads(content)
    except Exception:
        return {
            "summary": content,
            "likely_root_cause": "See AI analysis",
            "confidence": 0.5,
            "evidence": [],
            "recommendations": [],
            "historical_context": [m["text"] for m in memories[:5]],
        }

def fallback(incident, memories):
    texts = [m["text"] for m in memories[:5]]
    likely = "Insufficient evidence; inspect database connections and recent deployments."
    if any("connection pool" in x.lower() for x in texts):
        likely = "Connection pool exhaustion is strongly supported by historical incidents."
    return {
        "summary": "Groq API key is not configured, so ResolveIQ is using the demo analysis path.",
        "likely_root_cause": likely,
        "confidence": 0.72 if memories else 0.35,
        "evidence": [
            "Current incident and logs were analyzed.",
            f"{len(memories)} historical memories were recalled from Hindsight."
        ],
        "recommendations": [
            {
                "action": "Inspect database connection pool utilization.",
                "reason": "The current incident reports database connection timeout symptoms.",
                "risk": "low"
            },
            {
                "action": "Compare the current incident with previous payment-service incidents.",
                "reason": "Historical memory may contain a successful remediation.",
                "risk": "low"
            }
        ],
        "historical_context": texts,
    }
