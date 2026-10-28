
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

case_bp = Blueprint("case_management", __name__)

DB_PATH = Path(__file__).resolve().parent / "fraud_cases.db"

VALID_STATUSES = {"Open", "Investigating", "Resolved"}
VALID_PRIORITIES = {"Low", "Medium", "High", "Critical"}


def connect_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_cases_db():
    with connect_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS fraud_cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                priority TEXT NOT NULL DEFAULT 'High',
                status TEXT NOT NULL DEFAULT 'Open',
                notes TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)


def row_to_dict(row):
    return dict(row)


initialize_cases_db()


@case_bp.route("/api/cases", methods=["GET"])
def get_cases():
    with connect_db() as db:
        rows = db.execute(
            "SELECT * FROM fraud_cases ORDER BY id DESC"
        ).fetchall()

    return jsonify({"cases": [row_to_dict(row) for row in rows]})


@case_bp.route("/api/cases", methods=["POST"])
def create_case():
    data = request.get_json(silent=True) or {}

    transaction_id = str(data.get("transaction_id", "")).strip()
    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()
    priority = str(data.get("priority", "High")).strip().title()

    if not transaction_id or not title:
        return jsonify({
            "error": "transaction_id and title are required"
        }), 400

    if priority not in VALID_PRIORITIES:
        return jsonify({"error": "Invalid priority"}), 400

    now = datetime.now(timezone.utc).isoformat()

    with connect_db() as db:
        cursor = db.execute("""
            INSERT INTO fraud_cases
            (transaction_id, title, description, priority,
             status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'Open', '', ?, ?)
        """, (
            transaction_id, title, description,
            priority, now, now
        ))

        case_id = cursor.lastrowid
        row = db.execute(
            "SELECT * FROM fraud_cases WHERE id = ?",
            (case_id,)
        ).fetchone()

    return jsonify({"case": row_to_dict(row)}), 201


@case_bp.route("/api/cases/<int:case_id>", methods=["PATCH"])
def update_case(case_id):
    data = request.get_json(silent=True) or {}

    allowed = {"status", "priority", "notes", "description"}
    changes = {key: data[key] for key in allowed if key in data}

    if not changes:
        return jsonify({"error": "No valid fields provided"}), 400

    if "status" in changes:
        changes["status"] = str(changes["status"]).strip().title()
        if changes["status"] not in VALID_STATUSES:
            return jsonify({"error": "Invalid status"}), 400

    if "priority" in changes:
        changes["priority"] = str(changes["priority"]).strip().title()
        if changes["priority"] not in VALID_PRIORITIES:
            return jsonify({"error": "Invalid priority"}), 400

    for key in ("notes", "description"):
        if key in changes:
            changes[key] = str(changes[key]).strip()

    changes["updated_at"] = datetime.now(timezone.utc).isoformat()

    columns = ", ".join(f"{key} = ?" for key in changes)
    values = list(changes.values()) + [case_id]

    with connect_db() as db:
        cursor = db.execute(
            f"UPDATE fraud_cases SET {columns} WHERE id = ?",
            values
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Case not found"}), 404

        row = db.execute(
            "SELECT * FROM fraud_cases WHERE id = ?",
            (case_id,)
        ).fetchone()

    return jsonify({"case": row_to_dict(row)})
