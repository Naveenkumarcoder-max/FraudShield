
from flask import Blueprint, request, jsonify

risk_engine = Blueprint("risk_engine", __name__)


def calculate_risk(transaction):
    """Calculate an explainable demo risk score from 0 to 100."""

    amount = float(transaction.get("amount", 0))
    frequency = int(transaction.get("frequency", 1))
    location = transaction.get("location", "known")
    device = transaction.get("device", "known")

    if amount < 0:
        raise ValueError("Amount cannot be negative.")
    if frequency < 1 or frequency > 10000:
        raise ValueError("Frequency must be between 1 and 10000.")
    if location not in ("known", "unknown"):
        raise ValueError("Invalid location value.")
    if device not in ("known", "unknown"):
        raise ValueError("Invalid device value.")

    score = 5
    factors = []

    if amount >= 100000:
        score += 35
        factors.append("Very high transaction amount")
    elif amount >= 50000:
        score += 25
        factors.append("High transaction amount")
    elif amount >= 10000:
        score += 12
        factors.append("Elevated transaction amount")

    if frequency >= 10:
        score += 30
        factors.append("Very frequent transactions")
    elif frequency >= 5:
        score += 20
        factors.append("Frequent transactions")
    elif frequency >= 3:
        score += 10
        factors.append("Multiple transactions in one hour")

    if location == "unknown":
        score += 20
        factors.append("Unusual location")

    if device == "unknown":
        score += 20
        factors.append("Unrecognized device")

    score = min(score, 100)

    if score >= 60:
        level = "High"
    elif score >= 30:
        level = "Medium"
    else:
        level = "Low"

    return {
        "risk_score": score,
        "risk_level": level,
        "risk_factors": factors,
        "scoring_method": "Rule-based demo; not a trained ML prediction"
    }


@risk_engine.route("/api/risk-score", methods=["POST"])
def risk_score():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Send transaction details as JSON."}), 400

    try:
        result = calculate_risk(data)
        result["transaction_id"] = str(
            data.get("transaction_id", "DEMO-TRANSACTION")
        )[:80]
        return jsonify(result), 200
    except (ValueError, TypeError, OverflowError):
        return jsonify({
            "error": "Invalid transaction values. Check amount and frequency."
        }), 400
