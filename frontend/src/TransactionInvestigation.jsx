
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Clock3,
  X,
  MapPin,
  CreditCard,
  CalendarDays,
  AlertTriangle,
  FileSearch,
} from "lucide-react";
import "./TransactionInvestigation.css";

const API_URL = "http://127.0.0.1:5000/api/transactions";

async function fetchTransactions() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`Backend returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  const records = Array.isArray(payload)
    ? payload
    : payload.transactions ?? payload.data ?? payload.results ?? [];

  if (!Array.isArray(records)) {
    throw new Error("The API returned an unexpected transaction format.");
  }

  return records.map(normalizeRecord);
}

function normalizeStatus(value) {
  const status = String(value ?? "Safe").toLowerCase();

  if (
    status.includes("fraud") ||
    status.includes("flag") ||
    status.includes("block")
  ) {
    return "Fraud";
  }

  if (
    status.includes("review") ||
    status.includes("suspicious") ||
    status.includes("pending")
  ) {
    return "Review";
  }

  return "Safe";
}

function normalizeRecord(item, index) {
  return {
    id: item.id ?? item.transaction_id ?? item.txn_id ?? `TXN-${index + 1}`,
    transactionId:
      item.transaction_id ?? item.id ?? item.txn_id ?? `TXN-${index + 1}`,
    amount: Number(item.amount ?? item.transaction_amount ?? 0),
    paymentMethod:
      item.payment_method ?? item.paymentMethod ?? item.category ?? "Unknown",
    location: item.location ?? item.merchant ?? "Unknown",
    riskScore: Math.min(
      100,
      Math.max(0, Number(item.risk_score ?? item.riskScore ?? item.risk ?? 0))
    ),
    status: normalizeStatus(item.status ?? item.transaction_status),
    date: item.created_at ?? item.timestamp ?? item.date ?? "",
    reasons: Array.isArray(item.risk_reasons)
      ? item.risk_reasons
      : Array.isArray(item.reasons)
        ? item.reasons
        : [],
  };
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function TransactionInvestigation() {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadTransactions(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      updateTransactions(await fetchTransactions());
    } catch (err) {
      setError(
        err.message ||
          "Unable to load transactions. Check that the Flask backend is running."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function updateTransactions(normalized) {
    setTransactions(normalized);
    setSelected((current) =>
      current
        ? normalized.find(
            (item) => String(item.id) === String(current.id)
          ) ?? null
        : null
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialTransactions() {
      try {
        const records = await fetchTransactions();
        if (!cancelled) updateTransactions(records);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load transactions. Check that the Flask backend is running."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialTransactions();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions.filter((item) => {
      const matchesStatus = filter === "All" || item.status === filter;

      const matchesSearch =
        !query ||
        [
          item.transactionId,
          item.id,
          item.location,
          item.paymentMethod,
          item.status,
        ].some((value) => String(value).toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [transactions, search, filter]);

  const counts = useMemo(
    () => ({
      All: transactions.length,
      Fraud: transactions.filter((item) => item.status === "Fraud").length,
      Review: transactions.filter((item) => item.status === "Review").length,
      Safe: transactions.filter((item) => item.status === "Safe").length,
    }),
    [transactions]
  );

  return (
    <section className="investigation" id="transaction-investigation">
      <div className="investigation-heading">
        <div>
          <span className="investigation-eyebrow">FRAUD OPERATIONS</span>
          <h2>Transaction Investigation</h2>
          <p>Search, review, and inspect transactions stored in FraudShield.</p>
        </div>

        <button
          className="investigation-refresh"
          onClick={() => loadTransactions(true)}
          disabled={loading || refreshing}
          type="button"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "investigation-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="investigation-stats">
        {[
          { label: "Total", value: counts.All, icon: FileSearch },
          { label: "Fraud", value: counts.Fraud, icon: ShieldAlert },
          { label: "Review", value: counts.Review, icon: Clock3 },
          { label: "Safe", value: counts.Safe, icon: ShieldCheck },
        ].map(({ label, value, icon: Icon }) => (
          <div className="investigation-stat" key={label}>
            <span className={`investigation-stat-icon ${label.toLowerCase()}`}>
              <Icon size={19} />
            </span>
            <div>
              <span>{label} transactions</span>
              <strong>{loading ? "—" : value}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="investigation-toolbar">
        <label className="investigation-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search transaction ID, location, or payment..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </label>

        <div className="investigation-filters" aria-label="Filter by status">
          {["All", "Fraud", "Review", "Safe"].map((status) => (
            <button
              key={status}
              type="button"
              className={filter === status ? "active" : ""}
              onClick={() => setFilter(status)}
              aria-pressed={filter === status}
            >
              {status}
              <span>{counts[status]}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="investigation-error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => loadTransactions()}>
            Try again
          </button>
        </div>
      )}

      <div className="investigation-table-wrap">
        <table className="investigation-table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Location</th>
              <th>Payment</th>
              <th>Amount</th>
              <th>Risk score</th>
              <th>Status</th>
              <th>Created</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="investigation-empty">
                  Loading transaction records…
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="investigation-empty">
                  {error
                    ? "Transactions could not be loaded."
                    : "No transactions match your search or filter."}
                </td>
              </tr>
            ) : (
              filteredTransactions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong className="investigation-id">
                      {item.transactionId}
                    </strong>
                  </td>
                  <td>{item.location}</td>
                  <td>{item.paymentMethod}</td>
                  <td className="investigation-amount">
                    {formatCurrency(item.amount)}
                  </td>
                  <td>
                    <div className="investigation-risk">
                      <div>
                        <span
                          style={{ width: `${item.riskScore}%` }}
                          className={`risk-fill ${item.status.toLowerCase()}`}
                        />
                      </div>
                      <strong>{item.riskScore}%</strong>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`investigation-badge ${item.status.toLowerCase()}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>{formatDate(item.date)}</td>
                  <td>
                    <button
                      type="button"
                      className="investigation-view"
                      onClick={() => setSelected(item)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="investigation-footer">
        Showing {loading ? 0 : filteredTransactions.length} of{" "}
        {loading ? 0 : transactions.length} transactions
      </div>

      {selected && (
        <div
          className="investigation-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section
            className="investigation-detail"
            role="dialog"
            aria-modal="true"
            aria-labelledby="investigation-detail-title"
          >
            <div className="investigation-detail-heading">
              <div>
                <span className="investigation-eyebrow">RECORD DETAILS</span>
                <h3 id="investigation-detail-title">
                  {selected.transactionId}
                </h3>
              </div>
              <button
                type="button"
                className="investigation-close"
                onClick={() => setSelected(null)}
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="investigation-detail-score">
              <span>Recorded risk score</span>
              <strong>{selected.riskScore}%</strong>
              <span
                className={`investigation-badge ${selected.status.toLowerCase()}`}
              >
                {selected.status}
              </span>
            </div>

            <div className="investigation-detail-grid">
              <div>
                <span>Amount</span>
                <strong>{formatCurrency(selected.amount)}</strong>
              </div>
              <div>
                <span>Payment method</span>
                <strong>
                  <CreditCard size={15} /> {selected.paymentMethod}
                </strong>
              </div>
              <div>
                <span>Location</span>
                <strong>
                  <MapPin size={15} /> {selected.location}
                </strong>
              </div>
              <div>
                <span>Created</span>
                <strong>
                  <CalendarDays size={15} /> {formatDate(selected.date)}
                </strong>
              </div>
            </div>

            <div className="investigation-reasons">
              <h4>
                <ShieldAlert size={18} /> Risk explanation
              </h4>
              {selected.reasons.length ? (
                <ul>
                  {selected.reasons.map((reason, index) => (
                    <li key={`${index}-${String(reason)}`}>
                      {typeof reason === "string"
                        ? reason
                        : reason.message ?? reason.reason ?? JSON.stringify(reason)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  No risk reasons are stored in the transaction response.
                  This view shows the recorded score and status; it does not
                  infer additional reasons.
                </p>
              )}
            </div>

            <button
              type="button"
              className="investigation-close-button"
              onClick={() => setSelected(null)}
            >
              Close details
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
