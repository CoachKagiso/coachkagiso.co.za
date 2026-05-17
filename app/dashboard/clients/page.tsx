import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardClientsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; payment?: string }>;
}) {
  const { key, payment } = await searchParams;
  const params = new URLSearchParams();
  if (key) params.set('key', key);
  if (payment) params.set('payment', payment);
  params.set('tab', 'clients');

  redirect(`/resources/career-diagnostic/submissions?${params.toString()}`);
}
