from database import get_connection


def check_watchlist(location):
    with get_connection() as connection:
        match = connection.execute("""
            SELECT id, entity_type, identifier, reason
            FROM fraud_watchlist
            WHERE entity_type = 'merchant'
              AND LOWER(TRIM(identifier)) = LOWER(TRIM(?))
              AND is_active = 1
            LIMIT 1
        """, (location,)).fetchone()

    if match:
        return {
            "matched": True,
            "entry": dict(match),
            "reason": (
                f"Merchant/location '{location}' matches "
                f"the fraud watchlist: {match['reason']}"
            )
        }

    return {
        "matched": False,
        "entry": None,
        "reason": None
    }


def add_watchlist_entry(entity_type, identifier, reason):
    with get_connection() as connection:
        cursor = connection.execute("""
            INSERT INTO fraud_watchlist
            (entity_type, identifier, reason)
            VALUES (?, ?, ?)
        """, (entity_type, identifier, reason))

        connection.commit()
        return cursor.lastrowid