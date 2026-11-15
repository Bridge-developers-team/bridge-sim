"""Courses to study for a target role. A hand-checked catalog, not AI output:
every URL below was opened and its title checked before it went in, and each
syllabus is the provider's own list of modules. Free courses come first; paid
certificates are offered only when the user set a learning budget.

The study plan maps the main course onto the 30-day roadmap: a lecture series
moves one module a week, a certificate one or two modules a month."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

from pydantic import Field as PydanticField

from bridge.domain.drafts import CoursePickDraft
from bridge.domain.models import CamelModel
from bridge.domain.text import clean, slug
from bridge.domain.web import Found, host

# free: no charge at all. paid: a paid plan, subscription or trial. Coursera
# courses count as paid: its own FAQ says course materials need the paid
# certificate option, with a free trial or a no-certificate option on some.
Cost = Literal["free", "paid"]
Format = Literal["certificate", "course", "lectures"]
Pace = Literal["weekly", "course"]

CHECKED = "November 2026"  # when the links and syllabi below were last checked


class Course(CamelModel):
    id: str
    title: str
    provider: str
    url: str
    cost: Cost
    format: Format
    length: str = ""  # the provider's own estimate, never ours
    modules: list[str] = PydanticField(default_factory=list)
    pace: Pace = "course"
    why: str = ""
    # Paid only: the provider's US monthly price, rounded (Coursera programs
    # are $49 a month; checked November 2026). 0 = unknown or free.
    monthly_usd: int = 0
    found: bool = False  # True for a course the AI found on the web for this exact role


def _c(id: str, title: str, provider: str, url: str, cost: Cost, format: Format, **kw: object) -> Course:
    return Course.model_validate(
        {"id": id, "title": title, "provider": provider, "url": url, "cost": cost, "format": format, **kw}
    )


COURSES: dict[str, Course] = {
    c.id: c
    for c in [
        # ---------- Data ----------
        _c(
            "google-data-analytics",
            "Google Data Analytics Professional Certificate",
            "Google on Coursera",
            "https://www.coursera.org/professional-certificates/google-data-analytics",
            "paid",
            "certificate",
            monthly_usd=49,
            length="About 6 months at 10 hours a week (Coursera's estimate)",
            modules=[
                "Foundations: Data, Data, Everywhere",
                "Ask Questions to Make Data-Driven Decisions",
                "Prepare Data for Exploration",
                "Process Data from Dirty to Clean",
                "Analyze Data to Answer Questions",
                "Share Data Through the Art of Visualization",
                "Introduction to Data Analysis Using Python",
                "Google Data Analytics Capstone: Complete a Case Study",
            ],
            why="The best-known entry certificate for analysts; ends with a portfolio case study.",
        ),
        _c(
            "cs50-sql",
            "CS50's Introduction to Databases with SQL",
            "Harvard (CS50)",
            "https://cs50.harvard.edu/sql/",
            "free",
            "course",
            length="7 weeks of material",
            modules=["Querying", "Relating", "Designing", "Writing", "Viewing", "Optimizing", "Scaling"],
            pace="weekly",
            why="SQL is the skill most analyst job posts ask for; Harvard's course is free with problem sets.",
        ),
        _c(
            "cs50-sql-videos",
            "CS50 SQL lectures (YouTube playlist)",
            "Harvard (CS50)",
            "https://www.youtube.com/playlist?list=PLhQjrBD2T382v1MBjNOhPu9SiJ1fsD4C0",
            "free",
            "lectures",
            why="The same lectures as a playlist, for watching on a phone or TV.",
        ),
        _c(
            "kaggle-sql",
            "Intro to SQL",
            "Kaggle Learn",
            "https://www.kaggle.com/learn/intro-to-sql",
            "free",
            "course",
            why="Short hands-on lessons in the browser, nothing to install.",
        ),
        _c(
            "harvard-stat110",
            "Statistics 110: Probability (lectures)",
            "Harvard University on YouTube",
            "https://www.youtube.com/playlist?list=PL2SOU6wwxB0uwwH80KTQ6ht66KWxbzTIo",
            "free",
            "lectures",
            why="Joe Blitzstein's full Harvard course, for the statistics behind analysis.",
        ),
        _c(
            "mit-analytics-edge",
            "15.071 The Analytics Edge",
            "MIT OpenCourseWare",
            "https://ocw.mit.edu/courses/15-071-the-analytics-edge-spring-2017/",
            "free",
            "course",
            why="MIT Sloan's course on using data to make business decisions, with real cases.",
        ),
        # ---------- Health data ----------
        _c(
            "jhu-health-informatics",
            "Health Informatics Specialization",
            "Johns Hopkins University on Coursera",
            "https://www.coursera.org/specializations/health-informatics",
            "paid",
            "certificate",
            monthly_usd=49,
            modules=[
                "The Social and Technical Context of Health Informatics",
                "Leading Change in Health Informatics",
                "The Outcomes and Interventions of Health Informatics",
                "The Data Science of Health Informatics",
                "Culminating Project in Health Informatics",
            ],
            why="Written for clinicians moving into health IT; ends with an informatics project plan.",
        ),
        # ---------- Software and web ----------
        _c(
            "cs50x",
            "CS50x: Introduction to Computer Science",
            "Harvard (CS50)",
            "https://cs50.harvard.edu/x/",
            "free",
            "course",
            length="11 weeks of material",
            modules=[
                "Scratch",
                "C",
                "Arrays",
                "Algorithms",
                "Memory",
                "Data Structures",
                "Python",
                "SQL",
                "HTML, CSS, JavaScript",
                "Flask",
            ],
            pace="weekly",
            why="The most-taken free intro to programming; each week has lectures and problem sets.",
        ),
        _c(
            "cs50-videos",
            "CS50 lectures (YouTube playlist)",
            "Harvard (CS50)",
            "https://www.youtube.com/playlist?list=PLhQjrBD2T383f9scHRNYJkior2VvYjpSL",
            "free",
            "lectures",
            why="Every CS50 lecture as a playlist.",
        ),
        _c(
            "mit-6-0001",
            "6.0001 Introduction to Computer Science and Programming in Python",
            "MIT OpenCourseWare",
            "https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/",
            "free",
            "course",
            why="MIT's first programming course, with notes and problem sets.",
        ),
        _c(
            "mit-6-0001-videos",
            "MIT 6.0001 lectures (YouTube playlist)",
            "MIT OpenCourseWare",
            "https://www.youtube.com/playlist?list=PLUl4u3cNGP63WbdFxL8giv4yhgdMGaZNA",
            "free",
            "lectures",
            why="The full MIT lecture series in Python.",
        ),
        _c(
            "meta-back-end",
            "Meta Back-End Developer Professional Certificate",
            "Meta on Coursera",
            "https://www.coursera.org/professional-certificates/meta-back-end-developer",
            "paid",
            "certificate",
            monthly_usd=49,
            length="About 8 months at 6 hours a week (Coursera's estimate)",
            modules=[
                "Introduction to Back-End Development",
                "Programming in Python",
                "Version Control",
                "Introduction to Databases for Back-End Development",
                "Django Web Framework",
                "APIs",
                "The Full Stack",
                "Back-End Developer Capstone",
                "Coding Interview Preparation",
            ],
            why="A structured path with a capstone app and interview practice.",
        ),
        _c(
            "cs50w",
            "CS50's Web Programming with Python and JavaScript",
            "Harvard (CS50)",
            "https://cs50.harvard.edu/web/",
            "free",
            "course",
            length="9 weeks of material",
            modules=[
                "HTML, CSS",
                "Git",
                "Python",
                "Django",
                "SQL, Models, and Migrations",
                "JavaScript",
                "User Interfaces",
                "Testing, CI/CD",
                "Scalability and Security",
            ],
            pace="weekly",
            why="Harvard's free web course; each project becomes a portfolio piece.",
        ),
        _c(
            "odin-project",
            "The Odin Project",
            "The Odin Project",
            "https://www.theodinproject.com/",
            "free",
            "course",
            why="A free, project-based web curriculum with an active community.",
        ),
        _c(
            "freecodecamp",
            "freeCodeCamp certifications",
            "freeCodeCamp",
            "https://www.freecodecamp.org/learn/",
            "free",
            "course",
            why="Free certifications built from small coding exercises and projects.",
        ),
        _c(
            "meta-front-end",
            "Meta Front-End Developer Professional Certificate",
            "Meta on Coursera",
            "https://www.coursera.org/professional-certificates/meta-front-end-developer",
            "paid",
            "certificate",
            monthly_usd=49,
            length="About 7 months at 6 hours a week (Coursera's estimate)",
            modules=[
                "Introduction to Front-End Development",
                "Programming with JavaScript",
                "Version Control",
                "HTML and CSS in depth",
                "React Basics",
                "Advanced React",
                "Principles of UX/UI Design",
                "Front-End Developer Capstone",
                "Coding Interview Preparation",
            ],
            why="From HTML to React, ending with a capstone site.",
        ),
        # ---------- QA ----------
        _c(
            "umn-software-testing",
            "Software Testing and Automation Specialization",
            "University of Minnesota on Coursera",
            "https://www.coursera.org/specializations/software-testing-automation",
            "paid",
            "certificate",
            monthly_usd=49,
            length="About 2 months at 10 hours a week (Coursera's estimate)",
            modules=[
                "Introduction to Software Testing",
                "Black-box and White-box Testing",
                "Introduction to Automated Analysis",
                "Web and Mobile Testing with Selenium",
            ],
            why="Testing theory to Selenium automation, in four courses.",
        ),
        _c(
            "test-automation-university",
            "Test Automation University",
            "Applitools",
            "https://testautomationu.applitools.com/",
            "free",
            "course",
            why="Free courses on test automation tools, taught by working testers.",
        ),
        # ---------- UX ----------
        _c(
            "google-ux",
            "Google UX Design Professional Certificate",
            "Google on Coursera",
            "https://www.coursera.org/professional-certificates/google-ux-design",
            "paid",
            "certificate",
            monthly_usd=49,
            length="About 6 months at 10 hours a week (Coursera's estimate)",
            modules=[
                "Foundations of User Experience (UX) Design",
                "Start the UX Design Process: Empathize, Define, and Ideate",
                "Build Wireframes and Low-Fidelity Prototypes",
                "Conduct UX Research and Test Early Concepts",
                "Create High-Fidelity Designs and Prototypes in Figma",
                "Build Dynamic User Interfaces (UI) for Websites",
                "Design a User Experience for Social Good & Prepare for Jobs",
            ],
            why="The best-known UX entry certificate; you finish with three portfolio projects.",
        ),
        _c(
            "michigan-ux",
            "User Experience Research and Design Specialization",
            "University of Michigan on Coursera",
            "https://www.coursera.org/specializations/michiganux",
            "paid",
            "certificate",
            monthly_usd=49,
            modules=[
                "Introduction to User Experience Principles and Processes",
                "Understanding User Needs",
                "Evaluating Designs with Users",
                "UX Design: From Concept to Prototype",
                "UX Research at Scale: Surveys, Analytics, Online Testing",
                "UX (User Experience) Capstone",
            ],
            why="Stronger on research methods, good for UX researchers.",
        ),
        _c(
            "mit-6-831",
            "6.831 User Interface Design and Implementation",
            "MIT OpenCourseWare",
            "https://ocw.mit.edu/courses/6-831-user-interface-design-and-implementation-spring-2011/",
            "free",
            "course",
            why="MIT's course on usability, design principles and user testing.",
        ),
        # ---------- IT support and security ----------
        _c(
            "google-it-support",
            "Google IT Support Professional Certificate",
            "Google on Coursera",
            "https://www.coursera.org/professional-certificates/google-it-support",
            "paid",
            "certificate",
            monthly_usd=49,
            length="About 3 months at 10 hours a week (Coursera's estimate)",
            modules=[
                "Technical Support Fundamentals",
                "The Bits and Bytes of Computer Networking",
                "Operating Systems and You: Becoming a Power User",
                "System Administration and IT Infrastructure Services",
                "IT Security: Defense against the digital dark arts",
            ],
            why="The standard first step into help-desk and IT support jobs.",
        ),
        _c(
            "cs50t",
            "CS50's Understanding Technology",
            "Harvard (CS50)",
            "https://cs50.harvard.edu/technology/",
            "free",
            "course",
            length="6 weeks of material",
            modules=["Hardware", "Internet", "Multimedia", "Security", "Web Development", "Programming"],
            pace="weekly",
            why="How computers, networks and the web work, for non-programmers.",
        ),
        _c(
            "messer-a-plus",
            "CompTIA A+ 220-1201 training course",
            "Professor Messer",
            "https://www.professormesser.com/free-a-plus-training/220-1201/220-1201-video/220-1201-training-course/",
            "free",
            "lectures",
            why="Free videos for the A+ exam that many support jobs ask for (the exam itself costs extra).",
        ),
        _c(
            "google-cybersecurity",
            "Google Cybersecurity Professional Certificate",
            "Google on Coursera",
            "https://www.coursera.org/professional-certificates/google-cybersecurity",
            "paid",
            "certificate",
            monthly_usd=49,
            length="About 6 months at 7 hours a week (Coursera's estimate)",
            modules=[
                "Foundations of Cybersecurity",
                "Play It Safe: Manage Security Risks",
                "Connect and Protect: Networks and Network Security",
                "Tools of the Trade: Linux and SQL",
                "Assets, Threats, and Vulnerabilities",
                "Sound the Alarm: Detection and Response",
                "Automate Cybersecurity Tasks with Python",
                "Put It to Work: Prepare for Cybersecurity Jobs",
            ],
            why="An entry path toward security analyst roles, with hands-on labs.",
        ),
        _c(
            "cs50-cyber",
            "CS50's Introduction to Cybersecurity",
            "Harvard (CS50)",
            "https://cs50.harvard.edu/cybersecurity/",
            "free",
            "course",
            length="5 weeks of material",
            modules=[
                "Securing Accounts",
                "Securing Data",
                "Securing Systems",
                "Securing Software",
                "Preserving Privacy",
            ],
            pace="weekly",
            why="Harvard's free security course, no programming needed.",
        ),
        _c(
            "messer-security-plus",
            "CompTIA Security+ SY0-701 training course",
            "Professor Messer",
            "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/",
            "free",
            "lectures",
            why="Free videos for Security+, the certification most entry security jobs list.",
        ),
        _c(
            "mit-6-858-videos",
            "MIT 6.858 Computer Systems Security (YouTube playlist)",
            "MIT OpenCourseWare",
            "https://www.youtube.com/playlist?list=PLUl4u3cNGP62K2DjQLRxDNRi0z2IRWnNh",
            "free",
            "lectures",
            why="MIT's graduate security lectures, for going deeper later.",
        ),
        # ---------- Project and product ----------
        _c(
            "google-project-management",
            "Google Project Management Professional Certificate",
            "Google on Coursera",
            "https://www.coursera.org/professional-certificates/google-project-management",
            "paid",
            "certificate",
            monthly_usd=49,
            length="About 6 months at 10 hours a week (Coursera's estimate)",
            modules=[
                "Foundations of Project Management",
                "Project Initiation: Starting a Successful Project",
                "Project Planning: Putting It All Together",
                "Project Execution: Running the Project",
                "Agile Project Management",
                "Capstone: Applying Project Management in the Real World",
            ],
            why="The most popular entry certificate for project coordinators; covers Agile too.",
        ),
        _c(
            "mit-1-040",
            "1.040 Project Management",
            "MIT OpenCourseWare",
            "https://ocw.mit.edu/courses/1-040-project-management-spring-2009/",
            "free",
            "course",
            why="MIT's project management course: planning, scheduling, cost and risk.",
        ),
        _c(
            "uva-product",
            "Digital Product Management Specialization",
            "University of Virginia (Darden) on Coursera",
            "https://www.coursera.org/specializations/uva-darden-digital-product-management",
            "paid",
            "certificate",
            monthly_usd=49,
            modules=[
                "Digital Product Management: Modern Fundamentals",
                "Agile Meets Design Thinking",
                "Hypothesis-Driven Development",
                "Product Analytics and AI",
                "Managing an Agile Team",
            ],
            why="A business school's take on product work: discovery, experiments and analytics.",
        ),
        _c(
            "ibm-product",
            "IBM Product Manager Professional Certificate",
            "IBM on Coursera",
            "https://www.coursera.org/professional-certificates/ibm-product-manager",
            "paid",
            "certificate",
            monthly_usd=49,
            length="About 3 months (Coursera's estimate)",
            modules=[
                "Product Management: An Introduction",
                "Product Management: Foundations & Stakeholder Collaboration",
                "Product Management: Initial Product Strategy and Plan",
                "Product Management: Developing and Delivering a New Product",
                "Introduction to Agile Development and Scrum",
                "Product Management: Capstone Project",
            ],
            why="Shorter, with a capstone and practice for the AIPMM exam.",
        ),
        _c(
            "mit-15-783",
            "15.783J Product Design and Development",
            "MIT OpenCourseWare",
            "https://ocw.mit.edu/courses/15-783j-product-design-and-development-spring-2006/",
            "free",
            "course",
            why="MIT Sloan's course on taking a product from need to launch.",
        ),
        # ---------- Business, marketing, sales ----------
        _c(
            "wharton-business-analytics",
            "Business Analytics Specialization",
            "Wharton (University of Pennsylvania) on Coursera",
            "https://www.coursera.org/specializations/business-analytics",
            "paid",
            "certificate",
            monthly_usd=49,
            modules=[
                "Customer Analytics",
                "Operations Analytics",
                "People Analytics",
                "Accounting Analytics",
                "Business Analytics Capstone",
            ],
            why="Wharton's analytics for business decisions, one course per business area.",
        ),
        _c(
            "google-digital-marketing",
            "Google Digital Marketing & E-commerce Professional Certificate",
            "Google on Coursera",
            "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce",
            "paid",
            "certificate",
            monthly_usd=49,
            length="About 6 months at 10 hours a week (Coursera's estimate)",
            modules=[
                "Foundations of Digital Marketing and E-commerce",
                "Attract and Engage Customers with Digital Marketing",
                "From Likes to Leads: Interact with Customers Online",
                "Think Outside the Inbox: Email Marketing",
                "Assess for Success: Marketing Analytics and Measurement",
                "Make the Sale: Build, Launch, and Manage E-commerce Stores",
                "Satisfaction Guaranteed: Develop Customer Loyalty Online",
            ],
            why="The best-known entry certificate for digital marketing roles.",
        ),
        _c(
            "hubspot-inbound-marketing",
            "Inbound Marketing course",
            "HubSpot Academy",
            "https://academy.hubspot.com/courses/inbound-marketing",
            "free",
            "course",
            why="A free marketing course with a free certificate, widely listed on CVs.",
        ),
        _c(
            "mit-15-810",
            "15.810 Marketing Management",
            "MIT OpenCourseWare",
            "https://ocw.mit.edu/courses/15-810-marketing-management-fall-2010/",
            "free",
            "course",
            why="MIT Sloan's core marketing course, with cases.",
        ),
        _c(
            "hubspot-content-marketing",
            "Content Marketing course",
            "HubSpot Academy",
            "https://academy.hubspot.com/courses/content-marketing",
            "free",
            "course",
            why="Free, with a free certificate: planning, writing and measuring content.",
        ),
        _c(
            "salesforce-sdr",
            "Salesforce Sales Development Representative Professional Certificate",
            "Salesforce on Coursera",
            "https://www.coursera.org/professional-certificates/sales-development-representative",
            "paid",
            "certificate",
            monthly_usd=49,
            length="About 3 months at 10 hours a week (Coursera's estimate)",
            modules=[
                "Groundwork for Success in Sales Development",
                "Foundations for Interviewing with Confidence",
                "Conversational Selling Playbook for SDRs",
                "Boosting Productivity through the Tech Stack",
                "Practical Guide to Navigating Professional Relationships",
            ],
            why="Built by Salesforce for first jobs in tech sales.",
        ),
        _c(
            "hubspot-inbound-sales",
            "Inbound Sales course",
            "HubSpot Academy",
            "https://academy.hubspot.com/courses/inbound-sales",
            "free",
            "course",
            why="Free, with a free certificate: prospecting, discovery calls and closing.",
        ),
        _c(
            "hubspot-customer-service",
            "Customer Service course",
            "HubSpot Academy",
            "https://academy.hubspot.com/courses/customer-service",
            "free",
            "course",
            why="Free: the customer-first habits that customer success roles are built on.",
        ),
        _c(
            "trailhead",
            "Trailhead",
            "Salesforce",
            "https://trailhead.salesforce.com/",
            "free",
            "course",
            why="Free hands-on Salesforce lessons; CRM skills appear in most sales and success job posts.",
        ),
        # ---------- People, learning, finance, writing ----------
        _c(
            "umn-hr",
            "Human Resource Management: HR for People Managers Specialization",
            "University of Minnesota on Coursera",
            "https://www.coursera.org/specializations/human-resource-management",
            "paid",
            "certificate",
            monthly_usd=49,
            length="About 2 months at 10 hours a week (Coursera's estimate)",
            modules=[
                "Preparing to Manage Human Resources",
                "Recruiting, Hiring, and Onboarding Employees",
                "Managing Employee Performance",
                "Managing Employee Compensation",
                "Human Resources Management Capstone: HR for People Managers",
            ],
            why="The HR basics in order, from hiring to pay.",
        ),
        _c(
            "wharton-people-analytics",
            "People Analytics",
            "Wharton (University of Pennsylvania) on Coursera",
            "https://www.coursera.org/learn/wharton-people-analytics",
            "paid",
            "course",
            monthly_usd=49,
            why="How HR teams use data for hiring, performance and retention.",
        ),
        _c(
            "mit-15-660",
            "15.660 Strategic HR Management",
            "MIT OpenCourseWare",
            "https://ocw.mit.edu/courses/15-660-strategic-hr-management-spring-2003/",
            "free",
            "course",
            why="MIT Sloan's course on how HR choices shape a company.",
        ),
        _c(
            "illinois-instructional-design",
            "Instructional Design Foundations and Applications",
            "University of Illinois on Coursera",
            "https://www.coursera.org/learn/instructional-design-foundations-applications",
            "paid",
            "course",
            monthly_usd=49,
            length="About 13 hours (Coursera's estimate)",
            modules=["Introduction to ISD", "Foundations and Tools of ISD", "Analysis Part 1", "Analysis Part 2"],
            pace="weekly",
            why="The ID basics, the process and the career paths, from a university program.",
        ),
        _c(
            "bates-digital-age",
            "Teaching in a Digital Age (open textbook)",
            "Tony Bates, BCcampus Open Textbook",
            "https://opentextbc.ca/teachinginadigitalage/",
            "free",
            "course",
            why="A free, widely used book on designing teaching and online learning.",
        ),
        _c(
            "learning-how-to-learn",
            "Learning How to Learn",
            "Deep Teaching Solutions on Coursera",
            "https://www.coursera.org/learn/learning-how-to-learn",
            "paid",
            "course",
            monthly_usd=49,
            why="One of the most-taken online courses: the science of studying well, useful for any switch.",
        ),
        _c(
            "wharton-financial-modeling",
            "Business and Financial Modeling Specialization",
            "Wharton (University of Pennsylvania) on Coursera",
            "https://www.coursera.org/specializations/wharton-business-financial-modeling",
            "paid",
            "certificate",
            monthly_usd=49,
            modules=[
                "Fundamentals of Quantitative Modeling",
                "Introduction to Spreadsheets and Models",
                "Modeling Risk and Realities",
                "Decision-Making and Scenarios",
                "Wharton Business and Financial Modeling Capstone",
            ],
            why="Spreadsheet models for real decisions, the daily work of financial analysts.",
        ),
        _c(
            "mit-15-401-videos",
            "MIT 15.401 Finance Theory I (YouTube playlist)",
            "MIT OpenCourseWare",
            "https://www.youtube.com/playlist?list=PLUl4u3cNGP63B2lDhyKOsImI7FjCf6eDW",
            "free",
            "lectures",
            why="Andrew Lo's MIT Sloan lectures on valuation, risk and portfolios.",
        ),
        _c(
            "mit-15-401",
            "15.401 Finance Theory I",
            "MIT OpenCourseWare",
            "https://ocw.mit.edu/courses/15-401-finance-theory-i-fall-2008/",
            "free",
            "course",
            why="The course page with notes and problem sets for the lectures.",
        ),
        _c(
            "yale-financial-markets",
            "ECON 252 Financial Markets",
            "Open Yale Courses",
            "https://oyc.yale.edu/economics/econ-252",
            "free",
            "lectures",
            why="Robert Shiller's Yale course on how markets and institutions work.",
        ),
        _c(
            "google-tech-writing",
            "Technical Writing courses",
            "Google for Developers",
            "https://developers.google.com/tech-writing",
            "free",
            "course",
            modules=[
                "Technical Writing One",
                "Technical Writing Two",
                "Tech Writing for Accessibility",
                "Writing Helpful Error Messages",
            ],
            pace="weekly",
            why="The courses Google uses to train its own engineers to write.",
        ),
        _c(
            "stanford-sciwrite",
            "Writing in the Sciences",
            "Stanford University on Coursera",
            "https://www.coursera.org/learn/sciwrite",
            "paid",
            "course",
            monthly_usd=49,
            why="Stanford's course on clear, tight writing; the editing skills carry over to any field.",
        ),
    ]
}


@dataclass(frozen=True)
class Field:
    id: str
    label: str
    keywords: tuple[str, ...]
    courses: tuple[str, ...]  # best first; the first one the user can take is the main course


# Order matters: the first field whose keyword appears in the role title wins.
FIELDS: tuple[Field, ...] = (
    Field(
        "health-data",
        "Health data and informatics",
        (
            "health data",
            "health informatics",
            "clinical informatics",
            "informatics",
            "health information",
            "medical records",
            "clinical data",
            "healthcare data",
            "health analyst",
        ),
        ("jhu-health-informatics", "cs50-sql", "google-data-analytics", "kaggle-sql", "cs50-sql-videos"),
    ),
    Field(
        "security",
        "Cybersecurity",
        ("security", "cyber", "soc analyst"),
        ("google-cybersecurity", "cs50-cyber", "messer-security-plus", "mit-6-858-videos"),
    ),
    Field(
        "qa",
        "Software testing (QA)",
        ("qa", "quality assurance", "tester", "test engineer", "testing", "test analyst"),
        ("umn-software-testing", "cs50x", "test-automation-university", "cs50-videos"),
    ),
    Field(
        "ux",
        "UX and product design",
        (
            "ux",
            "ui",
            "user experience",
            "user research",
            "product designer",
            "interaction design",
            "service designer",
            "design researcher",
            "usability",
        ),
        ("google-ux", "mit-6-831", "michigan-ux"),
    ),
    Field(
        "product",
        "Product management",
        ("product manager", "product owner", "product management", "product operations", "product lead"),
        ("uva-product", "mit-15-783", "ibm-product", "mit-analytics-edge"),
    ),
    Field(
        "web",
        "Web development",
        ("web", "front-end", "frontend", "front end"),
        ("meta-front-end", "cs50w", "odin-project", "freecodecamp"),
    ),
    Field(
        "software",
        "Software development",
        ("software", "developer", "programmer", "back-end", "backend", "full stack", "full-stack", "devops", "coding"),
        ("meta-back-end", "cs50x", "mit-6-0001", "mit-6-0001-videos", "cs50-videos"),
    ),
    Field(
        "it-support",
        "IT support",
        (
            "it support",
            "help desk",
            "helpdesk",
            "technical support",
            "desktop support",
            "it specialist",
            "it technician",
            "systems administrator",
            "support specialist",
            "support engineer",
        ),
        ("google-it-support", "cs50t", "messer-a-plus"),
    ),
    Field(
        "data",
        "Data analysis",
        ("data", "analytics", "business intelligence", "bi analyst", "reporting analyst", "insights", "statistic"),
        ("google-data-analytics", "cs50-sql", "kaggle-sql", "harvard-stat110", "mit-analytics-edge", "cs50-sql-videos"),
    ),
    Field(
        "project",
        "Project management",
        ("project", "program manager", "programme", "scrum", "delivery manager", "implementation", "pmo"),
        ("google-project-management", "mit-1-040", "learning-how-to-learn"),
    ),
    Field(
        "learning",
        "Instructional design and training",
        (
            "instructional",
            "learning",
            "training",
            "trainer",
            "curriculum",
            "enablement",
            "l&d",
            "e-learning",
            "elearning",
            "education program",
            "facilitator",
        ),
        ("illinois-instructional-design", "bates-digital-age", "learning-how-to-learn", "google-tech-writing"),
    ),
    Field(
        "hr",
        "HR and recruiting",
        ("hr", "human resources", "recruit", "talent", "people operations", "people partner", "people ops"),
        ("umn-hr", "mit-15-660", "wharton-people-analytics"),
    ),
    Field(
        "sales",
        "Sales and customer success",
        (
            "customer success",
            "account manager",
            "account executive",
            "sales",
            "business development",
            "client success",
            "customer experience",
            "partnership",
            "relationship manager",
            "customer support",
        ),
        ("salesforce-sdr", "hubspot-inbound-sales", "hubspot-customer-service", "trailhead"),
    ),
    Field(
        "marketing",
        "Marketing",
        (
            "marketing",
            "seo",
            "growth",
            "brand",
            "social media",
            "community manager",
            "communications",
            "public relations",
            "advertising",
        ),
        ("google-digital-marketing", "hubspot-inbound-marketing", "mit-15-810", "hubspot-content-marketing"),
    ),
    Field(
        "finance",
        "Finance",
        (
            "financial",
            "finance",
            "fp&a",
            "accountant",
            "accounting",
            "investment",
            "budget",
            "credit analyst",
            "risk analyst",
            "controller",
        ),
        ("wharton-financial-modeling", "mit-15-401-videos", "mit-15-401", "yale-financial-markets"),
    ),
    Field(
        "writing",
        "Technical writing",
        ("technical writer", "technical writing", "documentation", "docs writer"),
        ("google-tech-writing", "stanford-sciwrite"),
    ),
    Field(
        "content",
        "Writing and content",
        ("content", "copywriter", "writer", "editor", "copy editor"),
        ("google-digital-marketing", "hubspot-content-marketing", "google-tech-writing", "stanford-sciwrite"),
    ),
    Field(
        "business",
        "Business and operations analysis",
        ("business analyst", "operations", "process", "consultant", "strategy", "analyst"),
        ("wharton-business-analytics", "mit-analytics-edge", "google-data-analytics", "learning-how-to-learn"),
    ),
)
GENERAL = Field("general", "Any new field", (), ("learning-how-to-learn", "cs50t"))
_FIELD_BY_ID = {f.id: f for f in (*FIELDS, GENERAL)}


def _pattern(keyword: str) -> re.Pattern[str]:
    return re.compile(r"(?<![a-z0-9])" + re.escape(keyword) + r"(?![a-z0-9])")


_PATTERNS = [(f, [_pattern(k) for k in f.keywords]) for f in FIELDS]


def match_field(role: str) -> Field:
    """The field a role title belongs to; GENERAL when nothing matches."""
    title = clean(role, 120).lower()
    for field, patterns in _PATTERNS:
        if any(p.search(title) for p in patterns):
            return field
    return GENERAL


def field_by_id(field_id: str) -> Field | None:
    return _FIELD_BY_ID.get(field_id)


class StudyWeek(CamelModel):
    week: int
    modules: list[str]


class StudyPlan(CamelModel):
    field: str
    field_label: str
    matched: bool  # False: no catalog field fits this role, so web-found courses lead
    budget_usd: int  # the user's monthly learning budget in US dollars (approximate)
    main: Course
    weeks: list[StudyWeek]  # what of the main course goes into each roadmap week
    later: list[str]  # main-course modules left after the 30 days
    more: list[Course]  # other good options the user can take
    checked: str = CHECKED


COURSERA_MONTHLY_USD = 49


def affordable(course: Course, budget_usd: int) -> bool:
    """Free courses always; a paid one when the monthly budget covers its
    monthly price (Coursera's $49 when the price is unknown)."""
    if course.cost != "paid":
        return True
    return budget_usd > 0 and budget_usd >= (course.monthly_usd or COURSERA_MONTHLY_USD)


def month_modules(course: Course, hours_per_week: float) -> int:
    """How many modules fit in 30 days. A weekly lecture series moves one
    module a week; a certificate module takes weeks, so one a month, or two
    with 8 or more hours a week."""
    if not course.modules:
        return 0
    if course.pace == "weekly":
        return min(4, len(course.modules))
    return min(len(course.modules), 2 if hours_per_week >= 8 else 1)


def spread(modules: list[str], weeks: int = 4) -> list[list[str]]:
    """Modules over the weeks, in order, every week non-empty: with fewer
    modules than weeks a module runs over several weeks."""
    if not modules:
        return [[] for _ in range(weeks)]
    return [
        [modules[min(len(modules) - 1, w * len(modules) // weeks)]]
        if len(modules) <= weeks
        else modules[w * len(modules) // weeks : (w + 1) * len(modules) // weeks]
        for w in range(weeks)
    ]


def study_plan(role: str, budget_usd: int, hours_per_week: float, weeks: int = 4) -> StudyPlan:
    field = match_field(role)
    usable = [COURSES[c] for c in field.courses if affordable(COURSES[c], budget_usd)]
    if not usable:  # every field lists at least one free course; this is a guard
        usable = [COURSES[c] for c in GENERAL.courses]
    main = usable[0]
    n = month_modules(main, hours_per_week)
    month = main.modules[:n]
    return StudyPlan(
        field=field.id,
        field_label=field.label,
        matched=field is not GENERAL,
        budget_usd=max(0, budget_usd),
        main=main,
        weeks=[StudyWeek(week=i + 1, modules=m) for i, m in enumerate(spread(month, weeks))],
        later=main.modules[n:],
        more=usable[1:5],
    )


# ---------- Courses found on the web for one exact role ----------

# Where the AI may look: course platforms, universities and official
# training sites. Never a search page (domain/web.py drops those).
COURSE_DOMAINS = [
    "coursera.org",
    "edx.org",
    "ocw.mit.edu",
    "youtube.com",
    "khanacademy.org",
    "freecodecamp.org",
    "udemy.com",
    "linkedin.com",
    "futurelearn.com",
    "open.edu",
    "pll.harvard.edu",
    "online.stanford.edu",
    "learn.microsoft.com",
    "grow.google",
    "skillshop.withgoogle.com",
    "academy.hubspot.com",
    "trailhead.salesforce.com",
    "kaggle.com",
    "cs50.harvard.edu",
    "oyc.yale.edu",
    "mooc.fi",
    "alison.com",
    "udacity.com",
    "datacamp.com",
    "codecademy.com",
]
MAX_FOUND = 8


def pick_courses(found: list[Found], picks: list[CoursePickDraft], budget_usd: int) -> list[Course]:
    """The AI's picks among real search results, by number. Invented numbers
    are ignored; paid picks are dropped when the user has no budget."""
    out: list[Course] = []
    used: set[int] = set()
    for p in picks:
        if p.index in used or not 0 <= p.index < len(found):
            continue
        used.add(p.index)
        if not p.free and budget_usd <= 0:
            continue
        r = found[p.index]
        out.append(
            Course(
                id="web-" + slug(r.url)[:40],
                title=r.title,
                provider=host(r.url),
                url=r.url,
                cost="free" if p.free else "paid",
                format="lectures" if host(r.url).endswith("youtube.com") else "course",
                why=clean(p.why, 160),
                found=True,
            )
        )
        if len(out) == MAX_FOUND:
            break
    return out
