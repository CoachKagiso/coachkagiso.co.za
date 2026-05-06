import crypto from 'node:crypto';
import { getSiteUrl } from '@/lib/env';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const CV_REVIEW_UPGRADE_WINDOW_DAYS = 7;
export const CV_REVIEW_CREDIT_AMOUNT = 150;
export const CV_REVIEW_REVAMP_AMOUNT_DUE = 250;

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

function createUpgradeToken() {
  return `cku_${crypto.randomBytes(12).toString('hex')}`;
}

function normalizeCredit(row: Partial<UpgradeCreditRecord>) {
  return {
    ...row,
    credit_amount: Number(row.credit_amount || 0),
    discounted_amount: Number(row.discounted_amount || 0),
  } as UpgradeCreditRecord;
}

function addDaysIso(from: string, days: number) {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date.toISOString();
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

export function getCvRevampUpgradeUrl(token: string) {
  return `${getSiteUrl()}/buy/cv-revamp?upgrade_token=${encodeURIComponent(token)}`;
}

export async function ensureCvReviewUpgradeCredit(input: {
  paymentId: string;
  buyerEmail?: string | null;
  buyerName?: string | null;
  confirmedAt?: string | null;
}) {
  const supabase = createSupabaseServiceClient();
  const existingResult = await supabase
    .from('upgrade_credits')
    .select('*')
    .eq('source_payment_id', input.paymentId)
    .eq('target_service_slug', 'cv-revamp')
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(existingResult.error.message);
  }

  if (existingResult.data) {
    return normalizeCredit(existingResult.data);
  }

  const confirmedAt = input.confirmedAt || new Date().toISOString();
  const token = createUpgradeToken();
  const insertResult = await supabase
    .from('upgrade_credits')
    .insert({
      source_payment_id: input.paymentId,
      source_service_slug: 'cv-review',
      target_service_slug: 'cv-revamp',
      buyer_email: input.buyerEmail || null,
      buyer_name: input.buyerName || null,
      token,
      credit_amount: CV_REVIEW_CREDIT_AMOUNT,
      discounted_amount: CV_REVIEW_REVAMP_AMOUNT_DUE,
      expires_at: addDaysIso(confirmedAt, CV_REVIEW_UPGRADE_WINDOW_DAYS),
      status: 'active',
    })
    .select('*')
    .single();

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  return normalizeCredit(insertResult.data);
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

export async function getCvReviewUpgradeCreditByPaymentId(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('upgrade_credits')
    .select('*')
    .eq('source_payment_id', paymentId)
    .eq('target_service_slug', 'cv-revamp')
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data ? normalizeCredit(result.data) : null;
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
