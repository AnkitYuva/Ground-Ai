import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileVideo,
  Gauge,
  Headphones,
  Info,
  Link2,
  Mic,
  PhoneCall,
  PhoneOff,
  Send,
  ShieldAlert,
  Sparkles,
  UsersRound,
  XCircle
} from "lucide-react";
import { analyzeCall } from "./agentEngine";
import { calls, quickReplies } from "./data";
import type { TranscriptLine } from "./types";
import { callPhoneNumber, hangUp, setupVoiceDevice, type VoiceStatus } from "./voiceClient";

type SetupStatus = {
  api: boolean;
  browserCallingReady: boolean;
  humanCallingReady: boolean;
  aiCallingReady: boolean;
  publicWebhookReady: boolean;
  missing: string[];
};

type CallLog = {
  kind: "Human" | "AI" | "System";
  status: string;
  detail: string;
  time: string;
};

const now = () =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());

const normalizePhone = (value: string) => value.trim().replace(/[^\d+]/g, "");
const isE164 = (value: string) => /^\+[1-9]\d{7,14}$/.test(normalizePhone(value));

export default function App() {
  const [selectedId, setSelectedId] = useState(calls[0].id);
  const [draft, setDraft] = useState("");
  const [dialNumber, setDialNumber] = useState("");
  const [aiDialNumber, setAiDialNumber] = useState("");
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [voiceDetail, setVoiceDetail] = useState("Run the API server, fill .env, then initialize the softphone.");
  const [isListening, setIsListening] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [callLog, setCallLog] = useState<CallLog[]>([
    { kind: "System", status: "Ready", detail: "Open setup, verify credentials, then record a real call.", time: now() }
  ]);
  const selectedCall = calls.find((call) => call.id === selectedId) ?? calls[0];
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptLine[]>>(
    Object.fromEntries(calls.map((call) => [call.id, call.transcript]))
  );
  const transcript = transcripts[selectedCall.id] ?? selectedCall.transcript;
  const analysis = useMemo(() => analyzeCall(selectedCall, transcript), [selectedCall, transcript]);
  const humanTarget = dialNumber || selectedCall.phone;
  const aiTarget = aiDialNumber || selectedCall.phone;
  const humanNumberValid = isE164(humanTarget);
  const aiNumberValid = isE164(aiTarget);

  useEffect(() => {
    refreshSetupStatus();
  }, []);

  const refreshSetupStatus = async () => {
    try {
      const response = await fetch("/api/setup/status");
      if (!response.ok) throw new Error("API server did not return setup status");
      setSetupStatus(await response.json());
    } catch {
      setSetupStatus({
        api: false,
        browserCallingReady: false,
        humanCallingReady: false,
        aiCallingReady: false,
        publicWebhookReady: false,
        missing: ["API server offline"]
      });
    }
  };

  const addLog = (entry: Omit<CallLog, "time">) => {
    setCallLog((current) => [{ ...entry, time: now() }, ...current].slice(0, 5));
  };

  const addLine = (speaker: TranscriptLine["speaker"], text: string) => {
    if (!text.trim()) return;
    setTranscripts((current) => ({
      ...current,
      [selectedCall.id]: [...(current[selectedCall.id] ?? []), { speaker, text: text.trim(), time: now() }]
    }));
    setDraft("");
  };

  const simulateVoice = () => {
    setIsListening(true);
    window.setTimeout(() => {
      addLine("Customer", "This is urgent. I need a clear update and a reliable technician before evening.");
      setIsListening(false);
    }, 900);
  };

  const updateVoiceStatus = (status: VoiceStatus, detail?: string) => {
    setVoiceStatus(status);
    if (detail) {
      setVoiceDetail(detail);
      addLog({ kind: "System", status, detail });
    }
  };

  const startHumanCall = async () => {
    if (!humanNumberValid) {
      updateVoiceStatus("error", "Enter a real E.164 number, for example +919876543210.");
      return;
    }

    try {
      await callPhoneNumber(normalizePhone(humanTarget), updateVoiceStatus);
      addLog({ kind: "Human", status: "Dialing", detail: `Browser agent calling ${normalizePhone(humanTarget)}` });
    } catch (error) {
      updateVoiceStatus("error", error instanceof Error ? error.message : "Calling failed");
    }
  };

  const startAiCall = async () => {
    if (!aiNumberValid) {
      updateVoiceStatus("error", "Enter a real E.164 number for the AI call.");
      return;
    }

    try {
      updateVoiceStatus("calling", "Starting AI-to-human outbound call");
      const response = await fetch("/api/calls/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: normalizePhone(aiTarget),
          customerName: selectedCall.customer,
          context: analysis.summary
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "AI call failed");
      updateVoiceStatus("connected", `AI call queued: ${result.callSid}`);
      addLog({ kind: "AI", status: "Queued", detail: `AI assistant calling ${normalizePhone(aiTarget)}` });
    } catch (error) {
      updateVoiceStatus("error", error instanceof Error ? error.message : "AI call failed");
    }
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Call queue">
        <div className="brand">
          <div className="brand-mark">
            <Headphones size={22} />
          </div>
          <div>
            <strong>on-ground.ai</strong>
            <span>VoiceOps command desk</span>
          </div>
        </div>

        <section className="operator-card">
          <div>
            <span>Workspace</span>
            <strong>Agentic Calling OS</strong>
          </div>
          <small>Live demo</small>
        </section>

        <section className="queue-summary">
          <div>
            <span>Queue</span>
            <strong>{calls.length}</strong>
          </div>
          <div>
            <span>At risk</span>
            <strong>1</strong>
          </div>
        </section>

        <div className="queue-list">
          {calls.map((call) => (
            <button
              className={`queue-item ${call.id === selectedId ? "active" : ""}`}
              key={call.id}
              onClick={() => setSelectedId(call.id)}
            >
              <span className={`priority ${call.priority.toLowerCase()}`}>{call.priority}</span>
              <strong>{call.customer}</strong>
              <small>{call.reason}</small>
              <span className="queue-meta">
                <Clock size={14} /> waiting {call.wait}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Live floor signal</p>
            <h1>{selectedCall.customer}</h1>
            <span className="subtle-line">
              {selectedCall.reason} · {selectedCall.location}
            </span>
          </div>
          <div className="call-actions">
            <button
              className="icon-button"
              title="Add sample urgent transcript line"
              aria-label="Add sample urgent transcript line"
              onClick={simulateVoice}
            >
              <Mic size={18} />
            </button>
            <button
              className="primary-button"
              onClick={() => setupVoiceDevice(updateVoiceStatus).catch((error) => updateVoiceStatus("error", error.message))}
            >
              <Headphones size={18} /> Init softphone
            </button>
            <button className="primary-button secondary" onClick={() => addLine("Agent", analysis.nextBestAction)}>
              <PhoneCall size={18} /> Add guidance
            </button>
          </div>
        </header>

        <section className="setup-strip">
          <SetupPill ready={Boolean(setupStatus?.api)} label="API" />
          <SetupPill ready={Boolean(setupStatus?.browserCallingReady)} label="Browser calling" />
          <SetupPill ready={Boolean(setupStatus?.publicWebhookReady)} label="Public webhook" />
          <SetupPill ready={Boolean(setupStatus?.aiCallingReady)} label="AI calling" />
          <button className="text-button" onClick={refreshSetupStatus}>
            Refresh checks
          </button>
        </section>

        <section className="metric-grid">
          <Metric icon={<Gauge size={18} />} label="Urgency" value={`${analysis.urgency}%`} tone="red" />
          <Metric icon={<Activity size={18} />} label="Sentiment" value={analysis.sentiment} tone="amber" />
          <Metric icon={<ShieldAlert size={18} />} label="Escalation" value={selectedCall.priority} tone="blue" />
          <Metric icon={<UsersRound size={18} />} label="Customer value" value={selectedCall.value} tone="green" />
        </section>

        <div className="main-grid">
          <section className="panel transcript-panel">
            <div className="panel-heading">
              <div>
                <p>Conversation</p>
                <h2>Live transcript</h2>
              </div>
              <span className={`recording ${isListening ? "on" : ""}`}>{isListening ? "Listening" : "Ready"}</span>
            </div>

            <div className="transcript">
              {transcript.map((line, index) => (
                <article className={`bubble ${line.speaker.toLowerCase()}`} key={`${line.time}-${index}`}>
                  <span>
                    {line.speaker} · {line.time}
                  </span>
                  <p>{line.text}</p>
                </article>
              ))}
            </div>

            <div className="composer">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addLine("Customer", draft);
                }}
                placeholder="Type customer speech, then press Enter..."
              />
              <button className="icon-button" aria-label="Add customer message" onClick={() => addLine("Customer", draft)}>
                <Send size={18} />
              </button>
            </div>

            <div className="reply-strip">
              {quickReplies.map((reply) => (
                <button key={reply} onClick={() => addLine("Agent", reply)}>
                  {reply}
                </button>
              ))}
            </div>
          </section>

          <section className="panel intelligence-panel">
            <div className="panel-heading">
              <div>
                <p>AI co-pilot</p>
                <h2>Decision support</h2>
              </div>
              <Sparkles size={20} />
            </div>
            <div className="recommendation">
              <strong>{analysis.intent}</strong>
              <p>{analysis.nextBestAction}</p>
            </div>
            <div className="insight-grid">
              <div className="insight-block">
                <h3>Summary</h3>
                <p>{analysis.summary}</p>
              </div>
              <div className="insight-block">
                <h3>CRM note</h3>
                <p>{analysis.crmNote}</p>
              </div>
            </div>
            <div className="real-calling">
              <h3>Real calling desk</h3>
              <p className="helper-text">Use a real phone number with country code. The app blocks unsafe formats before Twilio is called.</p>
              <div className="call-form">
                <label>
                  Human-to-human web call
                  <input
                    className={humanNumberValid ? "" : "invalid"}
                    value={dialNumber}
                    onChange={(event) => setDialNumber(event.target.value)}
                    placeholder={selectedCall.phone}
                  />
                </label>
                <button className="primary-button" onClick={startHumanCall} disabled={!humanNumberValid}>
                  <PhoneCall size={18} /> Call phone
                </button>
              </div>
              <ValidationHint valid={humanNumberValid} value={humanTarget} />
              <div className="call-form">
                <label>
                  AI-to-human outbound call
                  <input
                    className={aiNumberValid ? "" : "invalid"}
                    value={aiDialNumber}
                    onChange={(event) => setAiDialNumber(event.target.value)}
                    placeholder={selectedCall.phone}
                  />
                </label>
                <button className="primary-button ai" onClick={startAiCall} disabled={!aiNumberValid}>
                  <Bot size={18} /> Start AI call
                </button>
              </div>
              <ValidationHint valid={aiNumberValid} value={aiTarget} />
              <div className="call-control-row">
                <button className="hangup-button" onClick={hangUp}>
                  <PhoneOff size={18} /> Hang up browser call
                </button>
                <span className={`voice-status ${voiceStatus}`}>{voiceStatus}: {voiceDetail}</span>
              </div>
            </div>
          </section>
        </div>
      </section>

      <aside className="right-rail" aria-label="Agent pipeline">
        <section className="customer-card">
          <div className="avatar">{selectedCall.customer.slice(0, 1)}</div>
          <h2>{selectedCall.customer}</h2>
          <p>{selectedCall.phone}</p>
          <dl>
            <div>
              <dt>Plan</dt>
              <dd>{selectedCall.plan}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{selectedCall.location}</dd>
            </div>
          </dl>
        </section>

        <section className="pipeline">
          <div className="panel-heading compact">
            <div>
              <p>Multi-agent pipeline</p>
              <h2>Orchestration trace</h2>
            </div>
            <Bot size={20} />
          </div>
          {analysis.agents.map((agent) => (
            <article className="agent-step" key={agent.name}>
              <CheckCircle2 size={18} />
              <div>
                <strong>{agent.name}</strong>
                <p>{agent.output}</p>
                <span>{agent.confidence}% confidence</span>
              </div>
            </article>
          ))}
        </section>

        <section className="handoff">
          <ClipboardList size={20} />
          <div>
            <strong>Ops handoff</strong>
            <p>{analysis.escalation}</p>
          </div>
        </section>

        <section className="demo-card">
          <div className="panel-heading compact">
            <div>
              <p>Submission assistant</p>
              <h2>Demo readiness</h2>
            </div>
            <ClipboardCheck size={20} />
          </div>
          <ChecklistItem ready={Boolean(setupStatus?.browserCallingReady)} text="Twilio browser token works" />
          <ChecklistItem ready={Boolean(setupStatus?.humanCallingReady)} text="Human phone call path configured" />
          <ChecklistItem ready={Boolean(setupStatus?.aiCallingReady)} text="AI outbound call path configured" />
          <ChecklistItem ready={humanNumberValid} text="Human-call number is valid" />
          <ChecklistItem ready={aiNumberValid} text="AI-call number is valid" />
          {setupStatus?.missing.length ? (
            <div className="missing-box">
              <AlertTriangle size={16} />
              <span>Missing: {setupStatus.missing.join(", ")}</span>
            </div>
          ) : null}
        </section>

        <section className="demo-card">
          <div className="panel-heading compact">
            <div>
              <p>Record this</p>
              <h2>90-second video</h2>
            </div>
            <FileVideo size={20} />
          </div>
          <ol className="demo-steps">
            <li>Initialize softphone and show ready status.</li>
            <li>Call a real phone number from the browser.</li>
            <li>Start AI call and answer it on phone.</li>
            <li>Show transcript, CRM note, and agent trace.</li>
          </ol>
        </section>

        <section className="log-card">
          <div className="panel-heading compact">
            <div>
              <p>Call activity</p>
              <h2>Recent events</h2>
            </div>
            <Link2 size={20} />
          </div>
          {callLog.map((entry, index) => (
            <article className="log-entry" key={`${entry.time}-${index}`}>
              <span>{entry.time} · {entry.kind}</span>
              <strong>{entry.status}</strong>
              <p>{entry.detail}</p>
            </article>
          ))}
        </section>
      </aside>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "red" | "amber" | "blue" | "green";
}) {
  return (
    <article className={`metric ${tone}`}>
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function SetupPill({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span className={`setup-pill ${ready ? "ready" : "blocked"}`}>
      {ready ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {label}
    </span>
  );
}

function ChecklistItem({ ready, text }: { ready: boolean; text: string }) {
  return (
    <div className={`check-item ${ready ? "ready" : ""}`}>
      {ready ? <CheckCircle2 size={16} /> : <Info size={16} />}
      <span>{text}</span>
    </div>
  );
}

function ValidationHint({ valid, value }: { valid: boolean; value: string }) {
  return (
    <p className={`validation-hint ${valid ? "valid" : "invalid"}`}>
      {valid ? "Ready to dial" : "Use E.164 format"}: {normalizePhone(value) || "+919876543210"}
    </p>
  );
}
