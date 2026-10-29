
import { useState } from "react";
import "./MlCsvDemo.css";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? "https://fraud-shield-sepia.vercel.app"
    : "http://127.0.0.1:5000");

const API_URL = `${API_BASE_URL}/api/ml/predict-csv`;
export default function MlCsvDemo() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "The prediction request failed."
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend. Check that Flask is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ml-lab">
      <div className="ml-lab-header">
        <div>
          <p className="ml-eyebrow">MACHINE LEARNING</p>
          <h2>FraudShield ML Lab</h2>
          <p className="ml-subtitle">
            Upload a labeled or unlabeled CSV containing the trained
            model's required features.
          </p>
        </div>
        <span className="ml-model-tag">Random Forest</span>
      </div>

      <form className="ml-upload-card" onSubmit={handleSubmit}>
        <div className="ml-upload-icon" aria-hidden="true">
          ↑
        </div>
        <h3>Analyze transaction data</h3>
        <p>
          Select a CSV with the same feature columns used during
          model training. An optional Class column is ignored
          during prediction.
        </p>

        <label className="ml-file-label" htmlFor="ml-csv-file">
          Choose CSV file
        </label>
        <input
          id="ml-csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setError("");
            setData(null);
          }}
        />

        {file && (
          <p className="ml-selected-file">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}

        <button
          className="ml-submit"
          type="submit"
          disabled={loading || !file}
        >
          {loading ? "Analyzing..." : "Run ML prediction"}
        </button>

        {error && (
          <p className="ml-error" role="alert">
            {error}
          </p>
        )}
      </form>

      {data && (
        <div className="ml-results">
          <h3>Prediction summary</h3>

          <div className="ml-stat-grid">
            <article className="ml-stat">
              <span>Rows processed</span>
              <strong>{data.rows_processed}</strong>
            </article>
            <article className="ml-stat ml-stat-fraud">
              <span>Predicted fraud</span>
              <strong>{data.predicted_fraud}</strong>
            </article>
            <article className="ml-stat ml-stat-safe">
              <span>Predicted legitimate</span>
              <strong>{data.predicted_legitimate}</strong>
            </article>
          </div>

          <p className="ml-result-note">
            Showing {data.results_returned} of {data.rows_processed} rows.
          </p>

          <div className="ml-table-wrap">
            <table className="ml-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Prediction</th>
                  <th>Fraud probability</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((item) => (
                  <tr key={item.row}>
                    <td>{item.row}</td>
                    <td>
                      <span
                        className={
                          item.prediction === 1
                            ? "ml-badge ml-badge-fraud"
                            : "ml-badge ml-badge-safe"
                        }
                      >
                        {item.label}
                      </span>
                    </td>
                    <td>
                      {(item.fraud_probability * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="ml-disclaimer">
            Research demo only. This model uses anonymized features
            from a public credit-card dataset. Predictions are not
            validated for real-world transaction decisions.
          </p>
        </div>
      )}
    </section>
  );
}
