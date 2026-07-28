'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness, LockKeyhole } from 'lucide-react';
import FilterDropdown from '@/components/FilterDropdown';
import ClientStrategyContext from '@/components/career-tools/ClientStrategyContext';
import ClientStrategyPlanPanel from '@/components/career-tools/ClientStrategyPlanPanel';
import SessionDebriefEditor from '@/components/career-tools/SessionDebriefEditor';
import { buildDashboardAuthUrl } from '@/lib/dashboard-auth-url';
import type { ClientRecord } from '@/lib/clients';
import {
  buildClientStrategyClientChoiceLabel,
  buildClientStrategyWorkspaceHref,
  createEmptySessionDebrief,
  getClientStrategyAccess,
  normalizeSessionDebrief,
  type ClientStrategyServiceSlug,
  type ClientStrategyWorkspaceRecord,
  type SessionDebrief,
  type SessionDebriefFieldKey,
} from '@/lib/client-strategy';

type WorkspaceResponse = {
  workspace?: ClientStrategyWorkspaceRecord | null;
  error?: string;
};

export default function ClientStrategyWorkspace({
  adminKey,
  clients,
  selectedPaymentId,
}: {
  adminKey: string;
  clients: ClientRecord[];
  selectedPaymentId?: string;
}) {
  const router = useRouter();
  const clientAccessRecords = useMemo(() => {
    const now = new Date();
    return clients.map((client) => ({
      client,
      access: getClientStrategyAccess(client, now),
    }));
  }, [clients]);
  const selectableClientRecords = clientAccessRecords.filter(({ access }) =>
    access.status === 'active' || access.status === 'recently-completed'
  );
  const selectedClient = selectableClientRecords
    .find(({ client }) => client.paymentId === selectedPaymentId)?.client || null;
  const recentlyCompletedCount = selectableClientRecords
    .filter(({ access }) => access.status === 'recently-completed').length;
  const archivedCount = clientAccessRecords.filter(({ access }) => access.status === 'archived').length;
  const [workspace, setWorkspace] = useState<ClientStrategyWorkspaceRecord | null>(null);
  const [debrief, setDebrief] = useState<SessionDebrief>(() => createEmptySessionDebrief());
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(createEmptySessionDebrief()));
  const [isLoading, setIsLoading] = useState(Boolean(selectedClient));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const isDirty = JSON.stringify(debrief) !== savedSnapshot;

  useEffect(() => {
    if (!selectedClient) return;
    const controller = new AbortController();
    const paymentId = selectedClient.paymentId;

    async function loadWorkspace() {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(
          buildDashboardAuthUrl(`/api/clients/${encodeURIComponent(paymentId)}/strategy-workspace`, adminKey),
          { signal: controller.signal },
        );
        const data = await response.json().catch(() => null) as WorkspaceResponse | null;
        if (!response.ok) throw new Error(data?.error || 'Could not load this strategy workspace.');

        const loadedDebrief = data?.workspace?.debrief
          ? normalizeSessionDebrief(data.workspace.debrief)
          : createEmptySessionDebrief();
        setWorkspace(data?.workspace || null);
        setDebrief(loadedDebrief);
        setSavedSnapshot(JSON.stringify(loadedDebrief));
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : 'Could not load this strategy workspace.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadWorkspace();
    return () => controller.abort();
  }, [adminKey, selectedClient]);

  function selectClient(paymentId: string) {
    if (paymentId) {
      router.push(buildClientStrategyWorkspaceHref(adminKey, paymentId));
      return;
    }

    router.push(buildDashboardAuthUrl('/resources/career-diagnostic/submissions', adminKey, { tab: 'career-tools' }));
  }

  function updateDebrief(key: SessionDebriefFieldKey, value: string) {
    setDebrief((current) => ({ ...current, [key]: value }));
    setSavedMessage('');
  }

  async function saveDebrief() {
    if (!selectedClient || isSaving) return;
    setIsSaving(true);
    setError('');
    setSavedMessage('');

    try {
      const response = await fetch(
        `/api/clients/${encodeURIComponent(selectedClient.paymentId)}/strategy-workspace`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: adminKey, debrief }),
        },
      );
      const data = await response.json().catch(() => null) as WorkspaceResponse | null;
      if (!response.ok || !data?.workspace) {
        throw new Error(data?.error || 'Could not save the session debrief.');
      }

      const savedDebrief = normalizeSessionDebrief(data.workspace.debrief);
      setWorkspace(data.workspace);
      setDebrief(savedDebrief);
      setSavedSnapshot(JSON.stringify(savedDebrief));
      setSavedMessage(`Revision ${data.workspace.version} saved privately.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the session debrief.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section id="client-strategy-workspace" className="rounded-[8px] bg-[#F5F3EE] p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#8C7466]">
            <LockKeyhole className="h-4 w-4" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Private delivery workspace</p>
          </div>
          <h2 className="mt-2 font-serif text-[36px] leading-tight text-[#142334]">Client Strategy Workspace</h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[#142334]/64">
            Pull the paid engagement, intake, CV reference, and session notes into one place before drafting the client&apos;s follow-up plan.
          </p>
        </div>
        <div className="w-full lg:max-w-md">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Choose client</p>
          <FilterDropdown
            name="strategyClient"
            value={selectedClient?.paymentId || ''}
            onChange={selectClient}
            ariaLabel="Choose a Career Clarity or Glow Up client"
            wrapLabels
            options={[
              { value: '', label: 'Select Career Clarity or Glow Up client' },
              ...selectableClientRecords.map(({ client, access }) => ({
                value: client.paymentId,
                label: buildClientStrategyClientChoiceLabel(client, access),
              })),
            ]}
          />
          {(recentlyCompletedCount > 0 || archivedCount > 0) && (
            <p className="mt-2 text-[11px] leading-relaxed text-[#6B6B6B]">
              {recentlyCompletedCount > 0
                ? `${recentlyCompletedCount} completed client${recentlyCompletedCount === 1 ? '' : 's'} available for the 30-day rework window.`
                : ''}
              {recentlyCompletedCount > 0 && archivedCount > 0 ? ' ' : ''}
              {archivedCount > 0
                ? `${archivedCount} older client${archivedCount === 1 ? '' : 's'} remain${archivedCount === 1 ? 's' : ''} in Clients history.`
                : ''}
            </p>
          )}
        </div>
      </div>

      {selectableClientRecords.length === 0 ? (
        <div className="mt-5 grid min-h-[220px] place-items-center rounded-[8px] bg-white p-6 text-center">
          <div className="max-w-md">
            <BriefcaseBusiness className="mx-auto h-9 w-9 text-[#C9AD98]" />
            <p className="mt-4 font-serif text-[26px] text-[#142334]">No available strategy client yet.</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6B6B6B]">Active and recently completed Career Clarity and Glow Up clients will appear here automatically.</p>
          </div>
        </div>
      ) : !selectedClient ? (
        <div className="mt-5 grid min-h-[220px] place-items-center rounded-[8px] border border-dashed border-[#D8C8BB] bg-white p-6 text-center">
          <div className="max-w-md">
            <BriefcaseBusiness className="mx-auto h-9 w-9 text-[#C9AD98]" />
            <p className="mt-4 font-serif text-[26px] text-[#142334]">Choose the client you are preparing for.</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6B6B6B]">Their engagement context will load without retyping the intake or searching for the CV reference.</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)]">
          <ClientStrategyContext client={selectedClient} />
          <div className="grid gap-4">
            <SessionDebriefEditor
              debrief={debrief}
              isDirty={isDirty}
              isLoading={isLoading}
              isSaving={isSaving}
              error={error}
              savedMessage={savedMessage}
              version={workspace?.version || null}
              updatedAt={workspace?.updatedAt || null}
              onChange={updateDebrief}
              onSave={() => void saveDebrief()}
            />
            {!isLoading && (
              <ClientStrategyPlanPanel
                adminKey={adminKey}
                paymentId={selectedClient.paymentId}
                serviceSlug={selectedClient.serviceSlug as ClientStrategyServiceSlug}
                workspace={workspace}
                debriefDirty={isDirty}
                isTest={selectedClient.isTest}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
