"""Reference data in the database: tables, seeding and loading.

The reviewed source of the data is db/seed/*.json (in git, so every change
is reviewed and a fresh database can be rebuilt). At start-up the app seeds
the tables when those files changed (a hash of them is stored), then loads
everything once into domain.reference. Requests never query these tables:
the data is small and read on every request, so it is kept in memory."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text, delete, insert, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from bridge.db.models import Base

SEED_DIR = Path(__file__).parent / "seed"
SEED_FILES = (
    "countries",
    "cities",
    "currencies",
    "lists",
    "courses",
    "fields",
    "pay_us",
    "pay_kz",
    "samples",
)


class MetaRow(Base):
    """Bookkeeping: the seed version, and small settings (the demo persona)."""

    __tablename__ = "reference_meta"
    name: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[Any] = mapped_column(JSON)


class CountryRow(Base):
    __tablename__ = "countries"
    code: Mapped[str] = mapped_column(String(2), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    currency: Mapped[str] = mapped_column(String(3))
    linkedin_geo: Mapped[str] = mapped_column(String(20))
    indeed_host: Mapped[str] = mapped_column(String(40))
    adzuna: Mapped[bool] = mapped_column(Boolean)


class CityRow(Base):
    __tablename__ = "cities"
    country: Mapped[str] = mapped_column(String(2), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, primary_key=True)  # 0 = largest
    name: Mapped[str] = mapped_column(String(120))


class CurrencyRow(Base):
    __tablename__ = "currencies"
    code: Mapped[str] = mapped_column(String(3), primary_key=True)
    per_usd: Mapped[float] = mapped_column(Float)  # used only when the live rates service is down


class ListItemRow(Base):
    """Pick lists: currentRoles, targetRoles, motivations, jobTitles, courseDomains."""

    __tablename__ = "list_items"
    list: Mapped[str] = mapped_column(String(40), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, primary_key=True)
    value: Mapped[str] = mapped_column(String(200))


class CourseRow(Base):
    __tablename__ = "courses"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)  # title, provider, url, cost, format, length, modules, pace, why


class FieldRow(Base):
    __tablename__ = "study_fields"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    position: Mapped[int] = mapped_column(Integer)  # matching order: the first field whose keyword matches wins
    data: Mapped[dict] = mapped_column(JSON)  # label, keywords, courses, linkedinTerm, usSoc, kzKey


class PayTableRow(Base):
    """An official pay table (US BLS, Kazakhstan's statistics bureau), whole."""

    __tablename__ = "official_pay"
    country: Mapped[str] = mapped_column(String(2), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)


class SampleRow(Base):
    __tablename__ = "sample_cvs"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    position: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(120))
    resume: Mapped[str] = mapped_column(Text)


class PayEstimateRow(Base):
    """Cached pay estimates from the web (one per role, country and city),
    so the same question is not paid for twice and answers stay stable."""

    __tablename__ = "pay_estimates"
    key: Mapped[str] = mapped_column(String(200), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    payload: Mapped[dict] = mapped_column(JSON)


def read_seed(directory: Path = SEED_DIR) -> dict[str, Any]:
    return {name: json.loads((directory / f"{name}.json").read_text(encoding="utf-8")) for name in SEED_FILES}


def seed_version(directory: Path = SEED_DIR) -> str:
    h = hashlib.sha256()
    for name in SEED_FILES:
        h.update((directory / f"{name}.json").read_bytes())
    return h.hexdigest()


_TABLES = (CountryRow, CityRow, CurrencyRow, ListItemRow, CourseRow, FieldRow, PayTableRow, SampleRow)


def _rows(seed: dict[str, Any]) -> dict[type[Base], list[dict[str, Any]]]:
    return {
        CountryRow: [
            {
                "code": c["code"],
                "name": c["name"],
                "currency": c.get("currency", ""),
                "linkedin_geo": c.get("linkedinGeo", ""),
                "indeed_host": c.get("indeedHost", ""),
                "adzuna": bool(c.get("adzuna")),
            }
            for c in seed["countries"]
        ],
        CityRow: [
            {"country": code, "position": i, "name": name}
            for code, names in seed["cities"].items()
            for i, name in enumerate(names)
        ],
        CurrencyRow: [{"code": k, "per_usd": float(v)} for k, v in seed["currencies"].items()],
        ListItemRow: [
            {"list": name, "position": i, "value": value}
            for name, values in seed["lists"].items()
            for i, value in enumerate(values)
        ],
        CourseRow: [{"id": c["id"], "data": {k: v for k, v in c.items() if k != "id"}} for c in seed["courses"]],
        FieldRow: [
            {"id": f["id"], "position": i, "data": {k: v for k, v in f.items() if k != "id"}}
            for i, f in enumerate(seed["fields"])
        ],
        PayTableRow: [{"country": "us", "data": seed["pay_us"]}, {"country": "kz", "data": seed["pay_kz"]}],
        SampleRow: [
            {"id": s["id"], "position": i, "label": s["label"], "resume": s["resume"]}
            for i, s in enumerate(seed["samples"]["samples"])
        ],
    }


async def seed_reference(engine: AsyncEngine, directory: Path = SEED_DIR) -> bool:
    """Load the seed files into the tables if they changed since the last
    seeding. One transaction: readers never see half a data set. True if
    the tables were (re)written."""
    version = seed_version(directory)
    async with engine.begin() as conn:
        current = (await conn.execute(select(MetaRow.value).where(MetaRow.name == "seed_version"))).scalar()
        if current == version:
            return False
        seed = read_seed(directory)
        for table in _TABLES:
            await conn.execute(delete(table))
        for table, rows in _rows(seed).items():
            for start in range(0, len(rows), 2000):
                await conn.execute(insert(table), rows[start : start + 2000])
        await conn.execute(delete(MetaRow))
        await conn.execute(
            insert(MetaRow),
            [
                {"name": "seed_version", "value": version},
                {"name": "seeded_at", "value": datetime.now(UTC).isoformat()},
                {"name": "demo_persona", "value": seed["samples"]["demoPersona"]},
            ],
        )
    return True


async def load_reference(engine: AsyncEngine) -> dict[str, Any]:
    """Everything, in the shape domain.reference.Reference.from_data reads."""
    async with AsyncSession(engine) as session:

        async def all_rows(table: type[Base], *order: Any) -> list[Any]:
            return list((await session.execute(select(table).order_by(*order))).scalars())

        countries = await all_rows(CountryRow, CountryRow.name)
        cities: dict[str, list[str]] = {}
        for row in await all_rows(CityRow, CityRow.country, CityRow.position):
            cities.setdefault(row.country, []).append(row.name)
        lists: dict[str, list[str]] = {}
        for row in await all_rows(ListItemRow, ListItemRow.list, ListItemRow.position):
            lists.setdefault(row.list, []).append(row.value)
        pay = {row.country: row.data for row in await all_rows(PayTableRow, PayTableRow.country)}
        meta = {row.name: row.value for row in await all_rows(MetaRow, MetaRow.name)}
        return {
            "countries": [
                {
                    "code": c.code,
                    "name": c.name,
                    "currency": c.currency,
                    "linkedinGeo": c.linkedin_geo,
                    "indeedHost": c.indeed_host,
                    "adzuna": c.adzuna,
                }
                for c in countries
            ],
            "cities": cities,
            "currencies": {r.code: r.per_usd for r in await all_rows(CurrencyRow, CurrencyRow.code)},
            "lists": lists,
            "courses": [{"id": r.id, **r.data} for r in await all_rows(CourseRow, CourseRow.id)],
            "fields": [{"id": r.id, **r.data} for r in await all_rows(FieldRow, FieldRow.position)],
            "pay_us": pay["us"],
            "pay_kz": pay["kz"],
            "samples": {
                "samples": [
                    {"id": r.id, "label": r.label, "resume": r.resume}
                    for r in await all_rows(SampleRow, SampleRow.position)
                ],
                "demoPersona": meta.get("demo_persona", {}),
            },
        }


class PayCache:
    """Pay estimates found on the web, kept for 30 days."""

    MAX_AGE_DAYS = 30

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def get(self, key: str) -> dict[str, Any] | None:
        async with self._engine.connect() as conn:
            row = (await conn.execute(select(PayEstimateRow).where(PayEstimateRow.key == key))).first()
        if row is None:
            return None
        created = row.created_at if row.created_at.tzinfo else row.created_at.replace(tzinfo=UTC)
        if (datetime.now(UTC) - created).days >= self.MAX_AGE_DAYS:
            return None
        return row.payload

    async def put(self, key: str, payload: dict[str, Any]) -> None:
        async with self._engine.begin() as conn:
            await conn.execute(delete(PayEstimateRow).where(PayEstimateRow.key == key))
            await conn.execute(
                insert(PayEstimateRow), [{"key": key, "created_at": datetime.now(UTC), "payload": payload}]
            )
