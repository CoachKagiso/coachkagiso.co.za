import type { SupabaseClient } from '@supabase/supabase-js';

export type MilestoneTemplate = {
  stageName: string;
  stageOrder: number;
};

export const DELIVERY_MILESTONES: Record<string, MilestoneTemplate[]> = {
  'cv-review': [
    { stageName: 'Intake received', stageOrder: 1 },
    { stageName: 'Loom recorded', stageOrder: 2 },
    { stageName: 'Delivered', stageOrder: 3 },
  ],
  'cv-revamp': [
    { stageName: 'Intake received', stageOrder: 1 },
    { stageName: 'CV in progress', stageOrder: 2 },
    { stageName: 'Loom recorded', stageOrder: 3 },
    { stageName: 'Delivered', stageOrder: 4 },
  ],
  'cover-letter': [
    { stageName: 'Intake received', stageOrder: 1 },
    { stageName: 'In progress', stageOrder: 2 },
    { stageName: 'Delivered', stageOrder: 3 },
  ],
  linkedin: [
    { stageName: 'Intake received', stageOrder: 1 },
    { stageName: 'In progress', stageOrder: 2 },
    { stageName: 'Delivered', stageOrder: 3 },
  ],
  bundle: [
    { stageName: 'Intake received', stageOrder: 1 },
    { stageName: 'CV in progress', stageOrder: 2 },
    { stageName: 'LinkedIn in progress', stageOrder: 3 },
    { stageName: 'Loom recorded', stageOrder: 4 },
    { stageName: 'Delivered', stageOrder: 5 },
  ],
};

type ClientDeliveryInsert = {
  payment_id: string;
  stage_name: string;
  stage_order: number;
  completed: boolean;
};

export function getDeliveryMilestoneTemplate(serviceSlug: string) {
  return DELIVERY_MILESTONES[serviceSlug] || null;
}

export function buildDeliveryMilestoneRows(paymentId: string, serviceSlug: string) {
  const template = getDeliveryMilestoneTemplate(serviceSlug);
  if (!template) return null;

  return template.map((milestone) => ({
    payment_id: paymentId,
    stage_name: milestone.stageName,
    stage_order: milestone.stageOrder,
    completed: false,
  })) satisfies ClientDeliveryInsert[];
}

export async function ensureClientDeliveryMilestones(
  supabase: SupabaseClient,
  paymentId: string,
  serviceSlug: string
) {
  const milestones = buildDeliveryMilestoneRows(paymentId, serviceSlug);

  if (!milestones) {
    console.warn(
      `No milestone template found for service slug: ${serviceSlug}. Payment ${paymentId} confirmed but no milestones generated.`
    );
    return;
  }

  const { error } = await supabase
    .from('client_deliveries')
    .upsert(milestones, {
      onConflict: 'payment_id,stage_order',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error(`Failed to generate milestones for payment ${paymentId}:`, error.message);
  }
}
