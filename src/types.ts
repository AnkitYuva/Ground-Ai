export type Sentiment = "calm" | "concerned" | "frustrated";

export type TranscriptLine = {
  speaker: "Customer" | "Agent";
  text: string;
  time: string;
};

export type Call = {
  id: string;
  customer: string;
  phone: string;
  plan: string;
  wait: string;
  priority: "Low" | "Medium" | "High";
  reason: string;
  location: string;
  sentiment: Sentiment;
  value: string;
  transcript: TranscriptLine[];
};

export type AgentResult = {
  name: string;
  status: "Ready" | "Running" | "Done";
  output: string;
  confidence: number;
};

export type Analysis = {
  intent: string;
  sentiment: Sentiment;
  urgency: number;
  nextBestAction: string;
  summary: string;
  crmNote: string;
  escalation: string;
  qualityScore: number;
  agents: AgentResult[];
};
