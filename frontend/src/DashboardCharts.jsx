import {
  Activity,
  ShieldCheck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function DashboardCharts({
  activityData,
  riskData,
  totalTransactions,
  showActivityEmptyMessage,
}) {
  return (
    <section className="analytics-grid">
      <article className="panel activity-panel">
        <div className="panel-heading">
          <div>
            <h2>Transaction activity</h2>
            <p>Daily transactions from the last seven days</p>
          </div>
          <span className="panel-icon">
            <Activity size={18} />
          </span>
        </div>

        <div className="chart-legend">
          <span><i className="legend-blue" /> Transactions</span>
          <span><i className="legend-red" /> Flagged / review</span>
        </div>

        <div className="activity-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={activityData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="transactionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5577f5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#5577f5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f04452" stopOpacity={0.13} />
                  <stop offset="95%" stopColor="#f04452" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                dy={9}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--text)",
                  boxShadow: "0 8px 24px rgba(20, 30, 60, 0.08)",
                }}
              />
              <Area
                type="monotone"
                dataKey="transactions"
                name="Transactions"
                stroke="#5577f5"
                strokeWidth={2.5}
                fill="url(#transactionFill)"
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="flagged"
                name="Flagged / review"
                stroke="#f04452"
                strokeWidth={2}
                fill="url(#riskFill)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {showActivityEmptyMessage && (
          <p className="chart-empty-note">
            Add transactions to see activity recorded in your database.
          </p>
        )}
      </article>

      <article className="panel risk-panel" id="risk-monitoring">
        <div className="panel-heading">
          <div>
            <h2>Risk overview</h2>
            <p>Current transaction classifications</p>
          </div>
          <span className="panel-icon panel-icon-purple">
            <ShieldCheck size={18} />
          </span>
        </div>

        <div className="risk-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={riskData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={64}
                outerRadius={87}
                paddingAngle={4}
                stroke="none"
              >
                {riskData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--text)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="risk-chart-center">
            <strong>{totalTransactions}</strong>
            <span>Transactions</span>
          </div>
        </div>

        <div className="risk-legend">
          {riskData.map((item) => (
            <div className="risk-legend-row" key={item.name}>
              <span className="risk-legend-label">
                <i style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div className="risk-footnote">
          <ShieldCheck size={15} />
          <span>Based on current database records</span>
        </div>
      </article>
    </section>
  );
}
