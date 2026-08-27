// Cal.com's paid "redirect on booking" feature is replaced by a listener on the embed's
// bookingSuccessfulV2 event. This decides whether a given event should hand off to checkout.
// Kept free of node built-ins so the booking embed can import it on the client.

export type CalBookingSuccessData = {
  uid?: string;
  status?: string;
};

export function shouldHandOffToCheckout(data: CalBookingSuccessData) {
  // No UID means nothing to look the payment up by.
  if (!data.uid?.trim()) return false;

  // A booking still awaiting Kagiso's approval has no payment record yet, so Cal.com's own success
  // screen stays in place. This starts handing off by itself once "Requires confirmation" is off.
  if (data.status?.trim().toUpperCase() === 'PENDING') return false;

  return true;
}

export function buildBookingConfirmUrl(confirmPath: string, uid: string) {
  return `${confirmPath}?uid=${encodeURIComponent(uid.trim())}`;
}
