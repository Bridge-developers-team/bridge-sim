import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import type { Career } from "../api/types";
import { tastesOf } from "../lib/journey";
import { ENERGY_HIGH, QUADRANT_LABEL, SKILL_HIGH, rankTastes, recommend, type Quadrant } from "../lib/tasting";
import { useJourney } from "../state/journey";
import { TasteMap } from "./TasteMap";
import { Button } from "./ui/Button";
import { Lozenge, type Tone } from "./ui/Lozenge";
import { Panel, PanelBody, PanelHeader } from "./ui/Panel";

const QUADRANT_TONE: Record<Quadrant, Tone> = { thrive: "ok", grow: "info", trap: "danger", skip: "neutral" };

/** "Not sure which? Taste them first." Before any taste: an invitation. After
 * one: the Taste Map. After two or more: a recommendation with its reasons. */
export function TastingPanel({ onChoose }: { onChoose: (career: Career) => void }) {
  const journey = useJourney();
  const navigate = useNavigate();
  const location = useLocation();
  const anchor = useRef<HTMLDivElement>(null);
  const careers = journey.careers?.careers ?? [];
  const tastes = tastesOf(journey);
  const ranked = rankTastes(tastes);
  const best = recommend(tastes);
  const untasted = careers.find((c) => !journey.tastings[c.id]?.evaluation);

  // "See my Taste Map" lands here.
  useEffect(() => {
    if (location.hash === "#taste-map") anchor.current?.scrollIntoView({ block: "start" });
  }, [location.hash]);

  return (
    <div ref={anchor} id="taste-map">
      <Panel className={tastes.length ? "" : "next"}>
        <PanelHeader
          title={tastes.length ? "Your Taste Map" : "Not sure which? Taste them first."}
          note={<span className="tabular">{tastes.length} of {careers.length} tasted</span>}
        />
        <PanelBody className="stack">
          {tastes.length === 0 ? (
            <p>Try a 10-minute task from each path. Bridge maps your skill against how much you'd enjoy it.</p>
          ) : (
            <div className="taste">
              <TasteMap tastes={ranked} skillHigh={SKILL_HIGH} energyHigh={ENERGY_HIGH} />
              <div className="stack">
                {best ? (
                  <div className="stack">
                    <p className="label">Recommended from your tastes</p>
                    <p className="next__title">{best.title}</p>
                    <p>{best.reason}</p>
                    <div>
                      <Button
                        variant="primary"
                        onClick={() => {
                          const career = careers.find((c) => c.id === best.careerId);
                          if (career) onChoose(career);
                        }}
                      >
                        Build my 30-day plan for {best.title}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="muted">
                    {tastes.length < 2
                      ? "Taste at least one more path to get a recommendation."
                      : "None of your tastes is a path you'd want to do yet. Try revising an answer, or look again at the paths below."}
                  </p>
                )}
                <ul className="taste__list">
                  {ranked.map((t) => (
                    <li key={t.careerId}>
                      <span className="strong">{t.title}</span>{" "}
                      <Lozenge tone={QUADRANT_TONE[t.quadrant]}>{QUADRANT_LABEL[t.quadrant]}</Lozenge>
                      <p className="muted small">{t.reason}</p>
                    </li>
                  ))}
                </ul>
                <p className="fine">A 10-minute sample: an experiment, not a verdict.</p>
              </div>
            </div>
          )}
          {untasted && (
            <div>
              <Button variant={tastes.length ? "default" : "primary"} onClick={() => navigate(`/taste/${untasted.id}`)}>
                {tastes.length ? `Taste the next path: ${untasted.title}` : `Start with ${untasted.title} · 10 min`}
              </Button>
            </div>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
