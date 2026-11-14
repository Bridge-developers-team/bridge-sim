import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="stack">
      <h1>Page not found</h1>
      <Link className="btn btn--primary" to="/">
        Go home
      </Link>
    </div>
  );
}
