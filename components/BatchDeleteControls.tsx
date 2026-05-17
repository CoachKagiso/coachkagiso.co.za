'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

type BatchDeleteControlsProps = {
  group: string;
  phrase: string;
  label: string;
};

export default function BatchDeleteControls({ group, phrase, label }: BatchDeleteControlsProps) {
  const [typedPhrase, setTypedPhrase] = useState('');
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    const selector = `input[data-batch-group="${group}"]`;
    const updateSelectedCount = () => {
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(selector));
      const nextSelectedCount = inputs.filter((input) => input.checked).length;
      setSelectedCount(nextSelectedCount);
      if (nextSelectedCount === 0) setTypedPhrase('');
    };
    const queueSelectedCountUpdate = () => {
      window.setTimeout(updateSelectedCount, 0);
    };

    const initialTimeout = window.setTimeout(updateSelectedCount, 0);
    const selectedCountInterval = window.setInterval(updateSelectedCount, 250);
    document.addEventListener('change', updateSelectedCount);
    document.addEventListener('input', updateSelectedCount);
    document.addEventListener('click', queueSelectedCountUpdate);

    return () => {
      window.clearTimeout(initialTimeout);
      window.clearInterval(selectedCountInterval);
      document.removeEventListener('change', updateSelectedCount);
      document.removeEventListener('input', updateSelectedCount);
      document.removeEventListener('click', queueSelectedCountUpdate);
    };
  }, [group]);

  function setAll(checked: boolean) {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(`input[data-batch-group="${group}"]`));
    inputs.forEach((input) => {
      input.checked = checked;
    });
    setSelectedCount(checked ? inputs.length : 0);
    if (!checked) setTypedPhrase('');
  }

  const canDelete = selectedCount > 0 && typedPhrase === phrase;

  return (
    <div
      data-batch-delete-controls
      className={`${selectedCount === 0 ? 'hidden' : 'block'} border-b border-[#D8C8BB] bg-[#FCFBFA] px-6 py-5`}
    >
      <div className="grid gap-4 lg:grid-cols-[auto_auto_1fr_auto] lg:items-end">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="inline-flex items-center justify-center rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#142334]"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="inline-flex items-center justify-center rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#142334]"
          >
            Clear
          </button>
        </div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.17em] text-[#A09086]">
          {selectedCount} selected
        </p>
        <label className="grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A09086]">
            Type {phrase} to delete {label}
          </span>
          <input
            name="confirm_phrase"
            value={typedPhrase}
            onChange={(event) => setTypedPhrase(event.target.value)}
            className="h-11 border border-[#D8C8BB] bg-white px-4 text-[14px] outline-none focus:border-[#142334]"
          />
        </label>
        <button
          type="submit"
          disabled={!canDelete}
          onClick={(event) => {
            if (!window.confirm(`Delete ${selectedCount} selected ${label}? This cannot be undone.`)) {
              event.preventDefault();
            }
          }}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#C98672]/45 px-5 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#7A2F22] transition hover:border-[#7A2F22] hover:bg-[#FFF5F2] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[#C98672]/45 disabled:hover:bg-transparent"
        >
          Delete selected <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
