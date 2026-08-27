# Instant booking confirmation — Cal.com setup

Career Clarity and Glow Up VIP used to wait on Kagiso clicking **Accept** in Cal.com before the
client could pay. Twice that gap cost a sale. This document is the settings half of removing it.
The code half is already deployed: `/book/clarity/confirm` and `/book/glow-up/confirm` turn a fresh
booking into a PayFast checkout in the same browser session.

Everything below happens in the Cal.com dashboard. Nothing here can be changed from the codebase —
there is no Cal.com API key in this project.

## 1. Turn off the approval gate

Do this for **both** event types: `career-clarity` and `glow-up-vip`.

1. Cal.com → **Event Types** → open the event.
2. Left sidebar → **Policies** → **Privacy & security**.
3. Switch **Requires confirmation** off.

Cal.com's own help pages still say this lives on an "Advanced" tab. That tab no longer exists in
the current UI; the setting moved under Policies.

Leave **Requires booker email verification** on. Kagiso's approval step used to be what kept junk
bookings off the calendar, and once it is gone, email verification is the only thing left doing
that job.

Why this is the whole fix: while "Requires confirmation" is on, Cal.com fires a
`BOOKING_REQUESTED` webhook, which `app/api/webhooks/cal/route.ts` deliberately ignores. With it
off, Cal.com fires `BOOKING_CREATED` instead, which that route already handles — it saves the
intake, creates the pending payment, and emails the private checkout link automatically.

## 2. The handoff to checkout is already wired

No settings needed here. Cal.com's **Redirect on booking** feature is gated behind a paid plan on
this account, so the handoff runs from the embed instead: `CalBookingEmbed.tsx` listens for
Cal.com's `bookingSuccessfulV2` event and sends the client to `/book/<slug>/confirm?uid=…`, which
forwards them to PayFast.

Two consequences worth knowing:

- It only fires for people booking **through the site**. Anyone who books directly at
  `cal.com/coachkagiso/career-clarity` still gets the payment link by email, exactly as before.
- It deliberately does nothing while a booking comes back as `PENDING`, which is what happens
  while step 1 is still switched on. So the redirect stays dormant and starts working by itself
  the moment "Requires confirmation" goes off. There is no ordering trap.

## 3. Make instant confirmation safe

With approval off, a client can book any slot Cal.com believes is free. These three settings are
what stop that from becoming a double-booking. Set them on both event types.

1. **Conflict calendars.** Cal.com → **Settings → Calendars**. Every calendar holding Kagiso's real
   commitments must be ticked under **Check for conflicts**. This is the important one: a clash can
   only happen for something Cal.com cannot see.
2. **Minimum notice.** Event type → **Policies → Limits & buffers** → **Minimum notice**: 24 hours (48 is safer for Glow
   Up VIP). Stops someone booking tomorrow at 07:00.
3. **Daily cap.** Event type → **Policies → Limits & buffers** → **Limit booking frequency**: 1 per day, 4 per week for
   Career Clarity, per the capacity rule in `docs/Buying-Flow-Plan.md`.

## What the client now experiences

1. Picks a slot on `/book/clarity`. It is confirmed on the calendar immediately.
2. The embed sends them to `/book/clarity/confirm`.
3. That page finds the payment record the webhook just created and forwards to
   `/buy/career-clarity` with a signed, booking-specific token. Client pays there and then.
4. The acceptance email still goes out as a backstop for anyone who closes the tab.
5. Paying twice is not possible — the checkout shows "Payment already confirmed" if the booking is
   settled.

Kagiso does nothing for a sale to complete. She sees a paid, confirmed session in the dashboard.

## Still open

- **Unpaid holds are not released.** The payment link expires after
  `BOOKING_PAYMENT_WINDOW_HOURS` (48), but the slot stays blocked on the calendar forever. Fixing
  that needs a `CAL_API_KEY` and a sweeper that cancels unpaid bookings. Until then, unpaid holds
  have to be cancelled by hand in Cal.com. Note this is not a new problem: "Unconfirmed bookings
  still block calendar slots" is already ticked on these event types, so unapproved requests
  already hold slots today.
- **Refund policy.** The terms still assume Kagiso approved the time before money moved. Now that
  payment confirms instantly, decide whether a session she has to move is refunded or rescheduled,
  and say so in `Terms-and-Conditions.html`.
