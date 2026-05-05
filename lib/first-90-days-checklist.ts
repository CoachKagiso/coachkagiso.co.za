export const FIRST_90_DAYS_CHECKLIST_FILENAME =
  'Coach-Kagiso-First-90-Days-Checklist-SA-Managers-2026.pdf';

export const FIRST_90_DAYS_CHECKLIST_PATH =
  '/api/lead-magnets/first-90-days-checklist/pdf';

export type ChecklistAction = {
  action: string;
  output: string;
  saLens?: string;
};

export type ChecklistPhase = {
  phase: string;
  timeline: string;
  title: string;
  theme: string;
  actions: ChecklistAction[];
};

export const managerChecklistPhases: ChecklistPhase[] = [
  {
    phase: 'Phase 1',
    timeline: 'Week 1',
    title: 'Stabilise, Listen, and Set Expectations',
    theme:
      'Do not rush to prove authority. Your first job is to understand what success, trust, and risk look like in this specific team.',
    actions: [
      {
        action:
          'Book an expectations meeting with your manager and ask what would make them confident by Day 30, Day 60, and Day 90.',
        output: 'A one-page success scorecard with 3-5 measurable outcomes.',
      },
      {
        action:
          'Start a listening tour with each direct report. Ask what is working, what is frustrating, and what they need from you.',
        output: 'A theme tracker with patterns, not promises.',
      },
      {
        action:
          'If you now manage former peers, name the change early and calmly instead of pretending nothing has shifted.',
        output: 'A boundary reset conversation completed in the first week.',
      },
      {
        action:
          'Create a stakeholder map that separates formal authority from informal influence.',
        output: 'A stakeholder grid with influence, trust level, risk, and next move.',
        saLens:
          'Include tenure, seniority, location, race and gender dynamics, union or employee forum links, and customer or community impact where relevant.',
      },
      {
        action:
          'Agree communication norms with the team: channels, response times, meeting etiquette, escalation paths, and after-hours boundaries.',
        output: 'A short written working agreement the team can see.',
        saLens:
          'Make room for WhatsApp boundaries, hybrid work, load-shedding disruption, and connectivity constraints.',
      },
      {
        action:
          'Meet HR or People Ops to understand fair procedure, leave, probation, performance processes, and POPIA basics.',
        output: 'A private "what I must never improvise" note.',
        saLens:
          'This is not legal advice. It is a reminder to involve HR before formal discipline, sensitive data sharing, or high-risk performance steps.',
      },
      {
        action:
          'Ask for the transformation context: Employment Equity plan, B-BBEE priorities, skills development commitments, and current team demographics.',
        output: 'A transformation context summary you can refer to before making people decisions.',
      },
    ],
  },
  {
    phase: 'Phase 2',
    timeline: 'Weeks 2-4',
    title: 'Build Trust, Rhythm, and Your First Win',
    theme:
      'Authority starts to become useful once the team knows how you listen, how decisions will be made, and what problem you are helping them remove first.',
    actions: [
      {
        action:
          'Complete a second round of listening with cross-functional partners who depend on your team or regularly block your team.',
        output: 'A partner map showing expectations, friction points, and quick trust moves.',
      },
      {
        action:
          'Run a team charter conversation: how we meet, disagree, give feedback, escalate issues, and protect quality.',
        output: 'A team charter with 5-7 operating norms.',
        saLens:
          'Use Ubuntu-informed language without avoiding accountability: respect, dignity, directness, and shared responsibility can coexist.',
      },
      {
        action:
          'Set the operating rhythm: weekly team meeting, 1:1 cadence, decision log, priority review, and feedback loop.',
        output: 'A visible rhythm that reduces anxiety and repeated questions.',
      },
      {
        action:
          'Choose one high-visibility pain point to fix by Day 60. Avoid heroic rescues that create political blowback.',
        output: 'A quick win brief with owner, deadline, metric, risk, and stakeholder sponsor.',
      },
      {
        action:
          'Pressure-test fairness with former peers and newer team members. Watch who gets access, context, praise, and informal coaching.',
        output: 'A fairness note with one adjustment to make immediately.',
      },
      {
        action:
          'Create your manager notebook. Track decisions, commitments, feedback themes, and what you are learning about the team.',
        output: 'A weekly evidence log for Day 30, Day 60, and Day 90 conversations.',
      },
      {
        action:
          'Hold a Day 20 readout with your manager: what you heard, what you are prioritising, what you will not touch yet, and where you need cover.',
        output: 'A short alignment memo before the first month closes.',
      },
    ],
  },
  {
    phase: 'Phase 3',
    timeline: 'Month 2',
    title: 'Deliver, Develop, and Document',
    theme:
      'This is where listening becomes leadership. Start delivering visible value while building the systems that make performance less personality-dependent.',
    actions: [
      {
        action:
          'Execute the quick win with the team, not around the team. Give credit publicly and document the before-and-after.',
        output: 'A delivered improvement with evidence of impact.',
      },
      {
        action:
          'Clarify roles, decision rights, and performance expectations for every direct report.',
        output: 'A role clarity sheet for each person.',
      },
      {
        action:
          'Start a light feedback cycle: recognition, coaching, and one behaviour to improve. Keep the tone specific and documented.',
        output: 'A feedback rhythm that is human, fair, and traceable.',
        saLens:
          'For formal performance issues, involve HR early and follow fair process. Do not treat an informal coaching chat as a disciplinary process.',
      },
      {
        action:
          'Build development plans for direct reports, especially where skills gaps affect delivery or transformation commitments.',
        output: 'A simple growth plan with skill, action, support, and review date.',
      },
      {
        action:
          'Review meeting dynamics for voice equity. Notice who speaks, who is interrupted, who carries invisible work, and who gets decisions explained later.',
        output: 'One meeting-design change that improves participation.',
      },
      {
        action:
          'Check POPIA hygiene: where personal information is stored, who sees it, and what is being shared in email, WhatsApp, or spreadsheets.',
        output: 'A data handling fix or escalation to HR/IT.',
      },
      {
        action:
          'Run a 60-day pulse: what has improved, what still feels unclear, and what the team needs you to stop, start, or continue.',
        output: 'A 60-day team assessment with 3 themes and 3 actions.',
      },
    ],
  },
  {
    phase: 'Phase 4',
    timeline: 'Month 3',
    title: 'Set Direction and Prove the Next 90 Days',
    theme:
      'By Day 90, people should know what kind of manager you are becoming, what the team is aiming at, and what will change next.',
    actions: [
      {
        action:
          'Co-create quarterly goals with the team. Translate company priorities into clear team outcomes and owner-level accountability.',
        output: 'A 90-day team scoreboard with owners and review rhythm.',
      },
      {
        action:
          'Write your 90-day impact report for your manager: what you learned, what you fixed, what remains risky, and what support you need.',
        output: 'A concise leadership update you can send upward.',
      },
      {
        action:
          'Hold career conversations with direct reports. Ask about goals, blockers, growth appetite, and what support they need from you.',
        output: 'A talent map with development and retention risks.',
      },
      {
        action:
          'Run a team reflection session. Ask what should continue, what should change, and what the team is ready to own together.',
        output: 'A shared operating agreement for the next quarter.',
      },
      {
        action:
          'Audit your stakeholder map again. Upgrade relationships that are still transactional, tense, or unclear.',
        output: 'A relationship repair or strengthening plan.',
      },
      {
        action:
          'Choose one structural improvement for the next 90 days: process, handover, meeting rhythm, escalation path, development pipeline, or customer experience.',
        output: 'A practical next-quarter initiative with business value.',
      },
      {
        action:
          'Reflect on your own leadership habits: where you over-function, avoid conflict, seek approval, or move too slowly.',
        output: 'A personal leadership commitment for the next quarter.',
      },
    ],
  },
];

export const managerScorecard = [
  {
    area: 'Trust',
    question: 'Do people bring me useful truth early enough for me to act?',
  },
  {
    area: 'Clarity',
    question: 'Does the team know what matters most, what can wait, and how decisions are made?',
  },
  {
    area: 'Rhythm',
    question: 'Are meetings, 1:1s, priorities, and follow-ups predictable enough to reduce noise?',
  },
  {
    area: 'Delivery',
    question: 'Can I point to one visible improvement that made work easier or results better?',
  },
  {
    area: 'SA awareness',
    question: 'Am I managing with practical awareness of fairness, transformation, data, and context?',
  },
];

export const listeningTourQuestions = [
  {
    audience: 'Your manager',
    questions: [
      'What would make you confident that I am the right person for this role by Day 90?',
      'Where does this team need stability, and where does it need change?',
      'What risks should I understand before I make visible decisions?',
    ],
  },
  {
    audience: 'Direct reports',
    questions: [
      'What is working well that I should protect?',
      'What slows you down or creates unnecessary stress?',
      'What do you need from me as your manager that you were not getting before?',
    ],
  },
  {
    audience: 'Former peers',
    questions: [
      'What might feel awkward about this change, and how should we handle it directly?',
      'Where do you need fairness and consistency from me?',
      'What should stay relational, and what now needs to become managerial?',
    ],
  },
  {
    audience: 'HR / People Ops',
    questions: [
      'Which people processes must I follow exactly?',
      'Where do new managers in this organisation usually make mistakes?',
      'What Employment Equity, skills development, or transformation priorities should I understand?',
    ],
  },
  {
    audience: 'Cross-functional partners',
    questions: [
      'What does my team do that helps your work?',
      'Where does handover or communication break down?',
      'What is one thing I could fix in the next 60 days that would improve trust?',
    ],
  },
];

export const quickWinCriteria = [
  'Visible to the team and your manager',
  'Small enough to deliver by Day 60',
  'Meaningful enough to reduce a real pain point',
  'Low enough risk that it will not damage trust if it slips',
  'Aligned to business outcomes, not just your personal credibility',
  'Able to include the team instead of making you look like the hero',
];

export const formerPeerScript = {
  opener:
    'I want to name the obvious: our working relationship has changed. I value the trust we already have, and I also need to be fair and consistent in how I manage the whole team.',
  middle:
    'There may be moments where I need to make decisions, give feedback, or hold boundaries that feel different from before. I will be direct, and I do not want either of us guessing.',
  close:
    'What would help us handle this transition respectfully and professionally?',
};

export const impactReportSections = [
  'What I learned about the team, stakeholders, and delivery risks',
  'What I stabilised or clarified',
  'The first visible improvement and its evidence',
  'People or culture risks I am still watching',
  'Transformation, fairness, or development implications',
  'The next 90-day priorities and resources I need',
];
