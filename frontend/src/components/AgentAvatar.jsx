const STATUS_COPY = {
  idle: "Ready when you are",
  listening: "Listening...",
  thinking: "Thinking...",
  speaking: "Speaking...",
};

export default function AgentAvatar({ status }) {
  return (
    <div className="agent-avatar">
      <div className={`agent-avatar__ring agent-avatar__ring--${status}`}>
        <img src="/mia.jpg" alt="Mia, Aporum sales assistant" className="agent-avatar__img" />
      </div>
      <div className="agent-avatar__status">
        <span className={`agent-avatar__dot agent-avatar__dot--${status}`} />
        {STATUS_COPY[status] || STATUS_COPY.idle}
      </div>
      <div className="agent-avatar__name">Mia, your Aporum sales rep</div>
    </div>
  );
}
