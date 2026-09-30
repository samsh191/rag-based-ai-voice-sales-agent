import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__row">
        <div>
          <div className="site-header__mark" style={{ color: "var(--porcelain)" }}>
            <span className="site-header__pulse" aria-hidden="true" />
            Aporum
          </div>
          <p style={{ maxWidth: 320, marginTop: 10 }}>
            Home internet that shows up on time and tells you the truth about your speed.
          </p>
        </div>
        <div className="site-footer__cols">
          <div>
            <h3 className="site-footer__heading">Company</h3>
            <p>Coverage map</p>
            <p>Support</p>
            <p>Careers</p>
          </div>
          <div>
            <h3 className="site-footer__heading">Legal</h3>
            <p>Terms</p>
            <p>Privacy</p>
            <p>Network management</p>
          </div>
        </div>
      </div>
      <div className="container site-footer__bottom">
        <p>© {new Date().getFullYear()} Aporum Internet. Built for the neighborhood, not the boardroom.</p>
        <Link to="/admin" className="site-footer__admin">
          Admin
        </Link>
      </div>
    </footer>
  );
}
