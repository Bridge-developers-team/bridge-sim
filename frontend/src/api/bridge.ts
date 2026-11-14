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
  Profile,
  Proof,
  Resource,
  Roadmap,
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

  resources: (role: string, topic: string, sample = false) =>
    api.post<{ resources: Resource[]; mode: Mode }>("/api/resources", { role, topic, sample }),

  jobs: (role: string, city: string, country: string) =>
    api.get<JobsResult>(`/api/jobs?${new URLSearchParams({ role, city, country })}`),

  proof: (id: string) => api.get<Proof>(`/api/proofs/${encodeURIComponent(id)}`),

  deleteProof: (id: string, deleteKey: string) =>
    api.delete(`/api/proofs/${encodeURIComponent(id)}`, { "X-Delete-Key": deleteKey }),
};
