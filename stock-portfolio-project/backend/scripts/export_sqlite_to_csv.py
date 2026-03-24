#!/usr/bin/env python3
"""Export SQLite tables to CSV and generate PostgreSQL import commands."""

from __future__ import annotations

import argparse
import csv
import sqlite3
from collections import defaultdict, deque
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Set, Tuple


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def to_sqlite_path(path: str) -> Path:
    return Path(path).expanduser().resolve()


def get_tables(conn: sqlite3.Connection, include_system: bool) -> List[str]:
    query = "SELECT name FROM sqlite_master WHERE type='table'"
    params: Tuple[str, ...] = tuple()
    if not include_system:
        query += " AND name NOT LIKE 'sqlite_%'"
    query += " ORDER BY name"
    rows = conn.execute(query, params).fetchall()
    return [row[0] for row in rows]


def get_columns(conn: sqlite3.Connection, table: str) -> List[str]:
    rows = conn.execute(f"PRAGMA table_info({quote_ident(table)})").fetchall()
    return [row[1] for row in rows]


def get_primary_key_columns(conn: sqlite3.Connection, table: str) -> List[str]:
    rows = conn.execute(f"PRAGMA table_info({quote_ident(table)})").fetchall()
    pk_rows = sorted((row for row in rows if int(row[5]) > 0), key=lambda r: int(r[5]))
    return [row[1] for row in pk_rows]


def get_foreign_key_dependencies(conn: sqlite3.Connection, table: str) -> Set[str]:
    rows = conn.execute(f"PRAGMA foreign_key_list({quote_ident(table)})").fetchall()
    deps: Set[str] = set()
    for row in rows:
        referenced_table = row[2]
        if referenced_table:
            deps.add(referenced_table)
    return deps


def topological_order(tables: Sequence[str], deps: Dict[str, Set[str]]) -> Tuple[List[str], List[str]]:
    graph: Dict[str, Set[str]] = defaultdict(set)
    indegree: Dict[str, int] = {table: 0 for table in tables}

    for table in tables:
        for dependency in deps.get(table, set()):
            if dependency not in indegree:
                continue
            graph[dependency].add(table)
            indegree[table] += 1

    queue = deque(sorted([table for table, degree in indegree.items() if degree == 0]))
    ordered: List[str] = []

    while queue:
        current = queue.popleft()
        ordered.append(current)
        for child in sorted(graph[current]):
            indegree[child] -= 1
            if indegree[child] == 0:
                queue.append(child)

    if len(ordered) == len(tables):
        return ordered, []

    unresolved = sorted([table for table in tables if table not in ordered])
    return ordered + unresolved, unresolved


def export_table(conn: sqlite3.Connection, table: str, output_file: Path) -> int:
    columns = get_columns(conn, table)
    if not columns:
        return 0

    rows = conn.execute(f"SELECT * FROM {quote_ident(table)}").fetchall()

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("w", encoding="utf-8", newline="") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(columns)
        writer.writerows(rows)

    return len(rows)


def generate_copy_script(
    conn: sqlite3.Connection,
    ordered_tables: Iterable[str],
    output_dir: Path,
    sql_path: Path,
    cycle_tables: Sequence[str],
) -> None:
    lines: List[str] = []
    lines.append("-- PostgreSQL import script generated from SQLite export")
    lines.append("-- Run this file with: psql -U <user> -d <db> -f import_to_postgres.sql")
    lines.append("BEGIN;")
    lines.append("SET session_replication_role = replica;")
    lines.append("")

    if cycle_tables:
        lines.append("-- Warning: cyclic foreign-key dependencies detected in these tables:")
        lines.append("-- " + ", ".join(cycle_tables))
        lines.append("-- They were appended after acyclic tables; this still works because triggers are disabled above.")
        lines.append("")

    for table in ordered_tables:
        columns = get_columns(conn, table)
        if not columns:
            continue

        csv_path = (output_dir / f"{table}.csv").resolve().as_posix().replace("'", "''")
        quoted_table = quote_ident(table)
        quoted_columns = ", ".join(quote_ident(col) for col in columns)

        lines.append(f"-- Import {table}")
        lines.append(
            f"\\copy public.{quoted_table} ({quoted_columns}) FROM '{csv_path}' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"
        )

        pk_columns = get_primary_key_columns(conn, table)
        if len(pk_columns) == 1:
            pk = pk_columns[0]
            qpk = quote_ident(pk)
            lines.append(
                f"SELECT setval(pg_get_serial_sequence('public.{quoted_table}', '{pk}'), "
                f"GREATEST((SELECT COALESCE(MAX({qpk}), 0) FROM public.{quoted_table}), 1), "
                f"(SELECT COUNT(*) > 0 FROM public.{quoted_table})) "
                f"WHERE pg_get_serial_sequence('public.{quoted_table}', '{pk}') IS NOT NULL;"
            )

        lines.append("")

    lines.append("SET session_replication_role = DEFAULT;")
    lines.append("COMMIT;")
    lines.append("")

    sql_path.parent.mkdir(parents=True, exist_ok=True)
    sql_path.write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export SQLite tables to CSV files and generate PostgreSQL import commands."
    )
    parser.add_argument(
        "--sqlite-path",
        default="backend/db.sqlite3",
        help="Path to SQLite database file (default: backend/db.sqlite3)",
    )
    parser.add_argument(
        "--output-dir",
        default="backend/exports/sqlite_csv",
        help="Directory where CSV files will be written",
    )
    parser.add_argument(
        "--import-sql",
        default="backend/exports/sqlite_csv/import_to_postgres.sql",
        help="Path to write generated PostgreSQL import SQL",
    )
    parser.add_argument(
        "--include-system-tables",
        action="store_true",
        help="Include SQLite internal tables (sqlite_*)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    sqlite_path = to_sqlite_path(args.sqlite_path)
    output_dir = Path(args.output_dir).expanduser().resolve()
    import_sql_path = Path(args.import_sql).expanduser().resolve()

    if not sqlite_path.exists():
        raise SystemExit(f"SQLite file not found: {sqlite_path}")

    conn = sqlite3.connect(str(sqlite_path))

    try:
        tables = get_tables(conn, args.include_system_tables)
        if not tables:
            raise SystemExit("No tables found in SQLite database.")

        deps = {table: get_foreign_key_dependencies(conn, table) for table in tables}
        ordered_tables, cycle_tables = topological_order(tables, deps)

        summary: List[Tuple[str, int]] = []
        for table in ordered_tables:
            csv_file = output_dir / f"{table}.csv"
            row_count = export_table(conn, table, csv_file)
            summary.append((table, row_count))

        generate_copy_script(conn, ordered_tables, output_dir, import_sql_path, cycle_tables)

    finally:
        conn.close()

    print(f"SQLite source: {sqlite_path}")
    print(f"CSV output dir: {output_dir}")
    print(f"PostgreSQL import script: {import_sql_path}")
    print("")
    print("Export summary:")
    for table, row_count in summary:
        print(f"- {table}: {row_count} rows")

    if cycle_tables:
        print("")
        print("Warning: cyclic foreign-key dependencies detected:")
        for table in cycle_tables:
            print(f"- {table}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
