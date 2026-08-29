import { CalendarClock } from 'lucide-react';
import { getInstalmentPlans } from '@/lib/instalments';

type InstalmentOptionsProps = {
  amount: number;
};

export default function InstalmentOptions({ amount }: InstalmentOptionsProps) {
  const plans = getInstalmentPlans(amount);
  if (plans.length === 0) return null;

  return (
    <div className="mt-5 border border-[#C9AD98]/45 bg-white/[0.05] p-4">
      <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#C9AD98]">
        <CalendarClock className="h-4 w-4" />
        Or pay it off, interest-free
      </p>
      <ul className="mt-3 grid gap-3">
        {plans.map((plan) => (
          <li key={plan.provider}>
            <p className="text-[15px] font-semibold text-white">
              {plan.headline}{' '}
              <span className="font-normal text-white/58">with {plan.name}</span>
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/62">{plan.schedule}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] leading-relaxed text-white/48">
        Choose Payflex or MoreTyme on the PayFast screen. No interest and no extra fees. Approval is
        theirs to give, so your limit is set by them, not by us.
      </p>
    </div>
  );
}
