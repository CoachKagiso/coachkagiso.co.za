'use client';

import { useState } from 'react';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { OPENROUTER_KIMI_K2_6_FREE_MODEL } from '@/lib/ai-models';

type AiConfigurationPanelProps = {
  adminKey: string;
};

export default function AiConfigurationPanel({ adminKey }: AiConfigurationPanelProps) {
  const [showProduction, setShowProduction] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [referenceKey, setReferenceKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  async function testConnection() {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch('/api/content/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key: adminKey,
          mode: 'polish',
          userPrompt: 'Reply with the word CONNECTED only.',
          context: {},
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { result?: string; error?: string };
      if (!response.ok) throw new Error(data.error || 'Connection failed.');
      const connected = String(data.result || '').trim().toUpperCase().includes('CONNECTED');
      if (!connected) throw new Error('AI service responded, but not with the expected test word.');
      setStatus({ tone: 'success', message: 'Connected to GLM 5.2' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Connection failed. Check ZAI_API_KEY in your environment variables.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA]">
      <div className="flex items-start justify-between gap-4 border-b border-[#D8C8BB] px-6 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">AI model configuration</p>
          <h2 className="mt-2 font-serif text-[36px] leading-tight text-[#142334]">Content Studio AI routing</h2>
        </div>
        <Sparkles className="h-5 w-5 shrink-0 text-[#C9AD98]" />
      </div>

      <div className="grid gap-5 p-6">
        <div className="rounded-[8px] border border-[#F59E0B] bg-[#FEF3C7] px-4 py-3 text-[#92400E]">
          <p className="text-[13px] font-bold">Test configuration active</p>
          <p className="mt-1 text-[13px] leading-relaxed">
            Currently routing to GLM 5.2 via Z.ai for testing. Do not use with real lead data during this phase. Switch to production models once testing is complete.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[8px] bg-[#F5F3EE] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Primary model</p>
            <p className="mt-2 font-serif text-[25px] leading-tight text-[#142334]">GLM 5.2 via Z.ai</p>
            <p className="mt-1 text-[12px] text-[#142334]/58">Test</p>
            <button type="button" onClick={() => setShowProduction((value) => !value)} className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#142334]">
              Switch to production
            </button>
          </div>
          <div className="rounded-[8px] bg-[#F5F3EE] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Secondary model</p>
            <p className="mt-2 font-serif text-[25px] leading-tight text-[#142334]">GLM 5.2 via Z.ai</p>
            <p className="mt-1 text-[12px] text-[#142334]/58">Test, same model</p>
          </div>
        </div>

        {showProduction && (
          <div className="grid gap-3 rounded-[8px] border border-[#E4D8CB] bg-white p-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="studio-label">Production base URL</span>
              <input className="studio-input h-11" value="https://openrouter.ai/api/v1" readOnly />
            </label>
            <label className="grid gap-2">
              <span className="studio-label">Production model</span>
              <input className="studio-input h-11" value={OPENROUTER_KIMI_K2_6_FREE_MODEL} readOnly />
            </label>
            <p className="text-[12px] leading-relaxed text-[#142334]/62 md:col-span-2">
              Production switch is intentionally code-gated. When GLM 5.2 testing is complete, update the provider constants in the AI route and add the OpenRouter headers.
            </p>
          </div>
        )}

        <div className="grid gap-3 rounded-[8px] bg-[#F8F6F4] p-4">
          <label className="grid gap-2">
            <span className="studio-label">Z.ai API key</span>
            <span className="relative">
              <input
                value={referenceKey}
                onChange={(event) => setReferenceKey(event.target.value)}
                type={showKey ? 'text' : 'password'}
                className="studio-input h-11 w-full pr-12"
                placeholder="Paste here for reference only"
              />
              <button
                type="button"
                onClick={() => setShowKey((value) => !value)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#142334]/65 hover:bg-[#F5F3EE]"
                aria-label={showKey ? 'Hide Z.ai API key' : 'Show Z.ai API key'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          <p className="text-[12px] leading-relaxed text-[#142334]/62">
            Add this key to your Vercel environment variables as <span className="font-semibold text-[#142334]">ZAI_API_KEY</span> for the AI to function. The API route reads the server environment variable, not this field.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={testConnection} disabled={busy} className="studio-primary-button">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Test connection
            </button>
            {status && (
              <p className={`text-[13px] font-semibold ${status.tone === 'success' ? 'text-[#0F766E]' : 'text-[#92400E]'}`}>
                {status.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
