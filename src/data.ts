import type { Call } from "./types";

export const calls: Call[] = [
  {
    id: "CALL-1048",
    customer: "Asha Menon",
    phone: "+91 98765 41220",
    plan: "Field Assist Pro",
    wait: "00:38",
    priority: "High",
    reason: "Technician has not arrived",
    location: "Rajajinagar, Bengaluru",
    sentiment: "frustrated",
    value: "Rs 18.4k ARR",
    transcript: [
      {
        speaker: "Customer",
        time: "10:42",
        text: "I booked a technician for today morning and nobody has shown up. I have called twice already."
      },
      {
        speaker: "Agent",
        time: "10:43",
        text: "I am sorry about the delay, Asha. I am checking the technician route and appointment status now."
      },
      {
        speaker: "Customer",
        time: "10:43",
        text: "Please do something quickly. I need this fixed before evening."
      }
    ]
  },
  {
    id: "CALL-1049",
    customer: "Rohit Sharma",
    phone: "+91 99801 77820",
    plan: "Starter",
    wait: "01:12",
    priority: "Medium",
    reason: "Invoice mismatch",
    location: "Indiranagar, Bengaluru",
    sentiment: "concerned",
    value: "Rs 5.2k ARR",
    transcript: [
      {
        speaker: "Customer",
        time: "10:44",
        text: "My invoice is showing an extra visit charge. I only had one appointment this month."
      },
      {
        speaker: "Agent",
        time: "10:45",
        text: "I can verify the appointment log and explain the charge."
      }
    ]
  },
  {
    id: "CALL-1050",
    customer: "Nisha Rao",
    phone: "+91 99004 22110",
    plan: "Business",
    wait: "00:09",
    priority: "Low",
    reason: "Reschedule request",
    location: "Malleshwaram, Bengaluru",
    sentiment: "calm",
    value: "Rs 11.9k ARR",
    transcript: [
      {
        speaker: "Customer",
        time: "10:46",
        text: "I want to move tomorrow's visit to Saturday afternoon if possible."
      }
    ]
  }
];

export const quickReplies = [
  "I understand this is urgent. I am checking the live field schedule now.",
  "I can see the appointment record. Let me confirm the fastest available slot.",
  "I will create a priority follow-up and send you an update by SMS.",
  "I am escalating this to the operations lead because the SLA is at risk."
];
