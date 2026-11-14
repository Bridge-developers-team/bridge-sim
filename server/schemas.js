// Zod schemas for every LLM response. Structured outputs guarantee the JSON
// shape; counts, ranges, time budgets and quotes are re-checked in code
// (lib/roadmap.js, lib/simulation.js, server/careers.js).
import { z } from "zod";
import { TASK_TYPES, EFFORTS } from "../lib/roadmap.js";

export const CareersResponseSchema = z.object({
  profile: z.object({
    currentRole: z.string().describe("Short label of the person's current role, e.g. 'Middle-school English teacher'"),
    yearsExperience: z.number().nullable().describe("Total years in the current career if the text states or clearly implies it, else null"),
    industry: z.string().describe("Current industry or field, e.g. 'K-12 education'"),
    evidenceNote: z.string().describe("One sentence on how complete the resume evidence is; say plainly if it is thin"),
  }),
  careers: z
    .array(
      z.object({
        title: z.string().describe("Target career title, e.g. 'Instructional Designer'"),
        roleSummary: z.string().describe("One sentence: what people in this role do all day"),
        fitExplanation: z.string().describe("1-2 sentences on why it builds on THIS person's experience, naming concrete resume signals"),
        transferableSkills: z
          .array(
            z.object({
              skill: z.string().describe("Skill name in 2-5 words"),
              evidence: z.string().describe("Exact verbatim quote (4-20 words) copied from the resume that shows this skill"),
            }),
          )
          .describe("2-4 skills the person already shows"),
        missingSkills: z.array(z.string()).describe("2-4 role-relevant skills to learn, phrased as skills (e.g. 'Storyboarding e-learning modules')"),
        relativeEffort: z.enum(EFFORTS).describe("Qualitative transition effort compared with the other two paths"),
        keyTradeoff: z.string().describe("One honest trade-off of this path"),
        assumptions: z.array(z.string()).describe("0-3 assumptions or uncertainties behind this recommendation"),
      }),
    )
    .describe("Exactly 3 distinct careers"),
});

const RoadmapTaskSchema = z.object({
  title: z.string().describe("Short action title, e.g. 'Analyze 2 instructional designer job descriptions'"),
  type: z.enum(TASK_TYPES),
  estimatedMinutes: z.number().describe("Realistic minutes for this task"),
  whyThisMatters: z.string().describe("One sentence on why this task moves the switch forward"),
  instructions: z.array(z.string()).describe("2-5 short steps. Name search keywords instead of URLs"),
  deliverable: z.string().describe("The concrete thing the user produces, e.g. 'A list of 3 recurring requirements'"),
  successCriteria: z.string().describe("A specific, checkable test of done"),
});

export const RoadmapResponseSchema = z.object({
  weeks: z
    .array(
      z.object({
        title: z.string().describe("Milestone title, e.g. 'Explore and validate the role'"),
        objective: z.string().describe("One sentence: what this week achieves"),
        tasks: z.array(RoadmapTaskSchema).describe("2-4 tasks"),
      }),
    )
    .describe("Exactly 4 weeks"),
  assumptions: z.array(z.string()).describe("1-4 assumptions the plan makes"),
  cautions: z.array(z.string()).describe("0-3 honest cautions, e.g. that 30 days is a start, not a full switch"),
});

export const SimulationResponseSchema = z.object({
  scenario: z.string().describe("2-4 sentences: the work situation, using the person's past industry where it helps"),
  brief: z.string().describe("What exactly to do, with every fact or excerpt needed inside it"),
  expectedDeliverable: z.string().describe("The exact output to write, e.g. 'One learning objective plus 2-3 sentences of rationale'"),
  timeboxMinutes: z.number().describe("10"),
  rubric: z
    .array(
      z.object({
        label: z.string().describe("Criterion name, 2-5 words"),
        description: z.string().describe("What a top answer does on this criterion"),
        maxScore: z.number().describe("Integer 3-5"),
      }),
    )
    .describe("3-4 criteria"),
});

export const EvaluationResponseSchema = z.object({
  criteria: z.array(
    z.object({
      rubricId: z.string().describe("The criterion id, e.g. c1"),
      score: z.number().describe("Integer from 0 to that criterion's maxScore"),
      evidence: z.string().describe("Exact verbatim quote (4-25 words) from the answer behind the score, or empty string"),
      strengths: z.array(z.string()).describe("0-2 specific strengths"),
      improvements: z.array(z.string()).describe("1-2 actionable improvements"),
    }),
  ),
  overallFeedback: z.string().describe("2-3 sentences of overall practice feedback"),
  nextRevisionStep: z.string().describe("The single most useful change for the next draft"),
});

export const SampleAnswerSchema = z.object({
  answer: z.string(),
});

export const PdfTextSchema = z.object({
  text: z.string().describe("The full text of the document, transcribed verbatim in reading order"),
});
