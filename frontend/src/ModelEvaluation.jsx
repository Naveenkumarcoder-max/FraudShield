
import { useCallback, useEffect, useState } from "react";
import "./ModelEvaluation.css";

const API_URL = "http://127.0.0.1:5000/api/ml/evaluation";

export default function ModelEvaluation() {
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEvaluation = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load model evaluation.");
      }

      setEvaluation(data);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend. Check that Flask is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvaluation();
  }, [loadEvaluation]);

  const metrics = evaluation
    ? [
        {
          label: "Accuracy",
          value: evaluation.accuracy,
          description: "Overall correct predictions",
          color: "blue",
        },
        {
          label: "Precision",
          value: evaluation.precision,
          description: "Reliability of fraud alerts",
          color: "purple",
        },
        {
          label: "Recall",
          value: evaluation.recall,
          description: "Actual fraud detected",
          color: "orange",
        },
        {
          label: "F1-score",
          value: evaluation.f1_score,
          description: "Balance of precision and recall",
          color: "green",
        },
      ]
    : [];

  const matrix = evaluation?.confusion_matrix;

  return (
    <section className="model-evaluation">
      <div className="evaluation-heading">
        <div>
          <span className="evaluation-eyebrow">MACHINE LEARNING</span>
          <h2>Model Performance</h2>
          <p>Evaluation results from a held-out test dataset.</p>
        </div>

        <button
          className="evaluation-refresh"
          onClick={loadEvaluation}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      {loading && (
        <div className="evaluation-message">
          Loading model evaluation...
        </div>
      )}

      {!loading && error && (
        <div className="evaluation-error" role="alert">
          <strong>Unable to load evaluation</strong>
          <p>{error}</p>
          <button onClick={loadEvaluation}>Try again</button>
        </div>
      )}

      {!loading && !error && evaluation && (
        <>
          <div className="evaluation-metrics">
            {metrics.map((metric) => (
              <article
                className={`evaluation-card ${metric.color}`}
                key={metric.label}
              >
                <span className="evaluation-card-label">
                  {metric.label}
                </span>
                <strong>{metric.value.toFixed(2)}%</strong>
                <span className="evaluation-card-description">
                  {metric.description}
                </span>
              </article>
            ))}
          </div>

          <article className="confusion-card">
            <div className="confusion-heading">
              <div>
                <h3>Confusion Matrix</h3>
                <p>Compare actual classes with model predictions.</p>
              </div>
              <span className="test-count">
                {evaluation.test_rows.toLocaleString()} test rows
              </span>
            </div>

            <div className="matrix-wrap">
              <table className="confusion-table">
                <thead>
                  <tr>
                    <th>Actual / Predicted</th>
                    <th>Legitimate</th>
                    <th>Fraud</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>Legitimate</th>
                    <td className="matrix-correct">
                      {matrix.true_legitimate.toLocaleString()}
                      <small>Correctly identified</small>
                    </td>
                    <td className="matrix-wrong">
                      {matrix.false_fraud_alert.toLocaleString()}
                      <small>False fraud alerts</small>
                    </td>
                  </tr>
                  <tr>
                    <th>Fraud</th>
                    <td className="matrix-wrong">
                      {matrix.missed_fraud.toLocaleString()}
                      <small>Missed fraud</small>
                    </td>
                    <td className="matrix-correct">
                      {matrix.detected_fraud.toLocaleString()}
                      <small>Fraud detected</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <div className="evaluation-disclaimer">
            <strong>Research evaluation only</strong>
            <p>{evaluation.note}</p>
            <p>
              Fraud is rare in this dataset, so accuracy alone does not
              establish that a model is effective. Review recall,
              precision, and missed fraud cases too.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
