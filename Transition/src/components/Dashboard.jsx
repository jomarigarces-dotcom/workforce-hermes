import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Dashboard() {
  const stats = useQuery(api.tasks.getProjectStats);

  if (!stats) {
    return (
      <div className="container">
        <p style={{ color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div id="dashboard-view" className="view-section">
      <div className="container">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--col-todo)" }}>{stats.todo || 0}</div>
            <div className="stat-label">Queue</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--color-amber)" }}>{stats.development || 0}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "#10b981" }}>{stats.done || 0}</div>
            <div className="stat-label">Deployed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "#6366f1" }}>{stats.overallCompletion || 0}%</div>
            <div className="stat-label">Efficiency</div>
          </div>
        </div>

        <div className="section-card">
          <h2 style={{ fontWeight: 900, marginTop: 0, textTransform: "uppercase", fontSize: "1.2rem", letterSpacing: "-0.5px" }}>
            System Overview
          </h2>
          <p style={{ color: "#64748b" }}>
            Welcome to Workforce Hermes. Use the navigation above to manage tasks, staff, and project concepts.
          </p>
        </div>

        <div className="section-card" style={{ marginTop: 20 }}>
          <h2 style={{ fontWeight: 900, marginTop: 0, textTransform: "uppercase", fontSize: "1rem", color: "#1e293b", marginBottom: 20 }}>
            👥 Programmer Workload — Active & Pending
          </h2>
          <div>
            {(stats.staffWorkload || []).length === 0 ? (
              <p style={{ color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>
                No active or pending tasks right now.
              </p>
            ) : (
              stats.staffWorkload.map((w) => (
                <div
                  key={w.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 15px",
                    borderRadius: 12,
                    background: "#f8fafc",
                    marginBottom: 10,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#1e293b", fontSize: "0.9rem" }}>{w.name}</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {w.active > 0 && (
                      <span style={{ background: "linear-gradient(135deg,#6366f1,#a5b4fc)", color: "white", padding: "3px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 700 }}>
                        Active: {w.active}
                      </span>
                    )}
                    {w.pending > 0 && (
                      <span style={{ background: "linear-gradient(135deg,#f59e0b,#fcd34d)", color: "white", padding: "3px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 700 }}>
                        Pending: {w.pending}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
