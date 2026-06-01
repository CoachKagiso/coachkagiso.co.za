export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';

export type DiagnosticQuestion = {
  prompt: string;
  options: Record<OptionKey, string>;
};

export type DiagnosticArchetype = {
  key: OptionKey;
  name: string;
  symbol: {
    label: string;
    meaning: string;
  };
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
  playbook: {
    slug: string;
    title: string;
    intro: string;
    signalsTitle: string;
    signals: string[];
    prioritiesTitle: string;
    priorities: string[];
    progressTitle: string;
    progress: string[];
    journalPrompt: string;
  };
};

export const optionKeys: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];

export const questions: DiagnosticQuestion[] = [
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

export const archetypes: Record<OptionKey, DiagnosticArchetype> = {
  A: {
    key: 'A',
    name: 'Plateaued Performer',
    symbol: {
      label: 'North Star',
      meaning: 'A fixed point for choosing the next stretch.',
    },
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
    cta: 'Book my seat',
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
    playbook: {
      slug: 'plateaued-performer',
      title: 'How to restart growth when your role has stopped stretching you',
      intro:
        'This result usually shows up when you are capable, trusted, and even appreciated, but your work is no longer demanding enough to expand you. The risk is not failure. The risk is becoming excellent in a role that has stopped building your next chapter.',
      signalsTitle: 'What this often looks like',
      signals: [
        'You can do most of your work without much friction or learning.',
        'People rely on you, but the role itself no longer feels developmental.',
        'You are busy enough to look committed, but not stretched enough to keep growing.',
      ],
      prioritiesTitle: 'What to prioritise next',
      priorities: [
        'Create visible stretch before boredom becomes stagnation.',
        'Translate your current reliability into next-level readiness.',
        'Get specific about the kind of growth you want, not just the fact that you want more.',
      ],
      progressTitle: 'What progress looks like in 14 days',
      progress: [
        'You have identified one concrete stretch opportunity and taken action toward it.',
        'You know what capability your manager needs to see from you next.',
        'You have a clearer growth story than "I just want more."',
      ],
      journalPrompt:
        'Where have I confused being needed with still being developed, and what kind of stretch would actually move me now?',
    },
  },
  B: {
    key: 'B',
    name: 'Quiet Pivoter',
    symbol: {
      label: 'Signal Line',
      meaning: 'A clearer transmission of work that is already valuable.',
    },
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
    playbook: {
      slug: 'quiet-pivoter',
      title: 'How to make your value legible before the next opportunity passes',
      intro:
        'This result usually means your ability is not the main issue. The bigger issue is translation. Your story, proof, and positioning are not yet doing enough work for you in the rooms that matter.',
      signalsTitle: 'What this often looks like',
      signals: [
        'You know you are stronger than your CV or LinkedIn makes you appear.',
        'You have real results, but your materials still read like a duties list.',
        'People are not fully seeing the level, direction, or context of your work.',
      ],
      prioritiesTitle: 'What to prioritise next',
      priorities: [
        'Tighten the story people encounter before they meet you.',
        'Lead with proof, not only role titles or effort.',
        'Make your positioning specific enough to be found and remembered.',
      ],
      progressTitle: 'What progress looks like in 14 days',
      progress: [
        'Your LinkedIn headline and About section reflect the work you want next.',
        'Your CV contains stronger evidence of results and direction.',
        'You can explain your value in one clean sentence without rambling.',
      ],
      journalPrompt:
        'If a recruiter, manager, or collaborator landed on my profile today, what would they understand about me in under 10 seconds, and what are they still missing?',
    },
  },
  C: {
    key: 'C',
    name: 'Burnt-Out Builder',
    symbol: {
      label: 'Boundary Arch',
      meaning: 'A protective pause before the next decision.',
    },
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
    playbook: {
      slug: 'burnt-out-builder',
      title: 'How to tell the difference between burnout and a role that no longer fits',
      intro:
        'This result usually appears when the pressure has gone beyond "I need a break" and started asking a more serious question about fit. You may be carrying too much, but the deeper issue may be the design of the role, not your personal weakness.',
      signalsTitle: 'What this often looks like',
      signals: [
        'You are tired even when you technically had rest.',
        'The work drains more than it builds, even when you do it well.',
        'You keep trying to recover inside a structure that may be the actual problem.',
      ],
      prioritiesTitle: 'What to prioritise next',
      priorities: [
        'Separate tiredness from true misalignment.',
        'Notice what kind of work still gives energy or dignity.',
        'Slow down enough to make a wise move, not just an urgent one.',
      ],
      progressTitle: 'What progress looks like in 14 days',
      progress: [
        'You have a written list of what drains you versus what still energises you.',
        'You can name whether the issue is pace, culture, role design, or industry fit.',
        'You are making decisions from clarity, not only from depletion.',
      ],
      journalPrompt:
        'If the exhaustion is telling the truth about something, what is it trying to protect me from continuing unquestioned?',
    },
  },
  D: {
    key: 'D',
    name: 'Lost Pivoter',
    symbol: {
      label: 'Compass Point',
      meaning: 'A way back to the real question underneath the noise.',
    },
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
    playbook: {
      slug: 'lost-pivoter',
      title: 'How to find the real question before you make the next move',
      intro:
        'This result usually shows up when you already know that something is off, but every solution still feels slightly wrong. That often means the problem is not your effort. It is that you are solving without first naming the real question.',
      signalsTitle: 'What this often looks like',
      signals: [
        'Career advice feels useful in theory, but never quite fits your situation.',
        'You keep circling ideas without committing to any of them.',
        'The issue is not laziness. It is fog.',
      ],
      prioritiesTitle: 'What to prioritise next',
      priorities: [
        'Reduce noise long enough to hear your own patterns again.',
        'Name what has changed in your work and identity over time.',
        'Turn vague discomfort into one clean question you can actually respond to.',
      ],
      progressTitle: 'What progress looks like in 14 days',
      progress: [
        'You are less scattered because you have paused random advice intake.',
        'You can describe the problem in a sentence instead of only a feeling.',
        'You know what kind of support or decision would genuinely help next.',
      ],
      journalPrompt:
        'If I had to stop performing certainty and describe my actual career problem honestly, what would I finally say?',
    },
  },
  E: {
    key: 'E',
    name: 'Engaged Strategist',
    symbol: {
      label: 'Momentum Grid',
      meaning: 'A structure that turns direction into repeatable movement.',
    },
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
    cta: 'Book my seat',
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
    playbook: {
      slug: 'engaged-strategist',
      title: 'How to turn momentum into a deliberate career move',
      intro:
        'This result usually means you are not in crisis. You already have some motion. What matters now is not rescue. It is refinement, accountability, and making sure your next move is shaped on purpose rather than by drift.',
      signalsTitle: 'What this often looks like',
      signals: [
        'You already know the direction, but need sharper execution.',
        'You are motivated, but consistency is still vulnerable to distraction.',
        'You do not need a reinvention. You need a cleaner strategy.',
      ],
      prioritiesTitle: 'What to prioritise next',
      priorities: [
        'Name your next move publicly enough that it becomes real.',
        'Turn ambition into a repeatable weekly rhythm.',
        'Get into rooms that sharpen, challenge, and stretch your strategy.',
      ],
      progressTitle: 'What progress looks like in 14 days',
      progress: [
        'You have a clear quarterly target in writing.',
        'At least two people know what you are building toward.',
        'Your weekly calendar reflects the move, not just your intention.',
      ],
      journalPrompt:
        'What would it look like if I treated this next move like a real project instead of a private hope?',
    },
  },
};

export function getDiagnosticResult(answers: Partial<Record<number, OptionKey>>) {
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

export function getDiagnosticPlaybookBySlug(slug: string) {
  return Object.values(archetypes).find((archetype) => archetype.playbook.slug === slug) || null;
}
