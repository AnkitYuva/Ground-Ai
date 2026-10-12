import type { Analysis, Call, Sentiment, TranscriptLine } from "./types";

const sentimentRank: Record<Sentiment, number> = {
  calm: 1,
  concerned: 2,
  frustrated: 3
};

export function analyzeCall(call: Call, transcript: TranscriptLine[]): Analysis {
  const combined = transcript.map((line) => line.text.toLowerCase()).join(" ");
  const isDelay = /late|delay|arrived|shown up|waiting|technician/.test(combined);
  const isBilling = /invoice|charge|bill|payment/.test(combined);
  const isReschedule = /reschedule|move|slot|saturday|tomorrow/.test(combined);
  const urgentWords = (combined.match(/urgent|quickly|today|evening|twice|escalat/g) ?? []).length;
  const urgency = Math.min(98, 42 + urgentWords * 14 + sentimentRank[call.sentiment] * 10 + (call.priority === "High" ? 16 : 0));
  const sentiment = urgency > 75 ? "frustrated" : urgency > 56 ? "concerned" : "calm";
  const intent = isBilling
    ? "Billing dispute"
    : isReschedule
      ? "Appointment reschedule"
      : isDelay
        ? "Missed field appointment"
        : "General support";
  const escalation =
    urgency > 75
      ? "Escalate to field ops lead and commit to a 15-minute customer update."
      : urgency > 58
        ? "Create monitored follow-up task for agent owner."
        : "Resolve in queue without escalation.";
  const nextBestAction =
    intent === "Billing dispute"
      ? "Open invoice ledger, compare visit log, and offer correction or explanation."
      : intent === "Appointment reschedule"
        ? "Offer two available slots and confirm by SMS."
        : "Check technician GPS/route status and assign backup if SLA is at risk.";

  return {
    intent,
    sentiment,
    urgency,
    nextBestAction,
    summary: `${call.customer} contacted support about ${intent.toLowerCase()} in ${call.location}. Current risk is ${urgency > 75 ? "high" : urgency > 58 ? "medium" : "low"} based on tone, wait time, and transcript signals.`,
    crmNote: `Customer: ${call.customer}. Issue: ${intent}. Action: ${nextBestAction} Escalation: ${escalation}`,
    escalation,
    qualityScore: Math.max(72, 96 - Math.round(urgency / 5)),
    agents: [
      {
        name: "TranscriptAgent",
        status: "Done",
        output: `Structured ${transcript.length} transcript turns and extracted customer context.`,
        confidence: 94
      },
      {
        name: "IntentAgent",
        status: "Done",
        output: `Detected intent: ${intent}.`,
        confidence: isDelay || isBilling || isReschedule ? 91 : 76
      },
      {
        name: "SentimentAgent",
        status: "Done",
        output: `Customer sentiment is ${sentiment} with ${urgency}% urgency.`,
        confidence: 88
      },
      {
        name: "EscalationAgent",
        status: "Done",
        output: escalation,
        confidence: urgency > 75 ? 92 : 84
      },
      {
        name: "CRMUpdateAgent",
        status: "Done",
        output: "Prepared CRM note, follow-up task, and owner handoff.",
        confidence: 89
      },
      {
        name: "QAAgent",
        status: "Done",
        output: `Call quality score projected at ${Math.max(72, 96 - Math.round(urgency / 5))}/100.`,
        confidence: 86
      }
    ]
  };
}
