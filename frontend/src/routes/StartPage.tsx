import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Profile, Track } from "../api/types";
import { useConfig } from "../api/hooks";
import { Button } from "../components/ui/Button";
import { OptionList, Picker } from "../components/ui/Picker";
import { Panel, PanelBody, PanelHeader } from "../components/ui/Panel";
import { ArrowRightIcon, ChevronDownIcon, FileIcon, UploadIcon } from "../components/Icons";
import { readCvFile } from "../lib/pdf";
import {
  budgetLabel,
  budgetSteps,
  citiesFor,
  COUNTRIES,
  CURRENCIES,
  convertBudget,
  CURRENT_ROLES,
  HOURS,
  MOTIVATIONS,
  TARGET_ROLES,
  withCountry,
} from "../lib/options";
import { type InputMode, linkedinProfileUrl, resumeSource } from "../lib/source";
import { memory, updateJourney, useJourney } from "../state/journey";

type Source = { kind: "file" | "sample" | "paste"; name: string } | null;
type Draft = { text: string; source: Source };

const MODES: { id: InputMode; label: string }[] = [
  { id: "cv", label: "CV" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "text", label: "My words" },
];
const OWN_WORDS: Source = { kind: "paste", name: "Your own words" };

function startMode(): InputMode {
  return memory.resumeText ? (memory.resumeSource === "cv" ? "cv" : memory.resumeSource) : "cv";
}

const hourOptions = HOURS.map((h) => ({ value: String(h), label: `${h} hours a week` }));
const currencyOptions = CURRENCIES.map((c) => ({ value: c, label: c }));
const motivationOptions = MOTIVATIONS.map((m) => ({ value: m, label: m }));

export function StartPage() {
  const navigate = useNavigate();
  const config = useConfig();
  const journey = useJourney();
  // One draft per tab, so switching tabs never throws away what was typed or uploaded.
  const [mode, setMode] = useState<InputMode>(startMode);
  const [drafts, setDrafts] = useState<Record<InputMode, Draft>>(() => {
    const start: Record<InputMode, Draft> = {
      cv: { text: "", source: null },
      linkedin: { text: "", source: null },
      text: { text: "", source: OWN_WORDS },
    };
    if (memory.resumeText) {
      const m = startMode();
      start[m] = { text: memory.resumeText, source: m === "text" ? OWN_WORDS : { kind: "paste", name: "Your text" } };
    }
    return start;
  });
  const [linkedinInput, setLinkedinInput] = useState("");
  const resume = drafts[mode].text;
  const source = drafts[mode].source;
  const setSource = (next: Source) => setDrafts((d) => ({ ...d, [mode]: { ...d[mode], source: next } }));
  const [showText, setShowText] = useState(false);
  const [profile, setProfile] = useState<Profile>({ ...journey.profile, country: journey.profile.country || "us" });
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [samples, setSamples] = useState(false);
  const [needCv, setNeedCv] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cvCard = useRef<HTMLDivElement>(null);
  const sampleLink = useRef<HTMLButtonElement>(null);

  const limits = config.data?.limits;
  const minResume = limits?.minResume ?? 80;
  const maxResume = limits?.maxResume ?? 15000;
  const tooShort = resume.trim().length < minResume;
  const words = resume.trim() ? resume.trim().split(/\s+/).length : 0;
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile((p) => ({ ...p, [key]: value }));

  const applyText = (text: string, next: Source) => {
    setDrafts((d) => ({ ...d, [mode]: { text: text.slice(0, maxResume), source: next } }));
    setNeedCv(false);
  };
  const profileUrl = linkedinProfileUrl(linkedinInput);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setFileError(null);
    try {
      applyText(await readCvFile(file), { kind: "file", name: file.name });
      setShowText(false);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (tooShort) {
      // Point at the one thing missing instead of a dead, greyed-out button.
      setNeedCv(true);
      cvCard.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    memory.resumeText = resume.trim();
    memory.resumeSource = resumeSource(mode, resume);
    updateJourney((j) => ({ ...j, profile }));
    navigate("/paths", { state: { run: true, sample: false } });
  };

  const tracks = config.data?.tracks ?? [];
  const trackIndex = Math.max(0, tracks.findIndex((t) => t.id === profile.transitionPreference));
  const track = tracks[trackIndex];
  const budgetText = budgetLabel(profile.monthlyLearningBudget, profile.currency);

  return (
    <form className="start" onSubmit={submit} noValidate>
      <header className="page-head">
        <h1>Tell Bridge where you are now</h1>
        <p className="lead">
          Two minutes. Your CV, LinkedIn profile or own words are read on this device and sent only to the AI that
          suggests paths.
        </p>
      </header>

      <Panel>
        <div
          ref={cvCard}
          className={`cv ${dragging ? "is-over" : ""} ${needCv ? "is-needed" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void onFile(e.dataTransfer.files[0]);
          }}
        >
          <PanelHeader title="Your experience" />
          <PanelBody className="stack">
            <div
              className="segmented"
              role="radiogroup"
              aria-label="How to tell Bridge about your experience"
              style={{ "--count": MODES.length, "--index": MODES.findIndex((m) => m.id === mode) } as React.CSSProperties}
            >
              <span className="segmented__thumb" aria-hidden="true" />
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={m.id === mode}
                  className="segmented__opt"
                  onClick={() => {
                    setMode(m.id);
                    setNeedCv(false);
                    setFileError(null);
                    setShowText(false);
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />

            {mode === "linkedin" && (
              <div className="stack-sm">
                <ol className="steps small">
                  <li>
                    <div className="step__field">
                    <label htmlFor="li-url">Your LinkedIn profile link (optional)</label>
                    <input
                      id="li-url"
                      className="ui-field"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="linkedin.com/in/your-name"
                      value={linkedinInput}
                      onChange={(e) => setLinkedinInput(e.target.value)}
                    />
                    {linkedinInput.trim() && !profileUrl && (
                      <span className="text-danger small">That is not a profile link. It looks like linkedin.com/in/your-name.</span>
                    )}
                    {profileUrl && (
                      <a className="btn btn--sm" href={profileUrl} target="_blank" rel="noopener noreferrer">
                        Open my profile
                      </a>
                    )}
                    </div>
                  </li>
                  <li>
                    On your profile, click <strong>More</strong> (on some accounts <strong>Resources</strong>), then{" "}
                    <strong>Save to PDF</strong>. It works on a computer, not in the LinkedIn app.
                  </li>
                  <li>Upload that PDF here.</li>
                </ol>
                <p className="fine">
                  Why the PDF and not just the link: LinkedIn does not let other sites read profiles, so Bridge never
                  opens your profile itself. The PDF has your full experience, and it is read on this device.
                </p>
              </div>
            )}

            {mode === "text" ? (
              <div className="cv-text">
                <label className="label" htmlFor="cv-words">
                  Describe your work in your own words
                </label>
                <textarea
                  id="cv-words"
                  className="ui-field ui-field--textarea"
                  value={resume}
                  rows={9}
                  maxLength={maxResume}
                  placeholder={
                    "What jobs have you had, and for how long?\nWhat do you do on a normal day?\nWhat are you proud of? Numbers help: people, money, results.\nWhat do you enjoy, and what drains you?"
                  }
                  onChange={(e) => applyText(e.target.value, OWN_WORDS)}
                />
                <p className="field__hint tabular">
                  {tooShort
                    ? `At least ${minResume} characters. Plain sentences are fine; what you enjoy and what drains you helps a lot.`
                    : `${words} words.`}
                </p>
              </div>
            ) : (
              <>
                {source && source.kind !== "paste" ? (
                  <div className="cv-file" key={source.name}>
                    <span className="cv-file__icon">
                      <FileIcon />
                    </span>
                    <span className="cv-file__text">
                      <strong>{source.name}</strong>
                      <span className="muted small tabular">
                        {words.toLocaleString("en-US")} words · read on this device
                      </span>
                    </span>
                    <Button size="sm" onClick={() => fileInput.current?.click()} loading={reading}>
                      Replace
                    </Button>
                  </div>
                ) : source?.kind !== "paste" ? (
                  <div className="cv-empty">
                    <Button className="btn--upload" onClick={() => fileInput.current?.click()} loading={reading}>
                      {!reading && <UploadIcon />}
                      {reading ? "Reading…" : mode === "linkedin" ? "Upload LinkedIn PDF" : "Upload CV"}
                    </Button>
                    <p className="muted small">{mode === "linkedin" ? "The PDF from step 2, or drop it here." : "PDF or .txt, or drop it here."}</p>
                  </div>
                ) : null}

                {source?.kind === "paste" || (source && showText) ? (
                  <div className="cv-text">
                    <label className="sr-only" htmlFor="cv-text">
                      {mode === "linkedin" ? "LinkedIn profile text" : "CV text"}
                    </label>
                    <textarea
                      id="cv-text"
                      className="ui-field ui-field--textarea"
                      value={resume}
                      rows={8}
                      maxLength={maxResume}
                      autoFocus={source?.kind === "paste" && !resume}
                      placeholder={
                        mode === "linkedin"
                          ? "Paste the text of your LinkedIn profile: headline, About, and each job."
                          : "Paste your CV, or describe your jobs, what you did in them and the results."
                      }
                      onChange={(e) =>
                        applyText(e.target.value, source?.kind === "paste" || !source ? { kind: "paste", name: "Your text" } : source)
                      }
                    />
                    <p className="field__hint tabular">
                      {tooShort ? `At least ${minResume} characters, so the AI has something real to quote.` : `${words} words. Edit anything that came out wrong.`}
                    </p>
                  </div>
                ) : null}
              </>
            )}

            {fileError && <p className="text-danger small">{fileError}</p>}
            {needCv && (
              <p className="text-danger small" role="alert">
                {mode === "text"
                  ? `Write a little more first: at least ${minResume} characters.`
                  : mode === "linkedin"
                    ? "Add your LinkedIn PDF first, or paste your profile text."
                    : "Add your CV first: upload it, paste it, or try a sample."}
              </p>
            )}

            {mode !== "text" && (
              <div className="cv-links">
                {source && source.kind !== "paste" && (
                  <button type="button" className="link-btn" aria-expanded={showText} onClick={() => setShowText((v) => !v)}>
                    {showText ? "Hide the text" : "Check the text"}
                    <span className={`link-btn__chev ${showText ? "is-open" : ""}`}>
                      <ChevronDownIcon />
                    </span>
                  </button>
                )}
                {!source && (
                  <button type="button" className="link-btn" onClick={() => setSource({ kind: "paste", name: "Your text" })}>
                    Paste text instead
                  </button>
                )}
                {source?.kind === "paste" && !resume && (
                  <button type="button" className="link-btn" onClick={() => setSource(null)}>
                    Upload a file instead
                  </button>
                )}
                {mode === "cv" && (
                  <button ref={sampleLink} type="button" className="link-btn" aria-expanded={samples} onClick={() => setSamples((v) => !v)}>
                    Try a sample CV
                  </button>
                )}
              </div>
            )}
            {mode === "cv" && samples && config.data && (
              <OptionList
                title="Try a sample CV"
                options={config.data.samples.map((s) => ({ value: s.id, label: s.label.replace(/^Sample: /, "") }))}
                value=""
                onChange={(id) => {
                  const s = config.data?.samples.find((x) => x.id === id);
                  if (s) applyText(s.resume, { kind: "sample", name: `Sample: ${s.label.replace(/^Sample: /, "")}` });
                  setShowText(false);
                }}
                onClose={() => {
                  setSamples(false);
                  sampleLink.current?.focus({ preventScroll: true });
                }}
              />
            )}
          </PanelBody>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="You and your week" />
        <div className="settings">
          <Picker
            label="Current role"
            title="Your current role"
            placeholder="Optional"
            options={CURRENT_ROLES}
            searchable
            allowCustom
            value={profile.currentRole}
            onChange={(v) => set("currentRole", v)}
          />
          <Picker
            label="Curious about"
            title="Roles you are curious about"
            placeholder="Optional, up to 3"
            options={TARGET_ROLES}
            searchable
            allowCustom
            multiple
            max={3}
            value={profile.interestedRoles}
            onChange={(v) => set("interestedRoles", v)}
          />
          <Picker
            label="Free time"
            title="Free hours a week for the switch"
            options={hourOptions}
            value={String(profile.hoursPerWeek)}
            onChange={(v) => set("hoursPerWeek", Number(v))}
          />
          <Picker
            label="Learning budget"
            title="Monthly learning budget"
            options={budgetSteps(profile.currency).map((b) => ({ value: String(b), label: budgetLabel(b, profile.currency) }))}
            display={budgetText}
            value={String(profile.monthlyLearningBudget)}
            onChange={(v) => set("monthlyLearningBudget", Number(v))}
          />
          <Picker
            label="Currency"
            title="Currency"
            options={currencyOptions}
            value={profile.currency}
            onChange={(v) =>
              setProfile((p) => ({
                ...p,
                currency: v,
                monthlyLearningBudget: convertBudget(p.monthlyLearningBudget, p.currency, v),
              }))
            }
          />
          <Picker
            label="Country"
            title="Country"
            options={COUNTRIES}
            value={profile.country}
            onChange={(v) => setProfile((p) => withCountry(p, v))}
          />
          <Picker
            label="City"
            title="Your city, for local job openings"
            placeholder="Optional"
            options={citiesFor(profile.country)}
            searchable
            allowCustom
            value={profile.location}
            onChange={(v) => set("location", v)}
          />
          <Picker
            label="Why change"
            title="Why change?"
            placeholder="Optional, up to 3"
            options={motivationOptions}
            multiple
            max={3}
            value={profile.changeMotivation}
            onChange={(v) => set("changeMotivation", v)}
          />
        </div>

        <PanelBody className="pace">
          <span className="setting__label" id="pace-label">
            Pace
          </span>
          <div
            className="segmented"
            role="radiogroup"
            aria-labelledby="pace-label"
            style={{ "--count": tracks.length || 3, "--index": trackIndex } as React.CSSProperties}
          >
            <span className="segmented__thumb" aria-hidden="true" />
            {tracks.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={t.id === profile.transitionPreference}
                className="segmented__opt"
                onClick={() => set("transitionPreference", t.id as Track)}
              >
                {t.label.replace(/ Track$/, "")}
              </button>
            ))}
          </div>
          {track && (
            <p key={track.id} className="pace__note muted small">
              {track.summary}
            </p>
          )}
        </PanelBody>
      </Panel>

      <div className="submit-bar">
        <p className="submit-bar__summary small">
          <span>{profile.hoursPerWeek} h a week</span>
          <span>{profile.monthlyLearningBudget === 0 ? "Free only" : `${profile.monthlyLearningBudget.toLocaleString("en-US")} ${profile.currency}`}</span>
          {track && <span>{track.label.replace(/ Track$/, "")} pace</span>}
        </p>
        <button type="submit" className="btn btn--primary btn--cta">
          <span>Find my 3 paths</span>
          <span className="btn--cta__arrow" aria-hidden="true">
            <ArrowRightIcon />
          </span>
        </button>
        <p className="submit-bar__note muted small">Takes about 15–30 seconds.</p>
      </div>

    </form>
  );
}
