/** Wire types. Mirrors backend/src/bridge/domain/models.py and api/schemas.py
 * (camelCase on the wire). Change both sides together. */

export type Effort = "lower" | "medium" | "higher" | "unknown";
export type TaskType = "research" | "learning" | "simulation" | "portfolio" | "networking" | "application";
export type Track = "safe" | "balanced" | "fast";
/** live = real AI; demo = server has no AI key; sample = user chose labeled sample data. */
export type Mode = "live" | "demo" | "sample";

/** Form answers. Income fields are NOT here: they never leave the browser. */
export interface Profile {
  currentRole: string;
  yearsExperience: number | null;
  changeMotivation: string[];
  hoursPerWeek: number;
  monthlyLearningBudget: number;
  currency: string;
  /** City for local job openings, e.g. "Austin, TX". Optional. */
  location: string;
  /** Two-letter country code for job searches, lowercase. */
  country: string;
  interestedRoles: string[];
  transitionPreference: Track;
}

export interface TransferableSkill {
  skill: string;
  evidence: string;
  verified: boolean;
}

export type WorkMode = "remote" | "hybrid" | "on-site" | "flexible hours" | "shift work" | "travel";

export interface Career {
  id: string;
  title: string;
  roleSummary: string;
  fitExplanation: string;
  transferableSkills: TransferableSkill[];
  missingSkills: string[];
  relativeEffort: Effort;
  keyTradeoff: string;
  assumptions: string[];
  /** How the path serves the user's reasons and constraints. "" when unknown. */
  motivationMatch?: string;
  /** Study field id (backend domain/learning.py); "" or missing on older saved cards. */
  field?: string;
  /** Job-post titles to search for first. */
  jobTitles?: string[];
  /** English YouTube searches for the missing skills. */
  videoSearches?: string[];
  /** How the job is commonly done: remote, hybrid, on-site, flexible hours, shift work, travel. */
  workModes?: WorkMode[];
}

export interface ProfileRead {
  currentRole: string;
  yearsExperience: number | null;
  industry: string;
  evidenceNote: string;
  /** The most distinctive pattern in the person's experience. "" when too thin. */
  standout?: string;
}

/** What the experience text is; the AI reads each kind differently. */
export type ResumeSource = "cv" | "linkedin" | "text";

export interface CareersResponse {
  profile: ProfileRead;
  careers: Career[];
  mode: Mode;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  estimatedMinutes: number;
  whyThisMatters: string;
  instructions: string[];
  deliverable: string;
  successCriteria: string;
  completed: boolean;
}

export interface Week {
  week: number;
  title: string;
  objective: string;
  tasks: Task[];
}

export interface Roadmap {
  id: string;
  targetCareerId: string;
  currentRole: string;
  targetRole: string;
  track: Track;
  hoursPerWeek: number;
  createdAt: string;
  weeks: Week[];
  assumptions: string[];
  cautions: string[];
}

export interface RubricCriterion {
  id: string;
  label: string;
  description: string;
  maxScore: number;
}

export interface Practice {
  id: string;
  targetRole: string;
  scenario: string;
  brief: string;
  expectedDeliverable: string;
  timeboxMinutes: number;
  rubric: RubricCriterion[];
}

export interface CriterionResult {
  rubricId: string;
  label: string;
  score: number;
  scoreRaw: number;
  maxScore: number;
  verified: boolean;
  evidence: string;
  strengths: string[];
  improvements: string[];
}

export interface Evaluation {
  practiceId: string;
  criteria: CriterionResult[];
  totalScore: number;
  maxTotal: number;
  overallFeedback: string;
  nextRevisionStep: string;
}

export interface Proof {
  id: string;
  publishedAt: string;
  mode: Mode;
  displayName: string;
  reflection: string;
  practice: Practice;
  answer: string;
  evaluation: Evaluation;
}

export interface Sample {
  id: string;
  label: string;
  resume: string;
}

export interface TrackInfo {
  id: Track;
  label: string;
  summary: string;
}

export interface AppConfig {
  mode: Mode;
  samples: Sample[];
  demoPersona: Profile & { sampleId: string };
  tracks: TrackInfo[];
  limits: { maxResume: number; minResume: number; maxAnswer: number; minHours: number; maxHours: number };
  /** Reference data from the server's database. */
  reference: import("../lib/reference").ReferenceData;
}

/** A course from the checked catalog (backend domain/learning.py). free: no
 * charge; paid: a paid plan, subscription or trial (all Coursera courses). */
export interface Course {
  id: string;
  title: string;
  provider: string;
  url: string;
  cost: "free" | "paid";
  format: "certificate" | "course" | "lectures";
  length: string;
  modules: string[];
  pace: "weekly" | "course";
  why: string;
  /** Paid only: the US monthly price, rounded; 0 when unknown. */
  monthlyUsd: number;
  /** True when the AI found it on the web for this exact role. */
  found: boolean;
}

/** The main course spread over the 30 days, plus other options. */
export interface StudyPlan {
  field: string;
  fieldLabel: string;
  /** False: no catalog field fits this role, so web-found courses lead. */
  matched: boolean;
  budgetUsd: number;
  /** null: no checked course for this field (web-found courses and videos cover it). */
  main: Course | null;
  weeks: { week: number; modules: string[] }[];
  later: string[];
  more: Course[];
  checked: string;
}

/** Typical pay from an official table (backend domain/pay.py). */
export interface Pay {
  role: string;
  occupation: string;
  area: string;
  currency: string;
  period: "year" | "month";
  stat: "median" | "average" | "estimate";
  low: number;
  high: number;
  note: string;
  source: string;
  url: string;
  /** official: a statistics table; estimate: the median of several web pages'
   * figures (each checked against the page); ai: the AI's own estimate when
   * no page stated one. */
  kind: "official" | "estimate" | "ai";
  /** The pages behind an estimate. */
  sources?: { title: string; url: string }[];
}

export interface JobListing {
  title: string;
  company: string;
  location: string;
  url: string;
  salary: string;
  posted: string;
}

export interface JobsResult {
  role: string;
  city: string;
  country: string;
  source: "adzuna" | "links";
  listings: JobListing[];
  links: JobLink[];
  /** Searches for recruiters and team leads near the city. */
  people: JobLink[];
  /** Searches for what the field is talking about this month. */
  topics: JobLink[];
}

export interface JobLink {
  site: string;
  url: string;
  hint: string;
}

/** Meeting a job before planning for it. */
export interface JobIntro {
  role: string;
  oneLiner: string;
  responsibilities: string[];
  day: { time: string; what: string }[];
  tools: string[];
  youWillLike: string[];
  hardParts: string[];
  howToStart: string[];
}

/** One YouTube video (backend domain/videos.py). */
export interface Video {
  id: string;
  title: string;
  channel: string;
  url: string;
  thumbnail: string;
  views: number;
  minutes: number;
  published: string;
  query: string;
}

export interface VideosResult {
  /** "off": the server has no YouTube key, so there are no videos to show. */
  source: "youtube" | "off";
  videos: Video[];
}
