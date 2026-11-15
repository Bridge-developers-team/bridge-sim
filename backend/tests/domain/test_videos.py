"""Videos must be English, watched, real lessons, and one per search phrase."""

from bridge.domain.videos import (
    Candidate,
    best,
    duration_seconds,
    is_english,
    parse_videos,
    queries,
    search_ids,
)


def cand(i: str, views: int, *, seconds: int = 600, language: str = "en", title: str = "A lesson", live: bool = False):
    return Candidate(
        id=f"vid{i}xxxx",
        title=title,
        channel="C",
        thumbnail="",
        views=views,
        seconds=seconds,
        published="2025-01-01T00:00:00Z",
        language=language,
        live=live,
    )


def test_iso_durations():
    assert duration_seconds("PT15M33S") == 933
    assert duration_seconds("PT1H2M") == 3720
    assert duration_seconds("P1DT2H") == 93600
    assert duration_seconds("PT45S") == 45
    assert duration_seconds("") == 0 and duration_seconds("P") == 0 and duration_seconds("junk") == 0


def test_language_tags_win_and_untagged_titles_must_be_latin():
    assert is_english(cand("1", 1, language="en-GB"))
    assert not is_english(cand("2", 1, language="ru"))
    assert is_english(cand("3", 1, language="", title="Storyboarding for beginners"))
    assert not is_english(cand("4", 1, language="", title="Раскадровка для начинающих"))
    assert not is_english(cand("5", 1, language="", title="1234 !!"))


def test_the_most_relevant_video_that_clears_the_highest_bar_wins():
    # YouTube's order is relevance: the 3rd clears 50k, so it beats the more relevant 12k one.
    picked = best([cand("1", 12_000), cand("2", 900_000, seconds=60), cand("3", 60_000), cand("4", 2_000_000)], set())
    assert picked is not None and picked.id == "vid3xxxx"


def test_bars_step_down_but_never_show_an_unwatched_video():
    assert best([cand("1", 3_000), cand("2", 11_000)], set()).id == "vid2xxxx"  # type: ignore[union-attr]
    assert best([cand("1", 3_000)], set()).id == "vid1xxxx"  # type: ignore[union-attr]
    assert best([cand("1", 1_999), cand("2", 500)], set()) is None


def test_shorts_marathons_live_foreign_and_already_used_videos_are_skipped():
    skipped = [
        cand("1", 1_000_000, seconds=59),  # a Short
        cand("2", 1_000_000, seconds=4 * 3600),  # a 4-hour stream recording
        cand("3", 1_000_000, live=True),
        cand("4", 1_000_000, language="es"),
        cand("5", 1_000_000),  # already shown for another phrase
    ]
    assert best(skipped, {"vid5xxxx"}) is None


def test_api_payloads_are_parsed_defensively():
    assert search_ids(
        {"items": [{"id": {"videoId": "abcDEF123_-"}}, {"id": {"channelId": "x"}}, {"id": {"videoId": "abcDEF123_-"}}]}
    ) == ["abcDEF123_-"]
    parsed = parse_videos(
        {
            "items": [
                {
                    "id": "abcDEF123_-",
                    "snippet": {
                        "title": "Instructional design in 10 minutes",
                        "channelTitle": "Teach",
                        "publishedAt": "2024-05-01T10:00:00Z",
                        "defaultAudioLanguage": "en-US",
                        "liveBroadcastContent": "none",
                        "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/abcDEF123_-/mqdefault.jpg"}},
                    },
                    "statistics": {"viewCount": "123456"},
                    "contentDetails": {"duration": "PT10M2S"},
                },
                {"id": "nostats1234", "snippet": {"title": "Hidden views"}, "statistics": {}},
                {"id": "<script>", "snippet": {"title": "Bad id"}, "statistics": {"viewCount": "5"}},
            ]
        }
    )
    assert len(parsed) == 1
    c = parsed[0]
    assert (c.views, c.seconds, c.language, c.live) == (123456, 602, "en-US", False)
    assert c.thumbnail.startswith("https://i.ytimg.com/")


def test_queries_are_distinct_capped_and_fall_back_to_the_role():
    assert queries(["A b", "a B", "c", "d", "e"], "Analyst") == ["A b", "c", "d"]
    assert queries(["  "], "Instructional Designer") == ["what does an instructional designer do"]
    assert queries([], "Data Analyst") == ["what does a data analyst do"]
