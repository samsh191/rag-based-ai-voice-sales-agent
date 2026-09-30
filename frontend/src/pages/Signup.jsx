import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import SignupWizard from "../components/SignupWizard.jsx";
import "../styles/signup.css";

export default function Signup() {
  return (
    <div>
      <Header />
      <section className="signup-page">
        <div className="container signup-page__container">
          <div className="signup-page__intro">
            <h1>Get Aporum in a few minutes.</h1>
            <p>No account needed, no payment info required for this demo. Just your address, a plan, and how to reach you.</p>
          </div>
          <SignupWizard mode="standalone" />
        </div>
      </section>
      <Footer />
    </div>
  );
}
