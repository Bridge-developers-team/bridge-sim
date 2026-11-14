import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Profile, Track } from "../api/types";
import { useConfig } from "../api/hooks";
import { Button } from "../components/ui/Button";
import { Choices, MultiChoices } from "../components/ui/Choices";
import { TextArea, TextInput } from "../components/ui/Field";
import { Panel, PanelBody, PanelHeader } from "../components/ui/Panel";
import { readCvFile } from "../lib/pdf";
import { memory, updateJourney, useJourney } from "../state/journey";

const HOURS = [2, 3, 5, 8, 10, 15, 20].map((h) => ({ value: h, label: `${h} h` }));
const BUDGETS = [0, 25, 50, 100, 200, 500].map((b) => ({ value: b, label: b === 0 ? "Free only" : String(b) }));
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "KZT"].map((c) => ({ value: c, label: c }));
const MOTIVATIONS = [
  "Higher pay",
  "Less stress",
  "Better work-life balance",
  "More meaningful work",
  "Remote work",
  "Job security",
  "Room to grow",
];

export function StartPage() {
  const navigate = useNavigate();
  const config = useConfig();
  const journey = useJourney();
  const [resume, setResume] = useState(memory.resumeText);
  const [profile, setProfile] = useState<Profile>(journey.profile);
  const [roles, setRoles] = useState(journey.profile.interestedRoles.join(", "));
  const [fileNote, setFileNote] = useState<{ text: string; error: boolean } | null>(null);
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const limits = config.data?.limits;
  const minResume = limits?.minResume ?? 80;
  const tooShort = resume.trim().length < minResume;
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile((p) => ({ ...p, [key]: value }));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setFileNote(null);
    try {
      const text = await readCvFile(file);
      setResume(text.slice(0, limits?.maxResume ?? 15000));
      setFileNote({ text: `Read ${file.name}. Check the text below; nothing was uploaded.`, error: false });
    } catch (err) {
      setFileNote({ text: err instanceof Error ? err.message : "Could not read that file.", error: true });
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (tooShort) return;
    const interestedRoles = roles
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)
      .slice(0, 3);
    memory.resumeText = resume.trim();
    updateJourney((j) => ({ ...j, profile: { ...profile, interestedRoles } }));
    navigate("/paths", { state: { run: true, sample: false } });
  };

  return (
    <form className="stack-lg" onSubmit={submit}>
      <header className="page-head">
        <h1>Tell Bridge where you are now</h1>
        <p className="muted">Two minutes. Your CV is read in your browser and sent only to the AI that suggests paths.</p>
      </header>

      <Panel>
        <PanelHeader title="1 · Your experience" note={<span className="tabular">{resume.trim().length} chars</span>} />
        <PanelBody className="stack">
          <div className="row">
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="sr-only"
              id="cv-file"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <Button variant="primary" loading={reading} onClick={() => fileInput.current?.click()}>
              Upload CV (PDF or .txt)
            </Button>
            {config.data?.samples.map((s) => (
              <Button key={s.id} size="sm" variant="subtle" onClick={() => setResume(s.resume)}>
                {s.label}
              </Button>
            ))}
          </div>
          {fileNote && <p className={fileNote.error ? "text-danger small" : "muted small"}>{fileNote.text}</p>}
          <TextArea
            label="CV text"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={10}
            maxLength={limits?.maxResume ?? 15000}
            placeholder="Paste your CV, or describe your jobs, what you did in them and the results."
            hint={tooShort ? `At least ${minResume} characters, so the AI has something real to quote.` : undefined}
          />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="2 · Your situation" />
        <PanelBody className="stack">
          <div className="grid-2">
            <TextInput
              label="Current role (optional)"
              value={profile.currentRole}
              onChange={(e) => set("currentRole", e.target.value)}
              placeholder="e.g. Middle-school teacher"
              maxLength={120}
            />
            <TextInput
              label="Roles you are curious about (optional)"
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              placeholder="e.g. UX research, training"
              hint="Up to 3, separated by commas."
              maxLength={240}
            />
          </div>
          <Choices label="Free hours per week for the switch" options={HOURS} value={profile.hoursPerWeek} onChange={(v) => set("hoursPerWeek", v)} />
          <div className="grid-2">
            <Choices
              label="Monthly learning budget"
              options={BUDGETS}
              value={profile.monthlyLearningBudget}
              onChange={(v) => set("monthlyLearningBudget", v)}
            />
            <Choices label="Currency" options={CURRENCIES} value={profile.currency} onChange={(v) => set("currency", v)} />
          </div>
          <MultiChoices
            label="Why change? (up to 3)"
            options={MOTIVATIONS}
            value={profile.changeMotivation}
            onChange={(v) => set("changeMotivation", v)}
            max={3}
          />
          <fieldset className="choices">
            <legend className="field__label">Pace</legend>
            <div className="track-grid">
              {config.data?.tracks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={profile.transitionPreference === t.id}
                  className={`track ${profile.transitionPreference === t.id ? "track--on" : ""}`}
                  onClick={() => set("transitionPreference", t.id as Track)}
                >
                  <span className="track__label">{t.label}</span>
                  <span className="track__text">{t.summary}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </PanelBody>
      </Panel>

      <div className="sticky-actions">
        <Button type="submit" variant="primary" className="btn--lg" disabled={tooShort}>
          Find my 3 paths
        </Button>
        <span className="muted small">Usually 15-30 seconds.</span>
      </div>
    </form>
  );
}
