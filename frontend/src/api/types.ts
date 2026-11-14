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
}

export interface ProfileRead {
  currentRole: string;
  yearsExperience: number | null;
  industry: string;
  evidenceNote: string;
}

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
}

export interface Resource {
  /** "search": a labeled search link, used when no AI picked real pages. */
  kind: "article" | "video" | "search";
  title: string;
  url: string;
  source: string;
  why: string;
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
  links: { site: string; url: string }[];
}
