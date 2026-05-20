import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardSettingsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const params = new URLSearchParams();
  if (key) params.set('key', key);
  params.set('tab', 'settings');

  redirect(`/resources/career-diagnostic/submissions?${params.toString()}`);
}
