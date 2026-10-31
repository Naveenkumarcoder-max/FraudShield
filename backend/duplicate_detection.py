
from database import get_connection


def check_duplicate_transaction(amount, payment_method, location):
    """
    Find a similar transaction created in the last 2 minutes.

    This is a rule-based duplicate warning, not proof of fraud.
    """
    with get_connection() as connection:
        match = connection.execute("""
            SELECT transaction_id, amount, payment_method,
                   location, created_at
            FROM transactions
            WHERE amount = ?
              AND LOWER(TRIM(payment_method)) = LOWER(TRIM(?))
              AND LOWER(TRIM(location)) = LOWER(TRIM(?))
              AND datetime(created_at) >= datetime('now', '-2 minutes')
            ORDER BY created_at DESC
            LIMIT 1
        """, (amount, payment_method, location)).fetchone()

    if match:
        return {
            "is_duplicate": True,
            "matched_transaction": dict(match),
            "reason": (
                "A transaction with the same amount, payment method "
                "and location was found within the last 2 minutes."
            ),
        }

    return {
        "is_duplicate": False,
        "matched_transaction": None,
        "reason": None,
    }
