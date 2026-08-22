'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  FileSearch,
  LockKeyhole,
  NotebookPen,
  Search,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import FilterDropdown from '@/components/FilterDropdown';
import ManualClientEngagementForm from '@/components/clients/ManualClientEngagementForm';
import ClientStrategyContext from '@/components/career-tools/ClientStrategyContext';
import ClientStrategyPlanPanel from '@/components/career-tools/ClientStrategyPlanPanel';
import ClientFulfillmentChecklist from '@/components/career-tools/ClientFulfillmentChecklist';
import CvAnalyzerDashboard from '@/components/career-tools/CvAnalyzerDashboard';
import SessionDebriefEditor from '@/components/career-tools/SessionDebriefEditor';
import SessionEvidencePanel from '@/components/career-tools/SessionEvidencePanel';
import SessionPreparationPanel from '@/components/career-tools/SessionPreparationPanel';
import { buildDashboardAuthUrl } from '@/lib/dashboard-auth-url';
import { formatUpcomingClientBookingTime } from '@/lib/client-intake';
import type { ClientRecord } from '@/lib/clients';
import {
  buildClientStrategyClientChoiceLabel,
  buildClientStrategyWorkspaceHref,
  createEmptySessionDebrief,
  getClientStrategyAccess,
  isClientStrategyServiceSlug,
  normalizeClientStrategyWorkspaceView,
  normalizeSessionDebrief,
  type ClientStrategyServiceSlug,
  type ClientStrategyWorkspaceView,
  type ClientStrategyWorkspaceRecord,
  type SessionDebrief,
  type SessionDebriefFieldKey,
} from '@/lib/client-strategy';

type WorkspaceResponse = {
  workspace?: ClientStrategyWorkspaceRecord | null;
  error?: string;
};

const LAST_TAB_PREFIX = 'coach-kagiso:career-tools:last-tab:';
const DEBRIEF_DRAFT_PREFIX = 'coach-kagiso:career-tools:debrief-draft:';
const WORKSPACE_TABS = [
  {
    value: 'context',
    label: 'Client Context',
    icon: UserRound,
    requiresStrategy: false,
    description: 'Intake answers, booking time, and background pulled together so you never retype what a client already told you.',
  },
  {
    value: 'cv',
    label: 'CV Analyzer',
    icon: FileSearch,
    requiresStrategy: false,
    description: 'Read a CV against the target role and get the gaps, strengths, and rewrite direction in one pass.',
  },
  {
    value: 'prep',
    label: 'Session Preparation',
    icon: ClipboardCheck,
    requiresStrategy: true,
    description: 'Build the preparation pack before a coaching session, with the questions and evidence you want to open on.',
  },
  {
    value: 'strategy',
    label: 'Session Brief + Plan',
    icon: NotebookPen,
    requiresStrategy: true,
    description: 'Capture the debrief after the session and turn it into a reviewed support plan you can export.',
  },
] satisfies Array<{
  value: ClientStrategyWorkspaceView;
  label: string;
  icon: typeof UserRound;
  requiresStrategy: boolean;
  description: string;
}>;

function clientSearchText(client: ClientRecord) {
  return [client.buyerName, client.buyerEmail, client.serviceName, client.serviceSlug]
    .join(' ')
    .toLowerCase();
}

function clientInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'C';
}

function accessLabel(status: string | undefined) {
  if (status === 'recently-completed') return 'Follow-up window';
  if (status === 'active') return 'Active engagement';
  return 'Client record';
}

export default function ClientStrategyWorkspace({
  adminKey,
  clients,
  selectedPaymentId,
  selectedView,
}: {
  adminKey: string;
  clients: ClientRecord[];
  selectedPaymentId?: string;
  selectedView?: string;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllClients, setShowAllClients] = useState(false);
  const [standaloneCv, setStandaloneCv] = useState(false);
  const [activeTab, setActiveTab] = useState<ClientStrategyWorkspaceView>(
    () => normalizeClientStrategyWorkspaceView(selectedView),
  );
  const clientAccessRecords = useMemo(() => {
    const now = new Date();
    return clients.map((client) => ({
      client,
      access: getClientStrategyAccess(client, {}, now),
    }));
  }, [clients]);
  const filteredClientRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return clientAccessRecords.filter(({ client, access }) => {
      const matchesSearch = !normalizedSearch || clientSearchText(client).includes(normalizedSearch);
      if (!matchesSearch) return false;
      if (normalizedSearch || showAllClients) return true;
      return access.selectable;
    });
  }, [clientAccessRecords, searchTerm, showAllClients]);
  const selectedRecord = clientAccessRecords.find(({ client, access }) => (
    client.paymentId === selectedPaymentId && access.selectable
  )) || null;
  const selectedClient = selectedRecord?.client || null;
  const selectedAccess = selectedRecord?.access || null;
  const selectedBookingTime = formatUpcomingClientBookingTime(selectedClient?.intake?.source_metadata);
  const hasStrategyTab = Boolean(
    selectedAccess?.canUseStrategyTab && isClientStrategyServiceSlug(selectedClient?.serviceSlug),
  );
  const visibleTab = !hasStrategyTab && (activeTab === 'prep' || activeTab === 'strategy')
    ? 'context'
    : activeTab;
  const recentlyCompletedCount = clientAccessRecords.filter(({ access }) => access.status === 'recently-completed').length;
  const archivedCount = clientAccessRecords.filter(({ access }) => access.status === 'archived').length;
  const [workspace, setWorkspace] = useState<ClientStrategyWorkspaceRecord | null>(null);
  const [debrief, setDebrief] = useState<SessionDebrief>(() => createEmptySessionDebrief());
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(createEmptySessionDebrief()));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const isDirty = JSON.stringify(debrief) !== savedSnapshot;

  useEffect(() => {
    if (!selectedClient) {
      return;
    }

    const storedTab = window.localStorage.getItem(`${LAST_TAB_PREFIX}${selectedClient.paymentId}`);
    const requestedTab = normalizeClientStrategyWorkspaceView(selectedView || storedTab);
    const nextTab = !hasStrategyTab && (requestedTab === 'prep' || requestedTab === 'strategy')
      ? 'context'
      : requestedTab;
    const frame = window.setTimeout(() => setActiveTab(nextTab), 0);
    if (selectedView !== nextTab) {
      router.replace(
        buildClientStrategyWorkspaceHref(adminKey, selectedClient.paymentId, nextTab),
        { scroll: false },
      );
    }
    return () => window.clearTimeout(frame);
  }, [adminKey, hasStrategyTab, router, selectedClient, selectedView]);

  useEffect(() => {
    if (!selectedClient || !hasStrategyTab) {
      const frame = window.setTimeout(() => {
        setWorkspace(null);
        setDebrief(createEmptySessionDebrief());
        setSavedSnapshot(JSON.stringify(createEmptySessionDebrief()));
        setIsLoading(false);
        setError('');
        setSavedMessage('');
      }, 0);
      return () => window.clearTimeout(frame);
    }

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
        const loadedSnapshot = JSON.stringify(loadedDebrief);
        const localDraftKey = `${DEBRIEF_DRAFT_PREFIX}${paymentId}`;
        const localDraft = window.sessionStorage.getItem(localDraftKey);
        let nextDebrief = loadedDebrief;
        if (localDraft) {
          try {
            const parsed = JSON.parse(localDraft) as {
              debrief?: unknown;
              savedSnapshot?: unknown;
            };
            if (parsed.savedSnapshot === loadedSnapshot) {
              nextDebrief = normalizeSessionDebrief(parsed.debrief);
            } else {
              window.sessionStorage.removeItem(localDraftKey);
            }
          } catch {
            window.sessionStorage.removeItem(localDraftKey);
          }
        }
        setWorkspace(data?.workspace || null);
        setDebrief(nextDebrief);
        setSavedSnapshot(loadedSnapshot);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : 'Could not load this strategy workspace.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadWorkspace();
    return () => controller.abort();
  }, [adminKey, hasStrategyTab, selectedClient]);

  function selectClient(paymentId: string) {
    const record = clientAccessRecords.find(({ client }) => client.paymentId === paymentId);
    if (!record?.access.selectable) return;

    setSearchTerm('');
    router.push(buildClientStrategyWorkspaceHref(adminKey, paymentId, 'context'));
  }

  function selectTab(tab: ClientStrategyWorkspaceView) {
    if (!selectedClient) return;
    if ((tab === 'strategy' || tab === 'prep') && !hasStrategyTab) return;
    setActiveTab(tab);
    window.localStorage.setItem(`${LAST_TAB_PREFIX}${selectedClient.paymentId}`, tab);
    router.replace(
      buildClientStrategyWorkspaceHref(adminKey, selectedClient.paymentId, tab),
      { scroll: false },
    );
  }

  function updateDebrief(key: SessionDebriefFieldKey, value: string) {
    setDebrief((current) => {
      const next = { ...current, [key]: value };
      if (selectedClient) {
        window.sessionStorage.setItem(
          `${DEBRIEF_DRAFT_PREFIX}${selectedClient.paymentId}`,
          JSON.stringify({ debrief: next, savedSnapshot }),
        );
      }
      return next;
    });
    setSavedMessage('');
  }

  function applyEvidenceSuggestions(suggestions: SessionDebrief) {
    setDebrief((current) => {
      const next = { ...current };
      for (const key of Object.keys(suggestions) as SessionDebriefFieldKey[]) {
        if (suggestions[key].trim()) next[key] = suggestions[key];
      }
      if (selectedClient) {
        window.sessionStorage.setItem(
          `${DEBRIEF_DRAFT_PREFIX}${selectedClient.paymentId}`,
          JSON.stringify({ debrief: next, savedSnapshot }),
        );
      }
      return next;
    });
    setSavedMessage('');
  }

  async function saveDebrief() {
    if (!selectedClient || !selectedAccess?.canUseStrategyTab || isSaving) return;
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
      window.sessionStorage.removeItem(`${DEBRIEF_DRAFT_PREFIX}${selectedClient.paymentId}`);
      setSavedMessage(`Revision ${data.workspace.version} saved privately.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the session debrief.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section id="client-strategy-workspace" className="rounded-[8px] bg-[#F5F3EE] p-4 md:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#8C7466]">
              <LockKeyhole className="h-4 w-4" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Private Career Tools workspace</p>
            </div>
            <h2 className="mt-1 font-serif text-[32px] leading-tight text-[#142334]">Client workspace</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#142334]/62">
              Move from client context to analysis, session preparation, and a reviewed support plan.
            </p>
            <div className="mt-3">
              <ManualClientEngagementForm
                adminKey={adminKey}
                onCreated={(isTest) => {
                  if (isTest) setShowAllClients(true);
                }}
              />
            </div>
          </div>

          <div className="w-full xl:max-w-2xl">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(260px,1.2fr)]">
              <div className="relative">
                <label htmlFor="career-tools-client-search" className="sr-only">Find a client by name</label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09086]" />
                <input
                  id="career-tools-client-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search clients"
                  className="h-11 w-full rounded-[8px] border border-[#A09086] bg-white pl-10 pr-4 text-[13px] text-[#142334] outline-none transition focus:border-[#142334] focus:ring-2 focus:ring-[#C9AD98]/30"
                />
              </div>
              <FilterDropdown
                name="careerToolsClient"
                value={selectedClient?.paymentId || ''}
                onChange={selectClient}
                ariaLabel="Choose a client for Career Tools"
                wrapLabels
                options={[
                  { value: '', label: 'Select a client' },
                  ...filteredClientRecords.map(({ client, access }) => ({
                    value: client.paymentId,
                    disabled: !access.selectable,
                    label: access.status === 'archived'
                      ? `Archived, outside follow-up window: ${client.buyerName} - ${client.serviceName}`
                      : buildClientStrategyClientChoiceLabel(client, access),
                  })),
                ]}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#6B6B6B]">
                <input
                  type="checkbox"
                  checked={showAllClients}
                  onChange={(event) => setShowAllClients(event.target.checked)}
                  className="h-4 w-4 rounded border-[#A09086] accent-[#142334]"
                />
                Show all clients
              </label>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#8C7466]">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {filteredClientRecords.length} shown
              </span>
            </div>
            {(recentlyCompletedCount > 0 || archivedCount > 0) && (
              <p className="mt-1 hidden truncate text-[11px] leading-relaxed text-[#6B6B6B] sm:block">
                {recentlyCompletedCount > 0 ? `${recentlyCompletedCount} coaching client${recentlyCompletedCount === 1 ? '' : 's'} inside the follow-up window.` : ''}
                {recentlyCompletedCount > 0 && archivedCount > 0 ? ' ' : ''}
                {archivedCount > 0 ? `${archivedCount} archived coaching client${archivedCount === 1 ? '' : 's'} remain retained but cannot be selected.` : ''}
              </p>
            )}
          </div>
        </div>

        {!selectedClient && standaloneCv ? (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-[#142334] px-4 py-3 text-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4 shrink-0 text-[#C9AD98]" />
                  <h3 className="font-serif text-[24px] leading-tight">Standalone CV analysis</h3>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-white/60">
                  Not linked to a client, so this analysis is not saved to a client record.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStandaloneCv(false)}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/30 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-[#142334]"
              >
                <ArrowLeft className="h-4 w-4" /> Back to tools
              </button>
            </div>
            <div className="mt-3 min-w-0">
              <CvAnalyzerDashboard adminKey={adminKey} selectedClient={null} active />
            </div>
          </div>
        ) : !selectedClient ? (
          <div className="min-w-0">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {WORKSPACE_TABS.map((tab) => {
                const Icon = tab.icon;
                const standalone = tab.value === 'cv';
                return (
                  <div key={tab.value} className="flex flex-col rounded-[8px] bg-white p-4">
                    <Icon className="h-6 w-6 text-[#C9AD98]" />
                    <h3 className="mt-3 font-serif text-[22px] leading-tight text-[#142334]">{tab.label}</h3>
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[#142334]/62">{tab.description}</p>
                    <span className="mt-3 inline-flex w-fit rounded-full border border-[#D8C8BB] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">
                      {tab.requiresStrategy ? 'Coaching engagements' : 'All client services'}
                    </span>
                    {standalone && (
                      <button
                        type="button"
                        onClick={() => setStandaloneCv(true)}
                        className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#142334] px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                      >
                        <FileSearch className="h-4 w-4" /> Analyze a CV
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              className="mt-3 grid gap-3 rounded-[8px] border border-dashed border-[#D8C8BB] bg-white p-5 text-center"
              role="status"
            >
              <BriefcaseBusiness className="mx-auto h-8 w-8 text-[#C9AD98]" />
              <div>
                <p className="font-serif text-[24px] leading-tight text-[#142334]">
                  {filteredClientRecords.length === 0
                    ? 'No client matches this view yet.'
                    : 'Pick the paying client you are working on.'}
                </p>
                <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-[#142334]/62">
                  {filteredClientRecords.length === 0
                    ? 'Search by name, switch on Show all clients to inspect retained records, or add the client if they paid offline by EFT, cash, or card machine.'
                    : 'Use the picker above to open the tools with their intake answers and saved work already loaded. If they paid offline by EFT, cash, or card machine, add them with the button above first.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <div className="grid gap-4 rounded-[8px] bg-[#142334] px-4 py-3 text-white xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#C9AD98] text-[13px] font-bold tracking-[0.08em] text-[#142334]">
                  {clientInitials(selectedClient.buyerName)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-serif text-[24px] leading-tight">{selectedClient.buyerName}</h3>
                    {selectedClient.isTest && (
                      <span className="rounded-full border border-[#C4B5FD]/50 bg-[#6D28D9]/35 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#EDE9FE]">
                        Test record
                      </span>
                    )}
                    {selectedBookingTime && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9AD98]/70 bg-[#C9AD98]/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#E8D7C5]">
                        <CalendarClock className="h-3 w-3" />
                        {selectedBookingTime} SAST
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[12px] text-white/60">{selectedClient.buyerEmail}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-left xl:min-w-[390px]">
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/42">Service</dt>
                  <dd className="mt-1 truncate text-[12px] font-semibold text-white/88">{selectedClient.serviceName}</dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/42">Workspace status</dt>
                  <dd className="mt-1 text-[12px] font-semibold text-white/88">{accessLabel(selectedAccess?.status)}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 rounded-[8px] bg-white p-2 xl:grid-cols-4" role="tablist" aria-label="Client workspace tools">
              {WORKSPACE_TABS.map((tab) => {
                const active = visibleTab === tab.value;
                const disabled = tab.requiresStrategy && !hasStrategyTab;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.value}
                    id={`client-workspace-tab-${tab.value}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls="client-workspace-panel"
                    aria-disabled={disabled}
                    disabled={disabled}
                    title={disabled ? 'Available for Career Clarity and Glow Up coaching engagements' : undefined}
                    onClick={() => selectTab(tab.value)}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition ${
                      active
                        ? 'bg-[#142334] text-white'
                        : disabled
                          ? 'cursor-not-allowed bg-[#F5F3EE] text-[#142334]/30'
                          : 'bg-white text-[#142334]/62 hover:bg-[#F5F3EE] hover:text-[#142334]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div
              id="client-workspace-panel"
              role="tabpanel"
              aria-labelledby={`client-workspace-tab-${visibleTab}`}
              className="mt-4 min-w-0"
            >
              {visibleTab === 'context' ? (
                <ClientStrategyContext key={selectedClient.paymentId} client={selectedClient} adminKey={adminKey} />
              ) : visibleTab === 'cv' ? (
                <CvAnalyzerDashboard
                  key={selectedClient.paymentId}
                  adminKey={adminKey}
                  selectedClient={selectedClient}
                  active
                  onPrepareSession={hasStrategyTab ? () => selectTab('prep') : undefined}
                />
              ) : visibleTab === 'prep' ? (
                <SessionPreparationPanel
                  key={selectedClient.paymentId}
                  adminKey={adminKey}
                  paymentId={selectedClient.paymentId}
                  clientName={selectedClient.buyerName}
                  onOpenClientContext={() => selectTab('context')}
                  onOpenCvAnalyzer={() => selectTab('cv')}
                />
              ) : (
                <div className="grid gap-4">
                  <ClientFulfillmentChecklist
                    adminKey={adminKey}
                    paymentId={selectedClient.paymentId}
                    serviceSlug={selectedClient.serviceSlug as ClientStrategyServiceSlug}
                  />
                  <SessionEvidencePanel
                    adminKey={adminKey}
                    paymentId={selectedClient.paymentId}
                    serviceSlug={selectedClient.serviceSlug as ClientStrategyServiceSlug}
                    debrief={debrief}
                    onApplySuggestions={(suggestions) => applyEvidenceSuggestions(suggestions)}
                  />
                  <div className="grid gap-4">
                    <SessionDebriefEditor
                      serviceSlug={selectedClient.serviceSlug as ClientStrategyServiceSlug}
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
                        clientName={selectedClient.buyerName}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
