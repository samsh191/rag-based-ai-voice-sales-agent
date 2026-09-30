import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { PLANS } from "../data/plans.js";
import { submitSignup } from "../api/signupApi.js";

const STEP_DEFS = [
  { key: "address", label: "Service address", field: "address", placeholder: "123 Main St, Springfield" },
  { key: "plan", label: "Choose your plan" },
  { key: "first_name", label: "First name", field: "first_name", placeholder: "Jordan" },
  { key: "last_name", label: "Last name", field: "last_name", placeholder: "Rivera" },
  { key: "phone", label: "Phone number", field: "phone", placeholder: "(555) 010-2837", type: "tel" },
  { key: "email", label: "Email address", field: "email", placeholder: "you@example.com", type: "email" },
  { key: "confirmation", label: "Review & submit" },
];

function makeSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function SignupWizard({
  mode = "standalone",
  activeStepOverride = null,
  prefill = null,
  onSubmitted = null,
  sessionId: externalSessionId = null,
}) {
  const [searchParams] = useSearchParams();
  const sessionId = useMemo(() => externalSessionId || makeSessionId(), [externalSessionId]);
  const compact = mode === "embedded";

  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState({
    address: "",
    plan: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    install_preference: "self-install",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [preferredPlan, setPreferredPlan] = useState(null);

  // Standalone: honor ?plan=Name from the homepage plan table as a preselection hint.
  useEffect(() => {
    if (mode !== "standalone") return;
    const p = searchParams.get("plan");
    if (p) setPreferredPlan(p);
  }, [mode, searchParams]);

  // Embedded: the AI agent drives which step is showing.
  useEffect(() => {
    if (!activeStepOverride) return;
    const idx = STEP_DEFS.findIndex((s) => s.key === activeStepOverride);
    if (idx !== -1) setStepIndex(idx);
  }, [activeStepOverride]);

  // Embedded: fold in details the AI has learned, without clobbering what the customer already typed.
  useEffect(() => {
    if (!prefill) return;
    setFormData((prev) => {
      const next = { ...prev };
      ["address", "plan", "first_name", "last_name", "phone", "email"].forEach((k) => {
        if (prefill[k] && !prev[k]) next[k] = prefill[k];
      });
      return next;
    });
  }, [prefill]);

  const step = STEP_DEFS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = step.key === "confirmation";

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const canContinue = () => {
    if (step.key === "plan") return !!formData.plan;
    if (step.field) return formData[step.field]?.trim().length > 0;
    return true;
  };

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEP_DEFS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = { session_id: sessionId, ...formData };
      await submitSignup(payload);
      setSubmitted(true);
      onSubmitted?.(payload);
    } catch (e) {
      setSubmitError("Something went wrong saving your sign-up. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`signup-wizard ${compact ? "signup-wizard--compact" : ""}`}>
        <div className="signup-wizard__success">
          <div className="signup-wizard__success-badge">✓</div>
          <h2>You're all set, {formData.first_name || "there"}.</h2>
          <p>
            Demo only — no payment information was required to complete this sign-up. In a live
            system this is where you'd get an installation date by email.
          </p>
          <div className="signup-summary">
            <SummaryRow label="Address" value={formData.address} />
            <SummaryRow label="Plan" value={formData.plan} />
            <SummaryRow label="Name" value={`${formData.first_name} ${formData.last_name}`} />
            <SummaryRow label="Phone" value={formData.phone} />
            <SummaryRow label="Email" value={formData.email} />
          </div>
          {mode === "standalone" && (
            <Link to="/" className="btn btn--amber" style={{ marginTop: 18 }}>
              Back to Aporum
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`signup-wizard ${compact ? "signup-wizard--compact" : ""}`}>
      <SignupProgress steps={STEP_DEFS} activeIndex={stepIndex} compact={compact} />

      <div className="signup-wizard__body">
        {step.key === "plan" ? (
          <PlanStep formData={formData} updateField={updateField} preferredPlan={preferredPlan} compact={compact} />
        ) : step.key === "confirmation" ? (
          <ConfirmationStep formData={formData} updateField={updateField} />
        ) : (
          <TextStep step={step} value={formData[step.field]} onChange={(v) => updateField(step.field, v)} />
        )}
      </div>

      {submitError && <p className="signup-wizard__error">{submitError}</p>}

      <div className="signup-wizard__actions">
        {!isFirst && (
          <button type="button" className="btn btn--ghost" onClick={goBack} disabled={submitting}>
            Back
          </button>
        )}
        {!isLast ? (
          <button type="button" className="btn btn--dark" onClick={goNext} disabled={!canContinue()}>
            Continue
          </button>
        ) : (
          <button type="button" className="btn btn--amber" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
    </div>
  );
}

function SignupProgress({ steps, activeIndex, compact }) {
  if (compact) {
    return (
      <div className="signup-progress signup-progress--compact">
        <div
          className="signup-progress__bar"
          style={{ width: `${((activeIndex + 1) / steps.length) * 100}%` }}
        />
        <span className="signup-progress__label">
          Step {activeIndex + 1} of {steps.length}: {steps[activeIndex].label}
        </span>
      </div>
    );
  }
  return (
    <div className="signup-progress">
      {steps.map((s, i) => (
        <div key={s.key} className={`signup-progress__dot ${i <= activeIndex ? "is-active" : ""}`} />
      ))}
    </div>
  );
}

function TextStep({ step, value, onChange }) {
  return (
    <div className="signup-field">
      <label htmlFor={step.key}>{step.label}</label>
      <input
        id={step.key}
        type={step.type || "text"}
        value={value || ""}
        placeholder={step.placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
    </div>
  );
}

function PlanStep({ formData, updateField, preferredPlan, compact }) {
  const samePlan = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
  return (
    <div className="signup-field">
      <label>Choose your plan</label>
      <div className={`plan-picker ${compact ? "plan-picker--compact" : ""}`}>
        {PLANS.map((p) => (
          <button
            type="button"
            key={p.id}
            className={`plan-picker__card ${samePlan(formData.plan, p.name) ? "is-selected" : ""} ${
              samePlan(preferredPlan, p.name) ? "is-suggested" : ""
            }`}
            onClick={() => updateField("plan", p.name)}
          >
            <div className="plan-picker__name">{p.name}</div>
            <div className="plan-picker__price">{p.price}/mo</div>
            <div className="plan-picker__speed">
              {p.speed} down / {p.upload} up
            </div>
            {samePlan(preferredPlan, p.name) && !samePlan(formData.plan, p.name) && (
              <div className="plan-picker__tag">Suggested</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfirmationStep({ formData, updateField }) {
  return (
    <div className="signup-field">
      <label>Review your order</label>
      <div className="signup-summary">
        <SummaryRow label="Address" value={formData.address} />
        <SummaryRow label="Plan" value={formData.plan} />
        <SummaryRow label="Name" value={`${formData.first_name} ${formData.last_name}`} />
        <SummaryRow label="Phone" value={formData.phone} />
        <SummaryRow label="Email" value={formData.email} />
      </div>

      <div className="signup-field" style={{ marginTop: 16 }}>
        <label htmlFor="install-pref">Installation</label>
        <select
          id="install-pref"
          value={formData.install_preference}
          onChange={(e) => updateField("install_preference", e.target.value)}
        >
          <option value="self-install">Self-install with the Aporum app (~15 min)</option>
          <option value="professional-install">Professional installation ($49, waived this month)</option>
        </select>
      </div>

      <p className="signup-wizard__disclaimer">Demo only — no payment information is required.</p>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="signup-summary__row">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}
