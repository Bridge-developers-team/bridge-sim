"""Learning links must be real search results; job links must point at the
right board for the country; listings keep only what the listing says."""

from bridge.domain.jobs import board_links, parse_adzuna, salary_text
from bridge.domain.resources import Found, harvest, pick, search_links


def test_harvest_keeps_https_results_once_and_drops_youtube_pages_that_are_not_videos():
    found = harvest(
        [
            Found("https://example.com/guide", "Guide"),
            Found("https://example.com/guide", "Duplicate"),
            Found("http://insecure.com/x", "Insecure"),
            Found("https://www.youtube.com/@somechannel", "A channel"),
            Found("https://www.youtube.com/watch?v=abc123", "A video"),
            Found("https://youtu.be/xyz", ""),
        ]
    )

    assert [f.url for f in found] == [
        "https://example.com/guide",
        "https://www.youtube.com/watch?v=abc123",
        "https://youtu.be/xyz",
    ]
    assert found[2].title == "youtu.be"  # empty titles fall back to the domain


def test_pick_ignores_invented_indexes_and_caps_articles_and_videos():
    found = [Found(f"https://site{i}.com/a", f"Article {i}") for i in range(5)] + [
        Found(f"https://www.youtube.com/watch?v={i}", f"Video {i}") for i in range(3)
    ]

    picked = pick(
        found, [(99, "made up"), (0, "good"), (0, "again"), (1, ""), (2, ""), (3, ""), (5, ""), (6, ""), (7, "")]
    )

    assert [r.title for r in picked] == ["Article 0", "Article 1", "Article 2", "Video 0", "Video 1"]
    assert {r.kind for r in picked} == {"article", "video"}
    assert picked[0].why == "good" and picked[0].source == "site0.com"


def test_without_ai_the_links_are_labeled_searches():
    links = search_links("storyboarding for beginners")

    assert all(r.kind == "search" for r in links)
    assert links[0].url.startswith("https://www.youtube.com/results?search_query=storyboarding+for+beginners")


def test_job_board_links_use_the_country_and_encode_role_and_city():
    links = {link.site: link.url for link in board_links("UX Researcher", "Austin, TX", "us")}
    uk = {link.site: link.url for link in board_links("Analyst", "", "gb")}

    assert links["LinkedIn"] == "https://www.linkedin.com/jobs/search/?keywords=UX+Researcher&location=Austin%2C+TX"
    assert links["Indeed"].startswith("https://www.indeed.com/jobs?q=UX+Researcher&l=Austin%2C+TX")
    assert "UX+Researcher+jobs+in+Austin" in links["Google Jobs"]
    assert uk["Indeed"].startswith("https://uk.indeed.com/")


def test_salary_shows_only_what_the_listing_gives_and_labels_estimates():
    assert salary_text(None, None, "0") == ""
    assert salary_text("55000", "70000", "0") == "55,000–70,000"
    assert salary_text("60000", "60000", "1") == "60,000 (estimate)"


def test_adzuna_listings_without_title_or_https_link_are_skipped():
    listings = parse_adzuna(
        {
            "results": [
                {
                    "title": "Instructional Designer",
                    "company": {"display_name": "Acme"},
                    "location": {"display_name": "Austin, TX"},
                    "redirect_url": "https://www.adzuna.com/details/1",
                    "created": "2026-11-10T08:00:00Z",
                    "salary_min": 60000,
                    "salary_max": 75000,
                },
                {"title": "", "redirect_url": "https://www.adzuna.com/details/2"},
                {"title": "No link", "redirect_url": "javascript:alert(1)"},
            ]
        }
    )

    assert len(listings) == 1
    assert listings[0].company == "Acme" and listings[0].posted == "2026-11-10"
