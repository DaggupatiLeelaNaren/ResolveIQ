const API_URL = "http://localhost:8000";

async function request(
  endpoint: string,
  options?: RequestInit
) {
  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      ...options,
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      text || `Request failed: ${response.status}`
    );
  }

  return response.json();
}

// ---------------------------------------------
// HEALTH
// ---------------------------------------------

export async function getHealth() {
  return request("/api/health");
}

// ---------------------------------------------
// DASHBOARD
// ---------------------------------------------

export async function getDashboard() {
  return request("/api/dashboard");
}

// ---------------------------------------------
// INCIDENTS
// ---------------------------------------------

export async function getIncidents() {
  return request("/api/incidents");
}

// ---------------------------------------------
// SINGLE INCIDENT
// ---------------------------------------------

export async function getIncident(
  id: number
) {
  return request(`/api/incidents/${id}`);
}

// ---------------------------------------------
// AI INVESTIGATION
// ---------------------------------------------

export async function investigateIncident(
  id: number
) {
  return request(
    `/api/incidents/${id}/investigate`,
    {
      method: "POST",
    }
  );
}

// ---------------------------------------------
// SAVE RESOLUTION
// ---------------------------------------------

export async function submitResolution(
  id: number,
  data: {
    resolution: string;
    successful: boolean;
  }
) {
  return request(
    `/api/incidents/${id}/resolution`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

// ---------------------------------------------
// HINDSIGHT MEMORY
// ---------------------------------------------

export async function getMemoryStats() {
  return request("/api/memory/stats");
}

// ---------------------------------------------
// DEMO
// ---------------------------------------------

export async function getDemo() {
  return request("/api/demo");
}