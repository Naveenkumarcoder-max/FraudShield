
from pathlib import Path

import joblib
import pandas as pd

from flask import Blueprint, jsonify
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)

evaluation_api = Blueprint("evaluation_api", __name__)

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "data" / "creditcard.csv"
MODEL_PATH = BASE_DIR / "fraud_model.joblib"


@evaluation_api.route("/api/ml/evaluation", methods=["GET"])
def get_model_evaluation():
    try:
        if not DATASET_PATH.exists():
            return jsonify({
                "error": "Evaluation dataset not found."
            }), 404

        if not MODEL_PATH.exists():
            return jsonify({
                "error": "Trained model not found."
            }), 404

        df = pd.read_csv(DATASET_PATH)

        if "Class" not in df.columns:
            return jsonify({
                "error": "Dataset must contain the Class column."
            }), 400

        bundle = joblib.load(MODEL_PATH)
        model = bundle["model"]
        feature_columns = bundle["feature_columns"]

        if not set(feature_columns).issubset(df.columns):
            return jsonify({
                "error": "Dataset features do not match the saved model."
            }), 400

        X = df[feature_columns]
        y = df["Class"]

        # Recreate the held-out test split used during training.
        _, X_test, _, y_test = train_test_split(
            X,
            y,
            test_size=0.20,
            random_state=42,
            stratify=y,
        )

        predictions = model.predict(X_test)

        matrix = confusion_matrix(
            y_test,
            predictions,
            labels=[0, 1],
        )

        return jsonify({
            "accuracy": round(
                accuracy_score(y_test, predictions) * 100, 2
            ),
            "precision": round(
                precision_score(
                    y_test, predictions, zero_division=0
                ) * 100, 2
            ),
            "recall": round(
                recall_score(
                    y_test, predictions, zero_division=0
                ) * 100, 2
            ),
            "f1_score": round(
                f1_score(
                    y_test, predictions, zero_division=0
                ) * 100, 2
            ),
            "test_rows": int(len(y_test)),
            "confusion_matrix": {
                "true_legitimate": int(matrix[0][0]),
                "false_fraud_alert": int(matrix[0][1]),
                "missed_fraud": int(matrix[1][0]),
                "detected_fraud": int(matrix[1][1]),
            },
            "note": (
                "Research dataset evaluation. "
                "Not a guarantee of live transaction performance."
            ),
        })

    except Exception as error:
        print("Evaluation error:", error)
        return jsonify({
            "error": "Could not evaluate the model. "
                     "Check the backend terminal for details."
        }), 500
