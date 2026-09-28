import { useEffect, useState } from "react";

import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Database,
  History,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  Play,
  RefreshCw,
  Server,
  ShieldAlert,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import {
  getDashboard,
  getIncidents,
  getIncident,
  investigateIncident,
  submitResolution,
  getMemoryStats,
} from "./api";

type Tab =
  | "dashboard"
  | "investigation"
  | "memory"
  | "learning";

type Incident = {
  id: number;
  incident_number: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  service: string;
  environment: string;
  error_rate: number;
  affected_users: number;
  root_cause?: string | null;
  resolution?: string | null;
  resolution_time_minutes?: number | null;
  detected_at?: string | null;
  resolved_at?: string | null;
  logs?: string[];
};

type DashboardData = {
  active_incidents?: number;
  resolved_incidents?: number;
  avg_resolution_time?: number;
  memory_count?: number;
  [key: string]: any;
};

type Analysis = {
  summary?: string;
  probable_root_cause?: string;
  confidence?: number;
  recommended_actions?: string[];
  similar_incidents?: any[];
  reasoning?: string;
  [key: string]: any;
};

function App() {
  const [tab, setTab] = useState<Tab>("dashboard");

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [incidents, setIncidents] =
    useState<Incident[]>([]);

  const [selected, setSelected] =
    useState<Incident | null>(null);

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [memoryStats, setMemoryStats] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [investigating, setInvestigating] =
    useState(false);

  const [learning, setLearning] =
    useState(false);

  const [loadingIncident, setLoadingIncident] =
    useState(false);

  const [error, setError] =
    useState("");

  const refresh = async () => {
    try {
      setError("");

      const [
        dashboardResponse,
        incidentsResponse,
        memoryResponse,
      ] = await Promise.all([
        getDashboard(),
        getIncidents(),
        getMemoryStats(),
      ]);

      const dashboardData =
        dashboardResponse?.dashboard ||
        dashboardResponse ||
        {};

      const incidentData =
        incidentsResponse?.incidents ||
        incidentsResponse?.data ||
        incidentsResponse ||
        [];

      setDashboard(dashboardData);

      setIncidents(
        Array.isArray(incidentData)
          ? incidentData
          : []
      );

      setMemoryStats(memoryResponse);

      if (!selected && Array.isArray(incidentData)) {
        const demoIncident =
          incidentData.find(
            (item: Incident) =>
              item.incident_number ===
              "INC-245"
          ) ||
          incidentData[0];

        if (demoIncident) {
          setSelected(demoIncident);
        }
      }
    } catch (err) {
      console.error("Refresh error:", err);

      setError(
        "Unable to connect to the backend. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const selectIncident = async (
    incident: Incident
  ) => {
    
    setSelected(incident);
    setAnalysis(null);
    setError("");
    setTab("investigation");

    try {
      setLoadingIncident(true);

      const response =
        await getIncident(incident.id);

      const detailedIncident =
        response?.incident ||
        response?.data ||
        response;

      if (
        detailedIncident &&
        typeof detailedIncident ===
          "object"
      ) {
        setSelected({
          ...incident,
          ...detailedIncident,
        });
      }
    } catch (err) {

      console.warn(
        "Detailed incident request failed:",
        err
      );
    } finally {
      setLoadingIncident(false);
    }
  };

  const handleNavigation = async (
    nextTab: Tab
  ) => {
    setTab(nextTab);

    if (
      nextTab === "investigation" &&
      !selected
    ) {
      try {
        const response =
          await getIncidents();

        const data =
          response?.incidents ||
          response?.data ||
          response ||
          [];

        if (Array.isArray(data) && data.length) {
          const incident =
            data.find(
              (item: Incident) =>
                item.incident_number ===
                "INC-245"
            ) || data[0];

          await selectIncident(incident);
        }
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load incidents."
        );
      }
    }
  };

  const runInvestigation = async () => {
    if (!selected) {
      setError(
        "Please select an incident first."
      );

      return;
    }

    try {
      setInvestigating(true);
      setError("");
      setAnalysis(null);

      const response =
        await investigateIncident(
          selected.id
        );

      const result =
        response?.analysis ||
        response?.result ||
        response?.data ||
        response;

      setAnalysis(result);
    } catch (err) {
      console.error(
        "Investigation error:",
        err
      );

      setError(
        "AI investigation failed. Check your FastAPI backend and Groq configuration."
      );
    } finally {
      setInvestigating(false);
    }
  };

  const learnFromResolution = async () => {
    if (!selected) {
      setError(
        "No incident selected."
      );

      return;
    }

    try {
      setLearning(true);
      setError("");

      await submitResolution(
        selected.id,
        {
          resolution:
            "Increased database connection pool from 50 to 100 and restarted the affected service.",
          successful: true,
        }
      );

      setSelected({
        ...selected,
        status: "resolved",
        resolution:
          "Increased database connection pool from 50 to 100 and restarted the affected service.",
      });

      await refresh();

      alert(
        "Successful resolution saved to Hindsight memory."
      );
    } catch (err) {
      console.error(
        "Learning error:",
        err
      );

      setError(
        "Could not save the resolution."
      );
    } finally {
      setLearning(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2
          size={42}
          className="spin"
        />

        <h2>
          Starting ResolveIQ...
        </h2>

        <p>
          Loading incidents, AI memory
          and operational data.
        </p>
      </div>
    );
  }

  const navItems: {
    id: Tab;
    label: string;
    icon: any;
  }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "investigation",
      label: "AI Investigation",
      icon: Brain,
    },
    {
      id: "memory",
      label: "Hindsight Memory",
      icon: History,
    },
    {
      id: "learning",
      label: "Learning Loop",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="app">

      {}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            <Brain size={25} />
          </div>

          <div>
            <h1>ResolveIQ</h1>

            <span>
              Production Intelligence
            </span>
          </div>

        </div>

        <div className="nav-section">

          <p className="nav-title">
            OPERATIONS
          </p>

          {navItems.map((item) => {

            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${
                  tab === item.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleNavigation(
                    item.id
                  )
                }
              >

                <Icon size={19} />

                <span>
                  {item.label}
                </span>

              </button>
            );
          })}

        </div>

        <div className="sidebar-bottom">

          <div className="memory-status">

            <div className="status-dot" />

            <div>
              <strong>
                Hindsight Memory
              </strong>

              <span>
                {memoryStats
                  ? "Connected"
                  : "Fallback mode"}
              </span>
            </div>

          </div>

          <div className="version">
            ResolveIQ MVP · v1.0
          </div>

        </div>

      </aside>

      {}

      <main className="main">

        {}

        <header className="topbar">

          <div>

            <div className="breadcrumb">

              PRODUCTION OPERATIONS

              <span>/</span>

              {tab === "dashboard"
                ? "Dashboard"
                : tab === "investigation"
                ? "AI Investigation"
                : tab === "memory"
                ? "Hindsight Memory"
                : "Learning Loop"}

            </div>

            <h2>

              {tab === "dashboard" &&
                "Production Overview"}

              {tab === "investigation" &&
                "AI Incident Investigation"}

              {tab === "memory" &&
                "Hindsight Memory"}

              {tab === "learning" &&
                "Continuous Learning Loop"}

            </h2>

          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={refresh}
          >
            <RefreshCw size={17} />

            Refresh
          </button>

        </header>

        {}

        {error && (
          <div className="error-banner">

            <AlertTriangle size={18} />

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>

          </div>
        )}

        {}

        {tab === "dashboard" && (
          <section className="content">

            <div className="hero-card">

              <div>

                <span className="eyebrow">
                  AI-POWERED OPERATIONS
                </span>

                <h3>
                  Your production incidents
                  <br />
                  become organizational memory.
                </h3>

                <p>
                  ResolveIQ combines incident
                  intelligence with Hindsight's
                  long-term memory to help teams
                  learn from every failure.
                </p>

              </div>

              <div className="hero-icon">
                <Brain size={80} />
              </div>

            </div>

            {/* STATS */}

            <div className="stats-grid">

              <StatCard
                icon={<AlertTriangle />}
                title="Active Incidents"
                value={
                  dashboard
                    ?.active_incidents ??
                  incidents.filter(
                    (item) =>
                      item.status !==
                      "resolved"
                  ).length
                }
              />

              <StatCard
                icon={<CheckCircle2 />}
                title="Resolved Incidents"
                value={
                  dashboard
                    ?.resolved_incidents ??
                  incidents.filter(
                    (item) =>
                      item.status ===
                      "resolved"
                  ).length
                }
              />

              <StatCard
                icon={<Clock />}
                title="Avg Resolution"
                value={`${
                  dashboard
                    ?.avg_resolution_time ??
                  24
                } min`}
              />

              <StatCard
                icon={<Database />}
                title="Hindsight Memories"
                value={
                  dashboard
                    ?.memory_count ??
                  memoryStats?.count ??
                  0
                }
              />

            </div>

            {/* ACTIVE INCIDENTS */}

            <div className="section-header">

              <div>

                <h3>
                  Active Incidents
                </h3>

                <p>
                  Select an incident to
                  start an AI investigation.
                </p>

              </div>

            </div>

            <div className="incident-grid">

              {incidents.length === 0 ? (

                <div className="empty-state">

                  <AlertTriangle
                    size={35}
                  />

                  <h3>
                    No incidents found
                  </h3>

                  <p>
                    The backend returned
                    no production incidents.
                  </p>

                </div>

              ) : (

                incidents.map(
                  (incident) => (
                    <IncidentCard
                      key={
                        incident.id
                      }
                      incident={
                        incident
                      }
                      onClick={() =>
                        selectIncident(
                          incident
                        )
                      }
                    />
                  )
                )

              )}

            </div>

          </section>
        )}

        {/* =================================================
            INVESTIGATION
        ================================================= */}

        {tab === "investigation" && (
          <section className="content">

            {/* NO INCIDENT */}

            {!selected ? (

              <div className="empty-state">

                <Brain size={35} />

                <h3>
                  No incident selected
                </h3>

                <p>
                  Select an incident from
                  the Dashboard to start
                  an AI investigation.
                </p>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    setTab("dashboard")
                  }
                  style={{
                    marginTop: "18px",
                  }}
                >
                  View Incidents
                </button>

              </div>

            ) : (

              <>

                {/* INCIDENT HEADER */}

                <div className="investigation-header">

                  <div>

                    <div className="incident-label">

                      <span className="incident-number">
                        {selected.incident_number ||
                          "INC"}
                      </span>

                      <span
                        className={`severity ${
                          (
                            selected.severity ||
                            "medium"
                          ).toLowerCase()
                        }`}
                      >
                        {selected.severity ||
                          "MEDIUM"}
                      </span>

                      <span className="status-badge">
                        {selected.status ||
                          "active"}
                      </span>

                    </div>

                    <h3>
                      {selected.title ||
                        "Production Incident"}
                    </h3>

                    <p>
                      {selected.description ||
                        "Production issue detected."}
                    </p>

                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      runInvestigation
                    }
                    disabled={
                      investigating
                    }
                  >

                    {investigating ? (
                      <>
                        <Loader2
                          size={18}
                          className="spin"
                        />

                        Investigating...
                      </>
                    ) : (
                      <>
                        <Play size={18} />

                        Investigate with AI
                      </>
                    )}

                  </button>

                </div>

                {/* LOADING DETAILS */}

                {loadingIncident && (
                  <div
                    style={{
                      marginTop:
                        "10px",
                      color:
                        "#64748b",
                      fontSize:
                        "11px",
                    }}
                  >
                    <Loader2
                      size={13}
                      className="spin"
                      style={{
                        verticalAlign:
                          "middle",
                        marginRight:
                          "5px",
                      }}
                    />

                    Loading additional
                    incident details...
                  </div>
                )}

                {/* DETAILS */}

                <div className="details-grid">

                  <Detail
                    icon={<Server />}
                    label="Service"
                    value={
                      selected.service ||
                      "Unknown"
                    }
                  />

                  <Detail
                    icon={<Activity />}
                    label="Environment"
                    value={
                      selected.environment ||
                      "Production"
                    }
                  />

                  <Detail
                    icon={<TrendingUp />}
                    label="Error Rate"
                    value={`${selected.error_rate ?? 0}%`}
                  />

                  <Detail
                    icon={<Users />}
                    label="Affected Users"
                    value={(
                      selected.affected_users ??
                      0
                    ).toLocaleString()}
                  />

                </div>

                {/* INCIDENT SIGNALS */}

                <div className="panel">

                  <div className="panel-title">

                    <Activity
                      size={18}
                    />

                    <span>
                      Incident Signals
                    </span>

                  </div>

                  <div className="terminal">

                    {selected.logs &&
                    selected.logs.length >
                      0 ? (

                      selected.logs.map(
                        (
                          log,
                          index
                        ) => (
                          <div
                            key={
                              index
                            }
                          >
                            {log}
                          </div>
                        )
                      )

                    ) : (

                      <>
                        <div>
                          <span className="terminal-red">
                            ERROR
                          </span>{" "}
                          ConnectionPoolTimeoutException:
                          max connection pool
                          reached
                        </div>

                        <div>
                          <span className="terminal-yellow">
                            WARN
                          </span>{" "}
                          Database connection
                          acquisition exceeded
                          timeout threshold
                        </div>

                        <div>
                          <span className="terminal-red">
                            ERROR
                          </span>{" "}
                          Payment request
                          failed with HTTP 500
                        </div>

                        <div>
                          <span className="terminal-yellow">
                            WARN
                          </span>{" "}
                          Retry threshold
                          exceeded
                        </div>
                      </>

                    )}

                  </div>

                </div>

                {/* AI RESULT */}

                {analysis && (
                  <div className="analysis-container">

                    <div className="ai-header">

                      <div className="ai-title">

                        <div className="ai-icon">
                          <Brain
                            size={20}
                          />
                        </div>

                        <div>

                          <h3>
                            AI Investigation
                          </h3>

                          <span>
                            Powered by Groq +
                            Hindsight
                          </span>

                        </div>

                      </div>

                      {analysis.confidence !==
                        undefined && (

                        <div className="confidence">

                          <span>
                            Confidence
                          </span>

                          <strong>
                            {Math.round(
                              Number(
                                analysis.confidence
                              ) *
                                100
                            )}
                            %
                          </strong>

                        </div>

                      )}

                    </div>

                    {/* SUMMARY */}

                    {analysis.summary && (
                      <div className="analysis-section">

                        <h4>
                          <Lightbulb
                            size={17}
                          />

                          Investigation
                          Summary
                        </h4>

                        <p>
                          {
                            analysis.summary
                          }
                        </p>

                      </div>
                    )}

                    {/* ROOT CAUSE */}

                    {analysis.probable_root_cause && (
                      <div className="root-cause">

                        <div className="root-cause-icon">

                          <ShieldAlert
                            size={21}
                          />

                        </div>

                        <div>

                          <span>
                            PROBABLE ROOT CAUSE
                          </span>

                          <p>
                            {
                              analysis.probable_root_cause
                            }
                          </p>

                        </div>

                      </div>
                    )}

                    {/* RECOMMENDATIONS */}

                    {analysis.recommended_actions &&
                      analysis
                        .recommended_actions
                        .length >
                        0 && (

                        <div className="analysis-section">

                          <h4>
                            <Zap
                              size={17}
                            />

                            Recommended
                            Actions
                          </h4>

                          <div className="recommendations">

                            {analysis.recommended_actions.map(
                              (
                                action,
                                index
                              ) => (

                                <div
                                  className="recommendation"
                                  key={
                                    index
                                  }
                                >

                                  <span>
                                    {index +
                                      1}
                                  </span>

                                  <p>
                                    {
                                      action
                                    }
                                  </p>

                                </div>

                              )
                            )}

                          </div>

                        </div>
                      )}

                    {/* SIMILAR INCIDENTS */}

                    {analysis.similar_incidents &&
                      analysis
                        .similar_incidents
                        .length >
                        0 && (

                        <div className="analysis-section">

                          <h4>
                            <History
                              size={17}
                            />

                            Similar
                            Incidents
                          </h4>

                          <div className="similar-grid">

                            {analysis.similar_incidents.map(
                              (
                                item,
                                index
                              ) => (

                                <div
                                  className="similar-card"
                                  key={
                                    index
                                  }
                                >

                                  <strong>
                                    {item.incident_number ||
                                      item.id ||
                                      `Incident ${
                                        index +
                                        1
                                      }`}
                                  </strong>

                                  <p>
                                    {item.title ||
                                      item.content ||
                                      item.summary ||
                                      "Previous incident with similar symptoms."}
                                  </p>

                                </div>

                              )
                            )}

                          </div>

                        </div>
                      )}

                    {/* REASONING */}

                    {analysis.reasoning && (
                      <div className="analysis-section">

                        <h4>
                          AI Reasoning
                        </h4>

                        <p className="reasoning">
                          {
                            analysis.reasoning
                          }
                        </p>

                      </div>
                    )}

                    {/* SAVE MEMORY */}

                    <div className="learning-action">

                      <div>

                        <strong>
                          Did this resolution
                          work?
                        </strong>

                        <p>
                          Store the successful
                          resolution in Hindsight
                          so future incidents can
                          benefit from it.
                        </p>

                      </div>

                      <button
                        type="button"
                        className="success-button"
                        onClick={
                          learnFromResolution
                        }
                        disabled={
                          learning
                        }
                      >

                        {learning ? (
                          <>
                            <Loader2
                              size={17}
                              className="spin"
                            />

                            Learning...
                          </>
                        ) : (
                          <>
                            <CheckCircle2
                              size={17}
                            />

                            Save to Memory
                          </>
                        )}

                      </button>

                    </div>

                  </div>
                )}

                {/* BEFORE AI */}

                {!analysis &&
                  !investigating && (

                    <div className="empty-analysis">

                      <div className="empty-analysis-icon">
                        <Brain
                          size={34}
                        />
                      </div>

                      <h3>
                        Ready to investigate
                      </h3>

                      <p>
                        Click{" "}
                        <strong>
                          Investigate with AI
                        </strong>{" "}
                        to analyze this incident
                        using historical Hindsight
                        memories.
                      </p>

                    </div>

                  )}

                {/* INVESTIGATING */}

                {investigating && (

                  <div className="empty-analysis">

                    <Loader2
                      size={35}
                      className="spin"
                    />

                    <h3>
                      AI is investigating...
                    </h3>

                    <p>
                      ResolveIQ is searching
                      Hindsight memory and
                      reasoning over the incident.
                    </p>

                  </div>

                )}

              </>

            )}

          </section>
        )}

        {/* =================================================
            HINDSIGHT MEMORY
        ================================================= */}

        {tab === "memory" && (
          <section className="content">

            <div className="memory-hero">

              <div className="memory-large-icon">
                <Brain size={45} />
              </div>

              <div>

                <span className="eyebrow">
                  LONG-TERM AI MEMORY
                </span>

                <h3>
                  Hindsight remembers what
                  happened before.
                </h3>

                <p>
                  Instead of treating every incident
                  as new, ResolveIQ retrieves previous
                  experiences and uses them during
                  investigation.
                </p>

              </div>

            </div>

            <div className="stats-grid">

              <StatCard
                icon={<Database />}
                title="Stored Memories"
                value={
                  memoryStats?.count ??
                  dashboard
                    ?.memory_count ??
                  0
                }
              />

              <StatCard
                icon={<History />}
                title="Historical Incidents"
                value={
                  incidents.length
                }
              />

              <StatCard
                icon={<Brain />}
                title="Memory System"
                value={
                  memoryStats
                    ? "Active"
                    : "Fallback"
                }
              />

              <StatCard
                icon={<Zap />}
                title="Learning"
                value="Enabled"
              />

            </div>

            <div className="panel">

              <div className="panel-title">

                <History size={18} />

                <span>
                  How Hindsight is used
                </span>

              </div>

              <div className="memory-flow">

                <MemoryStep
                  number="01"
                  title="Incident occurs"
                  description="Production sends signals, errors and logs to ResolveIQ."
                />

                <MemoryStep
                  number="02"
                  title="Recall"
                  description="Hindsight searches previous incidents and operational experiences."
                />

                <MemoryStep
                  number="03"
                  title="Reason"
                  description="The AI compares the current incident with historical context."
                />

                <MemoryStep
                  number="04"
                  title="Learn"
                  description="Successful resolutions are stored for future incidents."
                />

              </div>

            </div>

            <div className="panel">

              <div className="panel-title">

                <Database size={18} />

                <span>
                  Example remembered experience
                </span>

              </div>

              <div className="memory-example">

                <div className="memory-example-header">

                  <span>
                    INC-127
                  </span>

                  <span className="memory-tag">
                    SUCCESSFUL RESOLUTION
                  </span>

                </div>

                <h4>
                  Payment Service Connection
                  Pool Exhaustion
                </h4>

                <p>
                  Database connection pool reached
                  its maximum size during a traffic
                  spike.
                </p>

                <div className="memory-result">

                  <CheckCircle2
                    size={17}
                  />

                  Connection pool increased
                  from 50 → 100. Error rate
                  returned to normal.

                </div>

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            LEARNING LOOP
        ================================================= */}

        {tab === "learning" && (
          <section className="content">

            <div className="learning-hero">

              <div>

                <span className="eyebrow">
                  CONTINUOUS IMPROVEMENT
                </span>

                <h3>
                  Every resolved incident makes
                  ResolveIQ smarter.
                </h3>

                <p>
                  The learning loop turns operational
                  experience into reusable AI memory.
                </p>

              </div>

              <div className="learning-icon">
                <TrendingUp size={55} />
              </div>

            </div>

            <div className="learning-flow">

              <FlowCard
                icon={<AlertTriangle />}
                number="01"
                title="Incident"
                description="A production issue is detected."
              />

              <FlowArrow />

              <FlowCard
                icon={<Brain />}
                number="02"
                title="Recall"
                description="Hindsight retrieves similar past experiences."
              />

              <FlowArrow />

              <FlowCard
                icon={<Lightbulb />}
                number="03"
                title="Recommendation"
                description="AI proposes a resolution using current and historical context."
              />

              <FlowArrow />

              <FlowCard
                icon={<CheckCircle2 />}
                number="04"
                title="Outcome"
                description="Engineer confirms whether the resolution worked."
              />

              <FlowArrow />

              <FlowCard
                icon={<Database />}
                number="05"
                title="Memory"
                description="The successful experience is retained for future incidents."
              />

            </div>

            <div className="panel">

              <div className="panel-title">

                <TrendingUp size={18} />

                <span>
                  Learning demonstration
                </span>

              </div>

              <div className="before-after">

                <div className="before">

                  <span className="comparison-label">
                    BEFORE
                  </span>

                  <h4>
                    New payment incident
                  </h4>

                  <p>
                    AI has no historical context
                    about this exact failure.
                  </p>

                  <div className="comparison-item">

                    <AlertTriangle
                      size={16}
                    />

                    HTTP 500 spike

                  </div>

                </div>

                <div className="arrow">
                  →
                </div>

                <div className="after">

                  <span className="comparison-label">
                    AFTER
                  </span>

                  <h4>
                    Learned experience
                  </h4>

                  <p>
                    Hindsight recalls a previous
                    connection pool incident.
                  </p>

                  <div className="comparison-item">

                    <CheckCircle2
                      size={16}
                    />

                    Pool 50 → 100

                  </div>

                </div>

              </div>

            </div>

          </section>
        )}

      </main>

    </div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
}) {
  return (
    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div>

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}

// =====================================================
// INCIDENT CARD
// =====================================================

function IncidentCard({
  incident,
  onClick,
}: {
  incident: Incident;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="incident-card"
      onClick={onClick}
    >

      <div className="incident-card-top">

        <span className="incident-number">
          {incident.incident_number ||
            "INC"}
        </span>

        <span
          className={`severity ${
            (
              incident.severity ||
              "medium"
            ).toLowerCase()
          }`}
        >
          {incident.severity ||
            "MEDIUM"}
        </span>

      </div>

      <h4>
        {incident.title ||
          "Production Incident"}
      </h4>

      <p>
        {incident.description ||
          "Production issue detected."}
      </p>

      <div className="incident-card-bottom">

        <span>

          <Server size={14} />

          {incident.service ||
            "Unknown Service"}

        </span>

        <span>

          <TrendingUp size={14} />

          {incident.error_rate ??
            0}
          %

        </span>

      </div>

    </button>
  );
}

// =====================================================
// DETAIL
// =====================================================

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="detail-card">

      <div className="detail-icon">
        {icon}
      </div>

      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}

// =====================================================
// MEMORY STEP
// =====================================================

function MemoryStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="memory-step">

      <div className="step-number">
        {number}
      </div>

      <div>

        <h4>
          {title}
        </h4>

        <p>
          {description}
        </p>

      </div>

    </div>
  );
}

// =====================================================
// FLOW CARD
// =====================================================

function FlowCard({
  icon,
  number,
  title,
  description,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flow-card">

      <span className="flow-number">
        {number}
      </span>

      <div className="flow-icon">
        {icon}
      </div>

      <h4>
        {title}
      </h4>

      <p>
        {description}
      </p>

    </div>
  );
}

// =====================================================
// FLOW ARROW
// =====================================================

function FlowArrow() {
  return (
    <div className="flow-arrow">
      →
    </div>
  );
}

export default App; 