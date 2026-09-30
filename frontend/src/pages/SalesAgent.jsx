import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AgentAvatar from "../components/AgentAvatar.jsx";
import Transcript from "../components/Transcript.jsx";
import SignupWizard from "../components/SignupWizard.jsx";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";
import { sendChatMessage } from "../api/chatApi.js";
import "../styles/agent.css";
import "../styles/signup.css";

function makeSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function SalesAgent() {
  const sessionId = useRef(makeSessionId());
  const messagesRef = useRef([]);
  const greetedRef = useRef(false);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("thinking"); // idle | listening | thinking | speaking
  const [uiAction, setUiAction] = useState(null);
  const [error, setError] = useState("");

  const { speak, cancel: cancelSpeech } = useSpeechSynthesis();
  const signupOpen = !!uiAction?.step;

  const pushMessage = (role, content) => {
    const next = [...messagesRef.current, { role, content }];
    messagesRef.current = next;
    setMessages(next);
  };

  const runTurn = async (userText, { hidden = false, openSignup = false } = {}) => {
    if (!hidden) pushMessage("user", userText);
    setStatus("thinking");
    setError("");
    try {
      const history = hidden ? messagesRef.current : messagesRef.current.slice(0, -1);
      const { reply, ui_action } = await sendChatMessage(sessionId.current, history, userText, { openSignup });
      pushMessage("assistant", reply);
      if (ui_action) setUiAction(ui_action);
      setStatus("speaking");
      speak(reply, { onEnd: () => setStatus("idle") });
    } catch (e) {
      setError("Mia couldn't reach the server. Check that the backend API is running.");
      setStatus("idle");
    }
  };

  const { isSupported, listening, interimText, start, stop } = useSpeechRecognition({
    onFinalResult: (text) => {
      stop();
      // The Web Speech API occasionally fires a "final" result that's empty or just noise
      // (e.g. background sound briefly recognized then corrected). Sending that on would give
      // Mia nothing real to respond to, which looks like she "didn't understand" - so just
      // drop it and go back to idle instead of starting a turn with a blank message.
      if (!text || !text.trim()) {
        setStatus("idle");
        return;
      }
      runTurn(text);
    },
  });

  useEffect(() => {
    // Guard against React 18 StrictMode's dev-only double effect invocation, which would
    // otherwise fire this greeting twice and show two slightly different replies on screen.
    if (greetedRef.current) return;
    greetedRef.current = true;
    runTurn("The customer just opened the call. Greet them and ask what brings them in today.", {
      hidden: true,
    });
    return () => cancelSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSpeakNow = () => {
    if (status === "speaking") {
      cancelSpeech();
      setStatus("idle");
      return;
    }
    if (listening) {
      stop();
      setStatus("idle");
      return;
    }
    setStatus("listening");
    start();
  };

  const handleSignupSubmitted = (payload) => {
    // Let Mia know the customer finished the form so she can wrap up naturally.
    runTurn(
      `The customer just submitted the sign-up form themselves: ${payload.first_name} ${payload.last_name}, ` +
        `plan ${payload.plan}, address ${payload.address}. Congratulate them briefly and let them know what happens next, then log a conversation summary.`,
      { hidden: true }
    );
  };

  const handleSignUpClick = () => {
    // Open the wizard immediately for a snappy feel; openSignup:true makes the backend mark
    // the session as started deterministically, before the model even sees the message, so
    // this doesn't depend on the model choosing to call a tool.
    setUiAction((prev) => prev || { step: "address" });
    runTurn(
      "The customer just clicked the Sign Up button on their screen. The sign-up form is now open " +
        "on their address step. Continue guiding them from here, starting with their service address.",
      { hidden: true, openSignup: true }
    );
  };

  const micLabel =
    status === "listening" ? "Stop" : status === "speaking" ? "Interrupt" : status === "thinking" ? "One sec..." : "Speak Now";

  return (
    <div className="agent-page">
      <header className="agent-page__header">
        <Link to="/" className="agent-page__back">
          ← Aporum
        </Link>
        <span className="agent-page__title">Talk to Sales</span>
        <Link to="/" className="agent-page__end">
          End call
        </Link>
      </header>

      <main className={`agent-page__main ${signupOpen ? "agent-page__main--split" : ""}`}>
        {signupOpen && (
          <div className="agent-page__form-panel">
            <SignupWizard
              mode="embedded"
              activeStepOverride={uiAction?.step}
              prefill={uiAction}
              sessionId={sessionId.current}
              onSubmitted={handleSignupSubmitted}
            />
          </div>
        )}

        <div className="agent-page__chat-panel">
          <AgentAvatar status={status === "listening" ? "listening" : status} />

          <button
            className={`speak-btn speak-btn--${status}`}
            onClick={handleSpeakNow}
            disabled={status === "thinking" || !isSupported}
          >
            <span className="speak-btn__icon" aria-hidden="true" />
            {micLabel}
          </button>

          {!isSupported && (
            <p className="agent-page__warning">
              Your browser doesn't support voice input. Try Chrome, Edge, or Safari, or type below.
            </p>
          )}
          {error && <p className="agent-page__warning">{error}</p>}

          {!signupOpen && (
            <button type="button" className="signup-cta-btn" onClick={handleSignUpClick}>
              Sign Up
            </button>
          )}

          <Transcript messages={messages} interimText={interimText} />

          <TypeFallback onSend={(text) => runTurn(text)} disabled={status === "thinking"} />
        </div>
      </main>
    </div>
  );
}

function TypeFallback({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };
  return (
    <form className="type-fallback" onSubmit={submit}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Or type a message to Mia"
        disabled={disabled}
      />
      <button type="submit" disabled={disabled}>
        Send
      </button>
    </form>
  );
}
