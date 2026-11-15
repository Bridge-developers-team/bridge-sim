// Input types: LinkedIn exports are recognised, profile links are validated.
import { test } from "node:test";
import assert from "node:assert/strict";
import { linkedinProfileUrl, looksLikeLinkedInPdf, resumeSource } from "../src/lib/source.ts";

const LINKEDIN_PDF = `Contact
www.linkedin.com/in/jane-doe-123 (LinkedIn)
Top Skills
Curriculum Development
Jane Doe
Middle School Teacher at Lincoln Middle School
Summary
I design lessons.
Experience
Lincoln Middle School
Teacher
August 2019 - Present (6 years 4 months)
Education
State University
Page 1 of 2`;

test("a LinkedIn Save-to-PDF export is recognised, a normal CV is not", () => {
  assert.ok(looksLikeLinkedInPdf(LINKEDIN_PDF));
  assert.ok(!looksLikeLinkedInPdf("Jane Doe\nExperience\nTeacher, 2019-now\nEducation\nB.A."));
  assert.ok(!looksLikeLinkedInPdf("Find me at linkedin.com/in/jane-doe. I taught for 7 years."));
});

test("the source follows the tab, and a CV upload that is a LinkedIn export counts as LinkedIn", () => {
  assert.equal(resumeSource("text", LINKEDIN_PDF), "text");
  assert.equal(resumeSource("cv", LINKEDIN_PDF), "linkedin");
  assert.equal(resumeSource("cv", "Teacher, 7 years"), "cv");
  assert.equal(resumeSource("linkedin", "anything"), "linkedin");
});

test("profile links are normalised; anything else is refused", () => {
  assert.equal(linkedinProfileUrl("linkedin.com/in/jane-doe-123"), "https://www.linkedin.com/in/jane-doe-123/");
  assert.equal(linkedinProfileUrl(" https://kz.linkedin.com/in/Jane_Doe/?trk=x "), "https://www.linkedin.com/in/Jane_Doe/");
  assert.equal(linkedinProfileUrl("https://www.linkedin.com/company/acme"), null);
  assert.equal(linkedinProfileUrl("https://evil.com/linkedin.com/in/jane"), null);
  assert.equal(linkedinProfileUrl("javascript:alert(1)//linkedin.com/in/jane"), null);
});
