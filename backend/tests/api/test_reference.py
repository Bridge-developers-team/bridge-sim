"""Reference data lives in the database: seeded from db/seed once per change,
loaded at start-up, and served to the front end."""

from __future__ import annotations

import asyncio

from bridge.db.engine import create_tables, make_engine
from bridge.db.reference import load_reference, read_seed, seed_reference


def test_seeding_runs_once_per_change_and_loads_back_what_was_seeded(tmp_path):
    async def run():
        engine = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'ref.db'}")
        await create_tables(engine)
        first, second = await seed_reference(engine), await seed_reference(engine)
        loaded = await load_reference(engine)
        await engine.dispose()
        return first, second, loaded

    first, second, loaded = asyncio.run(run())
    seed = read_seed()
    assert first is True and second is False
    assert len(loaded["countries"]) == len(seed["countries"])
    assert loaded["cities"]["kz"][:3] == seed["cities"]["kz"][:3]
    assert loaded["lists"]["jobTitles"] == seed["lists"]["jobTitles"]
    assert [f["id"] for f in loaded["fields"]] == [f["id"] for f in seed["fields"]]  # matching order kept
    assert loaded["pay_us"] == seed["pay_us"] and loaded["samples"] == seed["samples"]


def test_config_serves_countries_and_lists_from_the_database(demo):
    ref = demo.get("/api/config").json()["reference"]

    assert {"code": "kz", "name": "Kazakhstan", "currency": "KZT"} in ref["countries"]
    assert ref["currentRoles"][0] == "Teacher" and ref["motivations"]


def test_job_titles_are_searched_on_the_server_best_match_first(demo):
    found = demo.get("/api/job-titles", params={"q": "nurse"}).json()
    suggested = demo.get("/api/job-titles", params={"first": "target"}).json()

    assert found[0].lower().startswith("nurse") and all("nurse" in t.lower() for t in found)
    assert len(found) <= 80
    assert suggested[0] == "Instructional designer"


def test_every_seed_value_fits_its_column_because_postgres_enforces_lengths():
    # SQLite ignores VARCHAR lengths; Neon would refuse the whole seeding.
    from sqlalchemy import String

    from bridge.db.reference import _rows

    for table, rows in _rows(read_seed()).items():
        limits = {
            c.name: c.type.length for c in table.__table__.columns if isinstance(c.type, String) and c.type.length
        }
        for row in rows:
            for name, limit in limits.items():
                assert len(str(row[name])) <= limit, (table.__tablename__, name, row[name])
