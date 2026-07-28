export type CvAnalyzerResult = {
  snapshot: string;
  scores: {
    positioning: number;
    clarity: number;
    roleFit: number;
    atsReadability: number;
  };
  recruiterRead: {
    headline: string;
    firstImpression: string;
    possibleConcern: string;
  };
  strongestSignals: string[];
  priorityFixes: Array<{ title: string; whyItMatters: string; fix: string }>;
  evidenceGaps: Array<{ title: string; detail: string; fix: string }>;
  rewriteSamples: Array<{ before: string; after: string; why: string }>;
  atsNotes: string[];
  interviewAngles: string[];
  nextActions: Array<{ title: string; detail: string }>;
  recommendedCoachMove: {
    label: string;
    reason: string;
  };
};

export type ChangeReportEntry = {
  category: string;
  summary: string;
  before: string;
  after: string;
};
