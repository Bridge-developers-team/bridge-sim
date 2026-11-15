"""The sample CVs and demo persona, read from the reference seed (the same
data the app loads into its database)."""

from bridge.db.reference import read_seed
from bridge.domain.reference import Reference

_REF = Reference.from_data(read_seed())
SAMPLES = _REF.samples
DEMO_PERSONA = _REF.demo_persona
TEACHER = next(s for s in SAMPLES if s.id == "teacher")
NURSE = next(s for s in SAMPLES if s.id == "nurse")
RETAIL = next(s for s in SAMPLES if s.id == "retail")
