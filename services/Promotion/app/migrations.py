import os
import sqlite3
from pathlib import Path


def run_sqlite_migrations(db_path: str) -> None:
    db_file = Path(db_path)
    os.makedirs(db_file.parent if str(db_file.parent) else ".", exist_ok=True)
    migrations_dir = Path(__file__).resolve().parent.parent / "migrations"

    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        applied = {
            row[0]
            for row in conn.execute("SELECT version FROM schema_migrations ORDER BY version ASC").fetchall()
        }
        for migration_path in sorted(migrations_dir.glob("*.sql")):
            if migration_path.name in applied:
                continue
            conn.executescript(migration_path.read_text(encoding="utf-8"))
            conn.execute(
                "INSERT INTO schema_migrations (version) VALUES (?)",
                (migration_path.name,),
            )
        conn.commit()
