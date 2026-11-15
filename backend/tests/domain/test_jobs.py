"""Job links must point at the
right board for the country; listings keep only what the listing says."""

from urllib.parse import parse_qs, urlparse

from bridge.domain.jobs import board_links, city_name, parse_adzuna, people_links, salary_text, topic_links


def _query(url: str) -> dict[str, str]:
    return {k: v[0] for k, v in parse_qs(urlparse(url).query).items()}


def test_job_board_links_use_the_country_and_encode_role_and_city():
    links = {link.site: link.url for link in board_links("UX Researcher", "Austin, TX", "us")}
    uk = {link.site: link.url for link in board_links("Analyst", "", "gb")}

    assert _query(links["LinkedIn"]) == {
        "keywords": "UX Researcher",
        "location": "Austin, TX, United States",
        "distance": "25",
    }
    assert links["Indeed"].startswith("https://www.indeed.com/jobs?q=UX+Researcher&l=Austin%2C+TX")
    assert list(links) == ["LinkedIn", "LinkedIn: entry level", "Indeed"]  # no Google search pages
    assert uk["Indeed"].startswith("https://uk.indeed.com/")
    assert board_links("Data analyst", "Astana", "kz")[-1].url == "https://hh.kz/search/vacancy?text=Data+analyst"


def test_linkedin_jobs_without_a_city_filter_by_the_whole_country():
    uk = _query(board_links("Analyst", "", "gb")[0].url)
    kz = _query(board_links("Analyst", "Almaty", "kz")[0].url)
    remote = _query(board_links("Analyst", "Remote", "us")[0].url)

    assert uk == {"keywords": "Analyst", "location": "United Kingdom", "geoId": "101165590"}
    assert kz == {"keywords": "Analyst", "location": "Almaty, Kazakhstan", "distance": "25"}
    assert remote["location"] == "United States" and remote["geoId"] == "103644278"


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


def test_entry_level_linkedin_link_filters_level_and_last_30_days():
    entry = _query(board_links("UX Researcher", "Austin, TX", "us")[1].url)

    assert entry["f_E"] == "2,3" and entry["f_TPR"] == "r2592000" and entry["keywords"] == "UX Researcher"


def test_recruiter_search_uses_linkedin_filters_not_one_long_query():
    recruiters, leads = people_links("Instructional Designer", "Austin, TX", "us", "learning")

    q = _query(recruiters.url)
    assert recruiters.url.startswith("https://www.linkedin.com/search/results/people/?")
    assert q["titleFreeText"] == "recruiter"  # LinkedIn's Title filter
    assert q["geoUrn"] == '["103644278"]'  # LinkedIn's Location filter: United States
    assert q["keywords"] == "learning Austin"  # one broad field word and the city, no quotes or OR
    assert recruiters.hint == "Recruiters for learning roles around Austin"
    assert people_links("Analyst", "", "kz", "data")[0].hint == "Recruiters for data roles in Kazakhstan"
    assert people_links("Analyst", "", "gb")[1].hint == "Managers who mention this role in the United Kingdom"
    lq = _query(leads.url)
    assert lq["titleFreeText"] == "manager" and lq["keywords"] == "Instructional Designer Austin"


def test_people_searches_without_a_city_or_a_known_country_id_still_name_the_place():
    no_city = _query(people_links("Analyst", "", "gb", "data")[0].url)
    kz = _query(people_links("Analyst", "", "kz")[0].url)
    odd = _query(people_links('Data "Analyst" (BI)', "  ,  ", "us")[1].url)

    assert no_city == {
        "origin": "FACETED_SEARCH",
        "titleFreeText": "recruiter",
        "keywords": "data",
        "geoUrn": '["101165590"]',
    }
    assert "geoUrn" not in kz and kz["keywords"] == "Kazakhstan"
    assert odd["keywords"] == "Data Analyst BI"  # quotes and brackets would switch LinkedIn to boolean mode
    assert city_name("  ,  ") == "" and city_name("São Paulo, SP") == "São Paulo"


def test_topic_searches_are_recent_and_never_google():
    posts, reddit = topic_links("UX Researcher")

    assert _query(posts.url) == {"keywords": "UX Researcher", "sortBy": '["date_posted"]'}
    assert _query(reddit.url) == {"q": "UX Researcher", "sort": "top", "t": "month"}
    links = board_links("UX Researcher", "Austin", "us") + people_links("UX Researcher", "Austin") + topic_links("UX")
    assert not any("google." in link.url for link in links)
