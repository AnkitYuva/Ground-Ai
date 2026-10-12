# VoiceOps AI

VoiceOps AI is a full-stack call-centre staff app built for a Forward Deployed Engineer / Agentic Engineer role. It shows a working agent dashboard, real web-to-phone-number calling, AI-to-human outbound calling, transcript updates, and a multi-agent analysis pipeline for support operations.

## Why this project fits the role

- Call-centre staff app aligned with the assignment brief.
- Human-to-human calling from browser to phone number using Twilio Voice SDK.
- AI-to-human outbound calling using Twilio Programmable Voice, speech gather, and OpenAI responses.
- Multi-agent orchestration trace with transcript, intent, sentiment, escalation, CRM, and QA agents.
- Full-stack shape with a React frontend and Express API stub that can be replaced by real LLM/STT services.
- Demo-friendly interface designed for a short screen recording.

## Features

- Live call queue with priority and SLA risk.
- Active customer workspace with customer context.
- Transcript panel with customer and agent messages.
- Real browser softphone initialization.
- Web-to-phone-number calling with E.164 phone numbers.
- AI outbound phone calls with spoken responses.
- Reviewer-friendly setup readiness checks for API, Twilio browser calling, webhook, and AI calling.
- E.164 phone-number validation before any real call is attempted.
- Demo readiness checklist for the required assignment video.
- Recent call activity log for debugging and screen-recording proof.
- AI next-best-action recommendation.
- Generated call summary and CRM note.
- Multi-agent pipeline trace with confidence scores.
- Mock backend endpoint at `/api/agent/analyze`.

## Tech stack

- React
- TypeScript
- Vite
- Express
- Twilio Voice SDK
- Twilio Programmable Voice
- OpenAI Responses API
- Lucide React icons
- CSS modules through plain scoped CSS

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local URL printed by Vite.

Run the API server in a second terminal:

```bash
npm run api
```

## Calling setup

1. Buy or use a Twilio voice-capable phone number.
2. Create a Twilio API Key and Secret.
3. Create a TwiML App in Twilio Console.
4. Set the TwiML App Voice Request URL to:

```text
https://your-public-api-url/voice/outgoing
```

5. Expose the local API with ngrok during demo:

```bash
ngrok http 4000
```

6. Add the ngrok HTTPS URL to `PUBLIC_BASE_URL` in `.env`.
7. Fill all Twilio values in `.env`.
8. Add `OPENAI_API_KEY` for AI-to-human calling.

The app includes a setup strip and demo-readiness checklist. If something is missing, the UI shows the missing environment variable names without exposing any secret values.

Phone numbers must be in E.164 format, for example:

```text
+919876543210
```

## How calling works

Human-to-human calling:

1. The browser asks `/api/twilio/token` for a Twilio Voice access token.
2. Twilio Voice SDK registers the browser as a softphone.
3. The agent enters a real phone number and clicks `Call phone`.
4. Twilio requests `/voice/outgoing`.
5. The backend returns TwiML `<Dial><Number>`, connecting the browser audio to the phone number.

AI-to-human calling:

1. The app calls `/api/calls/ai` with the target phone number.
2. The backend creates a Twilio outbound call from the configured Twilio number.
3. Twilio requests `/voice/ai/start`.
4. The backend returns TwiML with `<Gather input="speech">`.
5. Customer speech is posted to `/voice/ai/respond`.
6. The backend sends the speech to OpenAI and returns a short spoken TwiML `<Say>` response.

## Demo script

1. Open the dashboard and select `Asha Menon`.
2. Start the API server and verify Twilio/ngrok environment variables.
3. Click `Init softphone` and allow microphone permission.
4. Enter a real phone number and click `Call phone`.
5. Record the human-to-human call with clear audio.
6. Enter a real phone number under `AI-to-human outbound call`.
7. Click `Start AI call`, answer the phone, speak a request, and record the AI spoken response.
8. Show the multi-agent pipeline, summary, and CRM note.

## Future production integrations

- Real-time barge-in AI voice: Twilio Media Streams with OpenAI Realtime.
- LLM reasoning: OpenAI Responses API or Agents SDK.
- Telephony: Twilio, Exotel, or SIP provider.
- CRM: HubSpot, Zoho, Freshdesk, or custom field-service backend.
- Persistence: PostgreSQL with call, transcript, task, and audit-log tables.

## AI tools used

- ChatGPT / Codex was used to plan and implement the prototype.
