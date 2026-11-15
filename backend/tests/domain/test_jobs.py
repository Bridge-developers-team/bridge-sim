"""Job links must point at the
right board for the country; listings keep only what the listing says."""

from bridge.domain.jobs import board_links, parse_adzuna, salary_text


def test_job_board_links_use_the_country_and_encode_role_and_city():
    links = {link.site: link.url for link in board_links("UX Researcher", "Austin, TX", "us")}
    uk = {link.site: link.url for link in board_links("Analyst", "", "gb")}

    assert links["LinkedIn"] == "https://www.linkedin.com/jobs/search/?keywords=UX+Researcher&location=Austin%2C+TX"
    assert links["Indeed"].startswith("https://www.indeed.com/jobs?q=UX+Researcher&l=Austin%2C+TX")
    assert list(links) == ["LinkedIn", "Indeed"]  # no Google search pages
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
