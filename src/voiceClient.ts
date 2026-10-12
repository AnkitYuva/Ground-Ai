import { Device, type Call } from "@twilio/voice-sdk";

export type VoiceStatus =
  | "idle"
  | "loading"
  | "ready"
  | "calling"
  | "connected"
  | "disconnected"
  | "error";

let device: Device | null = null;
let activeCall: Call | null = null;

export async function setupVoiceDevice(onStatus: (status: VoiceStatus, detail?: string) => void) {
  onStatus("loading", "Requesting microphone and Twilio token");
  const response = await fetch("/api/twilio/token");
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Could not create Twilio access token");
  }
  const { token } = await response.json();

  device?.destroy();
  device = new Device(token, {
    logLevel: 1
  });

  device.on("registered", () => onStatus("ready", "Browser softphone ready"));
  device.on("error", (error) => onStatus("error", error.message));
  device.on("disconnect", () => onStatus("disconnected", "Call ended"));
  await device.register();
  return device;
}

export async function callPhoneNumber(phoneNumber: string, onStatus: (status: VoiceStatus, detail?: string) => void) {
  if (!device) {
    await setupVoiceDevice(onStatus);
  }
  if (!device) {
    throw new Error("Voice device was not initialized");
  }

  onStatus("calling", `Dialing ${phoneNumber}`);
  activeCall = await device.connect({
    params: {
      To: phoneNumber
    }
  });

  activeCall.on("accept", () => onStatus("connected", "Human-to-human call connected"));
  activeCall.on("disconnect", () => onStatus("disconnected", "Call ended"));
  activeCall.on("error", (error) => onStatus("error", error.message));
  return activeCall;
}

export function hangUp() {
  activeCall?.disconnect();
  device?.disconnectAll();
}

