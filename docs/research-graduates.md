# Research: recent graduates as a second Bridge Sim audience

Researched 2026-11-14. Every number below has a source link. Check a number at its source before it goes on a slide.

## The pain, in numbers (US)

| Fact | Source |
| --- | --- |
| Recent-grad (ages 22–27) unemployment: 5.2% in 2026 Q3. Underemployment (working in a job that doesn't need a degree): 42.5%. | [New York Fed, Labor Market for Recent College Graduates](https://www.newyorkfed.org/research/college-labor-market) (2026 Q3 highlights) |
| 52% of graduates are underemployed one year after graduating; 45% still are 10 years later. | [Burning Glass Institute & Strada, *Talent Disrupted*, Feb 2024](https://static1.squarespace.com/static/6197797102be715f55c0e0a1/t/65fb306bc81e0c239fb4f6a9/1710960749260/Talent+Disrupted+03052024.pdf) |
| 73% of graduates who start out underemployed are still underemployed 10 years later. The first job matters most. | [Inside Higher Ed on *Talent Disrupted*](https://www.insidehighered.com/news/students/academics/2024/02/22/more-half-recent-four-year-college-grads-underemployed) |
| One internship cuts the odds of underemployment by 49%. | [Forbes on *Talent Disrupted*](https://www.forbes.com/sites/emmylucas/2024/02/22/more-than-half-of-college-grads-are-underemployed-as-debate-grows-over-higher-eds-value/) |
| Workers aged 22–25 in the most AI-exposed jobs: employment is 19% below that of their peers in less-exposed jobs. The cause is less hiring, not layoffs. | [Stanford Digital Economy Lab, *Canaries in the Coal Mine?*, Aug 2026](https://digitaleconomy.stanford.edu/app/uploads/2026/08/Canaries_August2026.pdf) |
| 66.8% of grads name lack of experience as their biggest obstacle; only 26% are on their dream career path. (n=3,000; class of 2025 and 2026) | [ZipRecruiter Graduate Survey 2026](https://www.ziprecruiter-research.org/economic-insights-research/grad-survey-2026) |
| Only 30% of 2025 grads found entry-level jobs in their field; 48% felt unprepared to apply. | [Cengage 2025 Graduate Employability Report, via Forbes](https://www.forbes.com/sites/michaeltnietzel/2025/09/10/new-report-as-skills-gap-grows-job-market-for-college-grads-at-5-year-low/) |
| 70% of employers use skills-based hiring for entry-level jobs (65% the year before). Only 42% still screen by GPA (73% in 2019). Fewer than 40% of seniors know the term. | [NACE, Jan 2026](https://www.naceweb.org/about-us/press/2026/skills-based-hiring-grows-but-college-students-dont-fully-understand-it) |
| Employers want *examples* of skills, not lists, and want grads to "tie coursework … to professional skills". | [NACE Job Outlook 2026 Spring Update](https://www.naceweb.org/research/reports/2026/job-outlook/spring-update/) |
| About 42% of bachelor's students reconsidered their major because of AI (Gallup–Lumina). | [Fortune, Sep 2026](https://fortune.com/2026/09/17/ai-chatgpt-college-majors-retail-jobs/) |
| Parents pay for help: "several hundred dollars" for a coach for a political science grad; up to $30,000 for finance coaching. | [Newsday, Sep 2026](https://www.newsday.com/business/gen-z-career-jobs-hiring-helicopter-parenting-e7rogi5z); [Globe and Mail, Apr 2026](https://www.theglobeandmail.com/investing/personal-finance/article-on-money-reverse-recruiting-career-coaches-upskilling-unemployed/) |

## Existing alternatives for graduates

| Product | What it does | Gap for our user |
| --- | --- | --- |
| [Forage](https://www.theforage.com/) | Free employer-made job simulations; Career Explorer runs 4 short scenarios | Same sim for everyone. The catalog is limited to sponsor employers, and it doesn't start from your degree or thesis. |
| [Parker Dewey](https://www.parkerdewey.com/faq) | Paid micro-internships, 10–40 h, $200–600 per project, paid by employers | The employer picks the candidate, so grads with no experience are often not selected (the catch-22). It also tests one company's task, not "which field fits me". |
| [Extern](https://www.extern.com/post/externship-vs-internship-guide) | 8–12 week remote externships, about 10 h/week, usually unpaid | Takes months for a single field. Too slow for comparing 2–3 directions. |
| [Google Career Dreamer](https://blog.google/outreach-initiatives/grow-with-google/a-new-experiment-to-help-people-explore-more-career-possibilities/), [Apt](https://ourculturemag.com/2026/08/20/best-ai-tools-for-career-advice/) ($9.99–29.99/mo), CareerVillage COACH | AI suggests paths from your skills and interests | It suggests, but doesn't test. Interest is not ability, and you get no proof to show an employer. |
| "What Can I Do With This Major", My Next Move, PathwayU (university career centers) | Static major-to-job lists and interest tests | Generic per major. They don't use your actual thesis or methods. |
| [Handshake](https://jobhire.ai/blog/best-job-search-apps) | Job board for students and grads, plus Handshake AI paid model-training gigs | Assumes you know what to apply for. The gig work is not career evidence in a new field. |
| [Jobright](https://careery.pro/blog/ai-job-search/jobright-ai-review) (Turbo about $39.99/mo), Teal, Simplify | Job matching, tailoring, auto-apply | They start after you've chosen a field, and push more applications into a market where grads already send 70–100+. |

## Gaps we fill, and how the prototype fills them

1. **No tool turns a degree into a tested direction.** Discovery tools stop at suggestions. Simulations are fixed catalogs.
   **Bridge Map:** the AI reads the degree, thesis and projects and picks skills from a fixed list, quoting the person's own words. Code checks every quote and ranks 13 roles by fit. Then a test-drive gives 3 tasks built on their own methods. Example: a poli-sci thesis regression becomes a credit-risk task.
2. **Employers want proof of skills; grads can't show it.** NACE: 70% use skills-based hiring and want examples.
   **Portfolio page:** graded work samples, rubric evidence quoted from the answer, a skill-evidence list, and AI-written resume lines. These describe the work as self-directed and claim only what the answer shows.
3. **The catch-22: no experience means no selection.** Parker Dewey and internships need an employer to pick you.
   **No gatekeeper:** anyone can do a test-drive today, and the result is shareable before any employer says yes.
4. **No honest time and money plan.**
   **Launch plan:** study hours come from the person's own skill gaps, adjusted by how well they did on the tasks, plus course cost and first-year pay. All of this is plain code with unit tests.

## Risks to answer in the pitch

- **Age fit.** The hackathon audience is adults aged 25–45. The NY Fed counts "recent grads" as ages 22–27. So frame the grad segment as master's graduates and grads aged 25–27 who are still underemployed: the *Talent Disrupted* data shows underemployment is sticky for years. Keep career changers as the core segment.
- **Who pays.** Unemployed grads have little cash. The price tested in the prototype is $19 per direction, or $49 for 3 directions plus the plan; parents can gift it. Parents already pay hundreds of dollars for coaches (Newsday).
- **Grading credibility.** It's the same mitigation as before: a fixed rubric, quotes checked by code, levels capped at 1 without proof, and the full rubric shown on the page.
- **Placeholder data.** Pay, course prices and per-skill study hours in `data/` are not verified yet. Replace them with BLS and provider figures before the deck.
