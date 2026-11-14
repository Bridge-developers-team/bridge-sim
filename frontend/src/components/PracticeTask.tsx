import { useMutation } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import { bridgeApi } from "../api/bridge";
import { errorText, useConfig } from "../api/hooks";
import type { Evaluation, Mode } from "../api/types";
import type { PracticeWork } from "../lib/journey";
import { getJourney } from "../state/journey";
import { FeedbackView } from "./FeedbackView";
import { Button } from "./ui/Button";
import { ErrorBox } from "./ui/ErrorBox";
import { TextArea } from "./ui/Field";
import { Lozenge } from "./ui/Lozenge";
import { ModeBanner } from "./ui/ModeBanner";
import { Panel, PanelBody, PanelHeader } from "./ui/Panel";

const MIN_WORDS = 15;
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export interface GradedResult {
  answer: string;
  evaluation: Evaluation;
  resultToken: string;
  mode: Mode;
}

/** One practice task: the situation, the rubric (shown before writing), the
 * answer box, and the rubric feedback. Used by the plan's practice page and by
 * career tasting; each caller decides where the work is stored and what comes
 * after the feedback (`children`). */
export function PracticeTask({
  work,
  title,
  subtitle,
  onDraft,
  onGraded,
  children,
}: {
  work: PracticeWork;
  title: string;
  subtitle: ReactNode;
  onDraft: (answer: string) => void;
  onGraded: (result: GradedResult) => void;
  children?: ReactNode;
}) {
  const { practice } = work;
  const config = useConfig();
  const [answer, setAnswer] = useState(work.answer);
  const saveTimer = useRef<number>(undefined);
  const sample = work.mode !== "live";
  const count = words(answer);
  const changedSinceGrade = Boolean(work.evaluation) && answer.trim() !== work.answer.trim();

  // Drafts are saved shortly after typing stops, so a reload loses nothing.
  const onType = (value: string) => {
    setAnswer(value);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => onDraft(value), 400);
  };

  const grade = useMutation({
    mutationFn: (asSample: boolean) => bridgeApi.evaluate(practice, work.practiceToken, answer.trim(), asSample),
    onSuccess: ({ evaluation, resultToken, mode }) => onGraded({ answer: answer.trim(), evaluation, resultToken, mode }),
  });
  const fill = useMutation({
    mutationFn: () => bridgeApi.sampleAnswer(practice, getJourney().profile, sample),
    onSuccess: ({ answer: text }) => onType(text),
  });

  return (
    <div className="stack-lg">
      <ModeBanner mode={work.mode} />
      <header className="page-head">
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </header>

      <Panel>
        <PanelHeader title="The situation" />
        <PanelBody className="stack">
          <p>{practice.scenario}</p>
          <p className="strong">{practice.brief}</p>
          <p className="small">
            <span className="strong">Hand in:</span> {practice.expectedDeliverable}
          </p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="How it is graded" note="Read this first" />
        <PanelBody>
          <ul className="rubric">
            {practice.rubric.map((c) => (
              <li key={c.id}>
                <span className="strong">{c.label}</span> <Lozenge>max {c.maxScore}</Lozenge>
                <p className="muted small">{c.description}</p>
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Your answer" note={<span className="tabular">{count} words</span>} />
        <PanelBody className="stack">
          <TextArea
            label="Write it the way you would at work"
            value={answer}
            onChange={(e) => onType(e.target.value)}
            rows={9}
            maxLength={config.data?.limits.maxAnswer ?? 8000}
          />
          {grade.isError && (
            <ErrorBox
              message={errorText(grade.error)}
              onRetry={() => grade.mutate(sample)}
              onSample={sample ? undefined : () => grade.mutate(true)}
            />
          )}
          {fill.isError && <p className="text-danger small">{errorText(fill.error)}</p>}
          <div className="row">
            <Button
              variant="primary"
              loading={grade.isPending}
              disabled={count < MIN_WORDS || (Boolean(work.evaluation) && !changedSinceGrade)}
              onClick={() => grade.mutate(sample)}
            >
              {work.evaluation ? "Get feedback on this revision" : "Get feedback"}
            </Button>
            <Button variant="subtle" loading={fill.isPending} onClick={() => fill.mutate()}>
              Fill a sample answer
            </Button>
            {count < MIN_WORDS && <span className="muted small">At least {MIN_WORDS} words.</span>}
          </div>
          {grade.isPending && <p className="muted small">Grading against the rubric. Usually 10-30 seconds.</p>}
        </PanelBody>
      </Panel>

      {work.evaluation && (
        <>
          <Panel>
            <PanelHeader title="AI practice feedback" note="Practice, not a hiring decision" />
            <PanelBody>
              <ModeBanner mode={work.evaluationMode} />
              <FeedbackView evaluation={work.evaluation} />
            </PanelBody>
          </Panel>
          {children}
        </>
      )}
    </div>
  );
}
