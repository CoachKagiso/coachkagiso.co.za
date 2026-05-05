export const LINKEDIN_HEADLINE_BUILDER_FILENAME =
  'Coach-Kagiso-SA-LinkedIn-Headline-Builder-2026.pdf';

export const LINKEDIN_HEADLINE_BUILDER_PATH = '/api/lead-magnets/linkedin-headline-builder/pdf';

export type KeywordBankItem = {
  industry: string;
  keywords: string;
};

export type HeadlineRewrite = {
  group: string;
  role: string;
  before: string;
  after: string;
  why: string;
};

export const keywordBank: KeywordBankItem[] = [
  {
    industry: 'Finance',
    keywords:
      'FP&A, CIMA, SAICA, CA(SA), Articles, B-BBEE, IFRS, JSE, treasury management, financial modelling, Pastel, Sage, Xero, reconciliations, VAT, management reporting',
  },
  {
    industry: 'HR',
    keywords:
      'HRBP, Employment Equity, B-BBEE, Skills Development, talent management, organisational development, payroll, BCEA, LRA, SABPP, employee relations, compensation and benefits',
  },
  {
    industry: 'Operations & Supply Chain',
    keywords:
      'supply chain, logistics, procurement, process optimisation, lean six sigma, warehouse management, SAP, operations management, continuous improvement, FMCG',
  },
  {
    industry: 'Marketing',
    keywords:
      'digital marketing, SEO, Google Analytics, Meta Ads, content strategy, brand management, CRM, HubSpot, marketing automation, B2B marketing, social media management',
  },
  {
    industry: 'IT & Software Engineering',
    keywords:
      'AWS, Azure, CI/CD, DevOps, Python, React, Node.js, SQL, Kubernetes, Docker, Scrum Master, PMP, cybersecurity, SIEM, cloud architecture',
  },
  {
    industry: 'Engineering',
    keywords:
      'ECSA, AutoCAD, AutoCAD Electrical, ETAP, structural engineering, PLC, SCADA, mechanical engineering, civil engineering, mining engineering, ISO 45001',
  },
  {
    industry: 'Healthcare',
    keywords:
      'SANC, HPCSA, clinical governance, NHI, PHC, patient safety, nursing management, clinical research, public health, health informatics',
  },
  {
    industry: 'Sales',
    keywords:
      'Account Executive, quota attainment, pipeline management, B2B SaaS, enterprise sales, FMCG sales, regional sales, key accounts, territory management',
  },
  {
    industry: 'Project Management',
    keywords:
      'PMP, PRINCE2, Agile, Scrum, programme governance, BFSI, SACPCMP, ISO 45001, on-time delivery, construction project management',
  },
  {
    industry: 'Legal & Compliance',
    keywords:
      'FICA, POPIA, FAIS, King IV, AML, KYC, company secretary, CSSA, JSE listing requirements, regulatory compliance, MLRO, PFMA',
  },
  {
    industry: 'Mining',
    keywords:
      'ECSA, metallurgist, plant recovery, LTI-free, MHSA, DMR, SAMTRAC, gold, platinum, PGM, Mintek, shaft management, carbon tax',
  },
  {
    industry: 'Data Science & Analytics',
    keywords:
      'SQL, Python, Power BI, Tableau, Azure Data Factory, dbt, data lake, machine learning, data pipeline, GA4, reporting cycle, NLP',
  },
  {
    industry: 'Retail',
    keywords:
      'store manager, area manager, buyer, OTB, shrinkage, range planning, vendor negotiation, turnover, merchandise planning, FMCG',
  },
  {
    industry: 'Sustainability & ESG',
    keywords:
      'carbon tax, GRI, SROI, ESG reporting, energy efficiency, ISO 14001, renewable energy, carbon strategy, sustainable investing',
  },
  {
    industry: 'L&D & Education to Corporate',
    keywords:
      'curriculum design, adult learning, SAQA, NQF, instructional design, vocational training, SABPP, blended learning, e-learning',
  },
];

export const headlineRewrites: HeadlineRewrite[] = [
  {
    group: 'Finance',
    role: 'Mid-career CA article clerk to Financial Analyst',
    before: 'Articles Clerk at Deloitte South Africa',
    after:
      'Financial Analyst (SAICA Articles Completed) | Financial Modelling & IFRS Reporting | R45M Budget Oversight | Johannesburg',
    why:
      'SA recruiters search "Financial Analyst" and "SAICA Articles". Both are now in your headline. The R45M budget figure proves scale. The city enables location filtering.',
  },
  {
    group: 'Finance',
    role: 'Senior finance professional to FD/CFO track',
    before: 'Senior Manager: Finance | Results-Driven Leader',
    after:
      'Finance Director (CIMA Qualified) | FP&A, IFRS & Group Reporting | Reduced Year-on-Year Costs by 18% | Ex-Standard Bank | Open to CFO Roles',
    why:
      'The empty phrase is replaced with the credential recruiters search, proof of impact, and a credibility anchor.',
  },
  {
    group: 'Finance',
    role: 'Recent finance graduate to first role',
    before: 'BCom Accounting Graduate Seeking Opportunities',
    after:
      'Junior Accountant | BCom Accounting (UKZN) | Pastel, Xero & Excel (Advanced) | VAT Reconciliations & Management Reporting | Durban',
    why:
      'Pastel and Xero are high-frequency SA finance search terms that global guides miss. "Seeking Opportunities" is passive and unsearchable.',
  },
  {
    group: 'Finance',
    role: 'Management accountant to internal promotion',
    before: 'Management Accountant at ABC Manufacturing',
    after:
      'Management Accountant (CIMA Adv. Dip.) | Cost Optimisation & Budgeting for R200M+ Manufacturing Operations | Sage Intacct & Power BI | Gauteng',
    why:
      'The tool names and manufacturing scale are the terms SA manufacturing recruiters search. The default LinkedIn autofill tells them nothing.',
  },
  {
    group: 'HR',
    role: 'HR generalist to HRBP',
    before: 'HR Generalist | Passionate About People',
    after:
      'HR Business Partner | Employment Equity, B-BBEE & Talent Management | Reduced Staff Turnover by 22% in 12 Months | SABPP Registered | Johannesburg',
    why:
      'Employment Equity and B-BBEE are non-negotiable keywords in South Africa, while "passionate" is just filler.',
  },
  {
    group: 'HR',
    role: 'Recruitment specialist to internal HR',
    before: 'Recruitment Specialist | Helping Companies Find Great Talent',
    after:
      'Talent Acquisition Specialist | High-Volume Recruitment (500+ Hires/Year) | Mining & Engineering Sectors | BCEA & LRA Compliance | Open to HR Generalist Roles',
    why:
      'The volume, sector, and SA labour law frameworks are specific search terms. The old headline is searched by no recruiter ever.',
  },
  {
    group: 'HR',
    role: 'HR graduate to first HR role',
    before: 'Human Resources Graduate | Hardworking and Dedicated',
    after:
      'HR Coordinator | BCom HR Management (UJ) | Employee Relations, Onboarding & Payroll Administration | SAGE 300 | Open to Gauteng Roles',
    why:
      'SAGE 300 is widely used in SA HR. "Hardworking and Dedicated" is meaningless filler.',
  },
  {
    group: 'Operations & Supply Chain',
    role: 'Operations manager to senior operations',
    before: 'Operations Manager | Experienced Professional',
    after:
      'Senior Operations Manager | Supply Chain Optimisation & Lean Six Sigma (Green Belt) | Reduced Lead Times by 30% Across 3 Distribution Centres | FMCG | Pretoria',
    why:
      'Lean Six Sigma Green Belt is highly searched in SA operations roles. "Experienced Professional" is searched by no recruiter ever.',
  },
  {
    group: 'Operations & Supply Chain',
    role: 'Procurement officer to supply chain career path',
    before: 'Procurement Officer at Government Department',
    after:
      'Procurement & Supply Chain Specialist | Strategic Sourcing & Vendor Management | R150M+ Annual Procurement Spend | PFMA & BBBEE Compliance | Cape Town',
    why:
      'PFMA is a specific SA regulatory term that corporate and SOE procurement recruiters search. The spend figure proves commercial scale.',
  },
  {
    group: 'Operations & Supply Chain',
    role: 'Logistics coordinator to growth',
    before: 'Logistics Coordinator | Team Player',
    after:
      'Logistics & Distribution Coordinator | Cross-Border Freight (SA to SADC) | Reduced Delivery Delays by 25% | SAP WM & Fleet Management | Johannesburg',
    why:
      'Cross-border SA to SADC logistics is a specific, valuable niche with limited specialist talent.',
  },
  {
    group: 'Marketing',
    role: 'Digital marketer to agency or corporate',
    before: 'Digital Marketing Specialist | Creative Thinker',
    after:
      'Digital Marketing Manager | SEO, Google Ads & Meta Business Suite | Grew Organic Traffic 120% in 6 Months | HubSpot & GA4 Certified | Open to Agency & Corporate Roles | Cape Town',
    why:
      'Google Ads, Meta Business Suite, HubSpot, and GA4 are the exact tool names SA marketing recruiters Boolean search.',
  },
  {
    group: 'Marketing',
    role: 'Brand manager to senior marketing',
    before: 'Brand Manager | Innovation Enthusiast',
    after:
      'Senior Brand Manager | FMCG Brand Strategy & Go-to-Market | Launched 4 SKUs Generating R12M Revenue in Year 1 | Ex-Unilever | Johannesburg',
    why:
      'FMCG and Go-to-Market are high-frequency search terms. The revenue proof is what FMCG recruiters want.',
  },
  {
    group: 'Marketing',
    role: 'Marketing graduate to first role',
    before: 'Marketing Graduate | Social Media Enthusiast',
    after:
      'Junior Content Marketer | SEO Copywriting & Social Media Management | Grew Instagram to 15K Followers for University Society | Canva & Buffer | Pretoria',
    why:
      'Entry-level SA marketing recruiters search for tool proficiency, not enthusiasm. 15K followers is tangible proof.',
  },
  {
    group: 'IT & Engineering',
    role: 'Software developer to mid-level growth',
    before: 'Software Developer | Problem Solver',
    after:
      'Full-Stack Developer | React, Node.js & PostgreSQL | Built Platform Serving 50K+ Users | AWS Certified | Cape Town | Open to Remote',
    why:
      'React, Node.js, and PostgreSQL are the exact stack terms SA tech recruiters Boolean search.',
  },
  {
    group: 'IT & Engineering',
    role: 'DevOps / cloud engineer',
    before: 'DevOps Engineer at Tech Startup',
    after:
      'Senior DevOps Engineer | AWS, Terraform & Kubernetes | CI/CD Pipeline Architecture | 99.9% Uptime Across 12 Microservices | Ex-Naspers | Johannesburg',
    why:
      'AWS, Terraform, and Kubernetes are exact infrastructure terms. Ex-Naspers is a strong tech credibility signal in SA.',
  },
  {
    group: 'IT & Engineering',
    role: 'Electrical engineer to consulting / project',
    before: 'Electrical Engineer | Detail-Oriented',
    after:
      'Electrical Engineer (ECSA Registered) | Power Distribution & Substation Design | R80M+ Project Delivery | AutoCAD Electrical & ETAP | Mining & Industrial Sectors',
    why:
      'ECSA registration is a legally required SA engineering signal that recruiters specifically search.',
  },
  {
    group: 'IT & Engineering',
    role: 'IT support to cybersecurity career change',
    before: 'IT Support Technician | Looking for New Challenges',
    after:
      'Transitioning to Cybersecurity | CompTIA Security+ & CEH | Former IT Infrastructure Lead (6 Years) | SIEM, Vulnerability Assessment & Incident Response | Gauteng',
    why:
      'CompTIA Security+ and CEH are exact certifications SA cybersecurity recruiters search.',
  },
  {
    group: 'Healthcare',
    role: 'Professional nurse to management track',
    before: 'Professional Nurse | Compassionate Caregiver',
    after:
      'Nursing Unit Manager | SANC Registered | Clinical Governance & Patient Safety | Reduced Hospital-Acquired Infections by 35% | 10 Years Critical Care | Durban',
    why:
      'SANC registration is essential for SA nursing roles. The infection reduction metric is a specific clinical outcome.',
  },
  {
    group: 'Healthcare',
    role: 'Public health professional to NHI-aligned',
    before: 'Public Health Specialist | Making a Difference',
    after:
      'Public Health Programme Manager | NHI Implementation, PHC & Health Systems Strengthening | Managed R25M Donor-Funded Programme Across 3 Provinces | MPH (Wits) | Johannesburg',
    why:
      'NHI is one of the most searched terms in SA public health. The donor-funded programme scale proves delivery.',
  },
  {
    group: 'Sales',
    role: 'B2B sales to enterprise account management',
    before: 'Account Executive | Helping Clients Succeed',
    after:
      'Enterprise Account Executive | B2B SaaS & Fintech | 140% Quota Achievement (R15M Pipeline) | Ex-Toast | Johannesburg | Open to Head of Sales Roles',
    why:
      'SA sales recruiters search by deal complexity, sector, and performance in rands.',
  },
  {
    group: 'Sales',
    role: 'FMCG field sales to regional management',
    before: 'Sales Representative | FMCG',
    after:
      'Regional Sales Manager | FMCG & Retail | Managing 120+ Store Network Across KZN | R45M Annual Revenue | Ex-Unilever | Durban',
    why:
      'Store count and revenue prove scale. Ex-Unilever signals structured corporate sales experience.',
  },
  {
    group: 'Project Management',
    role: 'IT project manager to senior PM / programme management',
    before: 'Project Manager | PMP Certified',
    after:
      'Senior Project Manager (PMP, PRINCE2) | Agile Delivery for BFSI Sector | R30M+ Programme Governance | 95% On-Time Delivery Rate | Cape Town',
    why:
      'PRINCE2 is valued in SA corporate. BFSI is a major employer category recruiters filter by.',
  },
  {
    group: 'Project Management',
    role: 'Construction project manager to senior / director track',
    before: 'Construction Project Manager at Large Firm',
    after:
      'Construction Project Manager (SACPCMP Registered) | Commercial & Residential Builds | R120M+ Project Portfolio | ISO 45001 Health & Safety Compliance | Gauteng',
    why:
      'SACPCMP registration is legally required for SA construction PMs. Recruiters specifically search for it.',
  },
  {
    group: 'Legal & Compliance',
    role: 'Compliance officer to senior compliance / MLRO',
    before: 'Compliance Officer | Regulatory Knowledge',
    after:
      'Senior Compliance Manager | FICA, POPIA & FAIS | AML/KYC Programme Implementation | Reduced Regulatory Findings by 60% | Ex-Old Mutual | Johannesburg',
    why:
      'FICA, POPIA, and FAIS are exact Acts SA financial services recruiters Boolean search.',
  },
  {
    group: 'Legal & Compliance',
    role: 'Company secretary to governance advisory',
    before: 'Company Secretary | Governance Professional',
    after:
      'Company Secretary (CSSA) | King IV, Board Governance & Secretarial Compliance | Managed 6 Subsidiary Boards | JSE Listing Requirements | Sandton',
    why:
      'King IV and CSSA are non-negotiable SA governance search terms. The board count proves scale.',
  },
  {
    group: 'Mining',
    role: 'Metallurgist to senior technical / plant management',
    before: 'Metallurgist at Mining Company',
    after:
      'Senior Metallurgist (ECSA Professional) | Gold & Platinum Processing | Improved Plant Recovery by 4.2% (R18M Annual Value) | Mintek Research | Rustenburg',
    why:
      'SA mining recruiters search by commodity, registration, and recovery metrics. Mintek is a strong credibility signal.',
  },
  {
    group: 'Mining',
    role: 'Mining safety officer to HSE management',
    before: 'Safety Officer | Safety First',
    after:
      'HSE Manager | Mining & Heavy Industry | ISO 45001, MHSA & DMR Compliance | Achieved 500+ LTI-Free Days Across 3 Shafts | SAMTRAC Certified | North West',
    why:
      'MHSA, DMR, SAMTRAC, and LTI-free are SA-specific mining safety signals recruiters search.',
  },
  {
    group: 'Retail',
    role: 'Store manager to regional / area management',
    before: 'Store Manager | Retail Experience',
    after:
      'Store Manager | R3.5M Monthly Turnover | 45 Staff | Fashion & Homeware | Reduced Shrinkage by 28% | Mr Price | Cape Town | Open to Area Manager Roles',
    why:
      'Turnover, staff count, and shrinkage reduction are the three metrics SA retail recruiters look for.',
  },
  {
    group: 'Retail',
    role: 'Retail buyer to merchandise planning',
    before: 'Buyer | Retail Professional',
    after:
      'Senior Buyer | Fashion & Apparel | R60M Annual OTB | Range Planning, Vendor Negotiation & Trend Forecasting | Ex-Woolworths | Cape Town',
    why:
      'OTB is the specific retail buying term recruiters search. Ex-Woolworths is a strong retail credibility signal.',
  },
  {
    group: 'Data Science',
    role: 'Data analyst to senior / BI lead',
    before: 'Data Analyst | Excel Expert',
    after:
      'Senior Data Analyst | SQL, Python & Power BI | Built Dashboards Used by 200+ Decision-Makers Monthly | Reduced Reporting Cycle by 60% | Johannesburg',
    why:
      'SA data recruiters search SQL, Python, and Power BI. Excel-only positioning now reads as too junior.',
  },
  {
    group: 'Data Science',
    role: 'BI developer to data engineering',
    before: 'BI Developer | Data Enthusiast',
    after:
      "BI & Data Engineer | Azure Data Factory, SQL Server & dbt | Built Enterprise Data Lake for SA's 3rd Largest Bank | AWS Data Engineer Certified | Gauteng",
    why:
      'Azure Data Factory and dbt are modern SA data stack terms recruiters search in 2026.',
  },
  {
    group: 'Career Transitions',
    role: 'Teacher to corporate L&D',
    before: 'Former Teacher Looking for New Opportunities',
    after:
      'Corporate Learning & Development Specialist | Curriculum Design & Adult Learning Theory | Trained 500+ Adult Learners in Vocational Skills | SAQA & NQF Aligned Programme Development | Johannesburg',
    why:
      'Corporate L&D recruiters search curriculum design, adult learning, SAQA, and NQF, not "teacher".',
  },
  {
    group: 'Career Transitions',
    role: 'C-suite executive to next role / NED portfolio',
    before: 'Experienced Executive | Business Leader',
    after:
      'Chief Operating Officer | Scaled Operations from R200M to R800M Revenue | M&A Integration & Organisational Transformation | Non-Executive Director (IoDSA) | Open to CEO / COO / NED Roles | Johannesburg',
    why:
      'Executive search firms search COO, CEO, and Non-Executive Director. The revenue scaling is the proof point.',
  },
  {
    group: 'Career Transitions',
    role: 'Career break to return to work',
    before: 'Stay-at-Home Mom | Ready to Return to Work',
    after:
      'HR & Talent Management Professional | 8 Years Corporate HR Experience (Pre-Career Break) | Skills Development, EE Reporting & Employee Relations | SABPP Member | Open to Flexible or Hybrid Roles | Pretoria',
    why:
      'The rewrite leads with professional identity and search terms instead of centring the gap.',
  },
  {
    group: 'Career Transitions',
    role: 'Entrepreneur to returning to corporate',
    before: 'Former Business Owner | Looking for Stability',
    after:
      'Operations & Business Development Manager | Founded & Ran SME for 6 Years (R12M Annual Revenue) | Strategic Planning, Client Acquisition & Team Building | Transitioning to Corporate | Cape Town',
    why:
      'The R12M revenue proves it was a real business and translates entrepreneurial work into corporate search terms.',
  },
  {
    group: 'Career Transitions',
    role: 'Government / SOE to private sector',
    before: 'Senior Manager at Government Department',
    after:
      'Strategy & Operations Manager | 12 Years Public Sector Experience | PFMA Compliance, Stakeholder Management & Policy Implementation | Managed R50M Programme Budget | Transitioning to Private Sector | Gauteng',
    why:
      'PFMA is valued in governance and compliance roles when named clearly.',
  },
  {
    group: 'Career Transitions',
    role: 'Sustainability coordinator to ESG manager',
    before: 'Sustainability Professional | Saving the Planet',
    after:
      'ESG & Sustainability Manager | Carbon Tax Compliance, GRI Reporting & SROI | Managed R8M Energy Efficiency Programme (12 Sites) | MSc Environmental Science (UCT) | Cape Town',
    why:
      'Carbon tax, GRI, and SROI are ESG reporting terms recruiters search. The old headline is a value statement, not a search term.',
  },
  {
    group: 'Career Transitions',
    role: 'Passive candidate to open to approach',
    before: 'Senior Developer at Big Bank',
    after:
      'Senior Software Engineer | Java, Spring Boot & Microservices | Building Real-Time Payment Systems | 10 Years Financial Services Tech | Ex-Standard Bank | Johannesburg | Open to Senior/Lead Engineering Roles',
    why:
      'Java, Spring Boot, and Microservices are exact stack terms. The openness signal is selective but reachable.',
  },
  {
    group: 'Career Transitions',
    role: 'Freelancer / consultant to permanent',
    before: 'Freelance Data Analyst',
    after:
      'Data Consultant Transitioning to Permanent | SQL, R & Python | Delivered BI Reporting Across 6 Client Engagements | Johannesburg | Open to Full-Time Analyst Roles',
    why:
      'The rewrite leads with specific skills, proves delivery across engagements, and signals the transition without apology.',
  },
];

export const headlineChecklist = [
  'Does it start with your target job title, not your employer name?',
  'Does it include 2-3 exact keywords SA recruiters search for in your industry?',
  'Does it include at least one quantified result, metric, or proof point?',
  'Does it include your city or province?',
  'Have you removed all of these: "passionate," "results-driven," "team player," "hardworking," "enthusiast," "dedicated"?',
  'Is it under 220 characters? Check on mobile, it cuts off earlier than desktop.',
  'Would a recruiter find you if they searched "[Your Job Title] AND [Your Skill] AND [Your City]" on LinkedIn?',
];
