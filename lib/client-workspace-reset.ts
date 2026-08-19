import { createEmptySessionDebrief } from '@/lib/client-strategy';
import {
  getClientStrategyWorkspace,
  resetClientStrategyPlanDrafts,
  saveClientStrategyWorkspace,
} from '@/lib/client-strategy-store';
import { deleteClientIntakeOverrides } from '@/lib/client-intake-store';
import { resetClientCvAnalysis } from '@/lib/client-cv-store';
import { deleteAllClientSessionPreparations } from '@/lib/client-session-preparation-store';

export type ClientWorkspaceResetSummary = {
  intakeOverridesCleared: number;
  cvReportsCleared: number;
  sessionPreparationsCleared: number;
  plansCleared: number;
  debriefReset: boolean;
};

/**
 * Full "start this client over" reset: Client Context edits, CV Analyzer reports, Session
 * Preparation, and the session debrief are wiped; the original booking intake (and its CV) is
 * untouched, since that is the one thing a reload should still bring back. Career Development
 * Plan drafts go through the same reset_client_strategy_plan_drafts guard the standalone
 * "Reset drafts" action already uses, so anything approved, delivered, or checkpointed survives.
 */
export async function resetClientWorkspace(paymentId: string): Promise<ClientWorkspaceResetSummary> {
  const workspace = await getClientStrategyWorkspace(paymentId);
  const [intakeOverridesCleared, cvReportsCleared, sessionPreparationsCleared] = await Promise.all([
    deleteClientIntakeOverrides(paymentId),
    resetClientCvAnalysis(paymentId),
    deleteAllClientSessionPreparations(paymentId),
  ]);

  let plansCleared = 0;
  let debriefReset = false;
  if (workspace) {
    plansCleared = await resetClientStrategyPlanDrafts(workspace.id);
    await saveClientStrategyWorkspace({
      paymentId,
      serviceSlug: workspace.serviceSlug,
      debrief: createEmptySessionDebrief(),
    });
    debriefReset = true;
  }

  return { intakeOverridesCleared, cvReportsCleared, sessionPreparationsCleared, plansCleared, debriefReset };
}
