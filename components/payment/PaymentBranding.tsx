import Image from 'next/image';
import {
  instalmentMethodLogos,
  paymentMethodLogos,
  paymentProcessorLogo,
} from '@/lib/payment-branding';
import { INSTALMENTS_ENABLED } from '@/lib/instalments';

export default function PaymentBranding() {
  const methods = INSTALMENTS_ENABLED
    ? [...paymentMethodLogos, ...instalmentMethodLogos]
    : paymentMethodLogos;

  return (
    <aside aria-label="Secure payment options" className="mt-5 border-t border-white/12 pt-5">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/54">
          Securely processed by
        </p>
        <div className="inline-flex bg-white px-3 py-2" title={paymentProcessorLogo.name}>
          <Image
            src={paymentProcessorLogo.src}
            alt={paymentProcessorLogo.name}
            width={337}
            height={120}
            className="h-8 w-auto"
          />
        </div>
      </div>

      <div className="mt-3 bg-white px-4 py-4">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#142334]/48">
          Available payment methods
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-4" role="list">
          {methods.map((method) => (
            <div key={method.name} role="listitem" title={method.name} className="flex min-h-7 items-center justify-center">
              {method.src ? (
                <Image
                  src={method.src}
                  alt={method.name}
                  width={method.width}
                  height={method.height}
                  className={method.displayClassName}
                />
              ) : (
                <span className="text-[13px] font-semibold tracking-[0.02em] text-[#142334]/70">
                  {method.name}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
