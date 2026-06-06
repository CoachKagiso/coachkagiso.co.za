export type InsightBodyBlock =
  | string
  | {
      type: 'subheading';
      text: string;
    }
  | {
      type: 'list' | 'orderedList';
      items: string[];
    };

export type Insight = {
  slug: string;
  title: string;
  dek: string;
  metaTitle?: string;
  metaDescription?: string;
  category: string;
  tags: string[];
  readTime: string;
  date: string;
  image: string;
  imageAlt: string;
  featured?: boolean;
  leadMagnet?: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    href: string;
    afterHeading?: string;
  };
  visualBreak?: {
    afterHeading: string;
    eyebrow: string;
    title: string;
    items: {
      label: string;
      value: string;
      note?: string;
    }[];
  };
  imageInserts?: {
    afterHeading: string;
    variant:
      | 'atsFlow'
      | 'plainTextTest'
      | 'keywordZones'
      | 'linkedinSearch'
      | 'headlineRewrite'
      | 'linkedinChecklist'
      | 'managerTimeline'
      | 'ubuntuLeadership'
      | 'managerChecklist'
      | 'credentialMatrix'
      | 'dataAccess';
    eyebrow: string;
    title: string;
    caption: string;
  }[];
  takeaways?: string[];
  faqs?: {
    question: string;
    answer: string;
  }[];
  faqHeading?: string;
  authorBio?: {
    name: string;
    role: string;
    body: string;
    href: string;
    cta: string;
  };
  pullQuote?: string;
  sections: {
    eyebrow?: string;
    heading: string;
    body: InsightBodyBlock[];
  }[];
};

export const insights: Insight[] = [
  {
    slug: 'linkedin-headline-mistake-recruiter-search',
    title: 'The LinkedIn headline mistake hiding you from recruiters',
    dek: 'Most South African professionals use the LinkedIn default headline and wonder why recruiters never message them. Here is the three-part fix that surfaces you for the searches that matter.',
    metaTitle: 'The LinkedIn Headline Mistake Hiding You From SA Recruiters | Coach Kagiso',
    metaDescription:
      "Most SA professionals use LinkedIn's default headline. Here is the three-part fix that helps recruiters find you for the searches that matter.",
    category: 'Visibility Audit',
    tags: ['LinkedIn', 'Recruiters', 'Visibility'],
    readTime: '4 min read',
    date: 'May 2026',
    image: '/images/insights/linkedin-headline-article.jpg',
    imageAlt: 'Laptop open to LinkedIn with notebook and coffee in a warm workspace',
    pullQuote:
      'LinkedIn is a search engine before it is a social network. If your headline does not contain the words recruiters search for, you are harder to find.',
    visualBreak: {
      afterHeading: 'The fix in three parts',
      eyebrow: 'Before / After',
      title: 'A stronger headline gives recruiters more to search for.',
      items: [
        {
          label: 'Before',
          value: 'Project Manager',
          note: 'Clear, but too broad. It tells people the role, not the context.',
        },
        {
          label: 'After',
          value: 'Project Manager | Cross-Functional Delivery in Logistics & Supply Chain',
          note: 'Now the headline carries role, function, industry, and recruiter language.',
        },
      ],
    },
    takeaways: [
      'Your LinkedIn headline is a search field, not just a label.',
      'Job-title-only headlines fail because they do not match how recruiters search.',
      'Use the three-part structure: role, specific value, and an optional credibility marker.',
      'Run the Recruiter Search Test before you rewrite anything.',
    ],
    faqs: [
      {
        question: 'Does my LinkedIn headline affect recruiter search results?',
        answer:
          'Yes. Recruiters often search LinkedIn using role, industry, skill, and location keywords. A headline with clearer search language gives your profile more chances to appear in relevant searches.',
      },
      {
        question: 'What keywords should I include in my LinkedIn headline in South Africa?',
        answer:
          'Use the terms recruiters would naturally type for your target role, such as your role title, industry, core skill, function, certification, or location when it matters. The goal is to be specific without stuffing the line.',
      },
      {
        question: 'How long should a LinkedIn headline be?',
        answer:
          'Keep it long enough to show role, value, and context, but short enough to scan quickly. A strong headline usually works best as one clear line with two or three searchable phrases.',
      },
      {
        question: 'Should I use symbols or emojis in my LinkedIn headline?',
        answer:
          'Simple separators like vertical bars are useful because they make the headline easier to scan. Emojis can distract from your professional positioning, so use them only if they genuinely fit your field and audience.',
      },
      {
        question: 'How often should I update my LinkedIn headline?',
        answer:
          'Update it whenever your target role, industry, positioning, or job search direction changes. If you are actively job hunting, review it at least once a month against the searches you want to appear for.',
      },
    ],
    authorBio: {
      name: 'Coach Kagiso',
      role: 'Career Development and Personal Brand Coach',
      body: 'Coach Kagiso helps South African professionals clarify their career story, strengthen their CV and LinkedIn presence, and show up with more intention in competitive career moments.',
      href: '/about',
      cta: 'Meet Coach Kagiso',
    },
    sections: [
      {
        eyebrow: 'Visibility audit',
        heading: 'Why job-title-only headlines fail',
        body: [
          'Open LinkedIn. Look at your headline. If it just says your job title and where you work, like "Marketing Manager at Company X," you have made the most common mistake on LinkedIn. And it is one reason recruiters scroll past you.',
          'LinkedIn is a search engine before it is a social network. When recruiters look for talent, they do not browse. They type keywords into the search bar: "Project Manager logistics Cape Town", "Brand strategist consumer goods", "Operations manager retail Johannesburg".',
          'If your headline does not contain the words a recruiter would type to find someone like you, you do not show up. It does not matter how good your experience is. The search filtered you out before anyone got to your About section.',
          'The default "[Job Title] at [Company]" headline contains exactly two keywords: your job title and your employer name. Both of those terms are competing against thousands of other people with the same title. You disappear into the crowd.',
        ],
      },
      {
        heading: 'The Recruiter Search Test',
        body: [
          'Try this. Open LinkedIn search. Type the role you want to be considered for. Look at who shows up on the first page. What is in their headlines?',
          'It will not be just job titles. It will be specific phrases that match how recruiters describe the work: "Project Manager | Supply Chain Optimisation | FMCG", "Brand Strategist building memorable campaigns for SA challenger brands", "Operations leader specialising in retail turnaround".',
          'The headlines that show up on page one are the ones that did the work to surface for the searches that actually matter. That is the test. If your current headline cannot pass it, your profile is invisible to the recruiters you most want to reach.',
        ],
      },
      {
        heading: 'The fix in three parts',
        body: [
          'A LinkedIn headline that works for you does three things at once. First, it names your role. Not just the title from your business card, but the role as a recruiter would search it. "Project Manager" is easier to find than "Senior Specialist II".',
          'Second, it says what you specifically do or who you help. This is the part most people skip. Add the specific area you work in, the type of clients or industries you serve, or the outcome you create. "Project Manager helping FMCG teams deliver on time without burnout" is more useful than a title on its own.',
          'Third, it can include a credibility marker. A specific certification, a notable industry, or a positioning phrase can help, but only if it adds keyword value or makes you more memorable. Think: "Project Manager | FMCG | PMP-certified".',
          'That is it. Role, specific value, optional marker. Three parts, one line.',
        ],
      },
      {
        heading: 'Three LinkedIn headline examples for South Africa',
        body: [
          'Before: "Customer Service Consultant at Company Name". After: "Customer Service Consultant | Client Relationship Management & Problem Resolution".',
          'Before: "Marketing Manager at Retail Brand". After: "Marketing Manager helping retail brands launch products that move on shelf".',
          'Before: "Project Manager". After: "Project Manager | Cross-Functional Delivery in Logistics & Supply Chain".',
          'In all three rewrites, the headline now contains four to six searchable phrases instead of one. The recruiter looking for someone with that specific experience now has a chance of finding you.',
        ],
      },
      {
        heading: 'Try it this week',
        body: [
          'Five minutes. Open your LinkedIn. Run the Recruiter Search Test on your current headline. If it fails, rewrite it using the three-part structure.',
          'If you want a head start, I have put together the [SA LinkedIn Headline Builder](/resources/linkedin-headline-swipe-file) with 39 before-and-after rewrites, the recruiter formula, and the keyword bank by industry. It is free.',
          'If you want me to do the full optimisation, your headline, your About section, your experience descriptions, all of it, that is what the [LinkedIn Optimisation Package](/buy/linkedin) is for. Either way: fix the headline this week. It is the single highest-leverage change you can make to your professional presence.',
          'Coach Kagiso is a Career Development and Personal Brand Coach based in South Africa. The Visibility Audit is a series of short, opinionated takes on what is broken and what is working in how SA professionals show up online.',
        ],
      },
    ],
  },
  {
    slug: 'career-planning-when-you-feel-stuck-south-africa',
    title: 'Career planning when you feel stuck: a 3-step plan for SA professionals',
    dek: 'You feel stuck in your career and you already know why. Most South African professionals do not need a new dream. They need an honest plan.',
    metaTitle: 'Career Planning When You Feel Stuck: A 3-Step Plan for SA Professionals | Coach Kagiso',
    metaDescription:
      'You feel stuck in your career and you already know why. Most South African professionals do not need a new dream. They need an honest plan.',
    category: 'Framework',
    tags: ['Career Planning', 'Clarity', 'Strategy'],
    readTime: '7 min read',
    date: 'May 2026',
    image: '/images/insights/career-planning-when-stuck.jpg',
    imageAlt: 'Professional reflecting at a desk during career planning',
    leadMagnet: {
      eyebrow: 'Free personal brand audit',
      title: 'Need a starting point before you make a career move?',
      body: 'Use the Personal Brand Audit to see whether the version of you showing up at work and online matches the direction you want next.',
      cta: 'Open the audit',
      href: '/resources/personal-brand-audit',
    },
    pullQuote:
      'Staying where you are is also a decision. The question is not whether to take a risk. The question is which risk you are choosing.',
    visualBreak: {
      afterHeading: 'The 3-step plan',
      eyebrow: 'The framework',
      title: 'The work is not to plan your whole life. It is to move honestly, in order.',
      items: [
        {
          label: 'Step 1',
          value: 'Get honest',
          note: 'Name what is draining you, what you want, and what decision you have been avoiding.',
        },
        {
          label: 'Step 2',
          value: 'Take inventory',
          note: 'List the strengths, skills, and patterns you already have but keep undercounting.',
        },
        {
          label: 'Step 3',
          value: 'Pick one direction',
          note: 'Match your existing skills to one clear path and start stretching where you are now.',
        },
      ],
    },
    takeaways: [
      'Feeling stuck is often less about confusion and more about a decision you have been postponing.',
      'Comfort at work can be a warning sign when it means you have stopped stretching.',
      'A useful plan starts with honesty, then inventory, then one clear direction.',
      'You do not need to change everything at once, but you do need to start moving.',
    ],
    faqs: [
      {
        question: 'How do I know if I am stuck in my career or just tired?',
        answer:
          'Tired usually improves with rest. Career stagnation does not. If you have been drained for months, feel under-stretched, and cannot see what the current role is adding to your growth, you are likely dealing with a career issue, not just fatigue.',
      },
      {
        question: 'What should I do first when I feel stuck in my career in South Africa?',
        answer:
          'Start with honesty before action. Get clear on what is draining you, what you want next, and what decision you have been avoiding. That gives your next move a real direction instead of turning it into panic planning.',
      },
      {
        question: 'Do I need to quit my job to get unstuck?',
        answer:
          'Not necessarily. Many professionals need a better plan before they need a resignation letter. You can often test a new direction by stretching inside your current role, taking on projects, improving visibility, and building evidence before making a bigger move.',
      },
      {
        question: 'How do I figure out which career direction fits my skills?',
        answer:
          'Take inventory of what comes naturally to you, what people rely on you for, and what work consistently energises you. Then match those strengths to one direction at a time instead of trying to plan five different futures at once.',
      },
      {
        question: 'What if I understand the framework but still cannot apply it to myself?',
        answer:
          'That is usually a clarity problem, not a capability problem. An outside conversation can help you sort your strengths, patterns, and options faster than trying to hold the whole decision alone.',
      },
    ],
    authorBio: {
      name: 'Coach Kagiso',
      role: 'Career Development and Personal Brand Coach',
      body: 'Coach Kagiso works with South African professionals who feel capable but unclear, helping them name their strengths, choose a direction, and build a more intentional next move through coaching, visibility work, and practical career strategy.',
      href: '/work-with-me',
      cta: 'Work with Coach Kagiso',
    },
    sections: [
      {
        eyebrow: 'Framework',
        heading: 'Why "comfortable" is the warning sign, not the goal',
        body: [
          "Most of you already know you're stuck.",
          "That is the part nobody wants to say out loud. The clients who come to me feeling stuck almost always know exactly what is wrong. They know the role is not growing them. They know the environment is toxic, or the manager is not backing them, or the work has gone flat. They know they want more.",
          'What they do not want to do is make the decision. That is not a criticism. It is human. The space you are in now might be draining, but it is also familiar. You know the people, the salary, and what Monday is going to look like. The next move does not come with that certainty.',
          'But staying is also a decision. Staying somewhere that is not growing you is a risk in the same way that leaving is. It just looks smaller because nothing changes day to day. The cost shows up later.',
          'As soon as you feel completely comfortable in a space, that is often the most dangerous place you can be. Comfortable can mean you have stopped stretching. It can mean the role is no longer asking anything new of you, and the people around you have stopped seeing you as someone going somewhere.',
          'Real career safety is built on adaptability, on the skills you keep adding, on the relationships you keep building, and on the visibility you keep earning. If you cannot remember the last time something at work asked something new of you, that is the signal. Not the salary. Not the title. The stretch.',
        ],
      },
      {
        heading: 'The 3-step plan',
        body: [
          'When a client comes to me feeling stuck, the work we do is rarely about finding a new dream. It is about being honest, taking inventory, and picking one direction to start moving in.',
          'Three steps. Done in order.',
        ],
      },
      {
        heading: 'Step 1: Get honest about what you already know',
        body: [
          'Sit with yourself somewhere quiet, with no phone. Ask three questions and write the answers down: What is actually draining me about my current situation? What do I already know I want, even if I have not said it out loud yet? What is the decision I have been avoiding making, and why?',
          'Most of the time, the answers are already there. They have been there for months. The work is not to discover them. The work is to admit them.',
          'This step sounds soft. It is not. Almost every meaningful career move I have seen started with a short, honest conversation someone finally had with themselves on a Sunday afternoon.',
        ],
      },
      {
        heading: 'Step 2: Take inventory of what you already have',
        body: [
          'This is the step most people skip, and it is the one that makes the rest of the plan work. You already have skills. You have built them over years of work, even in roles that did not grow you. You have experience. You have strengths that come naturally to you. The problem is that most professionals never sit down and actually name them.',
          'Ask yourself: What do I do that comes naturally to me, that other people find harder? What do colleagues come to me for help with? What is the one thing I could do in my sleep, that I sometimes forget is a real skill?',
          'Write the answers down. Not in your head. On paper.',
          'For Kagiso, one of those answers was training and facilitating. It had been happening across roles for years before it was fully recognised as the thing. That recognition eventually became coaching, the masterclass, and this body of work. You have your own version of that skill. The one you do not fully count because it comes too easily to you. Find it.',
        ],
      },
      {
        heading: 'Step 3: Pick one direction, match your skills to it, start where you are',
        body: [
          'This is the step where most career planning falls apart, because people try to plan their whole life. Do not do that. Pick one direction. One, not five.',
          'If you are in IT and you are known for solving problems, the direction might be system improvements, automation, or moving into a role where you teach and mentor others. If you are in customer experience and you are known for managing complaints under pressure, the direction might be client experience, sales and retention, or relationship management. If you are already managing people and you are known for guiding and coaching, the direction might be senior leadership, process improvement, or formal coaching and training work.',
          'Whatever the direction, take the skills you wrote down in Step 2 and match them to that direction explicitly. Where do those skills land? What roles, projects, or businesses use exactly those strengths?',
          'Then start where you are. You do not need to quit. You do not need a new job tomorrow. You need to use your current role as a training ground for the direction you picked. Take initiative on projects that use those skills. Speak up in meetings about the work that aligns with the direction. Find ways inside your current job to stretch into the next one.',
          'The skills are already there. You are just not applying them, and you are not stretching them. Start small, but start. That part is non-negotiable.',
        ],
      },
      {
        heading: 'Where to take this from here',
        body: [
          'If these three steps make sense but you cannot yet see how they apply to your situation, that is exactly what the [Career Clarity Session](/book/clarity) is for. One focused conversation, and you leave with a practical plan for the next ninety days.',
          'If you would rather start on your own, the [Personal Brand Audit](/resources/personal-brand-audit) helps you check whether the version of you showing up at work and online matches the direction you are trying to move toward.',
          'If you want to keep building your thinking in community, the [Saturday Masterclass](/buy/masterclass) is another good next step.',
          'Your career matters. The plan is yours. The decision is yours. When you are ready, Coach Kagiso is here.',
        ],
      },
    ],
  },
  {
    slug: 'ats-cv-south-africa-4-minute-fix',
    title: 'The ATS Test Your CV Is Failing in South Africa (and the 4-Minute Fix)',
    dek: 'Most CVs sent to SA companies never reach a human. Here is how ATS works in South Africa, what breaks it, and how to fix your CV in under 4 minutes.',
    metaTitle: 'The ATS Test Your CV Is Failing in South Africa (and the 4-Minute Fix)',
    metaDescription:
      'Most CVs sent to SA companies never reach a human. Here is how ATS works in South Africa, what breaks it, and how to fix your CV in under 4 minutes.',
    category: 'Search Pillar',
    tags: ['CV', 'ATS', 'Job Search'],
    readTime: '10 min read',
    date: 'May 2026',
    image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=1400&auto=format&fit=crop',
    imageAlt: 'Professional reviewing CV documents on a laptop',
    leadMagnet: {
      eyebrow: 'Free ATS CV checklist',
      title: 'Want a clean pre-send check before every application?',
      body: 'Use the ATS CV Checklist to test formatting, keyword placement, and the small details that can block your CV before a recruiter reads it.',
      cta: 'Get the checklist',
      href: '/resources/ats-cv-checklist',
      afterHeading: 'Free download: The ATS CV Checklist',
    },
    visualBreak: {
      afterHeading: 'The 4-minute fix',
      eyebrow: 'The ATS safe pass',
      title: 'Four checks before your CV goes into a South African careers portal.',
      items: [
        {
          label: '01',
          value: 'Plain text',
          note: 'Copy the CV into Notepad and check whether the story still reads in the right order.',
        },
        {
          label: '02',
          value: 'Section names',
          note: 'Use standard headings like Work Experience, Key Skills, and Education so the parser knows what it is reading.',
        },
        {
          label: '03',
          value: 'Clean structure',
          note: 'Remove photos, tables, headers, footers, text boxes, and anything that hides important information.',
        },
        {
          label: '04',
          value: 'Exact keywords',
          note: 'Mirror the job description language in your summary, skills, and achievement bullets.',
        },
      ],
    },
    imageInserts: [
      {
        afterHeading: 'What ATS is and what it actually does to your CV',
        variant: 'atsFlow',
        eyebrow: 'What happens after submit',
        title: 'Your CV enters a filter before it reaches a recruiter.',
        caption:
          'A clean document helps the system extract your details, match the role, and move you into the review pile.',
      },
      {
        afterHeading: 'What breaks ATS and why your Canva CV is a problem',
        variant: 'plainTextTest',
        eyebrow: 'The 30-second readability check',
        title: 'If Notepad cannot read it clearly, ATS probably cannot either.',
        caption:
          'The plain-text test reveals hidden formatting problems like columns, text boxes, image-based PDFs, and scrambled sections.',
      },
      {
        afterHeading: 'Keywords are the part that actually gets you through',
        variant: 'keywordZones',
        eyebrow: 'Where keywords belong',
        title: 'Place exact job-ad language in the areas ATS and recruiters scan first.',
        caption:
          'The goal is not keyword stuffing. It is strategic repetition in the summary, skills, and achievement bullets.',
      },
    ],
    takeaways: [
      'ATS is the first gate for many South African corporate applications, especially banks, retailers, telecoms, mining houses, and multinationals.',
      'Your CV must be readable before keywords matter. The plain-text test shows whether ATS can parse your document.',
      'Canva exports, tables, columns, photos, headers, footers, and text boxes are common reasons a strong CV becomes invisible.',
      'Use SA-specific terms carefully, including NQF levels, full qualification names, professional designations, and exact job advert keywords.',
      'ATS can help you get screened in, but it will not fix weak positioning. Your CV still needs to tell a clear human story.',
    ],
    faqs: [
      {
        question: 'Do South African companies use ATS?',
        answer:
          'Yes. Major SA corporates, JSE-listed companies, and large retailers use ATS to manage high application volumes. Mr Price, Clicks, Capitec, and Pick n Pay use Neptune ATS - a locally built platform. SAP SuccessFactors and Workday are common at multinationals and financial services firms. For companies with fewer than 50 employees, manual CV review is still common.',
      },
      {
        question: 'What is the plain-text test for CVs?',
        answer:
          'Copy your entire CV (Ctrl+A, Ctrl+C), paste it into Notepad (Ctrl+V), and read the output. If it reads in logical order - name, contact details, experience, education - your CV will parse correctly in most ATS. If the text is scrambled or missing sections, your formatting is breaking the parser.',
      },
      {
        question: 'Should I include my ID number on my CV in South Africa?',
        answer:
          'No. Under POPIA (the Protection of Personal Information Act), your ID number is personal information. Include it only if a specific job application form explicitly requests it. Your ID number belongs on a formal application form, not a widely circulated CV document.',
      },
      {
        question: 'Should I include a photo on my South African CV?',
        answer:
          'Not unless the job advert specifically requests one. ATS cannot analyse photos - they add zero value to automated screening and can cause parsing problems. Most current SA career guidance recommends leaving photos out for ATS-submitted CVs.',
      },
      {
        question: 'What file format is best for ATS in South Africa?',
        answer:
          '.docx (Word) is universally safe across all ATS platforms. Text-based PDFs work with most modern systems. Avoid scanned documents, image-based PDFs, and Canva CV exports - these cannot be read by ATS at all.',
      },
    ],
    faqHeading: 'Questions people ask before sending an ATS-friendly CV.',
    authorBio: {
      name: 'Coach Kagiso',
      role: 'Career Development and Personal Brand Coach',
      body: 'Coach Kagiso is a career development and personal brand coach based in South Africa. She works with SA professionals who are doing the work but not moving - helping them get visible, get positioned, and get hired.',
      href: '/book/discovery',
      cta: 'Book a free discovery call',
    },
    sections: [
      {
        eyebrow: 'Search pillar',
        heading: 'You finally found it.',
        body: [
          "The role you've been waiting for. You did your research on the company, rewrote your CV, practised your \"tell me about yourself\" in the mirror more times than you'd like to admit. You hit submit. And then you waited.",
          'Silence.',
          "No acknowledgement email. No rejection. Just... nothing. And you're left wondering - was my CV even seen? Did it land in the right inbox? Am I just not qualified enough?",
          'I know that feeling. And I want to tell you what actually happened.',
          'In most cases, your CV never reached a human being at all.',
          "Not because you were underqualified. Not because your experience was wrong. But because the software sitting between you and the recruiter made a decision about your document in seconds - and moved on. This is what Applicant Tracking Systems do. And in South Africa's job market, where a single vacancy at a major corporate can attract 600 or more applications, ATS isn't an optional filter. It's the first gate. If your CV doesn't get through it, nothing else matters.",
          'The good news: once you know what breaks ATS, most of it is fixable in under four minutes. No rewriting, no redesign. Just a few specific changes.',
          "Let's get into it.",
        ],
      },
      {
        heading: 'What ATS is and what it actually does to your CV',
        body: [
          "An Applicant Tracking System is software that receives, stores, and filters job applications before a human recruiter ever sees them. When you submit your CV on a company careers portal, you're not sending it to a person. You're sending it to a database.",
          'The ATS reads your CV, extracts information (your name, contact details, job titles, qualifications, skills), and scores it against the job requirements. If your CV scores above the threshold, it goes into the "review" pile. If it doesn\'t, it gets archived - and you never hear back.',
          "This is not a global problem imported from American career advice. It's happening at South Africa's biggest employers right now.",
          'Mr Price, Clicks, Capitec, and Pick n Pay all run a locally built ATS called Neptune, developed by [Graylink](https://www.graylink.biz). The major SA banks and multinationals use SAP SuccessFactors or Workday. Mid-market companies use platforms like [Talent Genie](https://www.talentgenie.co.za) - a SA-native system used by over 1,000 local companies and priced in rands.',
          "If you're applying to any JSE-listed company, a major retailer, one of the big four banks, a mining house, or a major telecoms company, ATS is almost certainly screening your application. For smaller companies - under 50 employees - manual review is still common. But for corporate SA? The machine is reading your CV first.",
        ],
      },
      {
        heading: 'Does ATS apply to you?',
        body: [
          "Before we go further, here's a quick check.",
          '**ATS is almost certain if you\'re applying to:**',
          {
            type: 'list',
            items: [
              'JSE-listed companies',
              'The big four banks (Standard Bank, ABSA, FNB/FirstRand, Nedbank)',
              'Major retailers (Pick n Pay, Woolworths, Shoprite, Clicks, Mr Price)',
              'Mining houses and major resources companies',
              'MTN, Vodacom, Telkom',
              'Any multinational operating in SA',
              'Any company using an online careers portal',
            ],
          },
          "**Manual review is still likely if you're applying to:**",
          {
            type: 'list',
            items: [
              'Companies with fewer than 50 employees',
              'Small businesses that recruit via WhatsApp or email',
              'Roles sourced through personal referral or direct recruiter contact',
            ],
          },
          "If you're not sure, assume ATS. The cost of assuming manual review - and losing your application before anyone reads it - is far higher than spending four minutes making your CV ATS-safe.",
        ],
      },
      {
        heading: 'What breaks ATS and why your Canva CV is a problem',
        body: [
          "Here's the part most articles skip: modern ATS doesn't just check your keywords. It has to **read** your CV first - and many common formatting choices make that impossible.",
          {
            type: 'subheading',
            text: 'The formatting killers',
          },
          "**Multi-column layouts.** ATS reads left to right across your page. If your CV has two columns, it merges them - which means your contact details end up mixed with your work experience, and nothing makes sense.",
          '**Tables.** Cell contents get scrambled or read completely out of order. A table that looks clean to a human becomes a jumbled mess for a parser.',
          '**Text boxes and floating elements.** ATS treats these as images. The content inside becomes invisible.',
          '**Headers and footers.** Most ATS cannot read content placed in a document header or footer. If your name and phone number are in the header, the ATS may have no idea who sent the CV.',
          '**Graphics, icons, and skill rating bars.** Ignored entirely. That visual bar showing your "Excel: 80%" is meaningless to an ATS.',
          '**Canva exports.** This one matters for South Africa, because Canva CV templates are popular here. The problem: most Canva PDFs export as image-based files, meaning the text is embedded in a graphic. ATS sees a picture, not words. Your entire CV becomes invisible.',
          "The plain-text test tells you immediately whether your CV has a parsing problem. Here's how to do it:",
          {
            type: 'orderedList',
            items: [
              'Open your CV',
              'Press Ctrl+A (select all), then Ctrl+C (copy)',
              'Open Notepad (or any plain text editor)',
              'Press Ctrl+V (paste)',
            ],
          },
          "If the text reads in logical, coherent order - name, contact, experience, education - your CV will parse correctly in most ATS. If it's scrambled, merged, or missing sections, you have a formatting problem.",
          'Do this before you apply anywhere. It takes 30 seconds.',
          {
            type: 'subheading',
            text: 'File format: PDF or Word?',
          },
          'The old advice was always "send Word." That\'s no longer accurate across the board.',
          'Modern ATS (post-2020 systems) handle text-based PDFs fine. The universally safe format is still .docx - every ATS handles it reliably. Text-based PDFs work with most current systems.',
          "What doesn't work: scanned documents, photographed CVs, and Canva exports. These are image files. No ATS can read them.",
          'Practical approach: keep both versions. Send .docx when submitting through online portals. Send a clean PDF for direct recruiter emails unless they ask otherwise.',
        ],
      },
      {
        heading: 'The SA-specific danger zone',
        body: [
          'South African CVs have a few norms that interact badly with ATS - and with POPIA.',
          {
            type: 'subheading',
            text: 'Your photo',
          },
          'The old SA convention was to include a professional photograph. Some international sources still recommend this for South African CVs. Ignore that advice.',
          'ATS cannot analyse photos. The image adds zero value to your application and can actually cause parsing problems. Progressive SA employers are moving away from photos for bias-reduction reasons too.',
          'Leave the photo out unless the job advert explicitly requests one.',
          {
            type: 'subheading',
            text: 'Your ID number',
          },
          "The [Western Cape Government's CV checklist](https://www.westerncape.gov.za) - still live on westerncape.gov.za - tells you to include your ID number. This is outdated advice.",
          'Under [POPIA](https://popia.co.za) (the Protection of Personal Information Act, fully in effect since 2021), your ID number is personal information. Including it on a CV that circulates freely creates unnecessary privacy risk for you and compliance headaches for the employer receiving it.',
          'Your ID number belongs on a formal application form, where the employer can demonstrate a lawful basis for collecting it. Not on your CV.',
          "Don't include your ID number unless a specific job application explicitly asks for it.",
          {
            type: 'subheading',
            text: 'BEE and EE status',
          },
          'This question comes up often: should you include your BEE status or equity designation on your CV?',
          'No. EE and B-BBEE information is collected by employers through their own internal processes and application forms - not through CV parsing. SA-native ATS systems like Neptune have EE and B-BBEE tracking built directly into the platform precisely because this data needs to be handled carefully under the [Employment Equity Act](https://www.labour.gov.za/employment-equity) and POPIA.',
          'If an advert explicitly asks for your equity status, note it briefly. Otherwise, leave it off.',
          {
            type: 'subheading',
            text: 'NQF levels and SA qualifications',
          },
          'Here\'s something unique to SA CVs: our qualifications don\'t always map to international ATS field structures. When listing qualifications, write both the full name and the NQF level: "BCom Accounting, NQF 7" or "National Diploma: Human Resources Management, NQF 6." Include the full institution name alongside common abbreviations - "University of Cape Town (UCT)" not just "UCT," because some ATS won\'t recognise the abbreviation.',
          'The same applies to professional designations: "Chartered Accountant (CA(SA))" catches both how recruiters search for it.',
        ],
      },
      {
        heading: 'Keywords are the part that actually gets you through',
        body: [
          'Once your formatting is clean, keywords are what determine whether you score above the threshold.',
          'ATS keyword matching is often literal - especially in older systems like Oracle Taleo, which is still running at some SA government departments and parastatals. "Project management" does not equal "managing projects." "Customer Relationship Management (CRM)" catches both the full term and the abbreviation; "CRM" alone might not.',
          "Here's the process:",
          '**Step 1: Read the job description three times.** Highlight every skill, tool, qualification, and phrase that appears more than once. Repetition signals priority.',
          '**Step 2: Categorise hard skills vs. soft skills.** ATS ranks hard skills heavily - qualifications, certifications, tools, industry-specific terms. Soft skills like "team player" and "excellent communicator" carry minimal ATS weight. Your skills section should be built from hard skills that mirror the job description, not a list of adjectives.',
          'SA-specific hard skills that matter: SAP SuccessFactors, IFRS reporting, King IV governance, BBBEE compliance, NQF levels, SAICA, SABPP, specific ERP systems, programming languages, SAQA.',
          '**Step 3: Mirror exact language.** "Stakeholder engagement" not "working with stakeholders." "P&L management" not "profit and loss responsibility." Match the exact phrase the recruiter used.',
          '**Step 4: Include both the full term and the acronym on first use.** "Broad-Based Black Economic Empowerment (BBBEE)" then use either going forward.',
          "**Step 5: Place keywords in three zones.** Professional summary. Skills section. Inside achievement bullets in work experience. Don't stuff them into a hidden paragraph - modern ATS flags that.",
          "The target is roughly 65-75% keyword match with the job description. You don't need 100% - that looks like manipulation. You need enough to score above the threshold.",
          "Two free tools worth knowing about: [Jobscan](https://www.jobscan.co) and [Resume Worded](https://resumeworded.com) both let you upload your CV alongside a job description and get a keyword match score. They're calibrated for global ATS platforms (Workday, Greenhouse, SuccessFactors) rather than SA-native systems like Neptune, so they're most useful if you're applying to multinationals or large SA corporates. For smaller SA companies, the plain-text test remains your most reliable check.",
        ],
      },
      {
        heading: 'The 4-minute fix',
        body: [
          "If you've never checked your CV against ATS, here's what to do right now. This works for any CV, any format.",
          "**Minute 1: Run the plain-text test.** Ctrl+A -> Ctrl+C -> Notepad -> Ctrl+V. Read the output. If it's scrambled, your CV has formatting problems that need fixing before you apply anywhere. If it reads clean, move on.",
          '**Minute 2: Check your section headings.** ATS maps your CV by recognising standard section names. Replace any creative headings with standard ones:',
          {
            type: 'list',
            items: [
              '"My Professional Journey" -> **Work Experience**',
              '"What I Bring" -> **Key Skills**',
              '"Academic Background" -> **Education**',
              '"What People Say About Me" -> **References**',
            ],
          },
          'Standard headings. Every time.',
          '**Minute 3: Remove or relocate anything that breaks parsing.** Photos - delete. Information in headers/footers - move into the document body. Tables in your skills section - convert to a clean bulleted list. Text boxes - remove and replace with regular paragraphs.',
          'If your CV is a Canva export and the plain-text test failed, you need a new document. Open a Word template and rebuild it clean. (The free ATS CV template at the bottom of this article is a good starting point.)',
          "**Minute 4: Mirror three keywords from the job description into your summary.** Read the job advert. Find the three most repeated skills or phrases. Make sure they appear in your professional summary, in the exact words the employer used. This is the single highest-leverage ATS change you can make on a document that's otherwise clean.",
        ],
      },
      {
        heading: 'One thing ATS will not fix for you',
        body: [
          "Here's the part I want you to sit with.",
          "ATS gets you through the first filter. But a CV that passes ATS and still doesn't reflect your actual story, your progression, your positioning - that CV gets read by a human and then quietly set aside. Different problem, same outcome.",
          'Formatting is fixable in four minutes. Positioning takes longer. And positioning is the work that actually gets you hired - not just screened in.',
          "If you've been applying consistently and not hearing back, the ATS test is a good starting point. Run it. Fix what's broken.",
          "But if you've been getting past ATS and still not converting interviews, the issue isn't your formatting. It's your story. That's a different conversation - and if you want to have it, [the 48-Hour CV Review](/buy/cv-review) is where we start.",
        ],
      },
      {
        heading: 'Free download: The ATS CV Checklist',
        body: [
          'Everything in this article, condensed into a one-page checklist you can use before every application.',
        ],
      },
      {
        heading: 'If your CV needs more than a checklist',
        body: [
          "Sometimes the formatting is fine and the document itself is the problem - the roles aren't framed right, the achievements are buried, the summary reads like a job description instead of a human being.",
          "That's what the [CV Revamp (R400)](/buy/cv-revamp) is for. I rewrite your CV from scratch, ATS-optimised and positioned for the roles you're actually targeting.",
          "Or, if your LinkedIn profile and CV need to tell the same story - because they usually don't - the [CV + LinkedIn Bundle (R500)](/buy/bundle) covers both.",
        ],
      },
    ],
  },
  {
    slug: 'linkedin-profile-optimisation-south-africa-2026',
    title: 'LinkedIn Profile Optimisation for SA Professionals: The Complete Playbook',
    dek: 'Most SA professionals have a LinkedIn profile. Very few have one that gets them found. Here is how the algorithm works in 2026 and how to fix your profile section by section.',
    metaTitle: 'LinkedIn Profile Optimisation for SA Professionals: The Complete 2026 Playbook',
    metaDescription:
      'Most SA professionals have a LinkedIn profile. Very few have one that gets them found. Here is how the algorithm works in 2026 and how to fix your profile section by section.',
    category: 'Search Pillar',
    tags: ['LinkedIn', 'Personal Brand', 'Visibility'],
    readTime: '11 min read',
    date: 'May 2026',
    image: '/images/insights/linkedin-optimisation-playbook.jpg',
    imageAlt: 'LinkedIn profile open on a laptop in a warm professional workspace',
    leadMagnet: {
      eyebrow: 'Free LinkedIn headline builder',
      title: 'Want headline examples you can adapt before you rewrite yours?',
      body: 'Download 39 before-and-after LinkedIn headline rewrites, the recruiter formula, and the keyword bank by industry.',
      cta: 'Get the PDF',
      href: '/resources/linkedin-headline-swipe-file',
      afterHeading: 'Free download: The SA LinkedIn Headline Builder',
    },
    visualBreak: {
      afterHeading: 'The section-by-section guide',
      eyebrow: 'The visibility stack',
      title: 'Six profile areas that decide whether recruiters understand your value.',
      items: [
        {
          label: '01',
          value: 'Headline',
          note: 'Your highest-weighted search field and the first reason a recruiter clicks.',
        },
        {
          label: '02',
          value: 'About',
          note: 'Your hook, proof, and keyword bank in one section.',
        },
        {
          label: '03',
          value: 'Experience',
          note: 'Impact-based evidence that shows scale, context, and results.',
        },
        {
          label: '04',
          value: 'Featured',
          note: 'Visible proof that supports the claims your profile is making.',
        },
        {
          label: '05',
          value: 'Skills',
          note: 'Searchable keywords that help LinkedIn match you to recruiter queries.',
        },
        {
          label: '06',
          value: 'Recommendations',
          note: 'Third-party evidence that makes your value easier to trust.',
        },
      ],
    },
    imageInserts: [
      {
        afterHeading: 'How LinkedIn search works in 2026',
        variant: 'linkedinSearch',
        eyebrow: 'Recruiter search logic',
        title: 'LinkedIn search is no longer just a keyword box.',
        caption:
          'Recruiters are filtering through keyword match, profile completeness, and activity signals before they ever decide who to message.',
      },
      {
        afterHeading: 'Your headline: 220 characters you are probably wasting',
        variant: 'headlineRewrite',
        eyebrow: 'The headline rewrite',
        title: 'A stronger headline gives the algorithm more to index and the recruiter more reason to click.',
        caption:
          'Use the full field to combine target role, technical context, quantified proof, and South African market relevance.',
      },
      {
        afterHeading: 'Your LinkedIn profile checklist',
        variant: 'linkedinChecklist',
        eyebrow: 'Profile readiness check',
        title: 'Your profile should be searchable, complete, evidenced, and alive.',
        caption:
          'If several of these sections are weak or empty, the issue is not that LinkedIn is not working. The profile is not giving it enough to work with.',
      },
    ],
    takeaways: [
      'Your LinkedIn profile is not a digital CV. It is a search asset that helps recruiters find you before roles are advertised.',
      'LinkedIn search in 2026 works across keywords, profile completeness, and activity signals. You need all three.',
      'The headline, About section, experience bullets, Featured section, skills, and recommendations all have different jobs.',
      'SA professionals should use local signals clearly, including rands, BBBEE, King IV, NQF levels, SADC context, and industry-specific tools.',
      'An optimised profile gets you found, but positioning is what turns views into conversations.',
    ],
    faqs: [
      {
        question: 'How do I optimise my LinkedIn profile for South African recruiters?',
        answer:
          'Focus on three areas: your headline, your About section, and your experience section. Use all 220 headline characters with your target role, key skills, and a quantified result. Open your About section with a specific first-person hook, then replace duty descriptions with impact-based bullets using rands, percentages, and timeframes. Stay active by posting once and commenting at least twice per week.',
      },
      {
        question: 'What should my LinkedIn headline say as a South African professional?',
        answer:
          'Use the formula: target role title, specialist area or technical skill, quantified result, and SA or industry context. For example: "Financial Manager | IFRS & Strategic Reporting | Reduced Month-End Close from 15 to 6 Days | SA Financial Services." Use all 220 characters available.',
      },
      {
        question: 'Should I turn on Open to Work on LinkedIn in South Africa?',
        answer:
          'It depends on your situation. If you are employed and looking quietly, use the Recruiters only setting. If you are between roles and actively searching, the public banner is recommended because it prioritises you in recruiter searches.',
      },
      {
        question: 'Does LinkedIn Creator Mode help with job searching in South Africa?',
        answer:
          'For most job seekers, no. Creator Mode changes your Connect button to a Follow button, which creates friction for recruiters who want to message you directly. Unless you are publishing weekly newsletter content consistently, keep Creator Mode off while job hunting.',
      },
      {
        question: 'How do I check my LinkedIn SSI score?',
        answer:
          'Go to linkedin.com/sales/ssi while logged into your account. Your Social Selling Index score, from 0 to 100, shows how well your profile is performing across four pillars. Professionals with scores above 70 experience significantly more profile views and recruiter contact.',
      },
    ],
    faqHeading: 'Questions SA professionals ask before optimising LinkedIn.',
    authorBio: {
      name: 'Coach Kagiso',
      role: 'Career Development and Personal Brand Coach',
      body: 'Coach Kagiso is a career development and personal brand coach based in South Africa. She helps SA professionals show up boldly, get visible, and grow with intention.',
      href: '/book/discovery',
      cta: 'Book a free discovery call',
    },
    sections: [
      {
        eyebrow: 'Search pillar',
        heading: 'Recruiters are not waiting for you to apply.',
        body: [
          'Recruiters at Standard Bank, MTN, and Capitec are not waiting for you to apply.',
          "They are searching. Right now. Running queries through LinkedIn's AI, filtering by keywords, location, skills, and activity signals. Your profile is either showing up in those results or it isn't. And here's the part most SA career advice skips: a profile that was set up three years ago and never touched again is, for the algorithm's purposes, invisible.",
          'This article explains how LinkedIn search actually works in 2026 and what to do about it, section by section.',
        ],
      },
      {
        heading: 'Your LinkedIn profile is not a digital CV',
        body: [
          'This is the first thing to get right in your head.',
          'When you send a CV, you are responding to a job. When you optimise your LinkedIn profile, you are making yourself findable for jobs that have not been advertised yet, by recruiters who are actively looking for someone with exactly your background.',
          "LinkedIn's own data shows that keyword-optimised profiles receive 40% more profile views and three times more recruiter messages than generic ones. In South Africa's job market, where advertised roles attract hundreds of applications, being found before a role goes public is a real edge.",
          'The professionals who understand this are not waiting for job adverts. They are positioning themselves to be discovered.',
        ],
      },
      {
        heading: 'How LinkedIn search works in 2026',
        body: [
          'The old model was simple keyword matching. A recruiter types "Financial Manager CA(SA) Johannesburg" and gets a list of profiles containing those words. That still happens. But in 2026 it is layer one of a three-layer system.',
          '**Layer one: keyword matching.** The algorithm checks whether your profile contains the exact terms a recruiter searched for. This is why your headline, About section, and skills need to use the same language employers put in job descriptions. Not your internal company title. Not a creative reframe. The actual words.',
          "**Layer two: profile completeness.** Incomplete profiles are filtered out before a recruiter sees them. LinkedIn's All-Star status, which requires a photo, headline, About section, current position, education, five skills, and at least one connection, is not a bonus. It is a prerequisite. Profiles without it are functionally invisible in recruiter search.",
          '**Layer three: activity signals.** LinkedIn now ranks search results partly by "likelihood to respond", a score based on how recently you have been active on the platform. A well-optimised profile that has been dormant for six months will rank lower than a slightly less optimised profile that is active. We will come back to this.',
          'Understanding these three layers changes how you approach your profile. It is not about impressing a human who lands on your page. It is about scoring well across all three layers so the right humans find you in the first place.',
        ],
      },
      {
        heading: 'The section-by-section guide',
        body: [
          'This is where the profile stops being a static page and starts becoming a search asset. Each section has a job. If one section is weak, the whole profile works harder than it should.',
        ],
      },
      {
        heading: 'Your headline: 220 characters you are probably wasting',
        body: [
          'The headline is the most important field on your LinkedIn profile. The algorithm weights it at roughly five times the relevance of regular profile text. It is the first thing a recruiter sees in search results.',
          'The most common mistake SA professionals make: using their current job title and company name. "Operations Manager at XYZ Company" gives the algorithm one signal and tells the recruiter almost nothing about why they should click.',
          'The formula that works in 2026:',
          '**[Target Role Title] | [Specialist Area or Technical Skill] | [Quantified Result or SA Context] | [Value Statement]**',
          'Here is what that looks like in practice:',
          '*Before:* "HR Manager | ABC Financial Services"',
          '*After:* "HR Manager | Talent Acquisition & BBBEE Strategy | Reduced Time-to-Hire by 30% | Building High-Performance Teams in SA Financial Services"',
          '*Before:* "Project Manager"',
          '*After:* "Project Manager | Agile & Prince2 | Delivered R80M Infrastructure Projects on Time | Johannesburg & SADC Region"',
          'Each "after" headline gives the algorithm specific keywords to index, gives the recruiter a reason to click, and does both in under 220 characters.',
          'Most SA professionals use about 60 of those 220 characters. Use all of them.',
        ],
      },
      {
        heading: 'Your About section: the hook that holds attention',
        body: [
          'Only the first three lines of your About section are visible before the "See more" button. Those three lines are your hook. If they do not make a recruiter want to read further, the rest of the section does not matter.',
          'The structure that works:',
          '**Hook (lines 1-3):** A first-person statement of who you are, what you do, and the scale of your work. Not "I am a passionate professional with 10 years of experience." Something specific: "In the last six years, I have helped three SA retailers move from legacy systems to cloud-native platforms, cutting their IT overhead by an average of 20%."',
          '**The value paragraph:** A short section on your how, your methodology, your leadership approach, what makes the way you work distinctive.',
          '**Achievement bullets (3-4):** Specific, quantified results in the South African context. Use rands, percentages, timeframes. "Managed R150M budget" tells the algorithm and the recruiter something. "Managed large budget" tells neither.',
          '**Core competencies:** A final section listing your key technical terms. "SAP SuccessFactors | IFRS Reporting | BBBEE Compliance | King IV Governance | Stakeholder Management." This is your keyword bank for the AI.',
          'One rule SA recruiters are consistent about: write in the first person. "I lead teams through complex change" lands differently than "Results-oriented leader with change management expertise." The first sounds like a person. The second sounds like a LinkedIn template, which it is, because everyone uses it.',
        ],
      },
      {
        heading: 'Your experience section: impact, not duties',
        body: [
          'The single biggest upgrade most SA professionals can make is converting their experience section from a list of duties to a list of results.',
          'Duty-based: "Responsible for managing the finance team and preparing monthly reports."',
          'Impact-based: "Led a team of eight finance professionals to reduce the monthly reporting cycle from 15 days to 6 days, freeing the CFO\'s review time by 40%."',
          'The difference matters because recruiters at major SA corporates are looking for evidence of impact in the SA context specifically. Scale your results to what is meaningful here. Rands, not dollars. Percentages in a low-growth GDP environment. BBBEE and transformation metrics. Load-shedding resilience. SADC expansion.',
          'The algorithm cannot guess the scale of your impact. If you do not quantify it, it does not exist in the search ranking.',
          'A format that works for each role entry:',
          {
            type: 'list',
            items: [
              'Front-load the result ("Led," "Grew," "Reduced," "Delivered")',
              'Add context (team size, budget, scope)',
              'Name the method (what you actually did)',
              'Include the tool or framework (SAP, Agile, King IV, these are keywords)',
            ],
          },
          'Each experience entry can also carry media attachments: PDFs, links to projects, certificates. These increase what is called dwell time on your profile, which is a positive signal to the algorithm. Use them.',
        ],
      },
      {
        heading: 'Your featured section: show, do not just tell',
        body: [
          'Most SA professionals leave this section empty. That is a missed opportunity.',
          'The Featured section sits prominently on your profile and lets you pin content: posts you have written, articles, PDFs, project links. Think of it as your portfolio, visible to every recruiter who lands on your page.',
          'What to pin:',
          {
            type: 'list',
            items: [
              'A PDF of your updated, [ATS-friendly CV](/insights/ats-cv-south-africa-4-minute-fix)',
              'A high-performing post you have written about your industry',
              'A case study or project summary (anonymised if needed)',
              'A certificate or credential that matters in your field',
              'A link to published work or a media feature',
            ],
          },
          'Recruiters at Standard Bank [specifically cite the Featured section](https://www.standardbank.co.za/southafrica/personal/learn/tips-to-boost-your-linkedin-profile) as a way to verify capability beyond the profile text. It is the difference between claiming you can do something and showing evidence that you have done it.',
        ],
      },
      {
        heading: 'Your skills section: the 100-skill opportunity',
        body: [
          'LinkedIn now allows up to 100 skills. Most SA professionals have 10 or fewer.',
          'Every skill you add is another keyword the algorithm can use to match you to recruiter searches. The three skills you pin to the top carry the most weight. For SA professionals, those three should be:',
          {
            type: 'orderedList',
            items: [
              'Your primary role title ("Financial Management," not just "Finance")',
              'Your primary technical tool or methodology ("SAP SuccessFactors," "IFRS," "Prince2")',
              'A high-demand contextual skill ("BBBEE Strategy," "Stakeholder Engagement," "Digital Transformation")',
            ],
          },
          'Endorsements still count. Skills endorsed by colleagues in your industry carry more weight than endorsements from people in unrelated fields. The algorithm treats them as peer-validated signals.',
        ],
      },
      {
        heading: 'Recommendations: three specific ones',
        body: [
          'Three well-written recommendations are worth more than ten generic ones.',
          'The combination that carries the most weight: one from a direct manager, one from a peer, and one from a client or stakeholder you have served.',
          'When you ask for a recommendation, ask specifically. "Can you write something about the warehouse automation project we delivered under budget" gets you a better result than "Can you write me a LinkedIn recommendation." The more specific the ask, the more useful the result.',
        ],
      },
      {
        heading: 'The "Open to Work" question',
        body: [
          'Whether to use it, and how, depends on your situation.',
          'If you are employed and looking quietly: use the "Recruiters only" setting. This makes you visible to LinkedIn Recruiter users without showing the public green banner, which means your current employer will not see it in their feed.',
          "If you are between roles and actively looking: the public green banner is worth using. It moves you into LinkedIn's Open to Work spotlight, a priority filter recruiters use specifically to find candidates who are ready to move quickly.",
          'One thing worth knowing: LinkedIn groups candidates into spotlight categories that recruiters can filter by. Beyond Open to Work, two others are worth engineering deliberately.',
          '"Engaged with Talent Brand", you get here by following target companies and engaging with their posts. Recruiters filter for this because it signals genuine interest in their organisation.',
          '"Have Company Connections", you get here by connecting with employees at your target companies. Being a second-degree connection to a hiring manager, or having three first-degree connections inside a company, can move you to the top of a recruiter\'s shortlist automatically.',
          "This is how you move from the general pool of thousands to a spotlight list of fifty.",
        ],
      },
      {
        heading: 'Activity: the part most people skip',
        body: [
          "A well-optimised profile that has been dormant for months is, in the algorithm's language, dead data. The platform scores your likelihood to respond based on how often you log in, how recently you have been active, and how you have engaged with content. This score affects where you rank in recruiter searches.",
          'You do not need to become a LinkedIn content creator. You need to maintain what the algorithm considers a warm profile.',
          'The minimum threshold in 2026: post once a week, comment at least twice a week.',
          'Commenting is actually more effective than posting for job seekers. A thoughtful comment on a post by a recruiter, hiring manager, or industry leader, something that adds to the conversation rather than just reacting, is indexed as an activity signal and exposes your profile to their network. Five substantive comments a day, targeted at the right people, does more for your visibility than posting content that no one engages with.',
          'One note on Creator Mode: if you are job hunting, keep it off. Creator Mode changes your Connect button to a Follow button, which creates friction for recruiters who want to message you directly without spending InMail credits. Unless you are publishing weekly newsletter content consistently, leave Creator Mode off.',
        ],
      },
      {
        heading: 'Check your own SSI score',
        body: [
          'LinkedIn gives every user a free Social Selling Index score, a 0 to 100 rating measuring how well your profile is set up and how actively you are using the platform. Professionals with a score above 70 experience significantly more profile views and recruiter contact than those below that threshold.',
          '[Check your SSI score here](https://linkedin.com/sales/ssi), it takes 30 seconds and shows you exactly which of the four pillars needs work.',
        ],
      },
      {
        heading: 'Your LinkedIn profile checklist',
        body: [
          'Before you close this article:',
          {
            type: 'list',
            items: [
              '[ ] Headline uses all 220 characters with the correct formula',
              '[ ] About section opens with a specific, first-person hook in the first three lines',
              '[ ] Experience section uses impact-based bullets with rands, percentages, and timeframes',
              '[ ] Featured section has at least two pieces of pinned content',
              '[ ] Skills section has 20 or more relevant skills with top three pinned',
              '[ ] At least three recommendations (manager, peer, client or stakeholder)',
              '[ ] Profile photo is recent, professional, shows your face clearly',
              '[ ] Banner image is branded or relevant to your field, not the default blue',
              '[ ] Open to Work is set correctly for your situation',
              '[ ] Profile has been active in the last 30 days',
            ],
          },
          'If you are checking fewer than seven of those boxes, your profile is costing you opportunities you do not know you are missing.',
        ],
      },
      {
        heading: 'One thing a LinkedIn profile cannot fix on its own',
        body: [
          'A well-optimised LinkedIn profile gets you found. It does not guarantee you get hired.',
          'The profile gets the recruiter to click. What happens after that, the first message, the interview, the way you position yourself, the story you tell about your career, that is a different layer of work entirely.',
          'If you have been getting profile views but not converting them to conversations, or getting conversations but not converting them to interviews, the issue is not your headline. It is your positioning. Your story. The clarity of where you are going and why.',
          'That is what the [Career Clarity Session (R800)](/book/clarity) is for. Seventy-five minutes of focused work on where you are, where you are going, and how to talk about it, on LinkedIn, in interviews, and everywhere else.',
          'Or, if your CV and LinkedIn both need work and you want them to tell the same story, the [CV + LinkedIn Bundle (R500)](/buy/bundle) covers both.',
          'If you require a [LinkedIn profile optimisation](/buy/linkedin) where I rewrite your profile for you, that is also available. You may connect with me for more information.',
          'Your career matters. Keep elevating.',
        ],
      },
      {
        heading: 'Free download: The SA LinkedIn Headline Builder',
        body: [
          '39 before-and-after headline rewrites for SA professionals across different industries and career stages. Includes the formula, the logic behind each rewrite, and the keyword bank by industry.',
        ],
      },
    ],
  },
  {
    slug: 'free-sa-learning-resources-2026',
    title: 'The Free SA Learning Resources Worth Your Weekend (2026 Edition)',
    dek: 'Most free learning lists are recycled global platforms with paywalls hiding behind the word free. This guide is built for South African professionals who want real return on their weekend time.',
    metaTitle: 'The Free SA Learning Resources Worth Your Weekend (2026 Edition)',
    metaDescription:
      'Most free learning lists are recycled global platforms with paywalls. This guide is built for South African professionals who want real ROI on their weekend time.',
    category: 'Curated List',
    tags: ['Skills & Learning', 'Career Growth', 'Strategy'],
    readTime: '9 min read',
    date: 'May 2026',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1400&auto=format&fit=crop',
    imageAlt: 'Professional studying online with a laptop and notebook on a warm desk',
    leadMagnet: {
      eyebrow: 'Free career audit',
      title: 'Not sure which skill is actually costing you opportunities?',
      body: 'Take the Personal Brand Audit and check whether your skills, visibility, and positioning are aligned with the move you are trying to make.',
      cta: 'Take the audit',
      href: '/#leadmagnet',
      afterHeading: 'First: know what you are upskilling toward',
    },
    visualBreak: {
      afterHeading: 'First: know what you are upskilling toward',
      eyebrow: 'Learning filter',
      title: 'A useful course has to connect to a real career gap.',
      items: [
        {
          label: '01',
          value: 'Target role',
          note: 'What work are you trying to move into or grow inside?',
        },
        {
          label: '02',
          value: 'Missing skill',
          note: 'Which skill gap is actually showing up in job adverts, feedback, or interviews?',
        },
        {
          label: '03',
          value: 'Proof',
          note: 'Will this resource give you evidence you can add to your CV, LinkedIn, or interview story?',
        },
        {
          label: '04',
          value: 'Access',
          note: 'Can you finish it with the time, data, and devices you realistically have?',
        },
      ],
    },
    imageInserts: [
      {
        afterHeading: 'The credentials that actually move the needle, and the ones that do not',
        variant: 'credentialMatrix',
        eyebrow: 'Credential filter',
        title: 'A certificate only matters when the market knows what to do with it.',
        caption:
          'Before you spend a weekend learning, check whether the credential appears in current SA job adverts for the roles you want.',
      },
      {
        afterHeading: 'A note on data costs and access',
        variant: 'dataAccess',
        eyebrow: 'Access matters',
        title: 'Choose the learning route that your actual life can support.',
        caption:
          'For many South African professionals, the barrier is not motivation. It is data, device access, and time.',
      },
    ],
    takeaways: [
      'Free learning only helps when it points toward a specific career move.',
      'SETA-funded learning can carry real weight in South Africa, but employed professionals usually access it through their employer or SDF.',
      'Microsoft, Google, IBM, and SETA credentials are stronger signals when they match current SA job adverts.',
      'Data cost still matters. Zero-rated, offline, and data-light options can make learning more realistic.',
      'If you cannot connect a course to your target role, it is probably not the best use of your weekend.',
    ],
    faqs: [
      {
        question: 'Are SETA courses free for employed South African professionals?',
        answer:
          'Yes. Employed professionals can qualify for SETA-funded training, but access is typically through an employer Skills Development Facilitator rather than direct self-enrolment. Ask HR whether your company has a discretionary grant available for employee upskilling.',
      },
      {
        question: 'Can South Africans get Coursera Financial Aid?',
        answer:
          'Yes. Coursera Financial Aid is available to South African learners and does not require you to be a current student. Applications take at least 15 days to review and must be done on a computer, not the mobile app.',
      },
      {
        question: 'Which free certifications help with job applications in South Africa?',
        answer:
          'Microsoft Azure, AWS, PMP, PRINCE2, SETA NQF qualifications, and Google, IBM, or Meta professional certificates tend to carry more weight when they match the target role. Generic course completion certificates are weaker unless you can demonstrate the skill clearly.',
      },
      {
        question: 'Is LinkedIn Learning free in South Africa?',
        answer:
          'LinkedIn Learning offers a one-month free trial for new users. The best approach is to choose one learning path before you start the trial, complete it, download the certificate, and add it to your LinkedIn profile before the trial ends.',
      },
      {
        question: 'What is the YES x Microsoft AI Skills Initiative?',
        answer:
          'It is a YES and Microsoft partnership that gives South Africans access to globally recognised Microsoft certifications in areas like AI, Data Science, Cybersecurity Analysis, and Cloud Solution Architecture. Certification vouchers are limited, so check current availability before planning around it.',
      },
    ],
    faqHeading: 'Questions people ask before choosing a free learning resource.',
    authorBio: {
      name: 'Coach Kagiso',
      role: 'Career Development and Personal Brand Coach',
      body: 'Coach Kagiso is a career development and personal brand coach based in South Africa. She helps SA professionals make clearer career moves, strengthen their visibility, and choose growth steps with intention.',
      href: '/book/discovery',
      cta: 'Book a free discovery call',
    },
    sections: [
      {
        eyebrow: 'Curated list',
        heading: 'So I did the clicking for you.',
        body: [
          'Every few weeks, someone shares a list of "free online courses." The caption usually says something like "upskill yourself this weekend."',
          'So I click through. Coursera is behind a paywall. LinkedIn Learning wants a credit card. The YouTube channel was last updated in 2019.',
          'So I did the clicking so you do not have to.',
          'Everything here is genuinely accessible to South African professionals in 2026. Where something has a catch, an application process, an employer requirement, or a data cost, I say so. You deserve honest information, not hype.',
          'Here is where to actually start.',
        ],
      },
      {
        heading: 'First: know what you are upskilling toward',
        body: [
          'Before you spend a weekend on any course, spend 20 minutes on this question: what skill gap is actually costing you opportunities right now?',
          'The [Xpatweb Critical Skills Survey](https://www.xpatweb.com) covers 381 SA employers, including JSE-listed companies and multinationals. Its 2025 data is clear: the roles hardest to fill are ICT specialists (data analysts, data scientists, software engineers), engineers, and financial professionals. The [Career Junction Employment Insights Report](https://www.careerjunction.co.za) for Q4 2025 shows medical, health, and logistics roles are also growing fast.',
          'The point is not that you need to become a data scientist. The point is that learning should be targeted, not random. *A weekend on a skill your industry is not searching for is a weekend wasted.*',
          'If you are not sure which skill gap is costing you the most, the [Personal Brand Audit](/#leadmagnet) is a free 5-minute assessment that checks your professional visibility across five dimensions, including whether your skills profile matches what SA employers are currently looking for.',
          'Now, to the resources.',
        ],
      },
      {
        heading: '1. SETA Online Courses: free and NQF-accredited',
        body: [
          '**What it is:** South Africa has 21 Sector Education and Training Authorities (SETAs) that fund accredited training programmes using employer skills levies. Online SETA courses are free. No tuition fees.',
          '**Why it matters:** These are not informal certificates. SETA qualifications are accredited on the South African Qualifications Authority (SAQA) National Qualifications Framework (NQF). Employers, TVET colleges, and training institutions recognise them. They carry real weight in SA hiring.',
          '**The catch most people do not know:** If you are employed, you typically access SETA-funded training through your employer\'s Skills Development Facilitator (SDF), not by signing up directly on a Saturday morning. Ask your HR department or SDF whether your company has a discretionary grant available for employee upskilling. Many do, and many employees never ask.',
          'If you are unemployed or between roles, you can apply directly through the relevant SETA portal for your sector. The [Services SETA](https://www.sseta.co.za), [MICT SETA](https://www.mict.org.za) for ICT professionals, and [ETDP SETA](https://www.etdp.org.za) for education and training all have online programmes.',
          'One important warning: not all courses advertised as SETA-funded are officially funded. Always verify through the official SETA portal for your sector before enrolling with a private provider claiming SETA accreditation.',
          '**Best for:** Professionals who want a nationally recognised qualification without the cost. Particularly strong for HR, ICT, services, and education sectors.',
        ],
      },
      {
        heading: '2. YES x Microsoft AI Skills Initiative: free certification vouchers',
        body: [
          '**What it is:** The YES (Youth Employment Service) x Microsoft partnership is giving thousands of South Africans access to globally recognised Microsoft certification at no cost. No prior experience is required to start.',
          '**What you can certify in:** AI fundamentals, Data Science, Cybersecurity Analysis, and Cloud Solution Architecture.',
          '**Why this matters right now:** The [Xpatweb Critical Skills Survey](https://www.xpatweb.com) shows ICT specialist shortages rose to 22% of surveyed SA employers in 2025, up from 10% two years earlier. Microsoft Azure certifications are explicitly listed as requirements or preferences in SA job adverts across banking, financial services, and technology. Getting certified while the vouchers are free is a real window that will not stay open indefinitely.',
          '**The catch:** Free certification vouchers are limited. This is first come, first served. Check availability at [yesjobs.co.za](https://www.yesjobs.co.za) or search "YES Microsoft AI Skills" directly. Do not rely on secondhand links.',
          '**Best for:** ICT professionals, career changers moving into tech, and anyone targeting roles at SA corporates or multinationals that list Microsoft Azure or AI skills.',
        ],
      },
      {
        heading: '3. IBM SkillsBuild: free tech skills for all SA learners',
        body: [
          '**What it is:** IBM SkillsBuild offers free access to technology-focused training and is open to all South Africans. No application process. No employer requirement. You sign up and start.',
          '**What it covers:** Cybersecurity, data science, AI, cloud fundamentals, and professional skills. Courses are self-paced and designed to be completed in hours, not months.',
          '**Why it is worth your weekend:** IBM SkillsBuild certificates carry employer recognition, particularly at companies that use IBM infrastructure, including many of SA\'s large banks and corporates. Unlike generic platform completions, IBM-branded credentials are treated as skill signals, not just proof that you finished a course.',
          '**Best for:** Professionals entering or moving within the ICT field, and anyone who wants to add credible tech credentials to their LinkedIn profile without a cost barrier.',
          'Access it at [skillsbuild.org](https://skillsbuild.org).',
        ],
      },
      {
        heading: '4. Vodacom Digital Skills Hub: free and zero-rated for Vodacom users',
        body: [
          '**What it is:** Vodacom Digital Skills Hub offers free courses across digital literacy, professional skills, and technical skills. Course durations range from 30 minutes to six hours, which is useful if you are working full time and learning in small windows.',
          '**What makes it different from other platforms:** Many courses are zero-rated for Vodacom users, which means they do not consume your data. In a country where data costs remain a real barrier to learning, especially outside major metros, this matters more than most learning lists admit.',
          '**What it covers:** Networking and communication, digital marketing, basic coding, CV and job search skills. It is not as technically deep as IBM SkillsBuild, but the professional skills content, including CV creation and workplace communication, is practical and SA-relevant.',
          '**The honest assessment:** Vodacom Digital Skills Hub is best for foundational learning and workplace readiness skills, not deep technical certification. If you are already a mid-career professional, use it to sharpen professional skills rather than as your primary technical upskilling route.',
          '**Best for:** Professionals who need foundational digital skills, Vodacom users who want zero-rated access, and anyone developing workplace communication or job search skills.',
          'Access it at [vodacom.co.za/digitalskills](https://www.vodacom.co.za).',
        ],
      },
      {
        heading: '5. Mzansi Digital Learning: free and data-free in Gauteng',
        body: [
          '**What it is:** The Gauteng Department of e-Government launched Mzansi Digital Learning to provide free, data-free access to digital skills training and certification. If you are based in Gauteng, this is one of the highest-return free learning options available.',
          '**What it covers:** Cybersecurity, generative AI, data analytics, business analysis, and project management. These fields connect directly to SA\'s current hiring signals.',
          '**The catch:** You need a LinkedIn profile to enrol and a stable internet connection to access content. The data-free access applies to the learning content itself, but the platform requires initial setup. If you are in Gauteng and your LinkedIn profile is up to date, which it should be after reading [our LinkedIn Optimisation article](/insights/linkedin-profile-optimisation-south-africa-2026), enrolment is straightforward.',
          '**Best for:** Gauteng-based professionals targeting ICT, data, or project management roles who want free, industry-recognised training.',
          'Search "Mzansi Digital Learning Gauteng" for the current enrolment link. The URL has changed since launch, so go from a fresh search instead of a cached link.',
        ],
      },
      {
        heading: '6. Google Digital Skills for Africa: free with certification',
        body: [
          '**What it is:** Google Digital Skills for Africa offers free courses with certificates on completion. The courses are accessible to South Africans, self-paced, and designed to be completed in a weekend or spread across a few evenings.',
          '**What it covers:** Digital marketing, data analytics, IT support, project management, and UX design. The Google Career Certificate pathway, available through Coursera with financial aid, goes deeper and carries more employer weight.',
          '**The honest assessment:** A standalone Google Digital Skills certificate signals effort and foundational knowledge. It is a "looks good on your profile" credential rather than a "moves the needle in hiring" credential, unless it is part of the full Google Career Certificate pathway. For the full pathway, you need Coursera Financial Aid.',
          'Access it at [learndigital.withgoogle.com/digitalskills](https://learndigital.withgoogle.com/digitalskills).',
        ],
      },
      {
        heading: '7. Coursera Financial Aid: how to access it as a South African',
        body: [
          '**What it is:** Coursera offers application-based financial aid on thousands of courses, specialisations, and professional certificates. When approved, you get full access to the course exactly as if you had paid.',
          '**Why SA professionals qualify:** 60% of Coursera Financial Aid applications come from learners in developing economies, who are approximately seven times as likely as learners in higher-income countries to be approved. South Africa qualifies as a developing economy context.',
          '*The Google, IBM, and Meta professional certificates are where this matters most.* These are the Coursera credentials that actually move the needle in SA hiring, not generic MOOC completions. A Google Data Analytics Professional Certificate or an IBM Data Science Professional Certificate, completed through Financial Aid, carries real employer recognition.',
          '**How to apply:**',
          {
            type: 'orderedList',
            items: [
              'Find the course or professional certificate on [coursera.org](https://www.coursera.org)',
              'Click "Enrol" and look for the Financial Aid link. It is small, so scroll down.',
              'Complete the short application explaining your financial situation and learning goals.',
              'Wait at least 15 days. Do not start a free trial while your application is pending, because that cancels the application.',
            ],
          },
          '**The catch:** Financial Aid cannot be used for Coursera degree programmes. It works for individual courses and professional certificates. The application must also be done on a computer. The mobile app does not support Financial Aid applications, which is a real barrier for SA learners who primarily use phones.',
          '**Best for:** SA professionals who want Google, IBM, or Meta professional certificates without the full course cost.',
        ],
      },
      {
        heading: '8. LinkedIn Learning: one month free',
        body: [
          '**What it is:** LinkedIn Learning offers a one-month free trial with full access to its entire library of courses. After the trial, it requires a paid subscription.',
          '**The strategic play:** Use the one-month trial to complete one full learning path in a skill area that directly supports your next career move. Do not use it to browse. Go in with a specific goal, complete the path, download the certificates, and add them to your LinkedIn profile before the trial ends.',
          '**What to prioritise in your trial:** Project management, data analytics, advanced Excel or Google Sheets, communication and presentation skills, and leadership fundamentals. These are the SA skills categories where LinkedIn Learning content is strongest.',
          '**One important note on data:** LinkedIn Learning allows video download for offline viewing on the mobile app. For SA learners managing mobile data costs, download your content on Wi-Fi and watch offline. This makes the trial significantly more accessible.',
          '**Best for:** Professionals who want to use the trial strategically and have a specific skill gap they need to address in 30 days.',
        ],
      },
      {
        heading: 'The credentials that actually move the needle, and the ones that do not',
        body: [
          'This is the part most free learning lists skip.',
          'Not all certificates are equal in SA hiring. The [Xpatweb Critical Skills Survey](https://www.xpatweb.com) and SA job advert data from [PNet](https://www.pnet.co.za) consistently show a difference between credentials that help and credentials that merely decorate your profile.',
          '**Moves the needle in SA hiring:**',
          {
            type: 'list',
            items: [
              'Microsoft Azure, AWS, and Google Cloud certifications, especially where SA job adverts list them explicitly',
              'PMP and PRINCE2 for project management roles across sectors',
              'SAICA, SABPP, ACCA, and ECSA professional registrations, because these are formal gates, not just credentials',
              'SETA NQF qualifications with regulatory weight',
              'Google, IBM, and Meta Professional Certificates from Coursera when the skills are demonstrable',
            ],
          },
          '**Looks good on your profile but rarely acts as a hard requirement:**',
          {
            type: 'list',
            items: [
              'Generic MOOC completions without the professional certificate pathway',
              'LinkedIn Learning certificates, which are useful skill signals but not formal credentials',
              'Standalone YouTube completion badges',
            ],
          },
          '**Window dressing in competitive SA hiring:**',
          {
            type: 'list',
            items: [
              'Any certification that is not demonstrable in practice or referenced in SA job adverts for your target role',
            ],
          },
          '*The rule worth internalising: if you cannot find your target certification listed in at least three current SA job adverts on PNet or LinkedIn Jobs, it is probably not the credential that will open the next door.*',
        ],
      },
      {
        heading: 'A note on data costs and access',
        body: [
          'Most free learning lists assume you have reliable internet. In South Africa, that assumption fails a significant portion of the professional population.',
          'The most data-conscious options in this list are Vodacom Digital Skills Hub, which is zero-rated for Vodacom users, SETA mobile-friendly delivery, and LinkedIn Learning\'s offline download feature. If you are managing data costs, prioritise these three for video-heavy content.',
          'For text-based learning, such as reading articles, completing written assignments, or working through written modules, data costs are considerably lower. Google Skillshop courses and SETA written content are relatively data-light.',
        ],
      },
      {
        heading: 'Where to start if you are still not sure',
        body: [
          'If you have read this article and you are still unsure which skill to prioritise, that is a clarity problem before it is a learning problem.',
          'The question is not "what should I learn?" The question is "what is actually blocking my next move?" Those are different questions with different answers.',
          'The [Career Clarity Session (R800)](/book/clarity) is 75 minutes of focused work on exactly that: where you are, where you want to go, and which specific gaps are standing between the two. Once you have that clarity, the right learning resource becomes obvious.',
          'Your career matters. Keep elevating.',
        ],
      },
    ],
  },
  {
    slug: 'first-time-manager-south-africa-first-30-days',
    title: "The First-Time Manager's Survival Guide: Your First 30 Days",
    dek: 'Getting promoted is one thing. Knowing what to do next is another. Here is what actually works in the first 30 days as a new manager in a South African workplace.',
    metaTitle: "The First-Time Manager's Survival Guide: Your First 30 Days in South Africa",
    metaDescription:
      'Getting promoted is one thing. Knowing what to do next is another. Here is what actually works in the first 30 days as a new manager in a South African workplace.',
    category: 'Insider Advice',
    tags: ['Leadership', 'Management', 'Career Growth'],
    readTime: '10 min read',
    date: 'May 2026',
    image: '/images/insights/first-time-manager-guide.jpeg',
    imageAlt: 'Two professionals in a bright office conversation about leadership and growth',
    featured: true,
    leadMagnet: {
      eyebrow: 'Free leadership checklist',
      title: 'Need a calmer plan for the first 90 days?',
      body: 'Download the First 90 Days Checklist for weekly actions, key questions, and SA-specific leadership prompts.',
      cta: 'Get the checklist',
      href: '/resources/downloads#first-90-days-checklist',
      afterHeading: 'What comes after the first 30 days',
    },
    visualBreak: {
      afterHeading: 'The role has changed. But nobody told your team.',
      eyebrow: 'The relationship shift',
      title: 'Your first leadership challenge is not authority. It is trust.',
      items: [
        {
          label: '01',
          value: 'Name the shift',
          note: 'Acknowledge that former peers are now direct reports and the dynamic has changed.',
        },
        {
          label: '02',
          value: 'Listen first',
          note: 'Ask what is working, what is frustrating, and what people need from you.',
        },
        {
          label: '03',
          value: 'Win small',
          note: 'Fix one visible irritation before making big strategic promises.',
        },
        {
          label: '04',
          value: 'Follow through',
          note: 'Consistency builds credibility faster than a big opening speech.',
        },
      ],
    },
    imageInserts: [
      {
        afterHeading: 'What the first four weeks actually look like',
        variant: 'managerTimeline',
        eyebrow: 'Your first month map',
        title: 'The first 30 days are about learning, trust, and visible consistency.',
        caption:
          'This is not a passive month. It is a purposeful listening phase that sets up the leadership work that comes next.',
      },
      {
        afterHeading: 'Ubuntu is not a soft skill',
        variant: 'ubuntuLeadership',
        eyebrow: 'Relationship as strategy',
        title: 'In the South African context, people-first leadership is performance work.',
        caption:
          'Ubuntu leadership is not decoration. It shows up in dignity, fairness, accountability, and how safe people feel to speak honestly.',
      },
      {
        afterHeading: 'The SA-specific checklist: your first 30 days',
        variant: 'managerChecklist',
        eyebrow: '30-day checkpoint',
        title: 'Four weeks. Four leadership jobs. One calmer start.',
        caption:
          'Use the checklist as a working rhythm, not a perfection test. The goal is to build trust while you learn the role.',
      },
    ],
    takeaways: [
      'The first 30 days are not about proving you know everything. They are about learning the landscape and building trust.',
      'Managing former peers in South Africa can carry personal, generational, and cultural complexity. Name the relationship shift early.',
      'Listen before you lead, but make the listening visible and purposeful so people understand you are taking the role seriously.',
      'Ubuntu leadership is not soft. Relationship-first management has measurable performance value in the South African context.',
      'If the promotion came faster than your preparation, support matters. Mentorship, peer support, and coaching can help you lead without shrinking.',
    ],
    faqs: [
      {
        question: 'What should a first-time manager do in the first 30 days in South Africa?',
        answer:
          'Spend the first week listening. Hold one-on-ones with every direct report and clarify expectations with your own manager. In week two, hold your first team meeting and identify one or two quick wins. By week three, begin giving feedback and delegating with clarity. Week four is for reflection, consolidation, and planning the next 60 days.',
      },
      {
        question: 'How do you manage former colleagues after a promotion in South Africa?',
        answer:
          'Name the relationship shift directly rather than pretending it has not happened. A brief, honest conversation early, acknowledging that the dynamic has changed and expressing your commitment to working well together, goes further than trying to manage the awkwardness silently.',
      },
      {
        question: 'What is Ubuntu leadership and does it work in South African workplaces?',
        answer:
          'Ubuntu leadership is a management approach rooted in the African philosophy of "I am because we are." It emphasises solidarity, compassion, dignity, and authentic relationship-building. South African research has found that Ubuntu leadership practices can significantly predict employee engagement.',
      },
      {
        question: 'Is impostor syndrome common for first-time managers in South Africa?',
        answer:
          'Yes. In South Africa it can carry additional weight, especially for Black professionals and women promoted into leadership roles that have historically been occupied by white men. Self-doubt can be a response to a genuinely unsupportive environment rather than a personal failing.',
      },
    ],
    faqHeading: 'Questions new managers ask before the first month settles.',
    authorBio: {
      name: 'Coach Kagiso',
      role: 'Career Development and Personal Brand Coach',
      body: 'Coach Kagiso is a career development and personal brand coach based in South Africa. She works with SA professionals who are doing the work but not moving, helping them show up boldly, get visible, and grow with intention.',
      href: '/book/discovery',
      cta: 'Book a free discovery call',
    },
    sections: [
      {
        eyebrow: 'Insider advice',
        heading: 'Nobody warned you about this part.',
        body: [
          'Nobody warned you about this part.',
          'They celebrated the promotion. Your manager shook your hand, HR sent the paperwork, and everyone said congratulations. And then Monday came.',
          'Suddenly you are sitting in a meeting that used to feel normal, except now people are looking at you differently. Your former teammates are a little quieter around you. The person who used to send you memes is now waiting to hear what you think about the project timeline. And somewhere underneath the professionalism, there is a voice asking: do I actually know what I am doing?',
          '*You are not alone. And you are not failing.*',
          'What you are experiencing is what happens when nobody properly prepares you for the shift from doing the work to leading the people doing the work. In South Africa, Employment Equity targets and BEE transformation can accelerate promotions. That makes the gap between "promoted" and "prepared" one of the most common and least talked about career challenges I see.',
          '*This article is for you. Not the polished version of you. The actual you, in week one, trying to figure out what to do first.*',
        ],
      },
      {
        heading: 'The role has changed. But nobody told your team.',
        body: [
          'Here is what most first-time manager guides miss: the hardest part of the first 30 days is not learning new skills. It is managing a relationship shift that nobody announced.',
          'Your team already has opinions about you. They have watched you work. Some of them applied for the same role. Some of them are older than you. Some of them have been in the company longer than you have been in the industry. And now you are their manager.',
          'In South Africa, this dynamic carries extra weight. In small teams where everyone braais together, where church ties and extended family networks overlap with office relationships, the "former peer" challenge is not abstract. It is personal. The research confirms it: [Capital Assignments](https://capitala.co.za), one of SA\'s established management consulting firms, specifically identified this as a leading cause of first-time manager struggles locally.',
          '*The relationship shift is real. The key is to name it rather than pretend it is not happening.*',
          'In the first week, consider having a brief, honest conversation with people who were peers before the promotion. Something simple: "I know this is a shift for both of us. I want to be clear that I still respect what you bring, and I want us to figure out how to work well together in this new dynamic." *You do not need a script. You need honesty.*',
        ],
      },
      {
        heading: 'What the first four weeks actually look like',
        body: [
          'There is a global consensus in management literature on this, and South African experts broadly agree: listen before you lead. Spend the first weeks absorbing before you start changing.',
          'This is not passivity. In the SA context, authority is sometimes contested along racial and generational lines. If your legitimacy is already being quietly questioned, being seen as uncertain can work against you. So the listening phase needs to be visible and purposeful. People should see you asking good questions, not just being quiet.',
          'Here is what actually works, week by week.',
          '**Week one: learn the landscape.**',
          'Before you do anything else, meet your own manager and clarify what success looks like for them in your first 90 days. Ask directly: "What would make you feel confident that I am the right person in this role?" Then schedule a one-on-one with every person who reports to you. Not a status meeting. A genuine conversation. Ask what is working. Ask what is frustrating them. Ask what they need from a manager that they have not been getting. Take notes. Do not announce any changes.',
          'This is also the week to admit, privately, that your nerves are there. A first management role can make even a capable professional feel exposed. *That does not mean you are wrong for the role. It means the role is new.*',
          '**Week two: build relationships and set expectations.**',
          'Hold your first team meeting. Frame it as collaborative, not directive. Share a little of what you heard in your one-on-ones, anonymised where needed, and invite the group to add to it. This signals that you listened. It also starts building the psychological safety that South African teams genuinely need but do not always have.',
          "This week, also start identifying one or two quick wins. Not big strategic pivots. Something the team has been living with that you can fix: a confusing process, a recurring meeting that wastes everyone's time, a simple communication gap. Solving something small and visible builds credibility faster than any strategy deck.",
          '**Week three: start leading.**',
          "Now you can begin giving feedback, delegating with clarity, and running the team's work more actively. Give credit loudly and publicly when team members do well. Give constructive feedback privately and with care. South African workplace culture values respect and dignity in how feedback is delivered. Direct criticism, especially across generational or racial lines, can damage a relationship that took weeks to build.",
          'Hold a full team session to check in on how things are going. Invite open dialogue. Create a moment where people can say something is not working. This is the beginning of genuine team trust.',
          '**Week four: reflect and stabilise.**',
          'Take stock. What have you learned? What assumptions did you bring in that turned out to be wrong? Seek feedback from your own manager on how you are doing. Start building a simple plan for the next 60 days, your priorities, your goals, your commitments to the team.',
          'Do not try to transform everything in month one. Many South African teams are already change-fatigued. Consistency and follow-through on small promises will earn you more trust than big announcements.',
        ],
      },
      {
        heading: 'Ubuntu is not a soft skill',
        body: [
          'There is a phrase that gets used a lot in South African leadership conversations: Ubuntu. "I am because we are." It sounds like inspiration. But there is actual research behind it.',
          'A 2024 study published in the [SA Journal of Human Resource Management](https://scielo.org.za) across 193 South African participants found that Ubuntu leadership practices, solidarity, compassion, dignity, and authentic relationship-building, significantly predicted employee engagement. The correlation was real and measurable. This means relationship-first management is not a niceness bonus in the South African context. It is a performance strategy.',
          'In practice, Ubuntu leadership as a new manager looks like this: acknowledge people as whole humans with lives outside the office. Celebrate team wins visibly and collectively. Mentor with genuine investment.',
          'It also means building fairness into how you treat people, including the ones who are more senior than you by experience or age.',
          'It also means creating what researchers call psychological safety. This is the sense that people can speak up, raise a concern, admit a mistake, or challenge an idea without being punished for it. SA research from 2024 and 2025 consistently shows that most South African workplaces have low psychological safety, not because leaders are cruel, but because nobody has made it an intentional priority.',
          'You can change that from the first week. The signal is simple: when someone raises a concern, thank them for raising it. When something goes wrong, take accountability visibly. When a team member gets something right, say so in front of people who matter.',
        ],
      },
      {
        heading: 'The part nobody talks about',
        body: [
          'Let me be honest with you about something.',
          "The first 30 days as a manager can feel lonely in a way that is hard to explain. You are no longer fully one of the team. You are not yet fully confident in the leadership role. And in South Africa's corporate environment, where transformation targets mean many first-time managers are Black professionals stepping into historically white-dominated structures, that loneliness can carry extra weight.",
          'Research by [Nishani Arumugam](https://www.linkedin.com/pulse/coaching-reflections-imposter-syndrome-black-women-ngo-leaders/) on Black women NGO leaders in South Africa names this precisely. What gets called impostor syndrome is often better understood as a rational response to a genuinely unsupportive environment. When your legitimacy is questioned, subtly or directly, self-doubt is not irrational. It is contextual.',
          '*This does not mean the self-doubt is true. It means the self-doubt has a source beyond you.*',
          'What helps, according to the research and from what I see in coaching, is this: find one person who understands the SA context.',
          'You need someone who can hold space for what you are navigating.',
          'That could be a mentor who has been where you are. A peer group of other new managers. Formal coaching. The [Black Management Forum](https://www.blackmanagementforum.co.za) and similar bodies in SA exist precisely for this reason.',
          '*You do not have to navigate this alone. No one truly makes it alone.*',
        ],
      },
      {
        heading: 'The SA-specific checklist: your first 30 days',
        body: [
          '**Days 1 to 7**',
          {
            type: 'list',
            items: [
              'Secure boss alignment: ask directly what success looks like for them in your first 90 days',
              'Schedule one-on-ones with every direct report before the end of the first week',
              'Observe silently: learn before you change',
              'Have an honest "new relationship" conversation with former peers early',
            ],
          },
          '**Days 8 to 14**',
          {
            type: 'list',
            items: [
              'Conduct genuine one-on-ones: ask what is working, what is frustrating, what they need from you',
              'Map your stakeholders: who has influence, who has information, who can help you, who can block you',
              'Identify one or two quick wins that the team has been waiting for',
              'Begin your first team meeting planning',
            ],
          },
          '**Days 15 to 21**',
          {
            type: 'list',
            items: [
              'Hold your first team session: share what you heard, invite dialogue',
              'Implement one visible quick win and give credit loudly to the team',
              'Start giving feedback, praise publicly, coach privately',
              'Ask for feedback on your own management style',
            ],
          },
          '**Days 22 to 30**',
          {
            type: 'list',
            items: [
              'Document your priorities, your obstacles, and your cadence for check-ins',
              'Produce a simple plan for days 31 to 60',
              'Check in with a mentor or peer about how you are feeling, not just how the work is going',
              'Reflect: am I building trust or just managing tasks?',
            ],
          },
        ],
      },
      {
        heading: 'What comes after the first 30 days',
        body: [
          'The first month is about credibility and relationships. Month two is where you start building. Month three is where real leadership begins.',
          'If you want a structured framework for the full 90 days, the [First 90 Days Checklist](/resources/downloads#first-90-days-checklist) covers exactly that. It includes weekly actions, key questions to ask, and SA-specific guidance. It is free to download.',
          'And if you are navigating something more specific, the [Career Clarity Session (R800)](/book/clarity) is a 75-minute one-on-one.',
          'That might be a complicated team dynamic, a promotion that came faster than expected, or uncertainty about where your career is heading.',
          'We work through exactly that.',
          'Your career matters. Keep elevating.',
        ],
      },
    ],
  },
];

export const insightTags = Array.from(new Set(insights.flatMap((insight) => insight.tags)));

export function getInsightBySlug(slug: string) {
  return insights.find((insight) => insight.slug === slug);
}

export function getRelatedInsights(slug: string, limit = 3) {
  const current = getInsightBySlug(slug);

  if (!current) {
    return insights.filter((insight) => insight.slug !== slug).slice(0, limit);
  }

  return insights
    .filter((insight) => insight.slug !== slug)
    .sort((a, b) => {
      const aMatches = a.tags.filter((tag) => current.tags.includes(tag)).length;
      const bMatches = b.tags.filter((tag) => current.tags.includes(tag)).length;
      return bMatches - aMatches;
    })
    .slice(0, limit);
}
