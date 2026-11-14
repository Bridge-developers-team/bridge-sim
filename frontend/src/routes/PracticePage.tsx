import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { bridgeApi } from "../api/bridge";
import { errorText, useConfig } from "../api/hooks";
import type { Practice } from "../api/types";
import { FeedbackView } from "../components/FeedbackView";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { TextArea, TextInput } from "../components/ui/Field";
import { Lozenge } from "../components/ui/Lozenge";
import { ModeBanner } from "../components/ui/ModeBanner";
import { Panel, PanelBody, PanelHeader } from "../components/ui/Panel";
import { Waiting } from "../components/ui/Waiting";
import { selectedCareer, updatePractice, withEvaluation, withPractice } from "../lib/journey";
import { findTask } from "../lib/progress";
import { getJourney, updateJourney, useJourney } from "../state/journey";

const MIN_WORDS = 15;
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function PracticePage() {
  const { taskId = "" } = useParams();
  const journey = useJourney();
  const career = selectedCareer(journey);
  const found = journey.roadmap ? findTask(journey.roadmap, taskId) : null;
  const work = journey.practices[taskId];
  const sample = journey.roadmapMode !== undefined && journey.roadmapMode !== "live";
  const started = useRef(false);

  const create = useMutation({
    mutationFn: (asSample: boolean) => bridgeApi.practice(career!, found!.task, getJourney().profile, asSample),
    onSuccess: ({ practice, practiceToken, mode }) =>
      updateJourney((j) => withPractice(j, taskId, { practice, practiceToken, mode, answer: "" })),
  });

  useEffect(() => {
    if (career && found && !work && !started.current) {
      started.current = true;
      create.mutate(sample);
    }
  }, [career, found, work, create, sample]);

  if (!career || !found) {
    return (
      <Panel>
        <PanelBody className="stack">
          <h1>This practice task is not in your plan</h1>
          <Link className="btn btn--primary" to={journey.roadmap ? "/plan" : "/"}>
            {journey.roadmap ? "Back to my plan" : "Home"}
          </Link>
        </PanelBody>
      </Panel>
    );
  }
  if (create.isPending) {
    return (
      <Waiting
        title="Writing a realistic practice task"
        steps={["Picking a real piece of the job", "Setting it in your past industry", "Writing the rubric you will be graded on"]}
        usually="Usually 10-20 seconds."
      />
    );
  }
  if (create.isError || !work) {
    return (
      <ErrorBox
        message={create.isError ? errorText(create.error) : "Loading the practice task..."}
        onRetry={() => create.mutate(sample)}
        onSample={sample ? undefined : () => create.mutate(true)}
      />
    );
  }
  return <PracticeWorkspace taskId={taskId} practice={work.practice} />;
}

function PracticeWorkspace({ taskId, practice }: { taskId: string; practice: Practice }) {
  const journey = useJourney();
  const work = journey.practices[taskId]!;
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
    saveTimer.current = window.setTimeout(() => {
      updateJourney((j) => (j.practices[taskId]?.evaluation ? j : updatePractice(j, taskId, { answer: value })));
    }, 400);
  };

  const grade = useMutation({
    mutationFn: (asSample: boolean) => bridgeApi.evaluate(practice, work.practiceToken, answer.trim(), asSample),
    onSuccess: ({ evaluation, resultToken, mode }) =>
      updateJourney((j) => withEvaluation(j, taskId, { answer: answer.trim(), evaluation, resultToken, mode })),
  });
  const fill = useMutation({
    mutationFn: () => bridgeApi.sampleAnswer(practice, getJourney().profile, sample),
    onSuccess: ({ answer: text }) => onType(text),
  });

  return (
    <div className="stack-lg">
      <ModeBanner mode={work.mode} />
      <header className="page-head">
        <p className="eyebrow">Practice · {practice.targetRole}</p>
        <h1>Try the job for {practice.timeboxMinutes} minutes</h1>
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
          <Panel className="animate-fade-up">
            <PanelHeader title="AI practice feedback" note="Practice, not a hiring decision" />
            <PanelBody>
              <ModeBanner mode={work.evaluationMode} />
              <FeedbackView evaluation={work.evaluation} />
            </PanelBody>
          </Panel>
          <PublishPanel taskId={taskId} />
        </>
      )}
    </div>
  );
}

function PublishPanel({ taskId }: { taskId: string }) {
  const work = useJourney().practices[taskId]!;
  const [name, setName] = useState("");
  const [reflection, setReflection] = useState("");
  const [copied, setCopied] = useState(false);

  const publish = useMutation({
    mutationFn: () =>
      bridgeApi.publish({
        practice: work.practice,
        answer: work.answer,
        evaluation: work.evaluation!,
        mode: work.evaluationMode ?? work.mode,
        resultToken: work.resultToken!,
        reflection,
        displayName: name,
      }),
    onSuccess: ({ proof, deleteKey }) =>
      updateJourney((j) => updatePractice(j, taskId, { proof: { id: proof.id, deleteKey } })),
  });
  const remove = useMutation({
    mutationFn: () => bridgeApi.deleteProof(work.proof!.id, work.proof!.deleteKey),
    onSuccess: () => updateJourney((j) => updatePractice(j, taskId, { proof: undefined })),
  });

  if (work.proof) {
    const url = `${window.location.origin}/p/${work.proof.id}`;
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      } catch {
        setCopied(false); // the link stays visible to copy by hand
      }
    };
    return (
      <Panel>
        <PanelHeader title="Your proof page is live" />
        <PanelBody className="stack">
          <p className="small">Anyone with this link can see the task, your answer and the rubric scores.</p>
          <a className="link-box" href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
          <div className="row">
            <Button variant="primary" onClick={() => void copy()}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              Delete page
            </Button>
          </div>
          {remove.isError && <p className="text-danger small">{errorText(remove.error)}</p>}
        </PanelBody>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader title="Turn it into proof" note="Optional" />
      <PanelBody className="stack">
        <p className="muted small">
          Publish this graded task as a public work sample you can link in applications. Only what you see here is
          published: no CV, no profile.
        </p>
        <div className="grid-2">
          <TextInput label="Name to show (optional)" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <TextArea
            label="What you learned (optional)"
            value={reflection}
            maxLength={600}
            rows={3}
            onChange={(e) => setReflection(e.target.value)}
          />
        </div>
        {publish.isError && <p className="text-danger small">{errorText(publish.error)}</p>}
        <div>
          <Button variant="primary" loading={publish.isPending} onClick={() => publish.mutate()}>
            Publish proof page
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}
