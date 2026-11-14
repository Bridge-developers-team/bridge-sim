import { Link, NavLink, Outlet } from "react-router";
import { useJourney } from "../state/journey";
import { ThemeToggle } from "./ThemeToggle";

export function Layout() {
  const journey = useJourney();
  return (
    <>
      <header className="top glass">
        <div className="top__inner">
          <Link to="/" className="brand">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M6 21c3-7 7-10 10-10s7 3 10 10M6 21h20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
            Bridge
          </Link>
          <nav className="nav" aria-label="Main">
            {journey.careers && <NavLink to="/paths">Paths</NavLink>}
            {journey.roadmap && <NavLink to="/plan">Plan</NavLink>}
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
      <footer className="foot">
        <p>
          AI suggestions are informational and can be wrong. Not career, financial or legal advice, and no guarantee of
          a job or income. Your resume is sent to the AI only to suggest paths; Bridge does not store it.
        </p>
      </footer>
    </>
  );
}
