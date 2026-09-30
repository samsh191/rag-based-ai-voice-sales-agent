import { useEffect, useRef } from "react";

export default function Transcript({ messages, interimText }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, interimText]);

  return (
    <div className="transcript">
      {messages.length === 0 && !interimText && (
        <p className="transcript__empty">Your conversation with Mia will show up here.</p>
      )}
      {messages.map((m, i) => (
        <div key={i} className={`transcript__row transcript__row--${m.role}`}>
          <span className="transcript__label">{m.role === "user" ? "You" : "Mia"}</span>
          <p className="transcript__text">{m.content}</p>
        </div>
      ))}
      {interimText && (
        <div className="transcript__row transcript__row--user transcript__row--interim">
          <span className="transcript__label">You</span>
          <p className="transcript__text">{interimText}</p>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
