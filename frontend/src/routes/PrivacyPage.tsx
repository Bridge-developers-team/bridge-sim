import { Link } from "react-router";
import { Panel, PanelBody } from "../components/ui/Panel";

const UPDATED = "15 November 2026";
const REPO = "https://github.com/Bridge-developers-team/bridge-sim";

/** What Bridge does with your data, in plain words. Every statement here is
 * true of the code: change this page in the same pull request as any change
 * to what is stored, sent or logged. */
export function PrivacyPage() {
  return (
    <article className="privacy stack-lg">
      <header className="page-head">
        <h1>Privacy</h1>
        <p className="lead">
          Bridge has no accounts, no cookies and no analytics. Your CV is used for one request and never stored by
          us.
        </p>
        <p className="muted small">Last updated {UPDATED}</p>
      </header>

      <Panel>
        <PanelBody className="stack prose">
          <h2>In short</h2>
          <ul>
            <li>Your CV, LinkedIn PDF or own words are read in your browser and sent to our server only to suggest career paths. We do not save them.</li>
            <li>To write the suggestions, the text is sent to Anthropic’s Claude AI, which does not train on it.</li>
            <li>Your plan and progress are saved in your browser, not on our server.</li>
            <li>Income figures you type in the money check never leave your browser.</li>
            <li>Only a proof page you choose to publish is stored on our server, and you can delete it.</li>
          </ul>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelBody className="stack prose">
          <h2>What you give us and what happens to it</h2>

          <h3>Your experience (CV, LinkedIn PDF, or your own words)</h3>
          <p>
            Files are read in your browser; the file itself is never uploaded. The extracted text, with your form
            answers (current role, years of experience, reasons for changing, free hours, learning budget, city,
            country, roles you are curious about and pace), is sent to our server when you ask for career paths. The
            server passes it to the AI for that one request and does not write it to a database or a log. Later steps
            (your plan, practice tasks, job introductions) send your form answers and the chosen path, not your CV.
          </p>

          <h3>LinkedIn profile link</h3>
          <p>
            If you paste a public profile link and ask Bridge to read it, the link is sent to the AI, which tries to
            open that public page. Bridge does not store the link or the profile. Uploading LinkedIn’s own “Save to
            PDF” export instead keeps everything on the same path as a CV.
          </p>

          <h3>Practice answers</h3>
          <p>
            When you ask for feedback, your answer and the task are sent to the AI for grading. They are kept in your
            browser, and on our server only if you publish a proof page.
          </p>

          <h3>Money check</h3>
          <p>The figures you type in the money check are calculated in your browser and are never sent anywhere.</p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelBody className="stack prose">
          <h2>What is stored, and where</h2>
          <h3>In your browser</h3>
          <p>
            Your form answers (without income), the career paths, the chosen plan and its ticks, practice work, job
            introductions and your study schedule are saved in your browser’s local storage under{" "}
            <code>bridge-journey</code>, and your light or dark choice under <code>bridge-theme</code>. They stay on
            this device. “Delete my data from this browser” on the plan page, or clearing this site’s data in your
            browser, removes them.
          </p>

          <h3>On our server</h3>
          <ul>
            <li>
              <strong>Published proof pages.</strong> If you publish one, we store the name you chose to show (optional),
              your reflection, the practice task, your answer and its scores. Anyone with the link can see it. It stays
              until you delete it with “Delete page”; the key that allows deletion is kept in your browser.
            </li>
            <li>
              <strong>Pay look-ups.</strong> Typical pay found on the web is cached for 30 days, keyed only by job
              title, country and city. Nothing about you is stored with it.
            </li>
            <li>
              <strong>Reference data.</strong> Countries, cities, job titles and courses. Not personal data.
            </li>
          </ul>
          <p>The database is hosted by Neon in Frankfurt, Germany.</p>

          <h3>Technical data</h3>
          <p>
            To keep the free demo fair, the server counts requests per IP address in memory for up to an hour to apply
            rate limits; these counts are never written to disk. Our hosting provider keeps standard request logs (IP
            address, time, page requested) for operating and securing the service.
          </p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelBody className="stack prose">
          <h2>Who else processes data</h2>
          <ul>
            <li>
              <strong>Anthropic (Claude AI)</strong> writes the career paths, plans, practice tasks, feedback and job
              introductions, and searches the web for pay and courses. Under Anthropic’s commercial terms it does not
              train its models on this data, and it deletes API inputs and outputs within 30 days unless longer
              retention is needed for safety or legal reasons (
              <a href="https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-personal-data" target="_blank" rel="noopener noreferrer">
                Anthropic’s data retention
              </a>
              ).
            </li>
            <li>
              <strong>Render</strong> hosts the app (Frankfurt region), behind Cloudflare’s network.
            </li>
            <li>
              <strong>Neon</strong> hosts the database (Frankfurt).
            </li>
            <li>
              <strong>YouTube Data API and Adzuna</strong> (videos and job listings) receive only search phrases, job
              titles and places from our server, never your name or CV. An exchange-rate service is asked for the
              day’s rates, with nothing about you.
            </li>
          </ul>
          <p>
            Links to LinkedIn, Indeed, hh.kz, Reddit, YouTube and course providers open those sites, whose own privacy
            policies apply. Bridge does not track what you do there.
          </p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelBody className="stack prose">
          <h2>Your choices</h2>
          <ul>
            <li>
              Try Bridge without your CV: “Try the demo” uses labeled sample data and makes no AI call, and the sample
              CVs on the start page describe fictional people.
            </li>
            <li>Delete everything in your browser at any time from the plan page, or by clearing this site’s data.</li>
            <li>Delete a published proof page from the page where you published it.</li>
            <li>
              If you lost the key for a proof page, or have any question about your data, open an issue at{" "}
              <a href={`${REPO}/issues`} target="_blank" rel="noopener noreferrer">
                our GitHub repository
              </a>{" "}
              with the page link (not your CV).
            </li>
          </ul>
          <p>
            Bridge is a prototype built for the Business Cup 2.0 hackathon. It is meant for adults, not for anyone
            under 16. Its suggestions are informational and are not career, financial or legal advice.
          </p>
          <p>
            <Link to="/">Back to Bridge</Link>
          </p>
        </PanelBody>
      </Panel>
    </article>
  );
}
