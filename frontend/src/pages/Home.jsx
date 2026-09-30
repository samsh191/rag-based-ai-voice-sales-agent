import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { PLANS } from "../data/plans.js";
import "../styles/home.css";

const FAQS = [
  {
    q: "Do I need to sign a contract?",
    a: "No. Every Aporum plan is month-to-month, and you can upgrade, downgrade, or cancel from your account anytime.",
  },
  {
    q: "How fast can I get installed?",
    a: "Most homes self-install in under 15 minutes with the Aporum app. If you'd rather have a technician come out, that's usually a 3-5 day wait.",
  },
  {
    q: "What if I'm already with another provider?",
    a: "Sign up with Aporum first, we'll get your line active, then cancel your old provider once the new connection is confirmed working.",
  },
];

export default function Home() {
  return (
    <div>
      <Header />

      <section className="hero">
        <div className="container hero__row">
          <div className="hero__copy">
            <h1 className="hero__title">
              Internet that actually
              <br />
              answers the phone.
            </h1>
            <p className="hero__sub">
              Aporum runs fiber-backed internet to your door with no data caps, no contracts, and
              a sales team you can talk to in seconds, not a phone tree.
            </p>
            <div className="hero__actions">
              <Link to="/talk-to-sales" className="btn btn--amber btn--lg">
                Talk to Sales Now
              </Link>
              <a href="#plans" className="btn btn--ghost btn--lg">
                See plans
              </a>
            </div>
            <div className="hero__stat-row">
              <div>
                <div className="hero__stat-num">99.9%</div>
                <div className="hero__stat-label">average network uptime</div>
              </div>
              <div>
                <div className="hero__stat-num">15 min</div>
                <div className="hero__stat-label">typical self-install time</div>
              </div>
              <div>
                <div className="hero__stat-num">0</div>
                <div className="hero__stat-label">contracts required</div>
              </div>
            </div>
          </div>

          <div className="hero__visual" aria-hidden="true">
            <svg viewBox="0 0 360 360" className="signal-svg">
              <circle cx="180" cy="180" r="150" className="signal-ring signal-ring--1" />
              <circle cx="180" cy="180" r="112" className="signal-ring signal-ring--2" />
              <circle cx="180" cy="180" r="74" className="signal-ring signal-ring--3" />
              <circle cx="180" cy="180" r="10" className="signal-core" />
            </svg>
            <div className="signal-badge">
              <span className="signal-dot" />
              Aporum network: online
            </div>
          </div>
        </div>
      </section>

      <section id="plans" className="plans">
        <div className="container">
          <h2 className="section-title">Four plans. Pick by what you actually do online.</h2>
          <p className="section-sub">
            Every plan includes the router, no data caps, and the current promotion below.
          </p>

          <div className="plan-table" role="table">
            <div className="plan-table__row plan-table__row--head" role="row">
              <div className="plan-table__cell plan-table__cell--label" role="columnheader" />
              {PLANS.map((p) => (
                <div
                  key={p.name}
                  role="columnheader"
                  className={`plan-table__cell plan-table__cell--head ${p.recommended ? "is-recommended" : ""}`}
                >
                  {p.recommended && <span className="plan-badge">Most chosen</span>}
                  <div className="plan-table__name">{p.name}</div>
                  <div className="plan-table__price">
                    {p.price}
                    <span>/mo</span>
                  </div>
                </div>
              ))}
            </div>

            {[
              { label: "Download speed", key: "speed" },
              { label: "Upload speed", key: "upload" },
              { label: "Best for", key: "fit" },
            ].map((row) => (
              <div className="plan-table__row" role="row" key={row.key}>
                <div className="plan-table__cell plan-table__cell--label" role="rowheader">
                  {row.label}
                </div>
                {PLANS.map((p) => (
                  <div
                    key={p.name + row.key}
                    role="cell"
                    className={`plan-table__cell ${p.recommended ? "is-recommended" : ""}`}
                  >
                    {p[row.key]}
                  </div>
                ))}
              </div>
            ))}

            <div className="plan-table__row plan-table__row--foot" role="row">
              <div className="plan-table__cell plan-table__cell--label" />
              {PLANS.map((p) => (
                <div key={p.name + "cta"} className={`plan-table__cell ${p.recommended ? "is-recommended" : ""}`}>
                  <Link to={`/signup?plan=${encodeURIComponent(p.name)}`} className="btn btn--dark btn--block">
                    Get {p.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="promo-strip">
            <strong>Current promotion:</strong> 50% off your first 2 months and free installation
            when you sign up online this month.
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container features__grid">
          <div className="feature">
            <h3>Talk to a rep in seconds</h3>
            <p>
              Skip the phone tree. Click Talk to Sales Now and you're speaking with Mia, our sales
              assistant, immediately, on any device.
            </p>
          </div>
          <div className="feature">
            <h3>No surprise fees</h3>
            <p>
              The price you're quoted on the call is the price on your first bill. Installation is
              free during the current promotion, otherwise it's a flat $49.
            </p>
          </div>
          <div className="feature">
            <h3>Switch without downtime</h3>
            <p>
              We activate your Aporum line before you cancel your old provider, so your home is
              never without internet during the switch.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="faq">
        <div className="container">
          <h2 className="section-title">Questions people usually ask Mia</h2>
          <div className="faq__list">
            {FAQS.map((f) => (
              <div className="faq__item" key={f.q}>
                <h3 className="faq__q">{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
          <Link to="/talk-to-sales" className="btn btn--amber" style={{ marginTop: 28 }}>
            Ask Mia something else
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
