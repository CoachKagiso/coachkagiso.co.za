import { createSupabaseServiceClient } from '@/lib/supabase-server';

export type UpgradeCreditStatus = 'active' | 'used' | 'expired';

export type UpgradeCreditRecord = {
  id: string;
  source_payment_id: string;
  source_service_slug: string;
  target_service_slug: string;
  buyer_email: string | null;
  buyer_name: string | null;
  token: string;
  credit_amount: number;
  discounted_amount: number;
  expires_at: string;
  status: UpgradeCreditStatus;
  used_by_payment_id: string | null;
  created_at: string;
  used_at: string | null;
};

export type UpgradeOffer =
  | {
      valid: true;
      reason: null;
      credit: UpgradeCreditRecord;
    }
  | {
      valid: false;
      reason: 'missing' | 'expired' | 'used' | 'invalid_target';
      credit: UpgradeCreditRecord | null;
    };

function normalizeCredit(row: Partial<UpgradeCreditRecord>) {
  return {
    ...row,
    credit_amount: Number(row.credit_amount || 0),
    discounted_amount: Number(row.discounted_amount || 0),
  } as UpgradeCreditRecord;
}

function deriveOffer(credit: UpgradeCreditRecord | null, targetServiceSlug: string): UpgradeOffer {
  if (!credit) {
    return { valid: false, reason: 'missing', credit: null };
  }

  if (credit.target_service_slug !== targetServiceSlug) {
    return { valid: false, reason: 'invalid_target', credit };
  }

  if (credit.status === 'used' || credit.used_by_payment_id) {
    return { valid: false, reason: 'used', credit };
  }

  if (credit.status === 'expired' || new Date(credit.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: 'expired', credit };
  }

  return { valid: true, reason: null, credit };
}

export async function getUpgradeOfferByToken(token: string, targetServiceSlug: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('upgrade_credits')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  const credit = result.data ? normalizeCredit(result.data) : null;
  return deriveOffer(credit, targetServiceSlug);
}

export async function markUpgradeCreditUsed(token: string, paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const result = await supabase
    .from('upgrade_credits')
    .update({
      status: 'used',
      used_by_payment_id: paymentId,
      used_at: now,
    })
    .eq('token', token)
    .eq('status', 'active')
    .is('used_by_payment_id', null)
    .select('*')
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.data) {
    return normalizeCredit(result.data);
  }

  const existing = await getUpgradeOfferByToken(token, 'cv-revamp');
  if (!existing.valid && existing.reason === 'used' && existing.credit?.used_by_payment_id === paymentId) {
    return existing.credit;
  }

  throw new Error('Upgrade credit is no longer available');
}
