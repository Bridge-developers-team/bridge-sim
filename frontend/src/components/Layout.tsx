import { Link, NavLink, Outlet } from "react-router";
import { useJourney } from "../state/journey";
import { BridgeMark } from "./Icons";
import { ThemeToggle } from "./ThemeToggle";

export function Layout() {
  const journey = useJourney();
  return (
    <>
      <header className="top">
        <div className="top__inner">
          <Link to="/" className="brand" aria-label="Bridge home">
            <BridgeMark />
            Bridge
          </Link>
          <nav className="nav" aria-label="Main">
            <NavLink to="/start">Start</NavLink>
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
