/** One function per backend route. Components call these through TanStack
 * Query; nothing else talks to the network. */
import { api } from "./client";
import type {
  AppConfig,
  Career,
  CareersResponse,
  Evaluation,
  JobsResult,
  Mode,
  Practice,
  Pay,
  Profile,
  Proof,
  ResumeSource,
  Roadmap,
  StudyPlan,
  Task,
  Track,
  VideosResult,
} from "./types";

export const bridgeApi = {
  config: () => api.get<AppConfig>("/api/config"),

  careers: (resumeText: string, profile: Profile, sample = false, source: ResumeSource = "cv") =>
    api.post<CareersResponse>("/api/careers", { resumeText, profile, sample, source }),

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

  /** `field`: the study field the AI chose for the path ("" lets the server use the title). */
  study: (role: string, paid: boolean, hours: number, field = "") =>
    api.get<StudyPlan>(`/api/study?${new URLSearchParams({ role, paid: String(paid), hours: String(hours), field })}`),

  /** One entry per role, in order; null where no official figure exists.
   * `fields` lines up with `roles` (the AI's study field for each). */
  pay: (roles: string[], country: string, location: string, fields: string[] = []) =>
    api.get<(Pay | null)[]>(
      `/api/pay?${new URLSearchParams([
        ...roles.map((r): [string, string] => ["role", r]),
        ...fields.map((f): [string, string] => ["field", f]),
        ["country", country],
        ["location", location],
      ])}`,
    ),

  jobs: (role: string, city: string, country: string, field = "") =>
    api.get<JobsResult>(`/api/jobs?${new URLSearchParams({ role, city, country, field })}`),

  /** The best English YouTube video for each search phrase (at most 3). */
  videos: (role: string, queries: string[]) =>
    api.get<VideosResult>(
      `/api/videos?${new URLSearchParams([["role", role], ...queries.slice(0, 3).map((q): [string, string] => ["q", q])])}`,
    ),

  proof: (id: string) => api.get<Proof>(`/api/proofs/${encodeURIComponent(id)}`),

  deleteProof: (id: string, deleteKey: string) =>
    api.delete(`/api/proofs/${encodeURIComponent(id)}`, { "X-Delete-Key": deleteKey }),
};
