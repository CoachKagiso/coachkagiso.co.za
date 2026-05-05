'use client';

import { useSyncExternalStore } from 'react';
import { Cookie, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const STORAGE_KEY = 'coach-kagiso-cookie-choice';
const COOKIE_EVENT = 'coach-kagiso-cookie-choice-updated';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(COOKIE_EVENT, callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(COOKIE_EVENT, callback);
  };
}

function getSnapshot() {
  return !window.localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot() {
  return false;
}

export default function CookieNotice() {
  const isVisible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const saveChoice = (choice: 'accepted' | 'essential') => {
    window.localStorage.setItem(STORAGE_KEY, choice);
    window.dispatchEvent(new Event(COOKIE_EVENT));
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          role="dialog"
          aria-label="Cookie notice"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-5 left-5 right-5 z-[90] max-w-[440px] border border-[#D8C8BB] bg-white/95 p-5 text-[#142334] shadow-[0_24px_80px_rgba(20,35,52,0.16)] backdrop-blur-md sm:left-auto sm:right-6 sm:bottom-6"
        >
          <div className="flex items-start justify-between gap-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E4D8CB] text-[#142334]">
                <Cookie className="h-4 w-4" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                Cookie note
              </p>
            </div>

            <button
              type="button"
              aria-label="Close cookie notice"
              onClick={() => saveChoice('essential')}
              className="rounded-full p-1.5 text-[#142334]/55 transition hover:bg-[#F7F1EC] hover:text-[#142334]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h2 className="mt-4 font-serif text-[27px] leading-tight">
            A small note about cookies.
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[#142334]/72">
            This site may use essential cookies and simple analytics to understand what is useful, improve the experience, and keep forms working properly.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => saveChoice('accepted')}
              className="inline-flex justify-center rounded-full bg-[#142334] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
            >
              Accept cookies
            </button>
            <button
              type="button"
              onClick={() => saveChoice('essential')}
              className="inline-flex justify-center rounded-full border border-[#D8C8BB] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142334] transition hover:border-[#142334]"
            >
              Essential only
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
