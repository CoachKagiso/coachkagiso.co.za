type PayFastFields = Record<string, string>;

// PayFast custom integrations must submit and sign fields in the order defined
// by its custom integration specification, rather than alphabetically.
const PAYFAST_CUSTOM_INTEGRATION_FIELD_ORDER = [
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'name_first',
  'name_last',
  'email_address',
  'cell_number',
  'm_payment_id',
  'amount',
  'item_name',
  'item_description',
  'custom_int1',
  'custom_int2',
  'custom_int3',
  'custom_int4',
  'custom_int5',
  'custom_str1',
  'custom_str2',
  'custom_str3',
  'custom_str4',
  'custom_str5',
  'email_confirmation',
  'confirmation_address',
  'payment_method',
  'subscription_type',
  'billing_date',
  'recurring_amount',
  'frequency',
  'cycles',
  'subscription_notify_email',
  'subscription_notify_webhook',
  'subscription_notify_buyer',
] as const;

const fieldPositions = new Map<string, number>(
  PAYFAST_CUSTOM_INTEGRATION_FIELD_ORDER.map((field, index) => [field, index]),
);

export function orderPayFastCheckoutFields(fields: PayFastFields): PayFastFields {
  return Object.fromEntries(
    Object.entries(fields).sort(([left], [right]) => {
      const leftPosition = fieldPositions.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightPosition = fieldPositions.get(right) ?? Number.MAX_SAFE_INTEGER;
      return leftPosition - rightPosition;
    }),
  );
}
