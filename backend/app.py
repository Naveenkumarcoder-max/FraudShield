
import math

from flask import Flask, jsonify, request
from flask_cors import CORS

from database import (
    initialize_database,
    get_all_transactions,
    get_connection,
)

app = Flask(__name__)
CORS(app)

initialize_database()


# ---------------- RISK DETECTION ----------------

KNOWN_PAYMENT_METHODS = {
    "upi",
    "card",
    "net banking",
    "cash",
    "wallet",
}


def analyze_transaction(amount, payment_method, location):
    """
    Demonstration rule-based scoring.
    This is not a trained or production-validated fraud model.
    """
    score = 0
    reasons = []

    # Amount risk
    if amount >= 50000:
        score += 55
        reasons.append("Very high transaction amount")
    elif amount >= 25000:
        score += 45
        reasons.append("High transaction amount")
    elif amount >= 10000:
        score += 35
        reasons.append("Elevated transaction amount")
    elif amount >= 5000:
        score += 15
        reasons.append("Moderately high transaction amount")

    # Location information risk
    normalized_location = location.strip().lower()

    if normalized_location in {
        "unknown",
        "unavailable",
        "unspecified",
    }:
        score += 30
        reasons.append("Location information is unavailable")

    # Payment method validation
    normalized_method = payment_method.strip().lower()

    if normalized_method not in KNOWN_PAYMENT_METHODS:
        score += 20
        reasons.append("Unrecognized payment method")

    score = min(score, 100)

    if score >= 70:
        status = "Fraud"
    elif score >= 35:
        status = "Review"
    else:
        status = "Safe"

    if not reasons:
        reasons.append("No configured risk rules were triggered")

    return {
        "risk_score": score,
        "status": status,
        "risk_reasons": reasons,
    }


# ---------------- HOME ----------------

@app.route("/")
def home():
    return jsonify({
        "success": True,
        "message": "Welcome to FraudShield API",
        "status": "Backend is running",
        "endpoints": [
            "/api/health",
            "/api/transactions",
            "/api/dashboard/stats",
        ],
    })


# ---------------- HEALTH CHECK ----------------

@app.get("/api/health")
def health():
    return jsonify({
        "success": True,
        "message": "FraudShield backend is running",
    })


# ---------------- ALL TRANSACTIONS ----------------

@app.get("/api/transactions")
def transactions():
    records = get_all_transactions()

    return jsonify({
        "success": True,
        "count": len(records),
        "transactions": records,
    })


# ---------------- DASHBOARD STATISTICS ----------------

@app.get("/api/dashboard/stats")
def dashboard_stats():
    records = get_all_transactions()

    total = len(records)
    fraud = sum(1 for item in records if item["status"] == "Fraud")
    safe = sum(1 for item in records if item["status"] == "Safe")
    review = sum(1 for item in records if item["status"] == "Review")

    fraud_rate = round((fraud / total) * 100, 2) if total else 0

    return jsonify({
        "success": True,
        "total_transactions": total,
        "fraud_transactions": fraud,
        "safe_transactions": safe,
        "review_transactions": review,
        "fraud_rate_percent": fraud_rate,
    })


# ---------------- CREATE TRANSACTION ----------------

@app.post("/api/transactions")
def create_transaction():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "error": "A valid JSON object is required",
        }), 400

    required_fields = [
        "transaction_id",
        "amount",
        "payment_method",
        "location",
    ]

    missing = [
        field for field in required_fields
        if field not in data
        or data[field] is None
        or (
            isinstance(data[field], str)
            and not data[field].strip()
        )
    ]

    if missing:
        return jsonify({
            "success": False,
            "error": "Missing required fields",
            "fields": missing,
        }), 400

    try:
        amount = float(data["amount"])
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": "Amount must be a valid number",
        }), 400

    if not math.isfinite(amount) or amount <= 0:
        return jsonify({
            "success": False,
            "error": "Amount must be a finite number greater than zero",
        }), 400

    transaction_id = str(data["transaction_id"]).strip()
    payment_method = str(data["payment_method"]).strip()
    location = str(data["location"]).strip()

    if not all([transaction_id, payment_method, location]):
        return jsonify({
            "success": False,
            "error": "Text fields cannot be empty",
        }), 400

    # Analyze the transaction using configurable demonstration rules.
    analysis = analyze_transaction(
        amount,
        payment_method,
        location,
    )

    risk_score = analysis["risk_score"]
    status = analysis["status"]

    try:
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO transactions
                (
                    transaction_id,
                    amount,
                    payment_method,
                    location,
                    risk_score,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    transaction_id,
                    amount,
                    payment_method,
                    location,
                    risk_score,
                    status,
                ),
            )
            connection.commit()

    except Exception as error:
        import sqlite3

        if isinstance(error, sqlite3.IntegrityError):
            return jsonify({
                "success": False,
                "error": "This transaction ID already exists",
            }), 409

        app.logger.exception("Failed to save transaction")
        return jsonify({
            "success": False,
            "error": "Unable to save transaction",
        }), 500

    return jsonify({
        "success": True,
        "message": "Transaction analyzed and saved",
        "transaction": {
            "transaction_id": transaction_id,
            "amount": amount,
            "payment_method": payment_method,
            "location": location,
            "risk_score": risk_score,
            "status": status,
            "risk_reasons": analysis["risk_reasons"],
        },
    }), 201


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )
