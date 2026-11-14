import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import { PracticeTask } from "../components/PracticeTask";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { TextArea, TextInput } from "../components/ui/Field";
import { Panel, PanelBody, PanelHeader } from "../components/ui/Panel";
import { Waiting } from "../components/ui/Waiting";
import { selectedCareer, updatePractice, withEvaluation, withPractice } from "../lib/journey";
import { findTask } from "../lib/progress";
import { getJourney, updateJourney, useJourney } from "../state/journey";


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
  return <PracticeWorkspace taskId={taskId} />;
}

function PracticeWorkspace({ taskId }: { taskId: string }) {
  const work = useJourney().practices[taskId]!;
  return (
    <PracticeTask
      work={work}
      title={`Try the job for ${work.practice.timeboxMinutes} minutes`}
      subtitle={<>A small, realistic piece of {work.practice.targetRole} work. Read the rubric first.</>}
      onDraft={(value) =>
        updateJourney((j) => (j.practices[taskId]?.evaluation ? j : updatePractice(j, taskId, { answer: value })))
      }
      onGraded={(result) => updateJourney((j) => withEvaluation(j, taskId, result))}
    >
      <PublishPanel taskId={taskId} />
    </PracticeTask>
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
