import CaseManagement from "../CaseManagement";
import DashboardCharts from "./DashboardCharts";
import MlCsvDemo from "./MlCsvDemo";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";

import {
  ShieldCheck,
  LayoutDashboard,
  ArrowLeftRight,
  ShieldAlert,
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  TrendingUp,
  Wallet,
  CircleCheck,
  Clock3,
  Plus,
  ArrowUpRight,
  RefreshCw,
  MapPin,
  CreditCard,
  Hash,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import {
  getDashboardStats,
  getTransactions,
  createTransaction,
} from "./api";
import "./App.css";

const NAV_ITEMS =[
  { label: "Overview", icon: LayoutDashboard },
  { label: "Transactions", icon: ArrowLeftRight },
  { label: "Risk monitoring", icon: ShieldAlert },
  { label: "Fraud Alerts", icon: Bell },
];

const EMPTY_FORM = {
  transaction_id: "",
  amount: "",
  payment_method: "UPI",
  location: "",
};

function getTransactionList(payload) {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.transactions)) return payload.transactions;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
}

async function fetchDashboardData() {
  const [statsResponse, transactionResponse] = await Promise.all([
    getDashboardStats(),
    getTransactions(),
  ]);

  return {
    stats: statsResponse ?? {},
    transactions: getTransactionList(transactionResponse).map(normalizeTransaction),
  };
}

function normalizeTransaction(item, index) {
  const rawStatus = String(
    item.status ?? item.transaction_status ?? "Safe"
  ).toLowerCase();

  let status = "Safe";

  if (
    rawStatus.includes("fraud") ||
    rawStatus.includes("flag") ||
    rawStatus.includes("block")
  ) {
    status = "Flagged";
  } else if (
    rawStatus.includes("review") ||
    rawStatus.includes("suspicious") ||
    rawStatus.includes("pending")
  ) {
    status = "Review";
  }

  const rawAmount = Number(
    item.amount ?? item.transaction_amount ?? item.value ?? 0
  );

  return {
    id: item.id ?? item.transaction_id ?? item.txn_id ?? `TXN-${index + 1}`,
    amount: Number.isFinite(rawAmount) ? rawAmount : 0,
    paymentMethod:
      item.payment_method ?? item.category ?? item.transaction_type ?? "Other",
    location: item.location ?? item.merchant ?? item.merchant_name ?? "Unknown",
    status,
    riskScore: Number(item.risk_score ?? item.risk ?? 0),
    date:
      item.created_at ??
      item.timestamp ??
      item.transaction_date ??
      item.date ??
      "",
  };
}

function readStat(stats, keys, fallback = 0) {
  for (const key of keys) {
    const value = Number(stats?.[key]);
    if (stats?.[key] !== undefined && Number.isFinite(value)) return value;
  }
  return fallback;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "Recently";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildActivityData(transactions) {
  const today = new Date();
  const days = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - offset);

    days.push({
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      transactions: 0,
      flagged: 0,
      date,
    });
  }

  transactions.forEach((transaction) => {
    if (!transaction.date) return;

    const parsed = new Date(transaction.date);
    if (Number.isNaN(parsed.getTime())) return;

    const key = `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}`;
    const day = days.find((entry) => entry.key === key);

    if (day) {
      day.transactions += 1;
      if (transaction.status === "Flagged" || transaction.status === "Review") {
        day.flagged += 1;
      }
    }
  });

  return days.map(({ day, transactions: count, flagged }) => ({
    day,
    transactions: count,
    flagged,
  }));
}

function App() {
  const [fraudAlerts, setFraudAlerts] = useState([]);
const [alertsLoading, setAlertsLoading] = useState(true);
const [alertsError, setAlertsError] = useState("");
useEffect(() => {
  const fetchAlerts = async () => {
    try {
      setAlertsLoading(true);
      setAlertsError("");

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://fraud-shield-sepia.vercel.app" : "http://127.0.0.1:5000")}/api/alerts`
      );

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();

      const alerts = Array.isArray(data)
        ? data
        : Array.isArray(data.alerts)
          ? data.alerts
          : [];

      setFraudAlerts(alerts);
    } catch (error) {
      setAlertsError(error.message || "Unable to load alerts.");
    } finally {
      setAlertsLoading(false);
    }
  };

  fetchAlerts();
}, []);
useEffect(() => {
  fetch(`${import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://fraud-shield-sepia.vercel.app" : "http://127.0.0.1:5000")}/api/alerts`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load fraud alerts");
      }
      return response.json();
    })
    .then((data) => {
      setFraudAlerts(Array.isArray(data) ? data : data.alerts || []);
      setAlertsError("");
    })
    .catch((error) => {
      setAlertsError(error.message);
    })
    .finally(() => {
      setAlertsLoading(false);
    });
}, []);
  const [stats, setStats] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [search, setSearch] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const refreshDashboard = useCallback(async (showSpinner = true) => {
    if (showSpinner) setRefreshing(true);

    try {
      const dashboard = await fetchDashboardData();
      setStats(dashboard.stats);
      setTransactions(dashboard.transactions);
      setBackendError("");
    } catch (error) {
      setBackendError(
        error?.message || "Could not connect to the FraudShield backend."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const dashboard = await fetchDashboardData();
        if (cancelled) return;

        setStats(dashboard.stats);
        setTransactions(dashboard.transactions);
        setBackendError("");
      } catch (error) {
        if (cancelled) return;
        setBackendError(
          error?.message || "Could not connect to the FraudShield backend."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return transactions;

    return transactions.filter((transaction) =>
      [
        transaction.id,
        transaction.location,
        transaction.paymentMethod,
        transaction.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [transactions, search]);

  const computed = useMemo(() => {
    const total = transactions.length;
    const flagged = transactions.filter((item) => item.status === "Flagged").length;
    const review = transactions.filter((item) => item.status === "Review").length;
    const safe = transactions.filter((item) => item.status === "Safe").length;

    const totalTransactions = readStat(
      stats,
      ["total_transactions", "totalTransactions", "total"],
      total
    );
    const flaggedTransactions = readStat(
      stats,
      ["fraud_detected", "flagged", "flagged_transactions", "fraud_count"],
      flagged
    );
    const reviewTransactions = readStat(
      stats,
      ["review", "review_transactions", "under_review"],
      review
    );
    const safeTransactions = readStat(
      stats,
      ["safe", "safe_transactions", "approved"],
      safe
    );

    const amountProtected = transactions
      .filter((item) => item.status === "Safe")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      totalTransactions,
      flaggedTransactions,
      reviewTransactions,
      safeTransactions,
      amountProtected,
      fraudRate:
        readStat(stats, ["fraud_rate", "fraudRate"], NaN) ||
        (totalTransactions
          ? (flaggedTransactions / totalTransactions) * 100
          : 0),
    };
  }, [stats, transactions]);

  const activityData = useMemo(
    () => buildActivityData(transactions),
    [transactions]
  );

  const riskData = [
    { name: "Safe", value: computed.safeTransactions, color: "#10b981" },
    { name: "Review", value: computed.reviewTransactions, color: "#f59e0b" },
    { name: "Flagged", value: computed.flaggedTransactions, color: "#f04452" },
  ];

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openTransactionForm = () => {
    setForm({
      ...EMPTY_FORM,
      transaction_id: `TXN-${Date.now().toString().slice(-8)}`,
    });
    setFormError("");
    setShowForm(true);
  };

  const closeTransactionForm = () => {
    if (submitting) return;
    setShowForm(false);
    setFormError("");
  };

  const handleCreateTransaction = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.transaction_id.trim() || !form.location.trim()) {
      setFormError("Please complete all the fields.");
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }

    setSubmitting(true);

    try {
      await createTransaction({
        transaction_id: form.transaction_id.trim(),
        amount,
        payment_method: form.payment_method,
        location: form.location.trim(),
      });

      setShowForm(false);
      setForm(EMPTY_FORM);
      setNotice("Transaction added successfully.");
      await refreshDashboard(false);
    } catch (error) {
      setFormError(
        error?.message ||
          "Unable to save the transaction. Please check your backend."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectNavigation = (label) => {

    const selectNavigation = (label) => {
  setActiveNav(label);
  setMobileSidebarOpen(false);

  if (label === "Transactions") {
    document.getElementById("transactions")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  } else if (label === "Risk monitoring") {
    document.getElementById("risk-monitoring")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  } else if (label === "Overview") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};
    setActiveNav(label);
    setMobileSidebarOpen(false);

    if (label === "Transactions") {
      document.getElementById("transactions")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else if (label === "Risk monitoring") {
      document.getElementById("risk-monitoring")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else if (label === "Overview") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className={`app-shell ${darkMode ? "dark-theme" : ""}`}>
      {mobileSidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileSidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={24} strokeWidth={2.5} />
          </div>
          <div className="brand-copy">
            <span className="brand-name">FraudShield</span>
            <span className="brand-caption">TRANSACTION SECURITY</span>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "nav-item-active" : ""}`}
              onClick={() => selectNavigation(label)}
            >
              <Icon size={19} strokeWidth={2} />
              <span>{label}</span>
              {label === "Risk monitoring" && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="security-card">
            <div className="security-icon">
              <ShieldCheck size={19} />
            </div>
            <div>
              <strong>Protection active</strong>
              <span>Monitoring transactions</span>
            </div>
            <span className="live-dot" />
          </div>

          <div className="profile">
            <div className="profile-avatar">FS</div>
            <div className="profile-copy">
              <strong>FraudShield Admin</strong>
              <span>Security workspace</span>
            </div>
            <span className="profile-menu">•••</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={15} />
              <strong>{activeNav}</strong>
            </div>
          </div>





          <div className="topbar-actions">
            <div className={`connection-pill ${backendError ? "connection-offline" : ""}`}>
              <span className="live-dot" />
              {backendError ? "Backend disconnected" : "System connected"}
            </div>
            <button
              className="icon-button"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDarkMode((current) => !current)}
              title="Toggle appearance"
            >
              {darkMode ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={19} />
              <span />
            </button>
            <button
              className="refresh-button"
              onClick={() => refreshDashboard(true)}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </header>
        
        <div className="page-content">
          {activeNav === "Fraud Alerts" ? (
            <FraudAlerts
              onOpenCaseManagement={() => {
                setActiveNav("Overview");
                setNotice(
                  "Open Case Management below the dashboard to investigate this alert."
                );
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ) : (
            <>
              {activeNav === "Fraud Alerts" ? (
  <FraudAlerts
    onOpenCaseManagement={() => {
      setActiveNav("Overview");
      setNotice(
        "Open Case Management below the dashboard to investigate this alert."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}
  />
) : (
  <>
    <CaseManagement />

    {/* Keep all your existing dashboard content here */}
  </>
)}

          {backendError && (
            <div className="alert-banner">
              <AlertCircle size={19} />
              <div>
                <strong>Unable to refresh dashboard data</strong>
                <p>{backendError} Check that the Flask server is running.</p>
              </div>
              <button
                className="alert-retry"
                onClick={() => refreshDashboard(true)}
              >
                Retry
              </button>
            </div>
          )}

          <section className="welcome-section">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                FRAUD DETECTION CENTER
              </div>
              <h1>Good to see you.</h1>
              <p className="welcome-description">
                Monitor transactions, review risk signals, and keep your
                payment activity in one place.
              </p>
              <div className="welcome-meta">
                <span className="meta-status">
                  <span className="live-dot" />
                  {backendError ? "Connection needs attention" : "Live dashboard"}
                </span>
                <span className="meta-separator">•</span>
                <span>Updated from your database</span>
              </div>
            </div>

            <div className="welcome-actions">
              <button className="button-primary" onClick={openTransactionForm}>
                <Plus size={18} />
                New transaction
              </button>
            </div>
            <div className="hero-decoration hero-decoration-one" />
            <div className="hero-decoration hero-decoration-two" />
          </section>

          <section className="stats-grid" aria-label="Transaction statistics">
            <StatCard
              title="Total transactions"
              value={computed.totalTransactions.toLocaleString("en-IN")}
              note="Records in your system"
              icon={ArrowLeftRight}
              color="blue"
              loading={loading}
            />
            <StatCard
              title="Flagged transactions"
              value={computed.flaggedTransactions.toLocaleString("en-IN")}
              note="Marked as potentially fraudulent"
              icon={ShieldAlert}
              color="red"
              loading={loading}
            />
            <StatCard
              title="Under review"
              value={computed.reviewTransactions.toLocaleString("en-IN")}
              note="Require further attention"
              icon={Clock3}
              color="amber"
              loading={loading}
            />
            <StatCard
              title="Safe transactions"
              value={computed.safeTransactions.toLocaleString("en-IN")}
              note="Currently marked safe"
              icon={CircleCheck}
              color="green"
              loading={loading}
            />
          </section>

          <Suspense fallback={<div className="analytics-grid" aria-busy="true">Loading charts...</div>}>
            <DashboardCharts
              activityData={activityData}
              riskData={riskData}
              totalTransactions={computed.totalTransactions}
              showActivityEmptyMessage={!loading && transactions.length === 0}
            />
          </Suspense>

          <section className="summary-strip">
            <div className="summary-icon">
              <Wallet size={21} />
            </div>
            <div className="summary-copy">
              <strong>Value of safe transactions</strong>
              <span>Sum of transactions currently classified as safe</span>
            </div>
            <div className="summary-value">
              {formatCurrency(computed.amountProtected)}
              <span><TrendingUp size={14} /> From loaded records</span>
            </div>
          </section>

          <section className="panel transactions-panel" id="transactions">
            <div className="transactions-heading">
              <div>
                <div className="section-title-row">
                  <h2>Recent transactions</h2>
                  <span className="count-badge">{transactions.length}</span>
                </div>
                <p>Review transaction details and current risk status.</p>
              </div>
              <button className="button-secondary" onClick={openTransactionForm}>
                <Plus size={16} />
                Add transaction
              </button>
            </div>

            <div className="table-toolbar">
              <div className="table-search">
                <Search size={17} />
                <input
                  type="search"
                  placeholder="Search ID, location, method, or status..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search transactions"
                />
                {search && (
                  <button
                    className="search-clear"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <span className="table-result-count">
                {filteredTransactions.length} of {transactions.length} records
              </span>
            </div>

            <div className="table-scroll">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Location</th>
                    <th>Payment method</th>
                    <th>Amount</th>
                    <th>Risk score</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="table-message">
                        <RefreshCw size={18} className="spin" />
                        Loading your transactions...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="table-message">
                        <div className="empty-state">
                          <div className="empty-state-icon">
                            <Search size={22} />
                          </div>
                          <strong>
                            {search ? "No matching transactions" : "No transactions yet"}
                          </strong>
                          <span>
                            {search
                              ? "Try another search term."
                              : "Create your first transaction to see it here."}
                          </span>
                          {!search && (
                            <button className="button-primary" onClick={openTransactionForm}>
                              <Plus size={16} /> New transaction
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction, index) => (
                      <tr key={`${transaction.id}-${index}`}>
                        <td>
                          <div className="transaction-id">
                            <span className="transaction-id-icon">
                              <Hash size={14} />
                            </span>
                            <strong>{transaction.id}</strong>
                          </div>
                        </td>
                        <td>
                          <div className="location-cell">
                            <MapPin size={15} />
                            <span>{transaction.location}</span>
                          </div>
                        </td>
                        <td>
                          <span className="payment-cell">
                            <CreditCard size={15} />
                            {transaction.paymentMethod}
                          </span>
                        </td>
                        <td className="amount-cell">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td>
                          <div className="risk-score-cell">
                            <div className="risk-score-track">
                              <span
                                className={`risk-score-fill risk-score-${transaction.status.toLowerCase()}`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, transaction.riskScore))}%`,
                                }}
                              />
                            </div>
                            <span>{transaction.riskScore}%</span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={transaction.status} />
                        </td>
                        <td className="date-cell">{formatDate(transaction.date)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>
                <span className="footer-live-dot" />
                Connected to your FraudShield API
              </span>
              <button
                className="text-button"
                onClick={() => refreshDashboard(true)}
                disabled={refreshing}
              >
                Refresh records <ArrowUpRight size={15} />
              </button>
            </div>
          </section>
          <MlCsvDemo />

          <footer className="app-footer">
            <span>© {new Date().getFullYear()} FraudShield</span>
            <span>Transaction monitoring dashboard</span>
            <span className="footer-secure"><ShieldCheck size={14} /> Security workspace</span>
          </footer>
            </>
          )}
        </div>
      </main>
      {showForm && (
        <div className="modal-backdrop" onMouseDown={closeTransactionForm}>
          <section
            className="transaction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div className="modal-title-icon">
                <ArrowLeftRight size={22} />
              </div>
              <div>
                <h2 id="transaction-modal-title">New transaction</h2>
                <p>Add a transaction to your database.</p>
              </div>
              <button
                className="icon-button modal-close"
                onClick={closeTransactionForm}
                disabled={submitting}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form className="transaction-form" onSubmit={handleCreateTransaction}>
              <label className="form-field">
                <span>Transaction ID</span>
                <div className="input-with-icon">
                  <Hash size={17} />
                  <input
                    name="transaction_id"
                    value={form.transaction_id}
                    onChange={updateForm}
                    placeholder="e.g. TXN-1001"
                    required
                  />
                </div>
              </label>

              <label className="form-field">
                <span>Transaction amount (₹)</span>
                <div className="input-with-icon">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={updateForm}
                    min="0.01"
                    step="0.01"
                    placeholder="Enter amount"
                    required
                  />
                </div>
              </label>

              <label className="form-field">
                <span>Payment method</span>
                <div className="input-with-icon select-input">
                  <CreditCard size={17} />
                  <select
                    name="payment_method"
                    value={form.payment_method}
                    onChange={updateForm}
                    required
                  >
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Wallet">Wallet</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </label>

              <label className="form-field">
                <span>Location or merchant</span>
                <div className="input-with-icon">
                  <MapPin size={17} />
                  <input
                    name="location"
                    value={form.location}
                    onChange={updateForm}
                    placeholder="e.g. Chennai or Online Store"
                    required
                  />
                </div>
              </label>

              <section className="fraud-alerts-panel">
  <h2>Fraud Alerts</h2>

  {alertsLoading && <p>Loading alerts...</p>}

  {alertsError && <p>{alertsError}</p>}

  {!alertsLoading &&
    !alertsError &&
    fraudAlerts.length === 0 && (
      <p>No fraud alerts found.</p>
    )}

  {fraudAlerts.map((alert, index) => (
    <div className="fraud-alert-item" key={alert.id ?? index}>
      <strong>
        {alert.title || alert.message || "Fraud alert"}
      </strong>
      <p>Severity: {alert.severity || alert.risk_level || "Unknown"}</p>
      <p>Status: {alert.status || "Open"}</p>
    </div>
  ))}
</section>


              {formError && (
                <div className="form-alert">
                  <AlertCircle size={17} />
                  {formError}
                </div>
              )}

              <div className="form-info">
                <ShieldCheck size={17} />
                <span>
                  Your backend will save this transaction and return its
                  assigned status.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-secondary modal-cancel"
                  onClick={closeTransactionForm}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary modal-submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Save transaction
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {notice && (
        <div className="toast-message">
          <CircleCheck size={19} />
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}
    </div>

  );
}

function StatCard({ title, value, note, icon: Icon, color, loading }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-icon-${color}`}>
        <Icon size={21} strokeWidth={2} />
      </div>
      <div className="stat-card-body">
        <span className="stat-title">{title}</span>
        <strong className="stat-value">
          {loading ? <span className="value-skeleton" /> : value}
        </strong>
        <span className="stat-note">{note}</span>
      </div>
      <div className={`stat-card-accent accent-${color}`} />
    </article>
  );
}

function StatusBadge({ status }) {
  const className = status.toLowerCase();

  return (
    <span className={`status-badge status-${className}`}>
      <span />
      {status}
    </span>
  );
}

export default App;
