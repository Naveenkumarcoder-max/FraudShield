import { useCallback, useEffect, useMemo, useState } from "react";
import "./FraudAlerts.css";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? "https://fraud-shield-sepia.vercel.app"
    : "http://127.0.0.1:5000");

const API_URL = `${API_BASE_URL}/api/alerts`;

async function fetchAlerts() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`Server returned HTTP ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data)
    ? data
    : Array.isArray(data.alerts)
      ? data.alerts
      : [];
}

export default function FraudAlerts({ onOpenCaseManagement }) {
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setAlerts(await fetchAlerts());
    } catch (err) {
      setError(
        `${err.message}. Check that the Flask backend is running on port 5000.`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialAlerts() {
      try {
        const records = await fetchAlerts();
        if (!cancelled) setAlerts(records);
      } catch (err) {
        if (!cancelled) {
          setError(
            `${err.message}. Check that the Flask backend is running on port 5000.`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialAlerts();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return alerts.filter((alert) => {
      const matchesSearch = [
        alert.transaction_id,
        alert.risk_level,
        alert.message,
        alert.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

      const matchesRisk =
        riskFilter === "All" || alert.risk_level === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [alerts, search, riskFilter]);

  const fraudCount = alerts.filter(
    (alert) => alert.risk_level === "Fraud"
  ).length;

  const reviewCount = alerts.filter(
    (alert) => alert.risk_level === "Review"
  ).length;

  return (
    <section className="fraud-alerts-page">
      <header className="fa-header">
        <div>
          <p className="fa-eyebrow">SECURITY OPERATIONS</p>
          <h1>Fraud Alerts</h1>
          <p className="fa-subtitle">
            Monitor suspicious transactions and investigate risk signals.
          </p>
        </div>

        <button
          className="fa-refresh-button"
          onClick={loadAlerts}
          disabled={loading}
        >
          ↻ {loading ? "Refreshing..." : "Refresh alerts"}
        </button>
      </header>

      <div className="fa-stats">
        <article className="fa-stat-card">
          <span className="fa-stat-icon">◎</span>
          <p>Total alerts</p>
          <strong>{alerts.length}</strong>
        </article>

        <article className="fa-stat-card fa-fraud-card">
          <span className="fa-stat-icon">!</span>
          <p>Fraud alerts</p>
          <strong>{fraudCount}</strong>
        </article>

        <article className="fa-stat-card fa-review-card">
          <span className="fa-stat-icon">◷</span>
          <p>Review alerts</p>
          <strong>{reviewCount}</strong>
        </article>
      </div>

      <div className="fa-toolbar">
        <input
          type="search"
          aria-label="Search alerts"
          placeholder="Search transaction, reason, or status..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          aria-label="Filter by risk level"
          value={riskFilter}
          onChange={(event) => setRiskFilter(event.target.value)}
        >
          <option value="All">All risk levels</option>
          <option value="Fraud">Fraud</option>
          <option value="Review">Review</option>
        </select>
      </div>

      {error && (
        <div className="fa-error" role="alert">
          <strong>Unable to load alerts.</strong>
          <p>{error}</p>
          <button onClick={loadAlerts}>Try again</button>
        </div>
      )}

      <div className="fa-table-card">
        <div className="fa-table-heading">
          <div>
            <h2>Alert activity</h2>
            <p>{filteredAlerts.length} alert(s) displayed</p>
          </div>
          <span className="fa-live-label">
            <span /> API connected when data loads
          </span>
        </div>

        {loading && alerts.length === 0 ? (
          <p className="fa-empty">Loading alerts...</p>
        ) : !error && filteredAlerts.length === 0 ? (
          <div className="fa-empty">
            <span className="fa-empty-icon">✓</span>
            <h3>No matching alerts</h3>
            <p>Try a different filter or create a test transaction.</p>
          </div>
        ) : (
          <div className="fa-table-scroll">
            <table className="fa-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Risk level</th>
                  <th>Risk score</th>
                  <th>Reason</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id ?? `${alert.transaction_id}-${alert.risk_level}`}>
                    <td>
                      <strong>{alert.transaction_id || "Unknown"}</strong>
                      <small>Alert #{alert.id ?? "—"}</small>
                    </td>

                    <td>
                      <span
                        className={`fa-risk-badge ${
                          alert.risk_level === "Fraud"
                            ? "fa-risk-fraud"
                            : "fa-risk-review"
                        }`}
                      >
                        {alert.risk_level || "Unknown"}
                      </span>
                    </td>

                    <td>
                      {alert.risk_score == null
                        ? "—"
                        : `${alert.risk_score}%`}
                    </td>

                    <td className="fa-reason">
                      {alert.message || "No reason provided"}
                    </td>

                    <td>
                      {alert.created_at
                        ? new Date(
                            `${alert.created_at.replace(" ", "T")}${
                              alert.created_at.endsWith("Z") ? "" : "Z"
                            }`
                          ).toLocaleString()
                        : "—"}
                    </td>

                    <td>
                      <button
                        className="fa-case-button"
                        onClick={() => {
                          if (onOpenCaseManagement) {
                            onOpenCaseManagement(alert);
                          } else {
                            window.alert(
                              "Open the Case Management section to investigate this transaction."
                            );
                          }
                        }}
                      >
                        Investigate →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="fa-disclaimer">
        Demonstration alerts are generated by configured risk rules. An alert
        indicates a transaction needs attention; it does not independently
        confirm fraud.
      </p>
    </section>
  );
}
