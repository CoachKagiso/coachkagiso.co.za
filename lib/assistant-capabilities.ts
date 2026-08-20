/**
 * The assistant's own capability list.
 *
 * This exists because the assistant had no way to know what it could reach. Its
 * data arrives as snapshots that are only attached when a request matches, so
 * asked about its own limits it would guess, and it guessed wrong: it told
 * Kagiso it could not see her inbox, calendar, payments, or Vault drafts, all of
 * which it can read.
 *
 * Kept free of imports on purpose. It is rendered into the system prompt by
 * lib/growth-os-assistant.ts, which the client bundle pulls in, so nothing
 * server-only may be reachable from here.
 */

export type AssistantCapability = {
  /** Matches the tool name used by the matching block in lib/assistant-access.ts. */
  name: string;
  reach: string;
};

export const ASSISTANT_ACCESS_CAPABILITIES: AssistantCapability[] = [
  {
    name: 'searchLeads',
    reach:
      'Every lead record across the diagnostic, lead magnets, and the masterclass waitlist: name, email, source, lead status, archetype, service interest, and their full diagnostic answers.',
  },
  {
    name: 'getEmailThread',
    reach:
      'Inbound replies that have been synced, and the outbound send log, both with message bodies and delivery, open, and click status.',
  },
  {
    name: 'readLiveMailbox',
    reach:
      'A live read of the most recent messages in the Zoho inbox. This is separate from the synced replies and can show mail that has not been imported yet.',
  },
  {
    name: 'getEmailBacklog',
    reach:
      'Every lead whose follow-up is overdue, due today, or due tomorrow, with the next sequence template already resolved and the leads that need manual handling flagged.',
  },
  {
    name: 'searchVaultDrafts / getVaultDraft',
    reach:
      'Content Vault drafts, including the full draft body when Kagiso asks to read, show, or work on one.',
  },
  {
    name: 'getPaymentsSummary',
    reach:
      'Confirmed payments and their buyers, amounts, total revenue, the intake answers each client submitted, and the delivery state and due date for each piece of work.',
  },
  {
    name: 'getBookingsSummary',
    reach: 'Calendar and booking events from seven days ago through forty-five days ahead.',
  },
  {
    name: 'fetchApprovedUrl',
    reach: 'The contents of a public URL, but only one Kagiso has pasted into her message.',
  },
];

/** Things the assistant genuinely cannot reach, so it stops offering or denying them incorrectly. */
export const ASSISTANT_ACCESS_GAPS: string[] = [
  'WhatsApp conversations. There is no integration. Kagiso can paste a conversation in and you can work from that.',
  'Website traffic or analytics of any kind.',
  'Social media account metrics such as follower counts or post performance.',
  'Browsing the web on your own. You can only read a URL Kagiso pastes into her message.',
];

export function buildAssistantCapabilityManifest() {
  return [
    'WHAT YOU CAN READ:',
    'Your data arrives as read-only snapshots. A snapshot is only attached when the request calls for it, so an absent snapshot means you do not have that data in front of you right now. It does NOT mean you lack the capability.',
    '',
    ...ASSISTANT_ACCESS_CAPABILITIES.map((capability) => `- ${capability.name}: ${capability.reach}`),
    '',
    'YOU CANNOT REACH:',
    ...ASSISTANT_ACCESS_GAPS.map((gap) => `- ${gap}`),
    '',
    'RULES ABOUT YOUR OWN ACCESS:',
    '- Never tell Kagiso you cannot see something listed above. You can. Say the snapshot is not attached to this message and ask her to name the area, for example "check my payments" or "what is in my calendar", so it gets pulled.',
    '- If a question needs data whose snapshot is not attached, say so before answering. Never fill the gap with a guess, an estimate, or a plausible-sounding number.',
    '- Everything above is read-only. You never send, schedule, edit, publish, or delete through it. The one action you can propose is a follow-up email batch, and it only happens after Kagiso approves it.',
    '- When asked what you can or cannot do, answer from this list rather than from impression.',
  ].join('\n');
}
