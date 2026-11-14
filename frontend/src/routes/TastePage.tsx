import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import { PracticeTask } from "../components/PracticeTask";
import { Button } from "../components/ui/Button";
import { Choices } from "../components/ui/Choices";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Panel, PanelBody, PanelHeader } from "../components/ui/Panel";
import { Waiting } from "../components/ui/Waiting";
import { updateTasting, withTasting } from "../lib/journey";
import { ENERGY_LABELS } from "../lib/tasting";
import { getJourney, updateJourney, useJourney } from "../state/journey";

const ENERGY_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({ value, label: ENERGY_LABELS[value]! }));

/** A 10-minute taste of one path, before choosing it: the same practice
 * engine as the plan, set in the user's own field, then one question about
 * how doing this work would feel. */
export function TastePage() {
  const { careerId = "" } = useParams();
  // Keyed by path, so moving to the next taste starts fresh instead of
  // reusing the previous path's request state.
  return <TasteView key={careerId} careerId={careerId} />;
}

function TasteView({ careerId }: { careerId: string }) {
  const journey = useJourney();
  const career = journey.careers?.careers.find((c) => c.id === careerId);
  const work = journey.tastings[careerId];
  const sample = journey.careers ? journey.careers.mode !== "live" : false;
  const started = useRef(false);

  const create = useMutation({
    mutationFn: (asSample: boolean) => {
      const j = getJourney();
      return bridgeApi.practice(
        career!,
        {
          id: `taste-${career!.id}`,
          title: `A 10-minute taste of ${career!.title} work`,
          deliverable: "One short written answer to a realistic work scenario",
        },
        { ...j.profile, industry: j.careers?.profile.industry ?? "" },
        asSample,
      );
    },
    onSuccess: ({ practice, practiceToken, mode }) =>
      updateJourney((j) => withTasting(j, careerId, { practice, practiceToken, mode, answer: "" })),
  });

  useEffect(() => {
    if (career && !work && !started.current) {
      started.current = true;
      create.mutate(sample);
    }
  }, [career, work, create, sample]);

  if (!career) {
    return (
      <Panel>
        <PanelBody className="stack">
          <h1>This path is not in your list</h1>
          <Link className="btn btn--primary" to={journey.careers ? "/paths" : "/start"}>
            {journey.careers ? "Back to my paths" : "Start with my CV"}
          </Link>
        </PanelBody>
      </Panel>
    );
  }
  if (create.isPending) {
    return (
      <Waiting
        title={`Setting up a taste of ${career.title} work`}
        steps={["Picking a real piece of the job", "Setting it in your own field", "Writing the rubric you will be graded on"]}
        usually="Usually 10-20 seconds."
      />
    );
  }
  if (create.isError || !work) {
    return (
      <ErrorBox
        message={create.isError ? errorText(create.error) : "Loading the task..."}
        onRetry={() => create.mutate(sample)}
        onSample={sample ? undefined : () => create.mutate(true)}
      />
    );
  }

  return (
    <PracticeTask
      work={work}
      title={`Taste it: ${career.title}`}
      subtitle={<>Ten minutes of real {career.title} work, set in your own field. Read the rubric first.</>}
      onDraft={(value) =>
        updateJourney((j) => (j.tastings[careerId]?.evaluation ? j : updateTasting(j, careerId, { answer: value })))
      }
      onGraded={(result) =>
        updateJourney((j) =>
          updateTasting(j, careerId, {
            answer: result.answer,
            evaluation: result.evaluation,
            resultToken: result.resultToken,
            evaluationMode: result.mode,
          }),
        )
      }
    >
      <EnergyPanel careerId={careerId} />
    </PracticeTask>
  );
}

function EnergyPanel({ careerId }: { careerId: string }) {
  const journey = useJourney();
  const navigate = useNavigate();
  const energy = journey.tastings[careerId]?.energy;
  const next = journey.careers?.careers.find((c) => !journey.tastings[c.id]?.evaluation);

  return (
    <Panel className="next">
      <PanelHeader title="One honest question" />
      <PanelBody className="stack">
        <p className="next__title">Would you want to do this on an ordinary Tuesday?</p>
        <p className="muted small">
          Not whether you can. Whether you'd want to, week after week. Your answer stays in this browser.
        </p>
        <Choices
          label="How it would feel"
          options={ENERGY_OPTIONS}
          value={energy ?? 0}
          onChange={(value) => updateJourney((j) => updateTasting(j, careerId, { energy: value }))}
        />
        {energy !== undefined && (
          <div className="row">
            {next ? (
              <Button variant="primary" onClick={() => navigate(`/taste/${next.id}`)}>
                Taste the next path: {next.title}
              </Button>
            ) : null}
            <Button variant={next ? "subtle" : "primary"} onClick={() => navigate("/paths#taste-map")}>
              See my Taste Map
            </Button>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
