'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Compass, Download, Mail, RotateCcw } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { ContourField, FlowRibbon, GeoArchPattern } from '@/components/DecorativeMotifs';
import { archetypes as diagnosticArchetypes } from '@/lib/career-diagnostic';

type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';

type DiagnosticQuestion = {
  prompt: string;
  options: Record<OptionKey, string>;
};

type Archetype = {
  key: OptionKey;
  name: string;
  tagline: string;
  description: string;
  diagnosis: string;
  action: string;
  actionPlanTitle: string;
  actionPlan: string[];
  avoidThis: string;
  service: string;
  href: string;
  cta: string;
  nextStepTitle: string;
  nextStepBody: string;
  secondaryPath: {
    label: string;
    href: string;
    body: string;
    cta: string;
  };
  readNextPath: {
    label: string;
    href: string;
    body: string;
    cta: string;
  };
};

const questions: DiagnosticQuestion[] = [
  {
    prompt: 'When you imagine your career a year from now, what comes up first?',
    options: {
      A: 'The same role, but with more responsibility and sharper growth.',
      B: 'A different role, probably inside the same company or industry.',
      C: 'A different kind of work entirely. The current shape is draining me.',
      D: 'Honestly, I have no clear picture.',
      E: 'A clear next level. I know the direction, I need traction.',
    },
  },
  {
    prompt: 'If you had to name the real frustration under everything, what would it be?',
    options: {
      A: 'I am capable, but I feel under-stretched.',
      B: 'My value is not being seen clearly enough.',
      C: 'The work takes more from me than it gives back.',
      D: 'I cannot tell whether I need a new job, a new direction, or a reset.',
      E: 'I know the direction. I need structure, accountability, and better rooms.',
    },
  },
  {
    prompt: 'If someone found your CV or LinkedIn today, what would they understand?',
    options: {
      A: 'They would understand my role, but not my next-level readiness.',
      B: 'They would see part of my value, but not the full story.',
      C: 'They would see a version of me I am outgrowing.',
      D: 'They would not know what I want next, because I do not know either.',
      E: 'They would understand me, but I want the story to become more strategic.',
    },
  },
  {
    prompt: 'If you received a raise tomorrow, would the feeling that something is off go away?',
    options: {
      A: 'Mostly, yes, if the role also came with more room to grow.',
      B: 'For a while, but I would still wonder why I am not more visible.',
      C: 'No. Money helps, but it is not the real issue.',
      D: 'I would take it, but I still would not know what I want.',
      E: 'It would be nice, but I am focused on strategy, not only salary.',
    },
  },
  {
    prompt: 'When you need career advice, what do you normally do?',
    options: {
      A: 'I ask for perspective when I feel ready for more.',
      B: 'I ask when I need help positioning myself better.',
      C: 'I wait until the pressure becomes hard to ignore.',
      D: 'I avoid asking because I do not know how to explain the problem.',
      E: 'I actively use mentors, peers, or communities to sharpen my moves.',
    },
  },
  {
    prompt: 'Your CV and LinkedIn currently feel like...',
    options: {
      A: 'Accurate, but not powerful enough.',
      B: 'Under-selling me.',
      C: 'Like they belong to a version of me I am outgrowing.',
      D: 'Outdated or disconnected from any clear direction.',
      E: 'Good enough, but ready for a more strategic polish.',
    },
  },
  {
    prompt: 'When you describe what you do at work to someone outside your company, you...',
    options: {
      A: 'Explain the role clearly, but struggle to show why it matters.',
      B: 'Know there is more value there than my words communicate.',
      C: 'Feel tired just trying to explain it.',
      D: 'Ramble, because the story is not clear in my own head.',
      E: 'Can explain it, but want the story to land with more authority.',
    },
  },
  {
    prompt: 'The thought of staying in your current role for another two years feels...',
    options: {
      A: 'Possible, if something meaningful changes.',
      B: 'Tolerable, but only if I become more visible and valued.',
      C: 'Too heavy. I need a different shape of work.',
      D: 'Confusing. I do not know whether leaving would solve anything.',
      E: 'Strategic, if it supports the bigger move I am building toward.',
    },
  },
  {
    prompt: 'If a mentor offered you 30 minutes tomorrow, you would...',
    options: {
      A: 'Ask how to stretch into the next level.',
      B: 'Ask how to position myself better.',
      C: 'Ask whether I am in the wrong role or field.',
      D: 'Struggle to form one clear question.',
      E: 'Bring one specific decision I need help sharpening.',
    },
  },
  {
    prompt: 'What kind of support would actually help you move?',
    options: {
      A: 'A strategic push and practical learning environment.',
      B: 'Someone to help me fix how I show up on paper and online.',
      C: 'A focused conversation about whether my current path still fits.',
      D: 'A deeper reset that helps me rebuild the map.',
      E: 'A community or structure that keeps me moving with intention.',
    },
  },
];

const archetypes: Record<OptionKey, Archetype> = {
  A: {
    key: 'A',
    name: 'Plateaued Performer',
    tagline: 'You are doing well. You have stopped being stretched.',
    description:
      'You are not failing. In fact, that is part of the problem. You are competent enough to keep things moving, but the work is no longer asking enough of you.',
    diagnosis:
      'This is career stagnation in plain sight. The job may not be broken, but the trajectory needs attention.',
    action: 'This week, identify one stretch project you could volunteer for in the next 30 days.',
    actionPlanTitle: 'Your 7-day reset plan',
    actionPlan: [
      'List the last three tasks you completed easily and mark which ones no longer stretch your thinking.',
      'Choose one project, meeting, or responsibility where you can visibly raise your hand in the next 30 days.',
      'Book 20 minutes with your manager and ask what next-level capability they need to see from you.',
    ],
    avoidThis:
      'Do not confuse being trusted with still being challenged. Reliability without stretch becomes invisibility over time.',
    service: 'Saturday Masterclass',
    href: '/book/masterclass',
    cta: 'Reserve my seat',
    nextStepTitle: 'You need a strategic stretch, not another motivation post.',
    nextStepBody:
      'A live masterclass gives you structure, reflection, and practical prompts so you can stop waiting for growth to appear and start creating a sharper next chapter.',
    secondaryPath: {
      label: 'Talk it through first',
      href: '/book/discovery',
      body: 'If you need to sense-check whether the plateau is about stretch, visibility, or role fit, start with a conversation before you commit.',
      cta: 'Book discovery',
    },
    readNextPath: {
      label: 'Read this next',
      href: '/insights/career-planning-when-you-feel-stuck-south-africa',
      body: 'This framework helps you separate comfort from real growth and pick a direction with more honesty.',
      cta: 'Read the planning guide',
    },
  },
  B: {
    key: 'B',
    name: 'Quiet Pivoter',
    tagline: 'Your value is real. It is not landing clearly enough.',
    description:
      'You are not deeply unhappy, but you are starting to notice a gap between what you contribute and what people seem to understand about you.',
    diagnosis:
      'This is usually a visibility and positioning problem before it is a performance problem.',
    action: 'This week, audit your LinkedIn headline against the work you actually want to be found for.',
    actionPlanTitle: 'Your 7-day visibility plan',
    actionPlan: [
      'Rewrite your LinkedIn headline so it names the role, value, and context you want to be found for.',
      'Open your CV and highlight the top three bullets that prove results, not just responsibilities.',
      'Ask one trusted colleague what they think you are best known for and compare that answer to how you describe yourself.',
    ],
    avoidThis:
      'Do not keep polishing in private while hoping the right people will somehow notice. Your value needs translation, not more silence.',
    service: 'CV + LinkedIn Bundle',
    href: '/buy/bundle',
    cta: 'Get the bundle',
    nextStepTitle: 'Your next move needs to be visible before it is available.',
    nextStepBody:
      'The bundle helps your CV and LinkedIn tell the same story, so recruiters, managers, and opportunities understand the value you are already carrying.',
    secondaryPath: {
      label: 'Start with LinkedIn only',
      href: '/buy/linkedin',
      body: 'If the bigger issue is discoverability rather than a full materials rewrite, start by fixing the profile recruiters see first.',
      cta: 'Optimise my LinkedIn',
    },
    readNextPath: {
      label: 'Read this next',
      href: '/insights/linkedin-headline-mistake-recruiter-search',
      body: 'This is the fastest visibility fix if you want immediate traction before investing in a full rewrite.',
      cta: 'Read the headline audit',
    },
  },
  C: {
    key: 'C',
    name: 'Burnt-Out Builder',
    tagline: 'You are tired in a way a holiday may not fix.',
    description:
      'You have been carrying projects, people, expectations, or pressure for too long. The issue may not be your effort. It may be the shape of the work.',
    diagnosis:
      'This points to role or industry mismatch. Exhaustion is the signal, but the structure may be the cause.',
    action: 'This week, write down the three parts of your work that drain you and the three parts that still give you energy.',
    actionPlanTitle: 'Your 7-day clarity plan',
    actionPlan: [
      'Track the moments this week that leave you depleted and the ones that still make you feel useful or alert.',
      'Name one demand in your current role that is heavy because of the structure, not because you are weak.',
      'Choose one boundary, one conversation, or one career question you need to stop postponing.',
    ],
    avoidThis:
      'Do not make a high-stakes decision from pure exhaustion. Burnout makes every escape route look wise, even when it is not.',
    service: 'Career Clarity Session',
    href: '/book/clarity',
    cta: 'Book clarity',
    nextStepTitle: 'Do not make a major move from exhaustion alone.',
    nextStepBody:
      'A clarity session gives you a focused space to separate burnout from misalignment, then decide what kind of move would actually make sense.',
    secondaryPath: {
      label: 'Talk before you book',
      href: '/book/discovery',
      body: 'If you are not yet sure whether you need strategy, rest, or a bigger career shift, a discovery call lets us locate the real problem first.',
      cta: 'Book discovery',
    },
    readNextPath: {
      label: 'Read this next',
      href: '/insights/career-planning-when-you-feel-stuck-south-africa',
      body: 'This article is a good bridge if you need language for what feels off before making a paid move.',
      cta: 'Read the planning guide',
    },
  },
  D: {
    key: 'D',
    name: 'Lost Pivoter',
    tagline: 'You know something is wrong. You do not know what to fix.',
    description:
      'Every piece of advice feels too generic because your real question is still underneath the surface. You do not need more tips. You need a clearer map.',
    diagnosis:
      'This is a clarity problem. Solving the wrong problem faster will only create a more polished version of stuck.',
    action: 'This week, stop reading career advice for seven days and write three honest pages about what has changed in your work life over the last five years.',
    actionPlanTitle: 'Your 7-day reset plan',
    actionPlan: [
      'Pause all new career content for one week so your own thinking can become audible again.',
      'Write three honest pages on what has changed in your work, energy, ambition, and identity over the last five years.',
      'At the end of the week, circle repeated themes and turn them into one real question you want answered next.',
    ],
    avoidThis:
      'Do not try to solve confusion by collecting more generic advice. The problem is not a lack of information. It is a lack of a clean question.',
    service: 'Glow Up VIP',
    href: '/book/glow-up',
    cta: 'Book my Glow Up',
    nextStepTitle: 'You need a deeper reset before another tactic.',
    nextStepBody:
      'Glow Up VIP is for the moment when the map itself needs rebuilding: your direction, your story, your positioning, and the way you start moving again.',
    secondaryPath: {
      label: 'Start with discovery',
      href: '/book/discovery',
      body: 'If Glow Up feels like a big leap, begin with a shorter call and we can decide whether you need a full reset or a narrower intervention.',
      cta: 'Book discovery',
    },
    readNextPath: {
      label: 'Read this next',
      href: '/insights/career-planning-when-you-feel-stuck-south-africa',
      body: 'This gives you a grounded starting framework if the real problem still feels hard to name.',
      cta: 'Read the planning guide',
    },
  },
  E: {
    key: 'E',
    name: 'Engaged Strategist',
    tagline: 'You are not stuck. You are sharpening.',
    description:
      'You already have motion. What you need now is structure, accountability, and smarter rooms so your next move is not left to chance.',
    diagnosis:
      'This is a strategy and accountability season. You need fellowship and refinement more than rescue.',
    action: 'This week, tell two people what career move you are building toward this quarter.',
    actionPlanTitle: 'Your 7-day momentum plan',
    actionPlan: [
      'Write down the one move you are building toward this quarter in a single sentence.',
      'Tell two people about it so the goal becomes real outside your head.',
      'Choose one weekly rhythm that will keep the move alive, whether that is an application block, a visibility action, or learning time.',
    ],
    avoidThis:
      'Do not let good momentum become private momentum. Unspoken goals drift. Named goals tend to gather support and accountability.',
    service: 'Saturday Masterclass series',
    href: '/book/masterclass',
    cta: 'Reserve my seat',
    nextStepTitle: 'You are ready for sharper rooms and cleaner accountability.',
    nextStepBody:
      'The masterclass series gives you focused support around visibility, strategy, and career moves so your existing momentum becomes more deliberate.',
    secondaryPath: {
      label: 'Want a 1:1 lens instead?',
      href: '/book/clarity',
      body: 'If your next move is active already and you want tailored strategy rather than a group room, take the clarity route.',
      cta: 'Book clarity',
    },
    readNextPath: {
      label: 'Read this next',
      href: '/insights/free-sa-learning-resources-2026',
      body: 'A curated list of free South African learning resources if you want to keep sharpening between sessions.',
      cta: 'Browse free resources',
    },
  },
};

const optionKeys: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];

type SubmissionStatus = 'idle' | 'saving' | 'saved' | 'error';

function getResult(answers: Partial<Record<number, OptionKey>>) {
  const score = optionKeys.reduce<Record<OptionKey, number>>(
    (acc, key) => ({ ...acc, [key]: 0 }),
    { A: 0, B: 0, C: 0, D: 0, E: 0 }
  );

  Object.values(answers).forEach((answer) => {
    if (answer) score[answer] += 1;
  });

  const priority: OptionKey[] = ['D', 'C', 'B', 'A', 'E'];
  const winner = optionKeys
    .map((key) => ({ key, value: score[key] }))
    .sort((a, b) => b.value - a.value || priority.indexOf(a.key) - priority.indexOf(b.key))[0].key;

  return {
    score,
    archetype: archetypes[winner],
  };
}

export default function CareerDiagnostic() {
  const [lead, setLead] = useState({ firstName: '', email: '' });
  const [hasStarted, setHasStarted] = useState(false);
  const [answers, setAnswers] = useState<Partial<Record<number, OptionKey>>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [submissionError, setSubmissionError] = useState('');

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === questions.length;
  const result = useMemo(() => (isComplete ? getResult(answers) : null), [answers, isComplete]);
  const current = questions[currentIndex];

  async function submitDiagnostic(nextAnswers: Partial<Record<number, OptionKey>>) {
    const nextResult = getResult(nextAnswers);
    setSubmissionStatus('saving');
    setSubmissionError('');

    try {
      const response = await fetch('/api/diagnostic/submit', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          firstName: lead.firstName,
          email: lead.email,
          answers: nextAnswers,
          score: nextResult.score,
          archetype: nextResult.archetype,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Could not save your result.');
      }

      setSubmissionStatus('saved');
    } catch (error) {
      setSubmissionStatus('error');
      setSubmissionError(error instanceof Error ? error.message : 'Could not save your result.');
    }
  }

  function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead.firstName.trim() || !lead.email.trim()) return;
    setSubmissionStatus('idle');
    setSubmissionError('');
    setHasStarted(true);
  }

  function chooseAnswer(answer: OptionKey) {
    const nextAnswers = { ...answers, [currentIndex]: answer };
    setAnswers(nextAnswers);
    if (currentIndex < questions.length - 1) {
      window.setTimeout(() => setCurrentIndex((index) => index + 1), 180);
    } else if (Object.keys(nextAnswers).length === questions.length && submissionStatus === 'idle') {
      void submitDiagnostic(nextAnswers);
    }
  }

  function resetDiagnostic() {
    setAnswers({});
    setCurrentIndex(0);
    setHasStarted(false);
    setSubmissionStatus('idle');
    setSubmissionError('');
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#FCFBFA] text-[#142334]">
      <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-20 lg:pb-28">
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
          <span className="font-serif text-[13vw] leading-none text-white/35 tracking-normal">
            DIAGNOSTIC
          </span>
        </div>
        <FlowRibbon className="absolute -right-28 top-4 h-[690px] w-[520px] opacity-[0.16] text-[#142334] pointer-events-none" />

        <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8">
          <Reveal className="max-w-4xl">
            <Link href="/resources" className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] font-semibold text-[#142334]/65 hover:text-[#142334]">
              <ArrowLeft className="h-4 w-4" />
              Resources
            </Link>
            <p className="mt-8 inline-flex rounded-full border border-[#142334]/25 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.25em] text-[#142334]/70">
              Free 5-minute diagnostic
            </p>
            <h1 className="mt-7 max-w-5xl font-serif text-[52px] md:text-[86px] leading-[0.94] font-medium">
              Stuck, stalling, or ready to pivot?
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-[#142334]/76">
              Answer 10 questions and find the career archetype shaping your next move. You will get a result, a 7-day action, and a clear next step.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative bg-[#FCFBFA] py-16 lg:py-24">
        <GeoArchPattern className="absolute -left-24 top-10 h-[460px] w-[560px] opacity-[0.08] text-[#142334] pointer-events-none" />
        <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1fr] lg:items-start">
            <Reveal direction="right">
              <aside className="sticky top-28 border border-[#D8C8BB] bg-white p-7 md:p-8">
                <Compass className="h-8 w-8 text-[#C9AD98]" />
                <h2 className="mt-6 font-serif text-[34px] leading-tight">What this diagnostic does.</h2>
                <div className="mt-7 space-y-4">
                  {[
                    'Shows which kind of stuck you may be in.',
                    'Gives you one useful action for the next 7 days.',
                    'Connects your result to the right support, not a random offer.',
                  ].map((item) => (
                    <div key={item} className="flex gap-3 text-[15px] leading-relaxed text-[#142334]/72">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#C9AD98]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t border-[#142334]/12 pt-6">
                  <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#A09086]">
                    Progress
                  </p>
                  <div className="mt-3 h-2 bg-[#E8E3DF]">
                    <span
                      className="block h-full bg-[#C9AD98] transition-all duration-500"
                      style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                    />
                  </div>
                  <p className="mt-3 text-[13px] text-[#142334]/58">
                    {answeredCount} of {questions.length} answered
                  </p>
                </div>
              </aside>
            </Reveal>

            <Reveal direction="left" delay={0.08}>
              {!hasStarted ? (
                <div className="border border-[#D8C8BB] bg-[#142334] p-8 md:p-10 text-white">
                  <Mail className="h-8 w-8 text-[#C9AD98]" />
                  <p className="mt-8 text-[12px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                    Start here
                  </p>
                  <h2 className="mt-4 max-w-2xl font-serif text-[44px] md:text-[62px] leading-[0.98]">
                    First, tell me where to send your result summary.
                  </h2>
                  <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-white/72">
                    Your result appears immediately after the final question. The email step is here so the PDF summary and follow-up sequence can connect cleanly when automation is switched on.
                  </p>
                  <form onSubmit={handleLeadSubmit} className="mt-9 grid gap-3 md:grid-cols-[1fr_1.2fr_auto]">
                    <input
                      type="text"
                      required
                      value={lead.firstName}
                      onChange={(event) => setLead((currentLead) => ({ ...currentLead, firstName: event.target.value }))}
                      placeholder="First name"
                      maxLength={50}
                      pattern="^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$"
                      autoComplete="given-name"
                      className="w-full border border-white/15 bg-white px-4 py-3.5 text-[15px] text-[#142334] outline-none focus:border-[#C9AD98]"
                    />
                    <input
                      type="email"
                      required
                      value={lead.email}
                      onChange={(event) => setLead((currentLead) => ({ ...currentLead, email: event.target.value }))}
                      placeholder="Email address"
                      maxLength={120}
                      autoComplete="email"
                      className="w-full border border-white/15 bg-white px-4 py-3.5 text-[15px] text-[#142334] outline-none focus:border-[#C9AD98]"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C9AD98] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:bg-white"
                    >
                      Begin <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </form>
                  <p className="mt-4 text-[12px] leading-relaxed text-white/48">
                    POPIA-conscious. No spam. Just the diagnostic and useful career notes.
                  </p>
                </div>
              ) : result ? (
                <div className="overflow-hidden border border-[#D8C8BB] bg-white">
                  <div className="bg-[#142334] p-8 md:p-10 text-white">
                    <p className="text-[12px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                      Your result
                    </p>
                    <h2 className="mt-4 font-serif text-[46px] md:text-[66px] leading-[0.96]">
                      {result.archetype.name}
                    </h2>
                    <p className="mt-5 max-w-2xl text-[20px] leading-relaxed text-white/76">
                      {result.archetype.tagline}
                    </p>
                    <div className="mt-7 inline-flex rounded-full border border-white/15 px-4 py-2 text-[12px] uppercase tracking-[0.16em] text-white/60">
                      {submissionStatus === 'saving' && 'Saving result...'}
                      {submissionStatus === 'saved' && 'Result saved and email queued'}
                      {submissionStatus === 'error' && 'Result shown. Email save needs attention.'}
                    </div>
                  </div>
                  <div className="grid gap-8 p-8 md:p-10">
                    <div>
                      <p className="text-[17px] leading-relaxed text-[#142334]/76">{result.archetype.description}</p>
                      <div className="mt-8 border-y border-[#142334]/12 py-7">
                        <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                          What is actually going on
                        </p>
                        <p className="mt-3 text-[17px] leading-relaxed text-[#142334]/76">{result.archetype.diagnosis}</p>
                      </div>
                      <div className="mt-7">
                        <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                          Your next 7 days
                        </p>
                        <p className="mt-3 font-serif text-[30px] leading-tight text-[#142334]">{result.archetype.action}</p>
                      </div>
                      <div className="mt-8 border border-[#D8C8BB] bg-[#F7F1EC] p-5 md:p-6">
                        <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                          {result.archetype.actionPlanTitle}
                        </p>
                        <div className="mt-5 grid gap-3">
                          {result.archetype.actionPlan.map((step, index) => (
                            <div key={step} className="grid grid-cols-[36px_1fr] gap-4 border border-[#D8C8BB] bg-white p-4">
                              <span className="font-serif text-[24px] leading-none text-[#C9AD98]">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <p className="text-[15px] leading-relaxed text-[#142334]/72">{step}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-5 border-t border-[#D8C8BB] pt-5">
                          <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#A09086]">
                            Avoid this trap
                          </p>
                          <p className="mt-3 text-[15px] leading-relaxed text-[#142334]/72">
                            {result.archetype.avoidThis}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 border border-[#C9AD98]/55 bg-[#142334] p-6 text-white md:grid-cols-[1fr_auto] md:items-end md:p-8">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                          Best next move
                        </p>
                        <h3 className="mt-4 max-w-2xl font-serif text-[32px] leading-tight md:text-[42px]">
                          {result.archetype.nextStepTitle}
                        </h3>
                        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70">
                          {result.archetype.nextStepBody}
                        </p>
                      </div>
                      <Link
                        href={result.archetype.href}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C9AD98] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:bg-white"
                      >
                        {result.archetype.cta} <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="border border-[#D8C8BB] bg-white p-5">
                        <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                          Best fit now
                        </p>
                        <h3 className="mt-4 font-serif text-[28px] leading-tight text-[#142334]">
                          {result.archetype.service}
                        </h3>
                        <p className="mt-4 text-[14px] leading-relaxed text-[#142334]/68">
                          This is the strongest next move if you want support that matches the pattern your answers revealed.
                        </p>
                        <Link
                          href={result.archetype.href}
                          className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:text-[#C9AD98]"
                        >
                          {result.archetype.cta} <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>

                      <div className="border border-[#D8C8BB] bg-[#F7F1EC] p-5">
                        <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                          Softer entry point
                        </p>
                        <h3 className="mt-4 font-serif text-[28px] leading-tight text-[#142334]">
                          {result.archetype.secondaryPath.label}
                        </h3>
                        <p className="mt-4 text-[14px] leading-relaxed text-[#142334]/68">
                          {result.archetype.secondaryPath.body}
                        </p>
                        <Link
                          href={result.archetype.secondaryPath.href}
                          className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:text-[#C9AD98]"
                        >
                          {result.archetype.secondaryPath.cta} <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>

                      <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-5">
                        <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                          Read before you decide
                        </p>
                        <h3 className="mt-4 font-serif text-[28px] leading-tight text-[#142334]">
                          {result.archetype.readNextPath.label}
                        </h3>
                        <p className="mt-4 text-[14px] leading-relaxed text-[#142334]/68">
                          {result.archetype.readNextPath.body}
                        </p>
                        <Link
                          href={result.archetype.readNextPath.href}
                          className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:text-[#C9AD98]"
                        >
                          {result.archetype.readNextPath.cta} <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    <div className="border border-[#D8C8BB] bg-white p-6 md:p-7">
                      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                            Your full playbook
                          </p>
                          <h3 className="mt-4 font-serif text-[30px] leading-tight text-[#142334]">
                            Keep the deeper strategy, not just the result.
                          </h3>
                          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#142334]/68">
                            I&apos;ve opened a longer field note for this result with sharper signals, priorities, what progress should look like in the next two weeks, and a reflection prompt to work through.
                          </p>
                        </div>
                        <Link
                          href={`/resources/career-diagnostic/playbooks/${diagnosticArchetypes[result.archetype.key].playbook.slug}`}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#142334] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:bg-[#142334] hover:text-white"
                        >
                          Open my playbook <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                      <div className="mt-6">
                        <a
                          href={`/api/diagnostic/playbook-pdf/${diagnosticArchetypes[result.archetype.key].playbook.slug}`}
                          className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#C9AD98] transition hover:text-[#142334]"
                        >
                          Download PDF version <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    {submissionStatus === 'error' && (
                      <div className="border border-[#C9AD98]/55 bg-[#F7F1EC] p-5 text-[14px] leading-relaxed text-[#142334]/72">
                        <strong className="font-semibold text-[#142334]">Small note:</strong> your result is still valid, but the email/save step did not complete. {submissionError || 'Please try again later.'}
                      </div>
                    )}

                    <div className="border border-[#D8C8BB] bg-[#F7F1EC] p-6 md:p-7">
                      <div className="grid gap-7">
                        <div className="max-w-xl">
                          <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#A09086]">
                            Your score pattern
                          </p>
                          <p className="mt-3 text-[14px] leading-relaxed text-[#142334]/62">
                            This shows the strongest themes in your answers. The highest score determines your main archetype.
                          </p>
                        </div>
                        <div className="grid gap-3">
                          {optionKeys.map((key) => (
                            <div key={key} className="border border-[#D8C8BB]/70 bg-white/70 p-4">
                              <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                                <span className="text-[12px] uppercase tracking-[0.16em] font-semibold leading-relaxed text-[#142334]/72">
                                  {archetypes[key].name}
                                </span>
                                <span className="font-serif text-[28px] leading-none text-[#C9AD98]">
                                  {result.score[key]}
                                </span>
                              </div>
                              <div className="mt-3 h-2 bg-[#E8E3DF]">
                                <span
                                  className="block h-full bg-[#C9AD98]"
                                  style={{ width: `${(result.score[key] / questions.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={resetDiagnostic}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8C8BB] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#142334]"
                        >
                          Retake <RotateCcw className="h-4 w-4" />
                        </button>
                        <Link
                          href="/resources"
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8C8BB] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#142334]"
                        >
                          Browse resources <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-[#D8C8BB] bg-white p-8 md:p-10">
                  <div className="flex flex-wrap items-center justify-between gap-5">
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                        Question {currentIndex + 1} of {questions.length}
                      </p>
                      <h2 className="mt-4 max-w-2xl font-serif text-[38px] md:text-[54px] leading-tight">
                        {current.prompt}
                      </h2>
                    </div>
                    <span className="font-serif text-[70px] leading-none text-[#E8E3DF]">
                      {String(currentIndex + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="mt-9 grid gap-3">
                    {optionKeys.map((key) => {
                      const selected = answers[currentIndex] === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => chooseAnswer(key)}
                          className={`grid grid-cols-[44px_1fr] gap-4 border p-4 text-left transition-all duration-300 ${
                            selected
                              ? 'border-[#142334] bg-[#142334] text-white'
                              : 'border-[#D8C8BB] bg-[#FCFBFA] text-[#142334] hover:border-[#C9AD98] hover:bg-[#F7F1EC]'
                          }`}
                        >
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-semibold ${
                            selected ? 'border-[#C9AD98] text-[#C9AD98]' : 'border-[#D8C8BB] text-[#C9AD98]'
                          }`}>
                            {key}
                          </span>
                          <span className={`text-[16px] leading-relaxed ${selected ? 'text-white/78' : 'text-[#142334]/76'}`}>
                            {current.options[key]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#142334]/12 pt-6">
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                      disabled={currentIndex === 0}
                      className="text-[12px] uppercase tracking-[0.18em] font-semibold text-[#142334]/55 transition hover:text-[#142334] disabled:opacity-30"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))}
                      disabled={currentIndex === questions.length - 1 || !answers[currentIndex]}
                      className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-5 py-2.5 text-[12px] uppercase tracking-[0.18em] font-semibold text-[#142334] transition hover:border-[#142334] disabled:opacity-30"
                    >
                      Next <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-[#E4D8CB] py-16">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-8">
          <Reveal className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#142334]/62">
                Keep the strategy
              </p>
              <h2 className="mt-3 font-serif text-[38px] md:text-[52px] leading-tight">
                Each result now opens a deeper playbook.
              </h2>
            </div>
            <p className="max-w-lg text-[16px] leading-relaxed text-[#142334]/72">
              Your result is now paired with a fuller field note, richer email follow-up, and a stronger next-step path so the diagnostic behaves more like a real resource than a quiz.
            </p>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
