"""Practice scoring: code owns the rubric and caps scores without a real quote."""

import pytest

from bridge.domain.practice import UNPROVEN_SCORE_CAP, IncompletePractice, build_practice, score_evaluation
from tests.factories import evaluation_draft, practice_draft

ANSWER = "By the end of the module, new staff will perform a pre-shift dock check with no missed steps."


def practice(**kw):
    return build_practice(practice_draft(**kw), practice_id="w1-try", target_role="Instructional Designer")


def test_rubric_ids_are_set_by_code_and_scores_and_timebox_are_clamped():
    p = practice(criteria=5, max_score=9)

    assert [c.id for c in p.rubric] == ["c1", "c2", "c3", "c4"]
    assert all(c.max_score == 5 for c in p.rubric)
    assert 5 <= p.timebox_minutes <= 20


def test_a_rubric_with_fewer_than_three_criteria_is_rejected():
    with pytest.raises(IncompletePractice):
        practice(criteria=2)


def test_real_quotes_keep_their_score_and_invented_ones_are_capped():
    p = practice()
    ev = score_evaluation(
        ANSWER,
        p,
        evaluation_draft(
            ("c1", 4, "new staff will perform a pre-shift dock check"),
            ("c2", 4, "staff will understand safety deeply"),  # not in the answer
            ("c3", 99, "with no missed steps"),
        ),
    )
    by_id = {c.rubric_id: c for c in ev.criteria}

    assert by_id["c1"].score == 4 and by_id["c1"].verified
    assert by_id["c2"].score == UNPROVEN_SCORE_CAP and by_id["c2"].score_raw == 4 and by_id["c2"].evidence == ""
    assert by_id["c3"].score == 4  # clamped to max, quote is real
    assert ev.total_score == 9 and ev.max_total == 12


def test_a_criterion_the_ai_skipped_scores_zero():
    ev = score_evaluation(ANSWER, practice(), evaluation_draft(("c1", 2, "new staff will perform")))

    assert [c.score for c in ev.criteria] == [2, 0, 0]
