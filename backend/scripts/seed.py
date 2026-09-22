"""Command-line seed tool.

Usage (from the ``backend`` directory):

    python scripts/seed.py --email admin@example.com --password <password> [--sample]
    python scripts/seed.py --email admin@example.com --password-hash <hash> [--sample]

Values also come from ``SEED_ADMIN_EMAIL``, ``SEED_ADMIN_PASSWORD``,
``SEED_ADMIN_PASSWORD_HASH`` and ``SEED_SAMPLE_DATA`` in the environment or
``.env`` file. Plaintext passwords are hashed with Argon2id at seed time; a
pre-computed ``--password-hash`` bypasses that step.
"""

import argparse
import asyncio
import sys

from app.core.config import get_settings
from app.core.db import MongoConnection
from app.db.indexes import ensure_indexes
from app.seed import SeedSummary, run_seed


async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the car decor platform database.")
    parser.add_argument("--email", help="Admin email (default: SEED_ADMIN_EMAIL)")
    parser.add_argument(
        "--password", help="Admin password, hashed at seed time (default: SEED_ADMIN_PASSWORD)"
    )
    parser.add_argument(
        "--password-hash",
        help="Pre-computed hash, overrides --password (default: SEED_ADMIN_PASSWORD_HASH)",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Also create sample categories, subcategories, and products",
    )
    args = parser.parse_args()

    settings = get_settings()
    email = args.email or settings.seed_admin_email
    password = args.password or settings.seed_admin_password
    password_hash = args.password_hash or settings.seed_admin_password_hash
    include_sample = args.sample or settings.seed_sample_data

    if not password and not password_hash:
        print(
            "ERROR: an admin password is required (pass --password or set SEED_ADMIN_PASSWORD).",
            file=sys.stderr,
        )
        raise SystemExit(2)

    connection = MongoConnection()
    await connection.connect(settings.mongo_uri, settings.mongo_db_name, settings.mongo_timeout_ms)
    try:
        await ensure_indexes(connection.database)
        summary: SeedSummary = await run_seed(
            connection.database,
            admin_email=email,
            admin_password=password or None,
            admin_password_hash=password_hash or None,
            include_sample_data=include_sample,
        )
        print(
            "Seed complete: "
            f"admin={summary.admin_created}, "
            f"shop_settings={summary.shop_settings_created}, "
            f"categories={summary.categories_created}, "
            f"subcategories={summary.subcategories_created}, "
            f"products={summary.products_created}"
        )
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(main())
