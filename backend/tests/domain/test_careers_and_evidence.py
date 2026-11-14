"""Career paths must be 3 distinct roles, and skills must quote the resume."""

import pytest

from bridge.domain.careers import NotEnoughCareers, normalize_careers, normalize_years, title_key
from bridge.domain.evidence import verify_evidence
from bridge.domain.profile import read_candidate
from tests.factories import RESUME, career_draft


def test_verbatim_quotes_match_ignoring_case_spacing_and_smart_quotes():
    source = "I “redesigned”   the unit — fast."

    assert verify_evidence(source, '"Redesigned" the unit - fast')
    assert not verify_evidence(source, "Redesigned the module")  # paraphrase
    assert not verify_evidence(source, "the unit")  # under 3 words


def test_three_distinct_paths_and_quotes_checked_against_the_resume():
    careers = normalize_careers(
        [
            career_draft("Instructional Designer"),
            career_draft("Senior Instructional Designer (Corporate)"),  # same role
            career_draft("Corporate Trainer", quote="Invented quote that is not in the resume"),
            career_draft("Education Project Coordinator"),
        ],
        RESUME,
    )

    assert [c.title for c in careers] == [
        "Instructional Designer",
        "Corporate Trainer",
        "Education Project Coordinator",
    ]
    assert careers[0].transferable_skills[0].verified
    trainer_skill = careers[1].transferable_skills[0]
    assert not trainer_skill.verified
    assert trainer_skill.evidence == ""


def test_fewer_than_three_distinct_paths_is_rejected():
    with pytest.raises(NotEnoughCareers):
        normalize_careers([career_draft("A role"), career_draft("Senior A role")], RESUME)


def test_title_key_ignores_seniority_and_brackets():
    assert title_key("Senior UX Researcher (Remote)") == title_key("ux researcher")


@pytest.mark.parametrize(("raw", "expected"), [(7, 7), ("6.5", 7), (None, None), ("", None), (-1, None), (61, None)])
def test_years_of_experience_keeps_plausible_numbers_only(raw, expected):
    assert normalize_years(raw) == expected


def test_candidate_drops_income_and_clamps_everything():
    c = read_candidate(
        {
            "currentRole": "  Teacher  ",
            "hoursPerWeek": 100,
            "monthlyLearningBudget": -5,
            "currency": "usd",
            "interestedRoles": ["A", "B", "C", "D"],
            "transitionPreference": "reckless",
            "currentMonthlyIncome": 5000,
        }
    )

    assert c.current_role == "Teacher"
    assert c.hours_per_week == 40
    assert c.monthly_learning_budget == 0
    assert c.currency == "USD"
    assert c.interested_roles == ["A", "B", "C"]
    assert c.transition_preference == "balanced"
    assert "income" not in c.model_dump_json().lower()
