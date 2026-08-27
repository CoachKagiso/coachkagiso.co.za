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
2. **Advanced** tab → find **Requires confirmation**.
3. Switch it **off**.

Why this is the whole fix: while "Requires confirmation" is on, Cal.com fires a
`BOOKING_REQUESTED` webhook, which `app/api/webhooks/cal/route.ts` deliberately ignores. With it
off, Cal.com fires `BOOKING_CREATED` instead, which that route already handles — it saves the
intake, creates the pending payment, and emails the private checkout link automatically.

## 2. Send the client straight to checkout

Still in the **Advanced** tab of each event type:

1. **Redirect on booking** → on.
2. Set the URL:
   - `career-clarity` → `https://coachkagiso.co.za/book/clarity/confirm`
   - `glow-up-vip` → `https://coachkagiso.co.za/book/glow-up/confirm`
3. Enable **Forward parameters such as ?email=…&name=… to the redirect URL**.

That forwarding is what supplies the `uid` the confirm page needs. Without it the client still gets
the payment link by email — the page falls back to saying so — but the in-session handoff is lost,
which is the part that recovers the sale.

## 3. Make instant confirmation safe

With approval off, a client can book any slot Cal.com believes is free. These three settings are
what stop that from becoming a double-booking. Set them on both event types.

1. **Conflict calendars.** Cal.com → **Settings → Calendars**. Every calendar holding Kagiso's real
   commitments must be ticked under **Check for conflicts**. This is the important one: a clash can
   only happen for something Cal.com cannot see.
2. **Minimum notice.** Event type → **Limits** → **Minimum notice**: 24 hours (48 is safer for Glow
   Up VIP). Stops someone booking tomorrow at 07:00.
3. **Daily cap.** Event type → **Limits** → **Limit booking frequency**: 1 per day, 4 per week for
   Career Clarity, per the capacity rule in `docs/Buying-Flow-Plan.md`.

## What the client now experiences

1. Picks a slot on `/book/clarity`. It is confirmed on the calendar immediately.
2. Cal.com redirects to `/book/clarity/confirm`.
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
  have to be cancelled by hand in Cal.com.
- **Refund policy.** The terms still assume Kagiso approved the time before money moved. Now that
  payment confirms instantly, decide whether a session she has to move is refunded or rescheduled,
  and say so in `Terms-and-Conditions.html`.
