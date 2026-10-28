
import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Clock3,
  CheckCircle2,
  X,
} from "lucide-react";
import "./src/CaseManagement.css";

const API = "http://127.0.0.1:5000/api/cases";

async function fetchCases() {
  const response = await fetch(API);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to load cases");
  }

  return Array.isArray(data) ? data : data.cases || [];
}

const emptyForm = {
  transaction_id: "",
  title: "",
  description: "",
  priority: "High",
};

export default function CaseManagement() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadCases() {
    setLoading(true);
    setError("");

    try {
      setCases(await fetchCases());
    } catch {
      setError(
        "Cannot load cases. Check that the Flask backend is running and the case API is registered."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialCases() {
      try {
        const records = await fetchCases();
        if (!cancelled) setCases(records);
      } catch {
        if (!cancelled) {
          setError(
            "Cannot load cases. Check that the Flask backend is running and the case API is registered."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialCases();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCases = cases.filter((item) => {
    const matchesStatus = filter === "All" || item.status === filter;
    const query = search.toLowerCase();

    const matchesSearch = [
      item.transaction_id,
      item.title,
      item.description,
      item.priority,
      item.status,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));

    return matchesStatus && matchesSearch;
  });

  const counts = {
    All: cases.length,
    Open: cases.filter((item) => item.status === "Open").length,
    Investigating: cases.filter(
      (item) => item.status === "Investigating"
    ).length,
    Resolved: cases.filter((item) => item.status === "Resolved").length,
  };

  async function createCase(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create case");
      }

      setCases((previous) => [data.case, ...previous]);
      setForm(emptyForm);
      setShowForm(false);
      setNotice("Investigation case created successfully.");
    } catch (err) {
      setError(err.message || "Could not create case.");
    } finally {
      setSaving(false);
    }
  }

  async function updateCase(caseId, updates) {
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not update case");
      }

      setCases((previous) =>
        previous.map((item) =>
          item.id === caseId ? data.case : item
        )
      );

      setSelected((previous) =>
        previous?.id === caseId ? data.case : previous
      );

      setNotice("Case updated successfully.");
    } catch (err) {
      setError(err.message || "Could not update case.");
    }
  }

  return (
    <section className="case-page">
      <div className="case-heading">
        <div>
          <span className="case-eyebrow">FRAUD OPERATIONS</span>
          <h1>Case Management</h1>
          <p>Track alerts, investigate suspicious activity, and record outcomes.</p>
        </div>

        <button className="case-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> New Case
        </button>
      </div>

      {error && <div className="case-message case-error">{error}</div>}
      {notice && <div className="case-message case-success">{notice}</div>}

      <div className="case-stats">
        {[
          { label: "Total Cases", value: counts.All, icon: BriefcaseBusiness },
          { label: "Open", value: counts.Open, icon: ShieldAlert },
          { label: "Investigating", value: counts.Investigating, icon: Clock3 },
          { label: "Resolved", value: counts.Resolved, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <div className="case-stat" key={label}>
            <span className="case-stat-icon"><Icon size={20} /></span>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="case-toolbar">
        <label className="case-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search cases or transaction IDs..."
          />
        </label>

        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          {["All", "Open", "Investigating", "Resolved"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>

        <button className="case-secondary" onClick={loadCases} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="case-table-wrap">
        <table className="case-table">
          <thead>
            <tr>
              <th>Case</th>
              <th>Transaction ID</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="case-empty">Loading cases...</td></tr>
            ) : filteredCases.length === 0 ? (
              <tr>
                <td colSpan="6" className="case-empty">
                  No cases found. Select “New Case” to create one.
                </td>
              </tr>
            ) : (
              filteredCases.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <small>CASE-{String(item.id).padStart(4, "0")}</small>
                  </td>
                  <td>{item.transaction_id}</td>
                  <td>
                    <span className={`case-priority priority-${item.priority.toLowerCase()}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`case-status status-${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="case-link" onClick={() => setSelected(item)}>
                      View / Update
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="case-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowForm(false);
        }}>
          <div className="case-modal">
            <div className="case-modal-head">
              <div>
                <h2>Create Investigation Case</h2>
                <p>Record a suspicious transaction for review.</p>
              </div>
              <button className="case-close" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createCase} className="case-form">
              <label>
                Transaction ID *
                <input
                  required
                  value={form.transaction_id}
                  onChange={(event) => setForm({ ...form, transaction_id: event.target.value })}
                  placeholder="e.g. TXN-1001"
                />
              </label>

              <label>
                Case Title *
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Describe the alert"
                />
              </label>

              <label>
                Priority
                <select
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                >
                  {["Low", "Medium", "High", "Critical"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>

              <label>
                Description
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Why does this transaction need investigation?"
                />
              </label>

              <button className="case-primary" type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Case"}
              </button>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="case-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}>
          <div className="case-modal">
            <div className="case-modal-head">
              <div>
                <span className="case-eyebrow">CASE-{String(selected.id).padStart(4, "0")}</span>
                <h2>{selected.title}</h2>
                <p>Transaction: {selected.transaction_id}</p>
              </div>
              <button className="case-close" onClick={() => setSelected(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="case-detail-grid">
              <div><span>Priority</span><strong>{selected.priority}</strong></div>
              <div><span>Created</span><strong>{new Date(selected.created_at).toLocaleString()}</strong></div>
            </div>

            <p className="case-description">
              {selected.description || "No description provided."}
            </p>

            <label className="case-field">
              Case Status
              <select
                value={selected.status}
                onChange={(event) => updateCase(selected.id, { status: event.target.value })}
              >
                {["Open", "Investigating", "Resolved"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>

            <label className="case-field">
              Investigation Notes
              <textarea
                rows="5"
                defaultValue={selected.notes || ""}
                key={selected.id}
                onBlur={(event) => {
                  if (event.target.value !== (selected.notes || "")) {
                    updateCase(selected.id, { notes: event.target.value });
                  }
                }}
                placeholder="Record findings, actions taken, and next steps..."
              />
              <small>Notes are saved when you leave the notes field.</small>
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
