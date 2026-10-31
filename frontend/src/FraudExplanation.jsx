
import { ShieldAlert, ShieldCheck, Info } from "lucide-react";

function FraudExplanation({ transaction }) {
  if (!transaction) return null;

  const risk = Number(
    transaction.riskScore ?? transaction.risk_score ?? 0
  );

  const status = transaction.status ?? "Review";

  const getRiskLevel = () => {
    if (risk >= 70) return "High Risk";
    if (risk >= 35) return "Medium Risk";
    return "Low Risk";
  };

  const getExplanation = () => {
    if (risk >= 70) {
      return "This transaction has a high risk score. It should be investigated before being approved.";
    }

    if (risk >= 35) {
      return "This transaction has a moderate risk score. Review its details before making a decision.";
    }

    return "This transaction has a low risk score based on the available prediction.";
  };

  return (
    <div className="fraud-explanation">
      <div className="explanation-header">
        {risk >= 70 ? <ShieldAlert /> : <ShieldCheck />}
        <div>
          <h3>AI Fraud Explanation</h3>
          <span>{getRiskLevel()}</span>
        </div>
      </div>

      <div className="explanation-score">
        <strong>{risk}/100</strong>
        <span>Risk Score</span>
      </div>

      <div className="explanation-message">
  <p>{getExplanation()}</p>
</div>

<div className="transaction-details">
  <h4>Transaction Details</h4>

  <div>
    <span>Transaction ID</span>
    <strong>{transaction.id ?? transaction.transaction_id ?? "N/A"}</strong>
  </div>

  <div>
    <span>Amount</span>
    <strong>
      ₹{Number(transaction.amount ?? 0).toLocaleString("en-IN")}
    </strong>
  </div>

  <div>
    <span>Payment Method</span>
    <strong>{transaction.paymentMethod ?? transaction.payment_method ?? "N/A"}</strong>
  </div>

  <div>
    <span>Location</span>
    <strong>{transaction.location ?? "N/A"}</strong>
  </div>
</div>

      <div className="explanation-status">
        <Info size={16} />
        Current transaction status: <strong>{status}</strong>
      </div>

      <small>
        This is an initial explanation based on the risk score and status.
        It is not a verified explanation of individual model features.
      </small>
    </div>
  );
}

export default FraudExplanation;
