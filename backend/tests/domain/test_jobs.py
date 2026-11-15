"""Job links must point at the
right board for the country; listings keep only what the listing says."""

from urllib.parse import parse_qs, urlparse

from bridge.domain.jobs import board_links, city_name, parse_adzuna, people_links, salary_text, topic_links


def test_job_board_links_use_the_country_and_encode_role_and_city():
    links = {link.site: link.url for link in board_links("UX Researcher", "Austin, TX", "us")}
    uk = {link.site: link.url for link in board_links("Analyst", "", "gb")}

    assert links["LinkedIn"] == "https://www.linkedin.com/jobs/search/?keywords=UX+Researcher&location=Austin%2C+TX"
    assert links["Indeed"].startswith("https://www.indeed.com/jobs?q=UX+Researcher&l=Austin%2C+TX")
    assert list(links) == ["LinkedIn", "LinkedIn: entry level", "Indeed"]  # no Google search pages
    assert uk["Indeed"].startswith("https://uk.indeed.com/")
    assert board_links("Data analyst", "Astana", "kz")[-1].url == "https://hh.kz/search/vacancy?text=Data+analyst"


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


def _query(url: str) -> dict[str, str]:
    return {k: v[0] for k, v in parse_qs(urlparse(url).query).items()}


def test_entry_level_linkedin_link_filters_level_and_last_30_days():
    entry = board_links("UX Researcher", "Austin, TX", "us")[1]

    assert _query(entry.url) == {
        "keywords": "UX Researcher",
        "location": "Austin, TX",
        "f_E": "2,3",
        "f_TPR": "r2592000",
    }


def test_recruiter_searches_quote_the_role_and_use_the_city_name_only():
    recruiters, leads = people_links("Instructional Designer", "Austin, TX")

    keywords = _query(recruiters.url)["keywords"]
    assert recruiters.url.startswith("https://www.linkedin.com/search/results/people/?")
    assert '"Instructional Designer"' in keywords and '"Austin"' in keywords and "TX" not in keywords
    assert "recruiter OR" in keywords
    assert '"Instructional Designer" (manager OR' in _query(leads.url)["keywords"]


def test_people_searches_without_a_city_have_no_location_and_survive_odd_input():
    no_city = people_links("Analyst", "")
    odd = people_links('Data "Analyst" (BI)', "  ,  ")

    assert _query(no_city[0].url)["keywords"].endswith('"Analyst"')
    # Quotes and brackets inside the role would break the search syntax.
    assert '"Data Analyst BI"' in _query(odd[0].url)["keywords"]
    assert city_name("  ,  ") == "" and city_name("São Paulo, SP") == "São Paulo"


def test_topic_searches_are_recent_about_the_exact_role_and_never_google():
    posts, reddit = topic_links("UX Researcher")

    assert _query(posts.url) == {"keywords": '"UX Researcher"', "sortBy": '["date_posted"]'}
    assert _query(reddit.url) == {"q": '"UX Researcher"', "sort": "top", "t": "month"}
    links = board_links("UX Researcher", "Austin", "us") + people_links("UX Researcher", "Austin") + topic_links("UX")
    assert not any("google." in link.url for link in links)
