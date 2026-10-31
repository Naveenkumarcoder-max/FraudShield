from watchlist import check_watchlist, add_watchlist_entry
from duplicate_detection import check_duplicate_transaction
from risk_engine import risk_engine
from fraud_alerts import alerts_bp, create_alert
from ml_api import ml_api
from evaluation_api import evaluation_api
import math

from flask import Flask, jsonify, request
from flask_cors import CORS

from database import (
    initialize_database,
    get_all_transactions,
    get_connection,
)

app = Flask(__name__)
app.register_blueprint(alerts_bp)
from case_management import case_bp
app.register_blueprint(case_bp)
app.register_blueprint(evaluation_api)
app.register_blueprint(ml_api)
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

    normalized_location = location.strip().lower()
    if normalized_location in {"unknown", "unavailable", "unspecified"}:
        score += 30
        reasons.append("Location information is unavailable")

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
        or (isinstance(data[field], str) and not data[field].strip())
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

    analysis = analyze_transaction(amount, payment_method, location)

    watchlist_check = check_watchlist(location)
    if watchlist_check["matched"]:
        analysis["risk_reasons"].append(watchlist_check["reason"])
        analysis["risk_score"] = min(analysis["risk_score"] + 30, 100)

        if analysis["risk_score"] >= 70:
            analysis["status"] = "Fraud"
        elif analysis["risk_score"] >= 35:
            analysis["status"] = "Review"
        else:
            analysis["status"] = "Safe"

    duplicate_check = check_duplicate_transaction(amount, payment_method, location)
    if duplicate_check["is_duplicate"]:
        analysis["risk_reasons"].append(duplicate_check["reason"])
        analysis["risk_score"] = min(analysis["risk_score"] + 25, 100)

        if analysis["risk_score"] >= 70:
            analysis["status"] = "Fraud"
        elif analysis["risk_score"] >= 35:
            analysis["status"] = "Review"
        else:
            analysis["status"] = "Safe"

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

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO fraud_timeline
            (transaction_id, event_type, description)
            VALUES (?, ?, ?)
            """,
            (
                transaction_id,
                "Transaction Created",
                f"Transaction submitted for ₹{amount:.2f}. "
                f"Risk score: {risk_score}. Status: {status}.",
            ),
        )
        connection.commit()

    if status in {"Fraud", "Review"}:
        try:
            with get_connection() as connection:
                connection.execute(
                    """
                    INSERT INTO fraud_timeline
                    (transaction_id, event_type, description)
                    VALUES (?, ?, ?)
                    """,
                    (
                        transaction_id,
                        "Fraud Alert Generated",
                        "; ".join(analysis["risk_reasons"]),
                    ),
                )
                connection.commit()

            create_alert(
                transaction_id=transaction_id,
                risk_level=status,
                risk_score=risk_score,
                message="; ".join(analysis["risk_reasons"]),
            )
        except Exception:
            app.logger.exception(
                "Transaction saved, but alert creation failed for %s",
                transaction_id,
            )

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


@app.get("/api/transactions/<transaction_id>/timeline")
def get_transaction_timeline(transaction_id):
    with get_connection() as connection:
        transaction = connection.execute(
            """
            SELECT transaction_id
            FROM transactions
            WHERE transaction_id = ?
            """,
            (transaction_id,),
        ).fetchone()

        if transaction is None:
            return jsonify({
                "success": False,
                "error": "Transaction not found",
            }), 404

        rows = connection.execute(
            """
            SELECT id, transaction_id, event_type,
                   description, event_time
            FROM fraud_timeline
            WHERE transaction_id = ?
            ORDER BY event_time ASC, id ASC
            """,
            (transaction_id,),
        ).fetchall()

    return jsonify({
        "success": True,
        "transaction_id": transaction_id,
        "count": len(rows),
        "timeline": [dict(row) for row in rows],
    })


@app.post("/api/transactions/<transaction_id>/report")
def report_fraud(transaction_id):
    data = request.get_json(silent=True) or {}

    reason = str(data.get("reason", "")).strip()
    reporter_name = str(data.get("reporter_name", "")).strip()
    description = str(data.get("description", "")).strip()

    if not reason:
        return jsonify({
            "success": False,
            "error": "Please provide a reason for reporting."
        }), 400

    with get_connection() as connection:
        transaction = connection.execute(
            """
            SELECT transaction_id
            FROM transactions
            WHERE transaction_id = ?
            """,
            (transaction_id,),
        ).fetchone()

        if transaction is None:
            return jsonify({
                "success": False,
                "error": "Transaction not found."
            }), 404

        cursor = connection.execute(
            """
            INSERT INTO fraud_reports
            (transaction_id, reporter_name, reason, description)
            VALUES (?, ?, ?, ?)
            """,
            (
                transaction_id,
                reporter_name or "Anonymous",
                reason,
                description,
            ),
        )

        report_id = cursor.lastrowid

        connection.execute(
            """
            INSERT INTO fraud_timeline
            (transaction_id, event_type, description)
            VALUES (?, ?, ?)
            """,
            (
                transaction_id,
                "Customer Fraud Report",
                f"Report #{report_id}: {reason}. {description}".strip(),
            ),
        )
        connection.commit()

    return jsonify({
        "success": True,
        "message": "Fraud report submitted successfully.",
        "report_id": report_id,
        "transaction_id": transaction_id,
    }), 201


@app.get("/api/fraud-reports")
def get_fraud_reports():
    with get_connection() as connection:
        reports = connection.execute(
            """
            SELECT id, transaction_id, reporter_name, reason, description,
                   report_status, created_at
            FROM fraud_reports
            ORDER BY created_at DESC, id DESC
            """
        ).fetchall()

    return jsonify({
        "success": True,
        "count": len(reports),
        "reports": [dict(report) for report in reports],
    })


@app.post("/api/watchlist")
def create_watchlist_entry():
    data = request.get_json(silent=True) or {}

    entity_type = str(data.get("entity_type", "")).strip().lower()
    identifier = str(data.get("identifier", "")).strip()
    reason = str(data.get("reason", "")).strip()

    if entity_type not in {"merchant", "account"}:
        return jsonify({
            "success": False,
            "error": "Entity type must be merchant or account."
        }), 400

    if not identifier or not reason:
        return jsonify({
            "success": False,
            "error": "Identifier and reason are required."
        }), 400

    try:
        entry_id = add_watchlist_entry(entity_type, identifier, reason)
        return jsonify({
            "success": True,
            "message": "Watchlist entry added successfully.",
            "id": entry_id,
        }), 201
    except Exception as error:
        if "UNIQUE constraint failed" in str(error):
            return jsonify({
                "success": False,
                "error": "This entry already exists."
            }), 409

        return jsonify({
            "success": False,
            "error": "Unable to add watchlist entry."
        }), 500


@app.get("/api/watchlist")
def get_watchlist():
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM fraud_watchlist
            ORDER BY created_at DESC, id DESC
            """
        ).fetchall()

    return jsonify({
        "success": True,
        "count": len(rows),
        "watchlist": [dict(row) for row in rows],
    })


@app.patch("/api/watchlist/<int:entry_id>")
def update_watchlist_entry(entry_id):
    data = request.get_json(silent=True) or {}

    if "is_active" not in data or not isinstance(data["is_active"], bool):
        return jsonify({
            "success": False,
            "error": "Provide is_active as true or false."
        }), 400

    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE fraud_watchlist
            SET is_active = ?
            WHERE id = ?
            """,
            (int(data["is_active"]), entry_id),
        )
        connection.commit()

    if cursor.rowcount == 0:
        return jsonify({
            "success": False,
            "error": "Watchlist entry not found."
        }), 404

    return jsonify({
        "success": True,
        "message": "Watchlist entry updated."
    })


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )
