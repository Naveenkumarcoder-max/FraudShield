
import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).parent / "fraudshield.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id TEXT NOT NULL UNIQUE,
                amount REAL NOT NULL,
                payment_method TEXT NOT NULL,
                location TEXT NOT NULL,
                risk_score INTEGER NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        count = connection.execute(
            "SELECT COUNT(*) FROM transactions"
        ).fetchone()[0]

        if count == 0:
            sample_transactions = [
                ("TXN-1001", 250.00, "UPI", "Chennai", 12, "Safe"),
                ("TXN-1002", 12500.00, "Card", "Mumbai", 86, "Fraud"),
                ("TXN-1003", 799.00, "UPI", "Coimbatore", 24, "Safe"),
                ("TXN-1004", 45999.00, "Card", "Unknown", 93, "Fraud"),
                ("TXN-1005", 1500.00, "Net Banking", "Bengaluru", 42, "Review"),
            ]

            connection.executemany("""
                INSERT INTO transactions
                (transaction_id, amount, payment_method, location,
                 risk_score, status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, sample_transactions)

        connection.commit()


def get_all_transactions():
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT id, transaction_id, amount, payment_method,
                   location, risk_score, status, created_at
            FROM transactions
            ORDER BY id DESC
        """).fetchall()

        return [dict(row) for row in rows]
