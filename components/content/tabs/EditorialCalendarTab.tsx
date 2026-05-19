'use client';

import type { ReactNode } from 'react';

export function EditorialCalendarTab({ children }: { children: ReactNode }) {
  return <section className="rounded-[8px] bg-white p-5">{children}</section>;
}
