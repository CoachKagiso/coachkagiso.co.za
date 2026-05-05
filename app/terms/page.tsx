import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description:
    'Terms and conditions for Coach Kagiso services, bookings, payments, cancellations, intellectual property, and website use.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#FCFBFA] text-[#142334]">
      <Navbar />

      <article className="mx-auto max-w-[860px] px-6 pb-24 pt-[130px] lg:px-8 lg:pb-32">
        <p className="inline-flex rounded-full border border-[#C9AD98]/60 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#C9AD98]">
          Legal
        </p>
        <h1 className="mt-6 font-serif text-[50px] leading-tight md:text-[74px]">
          Terms and Conditions
        </h1>
        <p className="mt-3 text-[14px] text-[#A09086]">Last updated: 2 May 2026</p>

        <div className="mt-12 space-y-10 text-[16px] leading-relaxed text-[#142334]/78">
          <p>
            Welcome to Coach Kagiso. These terms govern your use of my coaching services, website, and digital products. By booking a service or using coachkagiso.co.za, you agree to these terms.
          </p>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">1. Who I am</h2>
            <p className="mt-4">
              Kagiso Shabangu, trading as Coach Kagiso, is a career development and personal brand coaching practice based in Gauteng, South Africa. I work with professionals across South Africa, primarily online via Zoom.
            </p>
            <p className="mt-4">Contact: <a href="mailto:hello@coachkagiso.co.za" className="underline decoration-[#C9AD98] underline-offset-4">hello@coachkagiso.co.za</a></p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">2. My services</h2>
            <p className="mt-4">Currently available:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>1-on-1 coaching: Career Clarity Session and Glow Up VIP Package</li>
              <li>Done-with-you services: CV Revamp, Cover Letter, LinkedIn Optimisation, CV + LinkedIn Bundle, and 48-Hour CV Review</li>
              <li>Saturday Masterclass, which is live group sessions fortnightly during the cohort window</li>
              <li>Free resource: Personal Brand Audit</li>
            </ul>
            <p className="mt-4">
              Additional 1-on-1 services, including First 90 Days Coaching and Leadership Launchpad, and the interactive Career Diagnostic are launching from October 2026. Service descriptions, deliverables, and pricing are listed on my <Link href="/work-with-me" className="underline decoration-[#C9AD98] underline-offset-4">Work With Me</Link> page. I reserve the right to update services and prices with notice.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">3. Bookings and payment</h2>
            <p className="mt-4">All bookings are made via cal.com. Payment is required to confirm your spot, processed securely through PayFast.</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Prices are in South African Rand (ZAR) and include VAT where applicable</li>
              <li>Payment plans are available for services over R800 via PayJustNow, over 2 instalments</li>
              <li>Your booking is confirmed only once payment reflects</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">4. Cancellations, rescheduling, and refunds</h2>
            <p className="mt-4">Because I balance this practice with full-time work, my capacity is limited. Please respect the boundaries:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li><strong>Reschedule:</strong> You may reschedule once, up to 24 hours before your session, via the cal.com link in your booking confirmation</li>
              <li><strong>Cancellation with refund:</strong> Cancel up to 24 hours before and receive a full refund, less PayFast transaction fees</li>
              <li><strong>Late cancellation:</strong> Less than 24 hours notice, the session is forfeited. No refund</li>
              <li><strong>No-show:</strong> No refund or reschedule</li>
              <li><strong>CV, Cover Letter, and LinkedIn services:</strong> Once work has started, no refunds. You have a 7-day revision window included in the price</li>
              <li><strong>Saturday Masterclass:</strong> You may transfer to a future session up to 24 hours before, at no extra cost. No refunds within 24 hours. Sessions are not recorded for attendee privacy reasons. You will receive the workbook, take-home pack, and follow-up materials by email</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">5. Your responsibilities</h2>
            <p className="mt-4">Coaching works when you do. You agree to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Show up on time and prepared</li>
              <li>Provide accurate information about your career history</li>
              <li>Complete agreed actions between sessions</li>
              <li>Respect session boundaries: I respond to non-urgent messages on weekday evenings, typically within 24 to 48 hours</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">6. Mutual respect</h2>
            <p className="mt-4">
              This is a coaching relationship built on professional respect. I bring expertise, structure, and honest feedback. You bring openness and the work. I reserve the right to end the engagement if behaviour during sessions or in messages becomes abusive, threatening, or otherwise inappropriate. Refunds in those situations are at my discretion.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">7. Intellectual property</h2>
            <p className="mt-4">
              All frameworks, templates, worksheets, recordings, and methodology I share remain my intellectual property. You receive a personal, non-transferable licence to use them for your own career. You may not share, resell, or redistribute these materials without written permission.
            </p>
            <p className="mt-4">
              Final CVs, cover letters, and LinkedIn copy I create for you are yours. You can use, edit, and apply them however you choose. The methodology used to produce them remains mine.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">8. No guarantees</h2>
            <p className="mt-4">
              I do not guarantee job offers, promotions, interviews, or specific income results. I provide frameworks, feedback, and accountability based on my experience in the South African market. Your results depend on your effort, market conditions, and factors outside my control. Coaching is not recruitment, therapy, or legal advice.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">9. Confidentiality</h2>
            <p className="mt-4">
              What you share in sessions stays private, except where required by law. I may anonymise insights for teaching or content, never with identifying details, and never without your permission for any direct quote or testimonial use.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">10. Limitation of liability</h2>
            <p className="mt-4">
              To the extent permitted by South African law, my total liability for any claim related to services is limited to the amount you paid for that specific service. I am not liable for indirect or consequential loss.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">11. Privacy</h2>
            <p className="mt-4">
              How I handle your personal information is set out in my <Link href="/privacy" className="underline decoration-[#C9AD98] underline-offset-4">Privacy Policy</Link>, which complies with POPIA.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">12. Changes to these terms</h2>
            <p className="mt-4">
              I may update these terms as the practice grows. The latest version will always be on this page with the updated date.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[30px] text-[#142334]">13. Governing law</h2>
            <p className="mt-4">
              These terms are governed by the laws of South Africa. Any disputes will be handled in the courts of South Africa.
            </p>
          </section>

          <p className="border-t border-[#142334]/15 pt-8">
            Questions? Email <a href="mailto:hello@coachkagiso.co.za" className="underline decoration-[#C9AD98] underline-offset-4">hello@coachkagiso.co.za</a>.
          </p>
        </div>

        <div className="mt-12">
          <Link href="/privacy" className="inline-flex rounded-full bg-[#142334] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]">
            Read privacy policy
          </Link>
        </div>
      </article>

      <Footer />
    </main>
  );
}
