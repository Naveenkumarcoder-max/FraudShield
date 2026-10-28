
from pathlib import Path

import joblib
import pandas as pd
from flask import Blueprint, jsonify, request

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "fraud_model.joblib"

ml_api = Blueprint("ml_api", __name__)

# Load the model once when this module is imported.
model_bundle = None
model_load_error = None

try:
    if MODEL_PATH.exists():
        model_bundle = joblib.load(MODEL_PATH)
    else:
        model_load_error = "Trained model file not found."
except Exception:
    model_load_error = "Could not load the trained model."


@ml_api.route("/api/ml/health", methods=["GET"])
def ml_health():
    return jsonify({
        "model_loaded": model_bundle is not None,
        "message": (
            "ML model is ready."
            if model_bundle is not None
            else model_load_error
        ),
    }), 200 if model_bundle is not None else 503


@ml_api.route("/api/ml/predict", methods=["POST"])
def predict_fraud():
    if model_bundle is None:
        return jsonify({
            "error": "ML model is not available."
        }), 503

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "error": "Send a JSON object containing the model features."
        }), 400

    feature_columns = model_bundle["feature_columns"]
    model = model_bundle["model"]

    missing = [
        column for column in feature_columns
        if column not in payload
    ]

    extra = [
        column for column in payload
        if column not in feature_columns
    ]

    if missing or extra:
        return jsonify({
            "error": "Input features do not match the trained model.",
            "missing_features": missing,
            "unexpected_features": extra,
        }), 400

    try:
        values = {}

        for column in feature_columns:
            value = payload[column]

            if isinstance(value, bool) or not isinstance(
                value, (int, float)
            ):
                return jsonify({
                    "error": f"{column} must be a number."
                }), 400

            if not pd.notna(value) or abs(value) == float("inf"):
                return jsonify({
                    "error": f"{column} must be a finite number."
                }), 400

            values[column] = value

        features = pd.DataFrame(
            [values],
            columns=feature_columns,
        )

        prediction = int(model.predict(features)[0])
        probability = float(model.predict_proba(features)[0][1])

        return jsonify({
            "prediction": prediction,
            "label": "Fraud" if prediction == 1 else "Legitimate",
            "fraud_probability": round(probability, 6),
            "model_type": "Random Forest",
            "dataset": "ULB credit card fraud dataset",
            "note": (
                "Research demonstration only. This model uses "
                "anonymized PCA features and is not validated for "
                "real-world transaction decisions."
            ),
        }), 200

    except Exception:
        return jsonify({
            "error": "Prediction failed. Check the model and input data."
        }), 500

@ml_api.route("/api/ml/predict-csv", methods=["POST"])
def predict_csv():
    if model_bundle is None:
        return jsonify({"error": "ML model is not available."}), 503

    uploaded_file = request.files.get("file")

    if uploaded_file is None or not uploaded_file.filename:
        return jsonify({
            "error": "Upload a CSV file using the 'file' field."
        }), 400

    if not uploaded_file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are accepted."}), 400

    try:
        df = pd.read_csv(uploaded_file)

        if df.empty:
            return jsonify({"error": "The CSV file is empty."}), 400

        if len(df) > 10000:
            return jsonify({
                "error": "Maximum 10,000 rows per request."
            }), 400

        # Class is the answer column in the public dataset.
        # Never use it as a model input.
        actual_labels = None
        if "Class" in df.columns:
            actual_labels = df["Class"].copy()
            df = df.drop(columns=["Class"])

        feature_columns = model_bundle["feature_columns"]

        missing = [
            col for col in feature_columns if col not in df.columns
        ]
        extra = [
            col for col in df.columns if col not in feature_columns
        ]

        if missing or extra:
            return jsonify({
                "error": "CSV columns do not match the trained model.",
                "missing_features": missing,
                "unexpected_features": extra,
            }), 400

        features = df[feature_columns].apply(
            pd.to_numeric, errors="coerce"
        )

        if features.isna().any().any():
            return jsonify({
                "error": "All model feature values must be valid numbers."
            }), 400

        import numpy as np

        if not np.isfinite(features.to_numpy(dtype=float)).all():
            return jsonify({
                "error": "Feature values must be finite numbers."
            }), 400

        model = model_bundle["model"]
        predictions = model.predict(features)
        probabilities = model.predict_proba(features)[:, 1]

        results = []
        for i, (prediction, probability) in enumerate(
            zip(predictions, probabilities)
        ):
            results.append({
                "row": i + 1,
                "prediction": int(prediction),
                "label": "Fraud" if prediction == 1 else "Legitimate",
                "fraud_probability": round(float(probability), 6),
            })

        fraud_count = int((predictions == 1).sum())

        response = {
            "rows_processed": len(results),
            "predicted_fraud": fraud_count,
            "predicted_legitimate": len(results) - fraud_count,
            "results": results[:100],
            "results_returned": min(len(results), 100),
            "note": (
                "Research demonstration only. The model uses anonymized "
                "features and is not validated for real-world decisions."
            ),
        }

        # Report actual labels only as a separate evaluation summary.
        # These labels were not supplied to the model as features.
        if actual_labels is not None:
            if actual_labels.isin([0, 1]).all():
                response["dataset_label_counts"] = {
                    "legitimate": int((actual_labels == 0).sum()),
                    "fraud": int((actual_labels == 1).sum()),
                }

        return jsonify(response), 200

    except Exception:
        return jsonify({
            "error": "Could not process this CSV file. Check its format."
        }), 400
