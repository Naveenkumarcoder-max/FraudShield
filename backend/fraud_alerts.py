
from flask import Blueprint, jsonify
import sqlite3
from pathlib import Path

alerts_bp = Blueprint("alerts", __name__)

DB_PATH = Path(__file__).resolve().parent / "fraud_alerts.db"


def init_alerts_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS fraud_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                risk_score REAL,
                message TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'New',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(transaction_id, risk_level)
            )
        """)


init_alerts_db()


@alerts_bp.route("/api/alerts", methods=["GET"])
def get_alerts():
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT id, transaction_id, risk_level, risk_score,
                   message, status, created_at
            FROM fraud_alerts
            ORDER BY id DESC
        """).fetchall()

    return jsonify([dict(row) for row in rows])


@alerts_bp.route("/api/alerts/health", methods=["GET"])
def alerts_health():
    return jsonify({
        "status": "ok",
        "message": "Fraud Alerts API is running"
    })

def create_alert(transaction_id, risk_level, risk_score, message):
    """Create an alert once for a transaction and risk category."""
    if risk_level not in {"Fraud", "Review"}:
        return False

    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.execute(
                """
                INSERT OR IGNORE INTO fraud_alerts
                    (transaction_id, risk_level, risk_score, message)
                VALUES (?, ?, ?, ?)
                """,
                (transaction_id, risk_level, risk_score, message),
            )
            return cursor.rowcount > 0

    except sqlite3.Error:
        raise
