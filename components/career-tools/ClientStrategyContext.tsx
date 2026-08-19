'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, FileText, Loader2, Pencil, RotateCcw, Save, StickyNote, X } from 'lucide-react';
import type { ClientRecord } from '@/lib/clients';
import {
  ADDITIONAL_CONTEXT_KEY,
  CONTEXT_VERIFICATION_KEY,
  clearClientIntakeDraftField,
  coerceEditedIntakeValue,
  formatEditableIntakeValue,
  hasMeaningfulClientContext,
  type ClientLiveIntake,
} from '@/lib/client-intake';
import { buildDashboardAuthUrl } from '@/lib/dashboard-auth-url';
import { getClientIntakeCardGroup, getClientStrategyPlanLabel, isClientStrategyServiceSlug, orderClientIntakeKeys } from '@/lib/client-strategy';

type IntakeResponse = { intake?: ClientLiveIntake; error?: string };

function formatDateTime(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

function formatFieldLabel(key: string) {
  const normalizedKey = key.replace(/[_\-\s]/g, '').toLowerCase();
  const labels: Record<string, string> = {
    cvNoted: 'CV confirmation',
    notes: 'CV confirmation',
    phone: 'Phone number',
    attendeePhoneNumber: 'Phone number',
    attendeePhone: 'Phone number',
    telephone: 'Phone number',
    currentRole: 'Current role and tenure',
    skillStrength: 'Strength at work',
    clarityQuestion: 'Clarity goal',
    clarityGoal: 'Clarity goal',
    previousAttempts: 'Already tried',
    alreadyTried: 'Already tried',
    stuckScale: 'How stuck right now',
  };
  const normalizedLabels = Object.fromEntries(Object.entries(labels).map(([labelKey, label]) => [labelKey.replace(/[_\-\s]/g, '').toLowerCase(), label]));
  if (normalizedLabels[normalizedKey]) return normalizedLabels[normalizedKey];
  if (key === ADDITIONAL_CONTEXT_KEY) return 'Additional context';
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function initialLiveIntake(client: ClientRecord): ClientLiveIntake {
  const originalFormData = client.intake?.form_data || {};
  return {
    intakeId: client.intake?.id || null,
    submittedAt: client.intake?.submitted_at || null,
    source: client.intake?.source || null,
    sourceReference: client.intake?.source_reference || null,
    sourceMetadata: client.intake?.source_metadata || {},
    cvFileUrl: client.intake?.cv_file_url || null,
    originalFormData,
    formData: originalFormData,
    overrides: [],
    hasIntake: client.hasIntake,
    contextVerified: false,
  };
}

function draftFromIntake(intake: ClientLiveIntake) {
  const keys = new Set([
    ...Object.keys(intake.originalFormData),
    ...Object.keys(intake.formData),
    ...intake.overrides.map((override) => override.fieldName),
    ADDITIONAL_CONTEXT_KEY,
  ]);
  keys.delete(CONTEXT_VERIFICATION_KEY);
  return Array.from(keys).reduce<Record<string, string>>((result, key) => {
    result[key] = formatEditableIntakeValue(intake.formData[key]);
    return result;
  }, {});
}

function latestOverrideByField(intake: ClientLiveIntake) {
  return intake.overrides.reduce<Record<string, ClientLiveIntake['overrides'][number]>>((result, override) => {
    result[override.fieldName] = override;
    return result;
  }, {});
}

function IntakeGroupDivider({ label, description }: { label: string; description: string }) {
  return (
    <div className="lg:col-span-2 mt-2 border-t border-[#C9AD98]/30 pt-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C9AD98]">
        {label}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-white/48">
        {description}
      </p>
    </div>
  );
}

function AutoGrowingTextarea({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 104)}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={4}
      className="mt-1 w-full resize-y overflow-y-auto rounded-[6px] border border-[#D8C8BB] bg-[#FCFBF8] px-2.5 py-2 text-[13px] leading-relaxed outline-none focus:border-[#142334] focus:ring-2 focus:ring-[#C9AD98]/30"
    />
  );
}

export default function ClientStrategyContext({ client, adminKey }: { client: ClientRecord; adminKey: string }) {
  const [intake, setIntake] = useState<ClientLiveIntake>(() => initialLiveIntake(client));
  const [draft, setDraft] = useState<Record<string, string>>(() => draftFromIntake(initialLiveIntake(client)));
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingIntake, setIsLoadingIntake] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [intakeError, setIntakeError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResettingWorkspace, setIsResettingWorkspace] = useState(false);
  const [workspaceResetError, setWorkspaceResetError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadIntake() {
      try {
        const response = await fetch(
          buildDashboardAuthUrl(`/api/clients/${encodeURIComponent(client.paymentId)}/intake`, adminKey),
          { signal: controller.signal },
        );
        const data = await response.json().catch(() => null) as IntakeResponse | null;
        if (!response.ok || !data?.intake) throw new Error(data?.error || 'Could not load the latest intake values.');
        setIntake(data.intake);
        setDraft(draftFromIntake(data.intake));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setIntakeError(error instanceof Error ? error.message : 'Could not load the latest intake values.');
      } finally {
        if (!controller.signal.aborted) setIsLoadingIntake(false);
      }
    }

    void loadIntake();
    return () => controller.abort();
  }, [adminKey, client]);

  const keys = useMemo(() => Array.from(new Set([
    ...Object.keys(intake.originalFormData),
    ...Object.keys(intake.formData),
    ...intake.overrides.map((override) => override.fieldName),
    ADDITIONAL_CONTEXT_KEY,
  ])).filter((key) => key !== CONTEXT_VERIFICATION_KEY), [intake]);
  const orderedKeys = useMemo(() => orderClientIntakeKeys(keys), [keys]);
  const identityKeys = useMemo(() => orderedKeys.filter((key) => getClientIntakeCardGroup(key) === 'identity'), [orderedKeys]);
  const contextKeys = useMemo(() => orderedKeys.filter((key) => getClientIntakeCardGroup(key) === 'context'), [orderedKeys]);
  const displayKeys = useMemo(() => [...identityKeys, ...contextKeys], [contextKeys, identityKeys]);
  const contextSectionLabel = intake.source === 'manual_dashboard' ? 'Coach-entered context' : 'Booking questions';
  const contextSectionDescription = intake.source === 'manual_dashboard'
    ? 'Notes and context entered by Kagiso for this engagement.'
    : 'Questions and answers supplied during the Career Clarity booking.';
  const overridesByField = useMemo(() => latestOverrideByField(intake), [intake]);
  const planLabel = isClientStrategyServiceSlug(client.serviceSlug)
    ? getClientStrategyPlanLabel(client.serviceSlug)
    : 'CV Analyzer';
  const hasDirtyDraft = JSON.stringify(draft) !== JSON.stringify(draftFromIntake(intake));
  const hasMeaningfulContext = hasMeaningfulClientContext(intake.formData);

  function cancelEditing() {
    setDraft(draftFromIntake(intake));
    setIsEditing(false);
    setSavedMessage('');
  }

  async function verifyContext() {
    if (isVerifying || intake.contextVerified || !hasMeaningfulContext) return;
    setIsVerifying(true);
    setIntakeError('');
    setSavedMessage('');
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(client.paymentId)}/intake`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey, values: { [CONTEXT_VERIFICATION_KEY]: true } }),
      });
      const data = await response.json().catch(() => null) as IntakeResponse | null;
      if (!response.ok || !data?.intake) throw new Error(data?.error || 'Could not verify client context.');
      setIntake(data.intake);
      setDraft(draftFromIntake(data.intake));
      setSavedMessage('Context verified. Session Preparation can now use these answers.');
    } catch (error) {
      setIntakeError(error instanceof Error ? error.message : 'Could not verify client context.');
    } finally {
      setIsVerifying(false);
    }
  }

  async function saveIntake() {
    if (isSaving || !hasDirtyDraft) return;
    setIsSaving(true);
    setIntakeError('');
    setSavedMessage('');

    const values = Object.entries(draft).reduce<Record<string, unknown>>((result, [key, value]) => {
      result[key] = coerceEditedIntakeValue(value, intake.formData[key] ?? intake.originalFormData[key]);
      return result;
    }, {});

    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(client.paymentId)}/intake`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey, values }),
      });
      const data = await response.json().catch(() => null) as IntakeResponse | null;
      if (!response.ok || !data?.intake) throw new Error(data?.error || 'Could not save intake edits.');
      setIntake(data.intake);
      setDraft(draftFromIntake(data.intake));
      setIsEditing(false);
      setSavedMessage('Saved as a Kagiso override. The original submission remains available.');
    } catch (error) {
      setIntakeError(error instanceof Error ? error.message : 'Could not save intake edits.');
    } finally {
      setIsSaving(false);
    }
  }

  async function resetWorkspace() {
    if (isResettingWorkspace) return;
    if (!window.confirm(
      'Reset this entire client workspace? This clears Client Context edits, CV Analyzer reports, '
      + 'Session Preparation, and the session debrief. Only the original booking answers and CV stay. '
      + 'Approved or delivered plans, and anything already checkpointed, are kept as a record.',
    )) return;
    const phrase = `RESET ${client.buyerName.toUpperCase()} EVERYTHING`;
    if (window.prompt(`Type ${phrase} to confirm.`) !== phrase) {
      setWorkspaceResetError('Reset cancelled because the confirmation phrase did not match.');
      return;
    }
    setWorkspaceResetError('');
    setIsResettingWorkspace(true);
    try {
      const response = await fetch(
        buildDashboardAuthUrl(`/api/clients/${encodeURIComponent(client.paymentId)}/reset-workspace`, adminKey),
        {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: adminKey, confirmation: phrase, expectedConfirmation: phrase }),
        },
      );
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || 'Could not reset this client workspace.');
      // Debrief, plan drafts, and CV state are all held in sibling tabs and in the parent
      // workspace component, not just here, so a reload is the only way to guarantee every
      // tab reflects the reset instead of showing stale in-memory data.
      window.location.reload();
    } catch (error) {
      setWorkspaceResetError(error instanceof Error ? error.message : 'Could not reset this client workspace.');
      setIsResettingWorkspace(false);
    }
  }

  return (
    <section className="rounded-[8px] bg-[#142334] p-5 text-white" aria-labelledby="client-context-title">
      {client.isTest && (
        <div className="mb-4 rounded-[8px] border border-[#C4B5FD]/50 bg-[#6D28D9]/30 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#EDE9FE]">
          Test record. External plan delivery is blocked.
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Client context</p>
          <h3 id="client-context-title" className="mt-2 font-serif text-[30px] leading-tight">{client.buyerName}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-white/64">{client.buyerEmail}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full bg-[#C9AD98] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#142334]">
            {planLabel}
          </span>
          <button
            type="button"
            onClick={() => void resetWorkspace()}
            disabled={isResettingWorkspace}
            className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-white/20 px-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white/55 transition hover:border-[#F4B6AA] hover:text-[#F4B6AA] disabled:opacity-50"
          >
            {isResettingWorkspace ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Reset client workspace
          </button>
        </div>
      </div>

      {workspaceResetError && (
        <p className="mt-3 flex items-start gap-2 rounded-[8px] border border-[#F4B6AA]/60 bg-[#7A2F22]/25 px-3 py-2.5 text-[12px] leading-relaxed text-[#FFD9CE]" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {workspaceResetError}
        </p>
      )}

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[8px] border border-white/10 bg-white/[0.06] p-3">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/48">Service</dt>
          <dd className="mt-1 text-[13px] font-semibold text-white">{client.serviceName}</dd>
        </div>
        <div className="rounded-[8px] border border-white/10 bg-white/[0.06] p-3">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/48">Intake</dt>
          <dd className="mt-1 text-[13px] font-semibold text-white">
            {intake.hasIntake
              ? intake.source === 'cal'
                ? 'Cal.com booking'
                : intake.source === 'manual_dashboard'
                  ? 'Manual dashboard entry'
                  : intake.intakeId
                    ? 'Client form + Kagiso notes'
                    : 'Kagiso-entered context'
              : 'Not available'}
          </dd>
        </div>
      </dl>

      {intake.cvFileUrl && (
        <div className="mt-3 inline-flex items-center gap-2 text-[12px] font-semibold text-[#E4D8CB]">
          <FileText className="h-4 w-4 text-[#C9AD98]" />
          CV source available in the Analyzer
        </div>
      )}

      <div className="mt-5 border-t border-white/10 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/48">Intake answers</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/52">Live values are used by CV analysis, Session Prep, and plan generation.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
          {!intake.contextVerified && hasMeaningfulContext && !isEditing && (
            <button type="button" onClick={() => void verifyContext()} disabled={isVerifying} className="inline-flex min-h-9 items-center gap-1.5 rounded-[7px] bg-[#C9AD98] px-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#142334] disabled:opacity-50">
              {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {isVerifying ? 'Verifying...' : 'Mark verified'}
            </button>
          )}
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-[7px] border border-white/20 px-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/80 transition hover:border-[#C9AD98] hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={cancelEditing} disabled={isSaving} className="inline-flex min-h-9 items-center gap-1 rounded-[7px] border border-white/20 px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white/75 hover:text-white">
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button type="button" onClick={() => void saveIntake()} disabled={isSaving || !hasDirtyDraft} className="inline-flex min-h-9 items-center gap-1 rounded-[7px] bg-[#C9AD98] px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#142334] disabled:cursor-not-allowed disabled:opacity-45">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
          )}
          </div>
        </div>

        {isLoadingIntake && <p className="mt-3 text-[12px] text-white/55">Checking for the latest saved intake edits...</p>}
        {intakeError && <p className="mt-3 rounded-[7px] border border-[#FCA5A5]/40 bg-[#991B1B]/20 px-3 py-2 text-[12px] leading-relaxed text-[#FECACA]" role="alert">{intakeError}</p>}
        {savedMessage && <p className="mt-3 inline-flex items-start gap-1.5 text-[12px] leading-relaxed text-[#BBF7D0]" role="status"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />{savedMessage}</p>}
        <p className={`mt-3 text-[12px] leading-relaxed ${intake.contextVerified ? 'text-[#BBF7D0]' : hasMeaningfulContext ? 'text-[#FDE68A]' : 'text-[#FED7AA]'}`}>
          {intake.contextVerified
            ? 'Context verified for Session Preparation.'
            : hasMeaningfulContext
              ? 'Review the saved answers, then mark this context as verified before preparing the session.'
              : 'Placeholder answers such as “NA” do not count. Add the emailed answers under Additional context.'}
        </p>

        {isEditing ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {displayKeys.map((key, index) => {
              const value = draft[key] || '';
              const originalValue = intake.formData[key] ?? intake.originalFormData[key];
              const longField = value.length > 120 || /note|detail|goal|challenge|context|role|experience|reason|message|expect/i.test(key);
              const override = overridesByField[key];
              const group = getClientIntakeCardGroup(key);
              const isContext = group === 'context';
              const startsContext = isContext && index === identityKeys.length;
              return (
                <Fragment key={key}>
                  {startsContext && <IntakeGroupDivider label={contextSectionLabel} description={contextSectionDescription} />}
                <div data-intake-group={group} className={`group relative rounded-[8px] bg-white p-3 text-[#142334] ${isContext ? 'min-h-[88px]' : ''}`}>
                  <label htmlFor={`intake-${key}`} className="block pr-16 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">{formatFieldLabel(key)}</label>
                  {value && (
                    <button
                      type="button"
                      onClick={() => setDraft((current) => clearClientIntakeDraftField(current, key))}
                      aria-label={`Clear ${formatFieldLabel(key)}`}
                      className="absolute right-3 top-2 inline-flex min-h-7 items-center gap-1 rounded-[5px] px-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[#8C7466] opacity-0 transition hover:bg-[#F3E9DF] hover:text-[#142334] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9AD98] group-focus-within:opacity-100 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                  {longField ? (
                    <AutoGrowingTextarea
                      id={`intake-${key}`}
                      value={value}
                      onChange={(nextValue) => setDraft((current) => ({ ...current, [key]: nextValue }))}
                    />
                  ) : (
                    <input id={`intake-${key}`} type="text" value={value} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 h-10 w-full rounded-[6px] border border-[#D8C8BB] bg-[#FCFBF8] px-2.5 text-[13px] outline-none focus:border-[#142334] focus:ring-2 focus:ring-[#C9AD98]/30" />
                  )}
                  {override && <p className="mt-1 text-[10px] text-[#8C7466]">Edited by Kagiso · {formatDateTime(override.editedAt) || 'recently'}</p>}
                  {override && Object.prototype.hasOwnProperty.call(intake.originalFormData, key) && (
                    <details className="mt-1 text-[10px] text-[#8C7466]">
                      <summary className="cursor-pointer font-semibold">View original client answer</summary>
                      <p className="mt-1 whitespace-pre-wrap rounded-[5px] bg-[#F5F3EE] p-2 text-[#142334]/70">{formatEditableIntakeValue(intake.originalFormData[key]) || 'Not provided'}</p>
                    </details>
                  )}
                  {key === ADDITIONAL_CONTEXT_KEY && <p className="mt-1 text-[10px] leading-relaxed text-[#8C7466]">Use this for details shared outside the original onboarding form.</p>}
                </div>
                </Fragment>
              );
            })}
          </div>
        ) : keys.length === 1 && keys[0] === ADDITIONAL_CONTEXT_KEY && !intake.hasIntake ? (
          <p className="mt-3 text-[13px] leading-relaxed text-white/58">No onboarding answers are available yet. Click Edit to add context from your client conversation.</p>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {displayKeys.map((key, index) => {
              const value = formatEditableIntakeValue(intake.formData[key]);
              const override = overridesByField[key];
              const group = getClientIntakeCardGroup(key);
              const isContext = group === 'context';
              const startsContext = isContext && index === identityKeys.length;
              return (
                <Fragment key={key}>
                  {startsContext && <IntakeGroupDivider label={contextSectionLabel} description={contextSectionDescription} />}
                <div data-intake-group={group} className={`relative rounded-[8px] bg-white p-3 text-[#142334] ${isContext ? 'min-h-[88px]' : ''}`}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">{formatFieldLabel(key)}</p>
                  <p className={`mt-1 text-[13px] leading-relaxed ${value ? 'text-[#142334]/78' : 'text-[#142334]/42'}`}>{value || 'Not provided'}</p>
                  {override && <p className="mt-1 text-[10px] text-[#8C7466]">Edited by Kagiso · {formatDateTime(override.editedAt) || 'recently'}</p>}
                  {override && Object.prototype.hasOwnProperty.call(intake.originalFormData, key) && (
                    <details className="mt-1 text-[10px] text-[#8C7466]">
                      <summary className="cursor-pointer font-semibold">View original client answer</summary>
                      <p className="mt-1 whitespace-pre-wrap rounded-[5px] bg-[#F5F3EE] p-2 text-[#142334]/70">{formatEditableIntakeValue(intake.originalFormData[key]) || 'Not provided'}</p>
                    </details>
                  )}
                </div>
                </Fragment>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-[#C9AD98]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/48">Existing notes</p>
        </div>
        {client.notes.length === 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-white/58">No delivery notes have been saved for this engagement.</p>
        ) : (
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {client.notes.slice(0, 3).map((note) => (
              <p key={note.id} className="rounded-[8px] border border-white/10 bg-white/[0.06] p-3 text-[12px] leading-relaxed text-white/72">
                {note.body}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
