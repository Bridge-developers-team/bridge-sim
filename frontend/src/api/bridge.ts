/** One function per backend route. Components call these through TanStack
 * Query; nothing else talks to the network. */
import { api } from "./client";
import type {
  AppConfig,
  Career,
  CareersResponse,
  Evaluation,
  Course,
  JobIntro,
  JobsResult,
  Mode,
  Practice,
  Pay,
  Profile,
  Proof,
  Roadmap,
  StudyPlan,
  Task,
  Track,
} from "./types";

export const bridgeApi = {
  config: () => api.get<AppConfig>("/api/config"),

  careers: (resumeText: string, profile: Profile, sample = false) =>
    api.post<CareersResponse>("/api/careers", { resumeText, profile, sample }),

  roadmap: (career: Career, profile: Profile, track: Track, hoursPerWeek: number, sample = false) =>
    api.post<{ roadmap: Roadmap; mode: Mode }>("/api/roadmap", { career, profile, track, hoursPerWeek, sample }),

  /** `industry` (read from the CV) lets the server set the task in the user's own field. */
  practice: (
    career: Career,
    task: Pick<Task, "id" | "title" | "deliverable">,
    profile: Profile & { industry?: string },
    sample = false,
  ) =>
    api.post<{ practice: Practice; practiceToken: string; mode: Mode }>("/api/practice", {
      career,
      task: { id: task.id, title: task.title, deliverable: task.deliverable },
      profile,
      sample,
    }),

  evaluate: (practice: Practice, practiceToken: string, answer: string, sample = false) =>
    api.post<{ evaluation: Evaluation; resultToken: string; mode: Mode }>("/api/practice/evaluate", {
      practice,
      practiceToken,
      answer,
      sample,
    }),

  sampleAnswer: (practice: Practice, profile: Profile, sample = false) =>
    api.post<{ answer: string; mode: Mode }>("/api/practice/sample-answer", { practice, profile, sample }),

  publish: (body: {
    practice: Practice;
    answer: string;
    evaluation: Evaluation;
    mode: Mode;
    resultToken: string;
    reflection: string;
    displayName: string;
  }) => api.post<{ proof: Proof; deleteKey: string }>("/api/proofs", body),

  study: (role: string, budget: number, currency: string, hours: number) =>
    api.get<StudyPlan>(
      `/api/study?${new URLSearchParams({ role, budget: String(budget), currency, hours: String(hours) })}`,
    ),

  /** Courses, lectures and guides the live AI finds on the web for this exact role. */
  studySearch: (role: string, budget: number, currency: string, sample = false) =>
    api.post<{ courses: Course[]; mode: Mode }>("/api/study/search", { role, budget, currency, sample }),

  /** One entry per role, in order; null where no figure could be found. */
  pay: (roles: string[], country: string, countryName: string, location: string, sample = false) =>
    api.post<(Pay | null)[]>("/api/pay", { roles, country, countryName, location, sample }),

  intro: (role: string, currentRole: string, country: string, sample = false) =>
    api.post<{ intro: JobIntro; mode: Mode }>("/api/intro", { role, currentRole, country, sample }),

  cities: (country: string, q: string) => api.get<string[]>(`/api/cities?${new URLSearchParams({ country, q })}`),

  linkedin: (url: string) => api.post<{ resumeText: string; mode: Mode }>("/api/linkedin", { url }),

  jobs: (role: string, city: string, country: string) =>
    api.get<JobsResult>(`/api/jobs?${new URLSearchParams({ role, city, country })}`),

  proof: (id: string) => api.get<Proof>(`/api/proofs/${encodeURIComponent(id)}`),

  deleteProof: (id: string, deleteKey: string) =>
    api.delete(`/api/proofs/${encodeURIComponent(id)}`, { "X-Delete-Key": deleteKey }),
};
