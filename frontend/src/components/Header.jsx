import { Link } from "react-router-dom";

export default function Header({ dark = false }) {
  return (
    <header className={`site-header ${dark ? "site-header--dark" : ""}`}>
      <div className="container site-header__row">
        <Link to="/" className="site-header__mark">
          <span className="site-header__pulse" aria-hidden="true" />
          Aporum
        </Link>
        <nav className="site-header__nav">
          <a href="/#plans">Plans</a>
          <a href="/#faq">Questions</a>
          <Link to="/signup">Sign up</Link>
        </nav>
        <Link to="/talk-to-sales" className="btn btn--amber site-header__cta">
          Talk to Sales Now
        </Link>
      </div>
    </header>
  );
}
