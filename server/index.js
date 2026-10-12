import cors from "cors";
import "dotenv/config";
import express from "express";
import twilio from "twilio";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_TWIML_APP_SID,
  TWILIO_CALLER_ID,
  PUBLIC_BASE_URL,
  OPENAI_API_KEY,
  OPENAI_MODEL = "gpt-4.1-mini"
} = process.env;

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

function requireTwilioConfig(response, fields) {
  const missing = fields.filter((field) => !process.env[field]);
  if (missing.length) {
    response.status(500).json({
      error: `Missing Twilio configuration: ${missing.join(", ")}`
    });
    return false;
  }
  return true;
}

function normalizePhone(phone) {
  return String(phone ?? "").trim().replace(/[^\d+]/g, "");
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "voiceops-ai-api" });
});

app.get("/api/setup/status", (_request, response) => {
  const required = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_API_KEY",
    "TWILIO_API_SECRET",
    "TWILIO_TWIML_APP_SID",
    "TWILIO_CALLER_ID",
    "PUBLIC_BASE_URL",
    "OPENAI_API_KEY"
  ];
  const missing = required.filter((field) => !process.env[field]);

  response.json({
    api: true,
    browserCallingReady: ["TWILIO_ACCOUNT_SID", "TWILIO_API_KEY", "TWILIO_API_SECRET", "TWILIO_TWIML_APP_SID"].every(
      (field) => Boolean(process.env[field])
    ),
    humanCallingReady: ["TWILIO_CALLER_ID", "TWILIO_TWIML_APP_SID"].every((field) => Boolean(process.env[field])),
    aiCallingReady: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_CALLER_ID", "PUBLIC_BASE_URL", "OPENAI_API_KEY"].every(
      (field) => Boolean(process.env[field])
    ),
    publicWebhookReady: Boolean(PUBLIC_BASE_URL),
    missing
  });
});

app.get("/api/twilio/token", (_request, response) => {
  if (
    !requireTwilioConfig(response, [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_API_KEY",
      "TWILIO_API_SECRET",
      "TWILIO_TWIML_APP_SID"
    ])
  ) {
    return;
  }

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;
  const identity = `agent-${Date.now()}`;
  const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, {
    identity,
    ttl: 3600
  });
  token.addGrant(
    new VoiceGrant({
      outgoingApplicationSid: TWILIO_TWIML_APP_SID,
      incomingAllow: false
    })
  );

  response.json({ identity, token: token.toJwt() });
});

app.post("/voice/outgoing", (request, response) => {
  const to = normalizePhone(request.body.To);
  const twiml = new twilio.twiml.VoiceResponse();

  if (!TWILIO_CALLER_ID) {
    twiml.say("The call centre caller ID is not configured.");
  } else if (!to || !to.startsWith("+")) {
    twiml.say("Please provide a valid E.164 phone number beginning with plus and country code.");
  } else {
    const dial = twiml.dial({
      callerId: TWILIO_CALLER_ID,
      answerOnBridge: true,
      record: "record-from-answer-dual"
    });
    dial.number(to);
  }

  response.type("text/xml").send(twiml.toString());
});

app.post("/api/calls/ai", async (request, response) => {
  if (
    !requireTwilioConfig(response, [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_CALLER_ID",
      "PUBLIC_BASE_URL"
    ])
  ) {
    return;
  }

  if (!OPENAI_API_KEY) {
    response.status(500).json({
      error: "OPENAI_API_KEY is required for AI-to-human calling."
    });
    return;
  }

  const to = normalizePhone(request.body.to);
  if (!to || !to.startsWith("+")) {
    response.status(400).json({ error: "Use an E.164 phone number such as +919876543210." });
    return;
  }

  try {
    const call = await twilioClient.calls.create({
      to,
      from: TWILIO_CALLER_ID,
      url: `${PUBLIC_BASE_URL}/voice/ai/start?customerName=${encodeURIComponent(request.body.customerName ?? "there")}&context=${encodeURIComponent(request.body.context ?? "")}`,
      record: true
    });
    response.json({ callSid: call.sid, status: call.status });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/voice/ai/start", (request, response) => {
  const customerName = request.query.customerName || "there";
  const twiml = new twilio.twiml.VoiceResponse();
  const gather = twiml.gather({
    input: "speech",
    action: "/voice/ai/respond",
    method: "POST",
    speechTimeout: "auto",
    enhanced: true
  });
  gather.say(
    { voice: "alice" },
    `Hi ${customerName}. This is the VoiceOps AI assistant calling from the support desk. Tell me what update you need, and I will help route it.`
  );
  twiml.say({ voice: "alice" }, "I did not hear anything. Goodbye.");
  response.type("text/xml").send(twiml.toString());
});

app.post("/voice/ai/respond", async (request, response) => {
  const userSpeech = request.body.SpeechResult || "The customer did not say anything.";
  const twiml = new twilio.twiml.VoiceResponse();

  try {
    const aiReply = await generateAiReply(userSpeech);
    const gather = twiml.gather({
      input: "speech",
      action: "/voice/ai/respond",
      method: "POST",
      speechTimeout: "auto",
      enhanced: true
    });
    gather.say({ voice: "alice" }, aiReply);
    twiml.say({ voice: "alice" }, "Thanks. The support team has the note. Goodbye.");
  } catch (error) {
    twiml.say(
      { voice: "alice" },
      "I am having trouble reaching the AI service. I will ask a human agent to follow up. Goodbye."
    );
  }

  response.type("text/xml").send(twiml.toString());
});

async function generateAiReply(userSpeech) {
  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content:
            "You are a concise support call-centre voice agent. Reply in one or two short spoken sentences. Ask one useful follow-up question if needed."
        },
        {
          role: "user",
          content: userSpeech
        }
      ]
    })
  });

  if (!openAiResponse.ok) {
    throw new Error(await openAiResponse.text());
  }

  const data = await openAiResponse.json();
  return (
    data.output_text ||
    data.output?.flatMap((item) => item.content ?? []).find((content) => content.type === "output_text")?.text ||
    "I understand. I am creating a support note and routing this to the right team."
  );
}

app.post("/api/agent/analyze", (request, response) => {
  const { customer = "Unknown customer", transcript = [] } = request.body ?? {};
  const text = transcript.map((line) => line.text ?? "").join(" ").toLowerCase();
  const urgent = /urgent|today|late|delay|escalate|angry|twice/.test(text);
  const billing = /invoice|billing|charge|refund/.test(text);

  response.json({
    intent: billing ? "Billing dispute" : urgent ? "SLA risk" : "General support",
    summary: `${customer} needs support. The transcript contains ${transcript.length} turns.`,
    nextBestAction: urgent
      ? "Escalate to operations lead and send a customer update within 15 minutes."
      : "Create a follow-up task and continue first-contact resolution.",
    agents: ["TranscriptAgent", "IntentAgent", "SentimentAgent", "EscalationAgent", "CRMUpdateAgent"]
  });
});

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`VoiceOps AI API listening on http://localhost:${port}`);
});
