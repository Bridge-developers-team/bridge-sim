// Zod schemas for every LLM response. Structured outputs guarantee the JSON
// shape; counts and ranges are re-checked in code (see server/llm.js).
import { z } from "zod";
import { RUBRIC_IDS } from "../lib/rubric.js";

export const TaskSchema = z.object({
  title: z.string().describe("Short task title, max 8 words"),
  scenario: z.string().describe("2-4 sentences: the work situation, set in the candidate's current industry"),
  inputs: z.string().describe("All data the candidate needs (numbers, short excerpts, constraints), so the task is self-contained"),
  deliverable: z.string().describe("Exactly what to write, e.g. 'A 1-page outline with...'"),
  timeMinutes: z.number().describe("Suggested time, 10-25"),
  buildsOn: z.string().describe("Which part of the candidate's background this task lets them use"),
});

export const TasksResponseSchema = z.object({
  profile: z.object({
    currentRole: z.string(),
    industry: z.string(),
    transferableSkills: z.array(z.string()).describe("3-5 skills that carry over to the target role"),
    gaps: z.array(z.string()).describe("2-4 skills the target role needs that the resume does not show"),
  }),
  tasks: z.array(TaskSchema).describe("Exactly 3 tasks"),
});

export const GradeResponseSchema = z.object({
  criteria: z.array(
    z.object({
      id: z.enum(RUBRIC_IDS),
      level: z.number().describe("Integer 0-4 from the rubric"),
      evidence: z.string().describe("Exact verbatim quote copied from the answer (5-25 words), or empty string"),
      reason: z.string().describe("One sentence: why this level and not the next one up"),
    }),
  ),
  strength: z.string().describe("The single best thing in the answer"),
  topFix: z.string().describe("The single change that would raise the score most"),
});

export const DemoAnswerSchema = z.object({
  answer: z.string(),
});
