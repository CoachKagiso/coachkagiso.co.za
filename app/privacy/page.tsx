import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy policy for Coach Kagiso, including how personal information is collected, used, stored, and protected under POPIA.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#FCFBFA] text-[#142334]">
      <Navbar />

      <article className="mx-auto max-w-[860px] px-6 pb-24 pt-[130px] lg:px-8 lg:pb-32">
        <p className="inline-flex rounded-full border border-[#C9AD98]/60 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#C9AD98]">
          Legal
        </p>
        <h1 className="mt-6 font-serif text-[50px] leading-tight md:text-[74px]">
          Privacy Policy
        </h1>
        <p className="mt-3 text-[14px] text-[#A09086]">Last updated: 2 May 2026</p>

        <div className="mt-12 space-y-10 text-[16px] leading-relaxed text-[#142334]/78">
          <p>
            Your career information is personal. I treat it that way. This policy explains what I collect, why, and how I protect it, in line with South Africa&apos;s Protection of Personal Information Act (POPIA).
          </p>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">1. Who is responsible</h2>
            <p className="mt-4">
              Kagiso Shabangu, trading as Coach Kagiso, is the responsible party. Contact: <a href="mailto:hello@coachkagiso.co.za" className="underline decoration-[#C9AD98] underline-offset-4">hello@coachkagiso.co.za</a>, Gauteng, South Africa.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">2. What information I collect</h2>
            <p className="mt-4 font-semibold text-[#142334]">You provide directly:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Name, email, phone number, LinkedIn URL</li>
              <li>Career history, CV, qualifications, salary expectations for coaching</li>
              <li>Payment details processed by PayFast. I do not store card numbers</li>
              <li>Answers to audit and intake forms</li>
              <li>Session notes and action plans</li>
            </ul>
            <p className="mt-5 font-semibold text-[#142334]">Collected automatically:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Website usage via analytics, such as pages visited and device type</li>
              <li>Email open and click data via Brevo</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">3. Why I use your information</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>To deliver the service you booked, including coaching, CV work, and masterclass support</li>
              <li>To send session links, resources, and follow-ups</li>
              <li>To process payments and issue invoices</li>
              <li>To send you the Personal Brand Audit you requested</li>
              <li>To improve my services and content</li>
              <li>To comply with legal and tax obligations</li>
            </ul>
            <p className="mt-4">I will only use your information for the purpose you gave it, unless you consent to something else.</p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">4. Legal basis under POPIA</h2>
            <p className="mt-4">I process your information because:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>You consented when you book or download a resource</li>
              <li>It is necessary to perform our contract and deliver coaching</li>
              <li>I have a legitimate interest in improving services and keeping records</li>
              <li>I must comply with law, including tax records</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">5. Who I share with</h2>
            <p className="mt-4">I do not sell your data. I use trusted processors to run the practice:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li><strong>PayFast</strong> in South Africa for payment processing</li>
              <li><strong>cal.com</strong> in the United States for scheduling</li>
              <li><strong>Brevo</strong> in the European Union for email delivery for audits and newsletters</li>
              <li><strong>Google Workspace and Google Drive</strong> in the United States for secure storage of client files</li>
              <li><strong>Loom</strong> in the United States for video walkthroughs using private links only</li>
              <li><strong>Zoom</strong> in the United States for live coaching sessions</li>
              <li><strong>WhatsApp Business</strong>, Meta in the United States, for client communication</li>
            </ul>
            <p className="mt-4">All processors are required to protect your information under their own terms and privacy notices.</p>
            <p className="mt-4">
              <strong>Cross-border data transfers:</strong> Several of these processors store data outside South Africa, primarily in the European Union and the United States. Where this happens, I rely on each provider&apos;s compliance with data protection laws that offer protection equivalent to or stronger than POPIA, together with their published standard data processing terms. I also limit what I share to the minimum needed to deliver the service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">6. How long I keep it</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>Active client files: for the duration of our work plus 2 years</li>
              <li>Session notes: 2 years</li>
              <li>Invoices and tax records: 5 years, as legally required under SARS</li>
              <li>Email list: until you unsubscribe</li>
              <li>Audit and intake form results: 1 year unless you become a client</li>
              <li>WhatsApp Business message history: 12 months from last contact</li>
            </ul>
            <p className="mt-4">After this, I delete or anonymise information securely.</p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">7. Your rights</h2>
            <p className="mt-4">Under POPIA you can:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Ask what information I hold about you</li>
              <li>Request correction or deletion</li>
              <li>Object to processing or withdraw consent</li>
              <li>Request a copy in a portable format</li>
              <li>Lodge a complaint with the Information Regulator at inforeg@justice.gov.za</li>
            </ul>
            <p className="mt-4">Email <a href="mailto:hello@coachkagiso.co.za" className="underline decoration-[#C9AD98] underline-offset-4">hello@coachkagiso.co.za</a> to exercise any right. I will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">8. Security</h2>
            <p className="mt-4">
              I use password protection, two-factor authentication, and encrypted storage. While I take reasonable steps, no online system is 100% secure. If a breach occurs that risks your rights, I will notify you and the Regulator as required by law.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">9. Cookies and analytics</h2>
            <p className="mt-4">My website uses two types of cookies:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li><strong>Essential cookies</strong> are needed for the site to work, for example remembering your form inputs. These are always on.</li>
              <li><strong>Analytics cookies</strong> help me understand how visitors use the site, such as pages visited and time on site. You can decline these via the cookie banner when you first visit, or manage them in your browser settings at any time.</li>
            </ul>
            <p className="mt-4">I do not use advertising trackers or third-party retargeting cookies.</p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">10. Marketing and email frequency</h2>
            <p className="mt-4">
              I will only send you marketing emails if you opt in, for example when you download the Personal Brand Audit or join my email list.
            </p>
            <p className="mt-4">
              For most weeks you will receive no more than one email from me. During specific program windows, such as the lead-up to a Saturday Masterclass cohort or the 14 days after a session you booked, you may receive up to four emails over a two-week period as part of the program you signed up for. Every email includes an unsubscribe link.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">11. Children</h2>
            <p className="mt-4">My services are for adults 18 and older. I do not knowingly collect data from children.</p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">12. Changes</h2>
            <p className="mt-4">I may update this policy as tools or laws change. The latest version will be posted here with a new date.</p>
          </section>

          <p className="border-t border-[#142334]/15 pt-8">
            Questions about privacy? Email <a href="mailto:hello@coachkagiso.co.za" className="underline decoration-[#C9AD98] underline-offset-4">hello@coachkagiso.co.za</a>.
          </p>
        </div>

        <div className="mt-12">
          <Link href="/terms" className="inline-flex rounded-full bg-[#142334] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]">
            Read terms
          </Link>
        </div>
      </article>

      <Footer />
    </main>
  );
}
