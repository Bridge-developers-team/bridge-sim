"""/api/videos through HTTP with a fake YouTube: off without a key, one good
video per phrase, a broad retry when a phrase finds nothing, a day's cache,
and a failed YouTube call never breaks the page."""

from __future__ import annotations

ROLE = "Instructional Designer"


def youtube(videos: dict[str, list[tuple[str, int]]], calls: list[tuple[str, dict]], fail: bool = False):
    """A fake YouTube: `videos` maps a search phrase to (id, views) in relevance order."""
    by_id = {vid: views for found in videos.values() for vid, views in found}

    async def fetch(url, params):
        calls.append((url, params))
        if fail:
            raise RuntimeError("quotaExceeded")
        if url.endswith("/search"):
            return {"items": [{"id": {"videoId": vid}} for vid, _ in videos.get(params["q"], [])]}
        return {
            "items": [
                {
                    "id": vid,
                    "snippet": {
                        "title": f"Lesson {vid}",
                        "channelTitle": "Ch",
                        "publishedAt": "2025-02-03T00:00:00Z",
                        "defaultAudioLanguage": "en",
                        "liveBroadcastContent": "none",
                        "thumbnails": {},
                    },
                    "statistics": {"viewCount": str(by_id[vid])},
                    "contentDetails": {"duration": "PT12M"},
                }
                for vid in params["id"].split(",")
            ]
        }

    return fetch


def test_without_a_youtube_key_the_section_is_off_and_nothing_is_called(demo):
    body = demo.get("/api/videos", params={"role": ROLE, "q": "storyboarding tutorial"}).json()

    assert body == {"source": "off", "videos": []}


def test_one_watched_video_per_phrase_and_a_broad_retry_when_a_phrase_has_none(make_client):
    calls: list[tuple[str, dict]] = []
    fetch = youtube(
        {
            "storyboarding tutorial": [("lowviews001", 900), ("goodvideo01", 80_000)],
            "articulate storyline basics": [("goodvideo01", 80_000), ("second00002", 40_000)],
            "nothing good here": [("tinyviews01", 10)],
            "what does an instructional designer do": [("broadvideo1", 300_000)],
        },
        calls,
    )
    client = make_client(youtube_api_key="k", videos_fetch=fetch)
    params = {"role": ROLE, "q": ["storyboarding tutorial", "articulate storyline basics", "nothing good here"]}

    body = client.get("/api/videos", params=params).json()

    assert body["source"] == "youtube"
    assert [(v["id"], v["query"]) for v in body["videos"]] == [
        ("goodvideo01", "storyboarding tutorial"),
        ("second00002", "articulate storyline basics"),  # never the same video twice
        ("broadvideo1", "what does an instructional designer do"),  # the retry
    ]
    v = body["videos"][0]
    assert v["url"] == "https://www.youtube.com/watch?v=goodvideo01" and v["minutes"] == 12 and v["views"] == 80_000
    search = next(p for u, p in calls if u.endswith("/search"))
    assert search["relevanceLanguage"] == "en" and search["type"] == "video" and search["safeSearch"] == "strict"

    before = len(calls)
    assert client.get("/api/videos", params=params).json() == body
    assert len(calls) == before  # a day's cache: YouTube allows 100 searches a day


def test_a_failing_youtube_gives_an_empty_list_not_an_error(make_client):
    client = make_client(youtube_api_key="k", videos_fetch=youtube({}, [], fail=True))

    response = client.get("/api/videos", params={"role": ROLE, "q": "x"})

    assert response.status_code == 200 and response.json() == {"source": "youtube", "videos": []}


def test_videos_need_a_role_and_are_rate_limited(make_client):
    client = make_client(youtube_api_key="k", videos_fetch=youtube({}, []), videos_per_client=1)

    assert client.get("/api/videos", params={"role": " "}).status_code == 400
    assert client.get("/api/videos", params={"role": ROLE}).status_code == 200
    assert client.get("/api/videos", params={"role": ROLE}).status_code == 429
