import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Profile, Track } from "../api/types";
import { useConfig } from "../api/hooks";
import { Button } from "../components/ui/Button";
import { OptionList, Picker } from "../components/ui/Picker";
import { Panel, PanelBody, PanelHeader } from "../components/ui/Panel";
import { ArrowRightIcon, ChevronDownIcon, FileIcon, UploadIcon } from "../components/Icons";
import { readCvFile } from "../lib/pdf";
import { BUDGETS, CITIES, COUNTRIES, CURRENCIES, CURRENT_ROLES, HOURS, MOTIVATIONS, TARGET_ROLES } from "../lib/options";
import { memory, updateJourney, useJourney } from "../state/journey";

type Source = { kind: "file" | "sample" | "paste"; name: string } | null;

const hourOptions = HOURS.map((h) => ({ value: String(h), label: `${h} hours a week` }));
const currencyOptions = CURRENCIES.map((c) => ({ value: c, label: c }));
const motivationOptions = MOTIVATIONS.map((m) => ({ value: m, label: m }));

export function StartPage() {
  const navigate = useNavigate();
  const config = useConfig();
  const journey = useJourney();
  const [resume, setResume] = useState(memory.resumeText);
  const [source, setSource] = useState<Source>(memory.resumeText ? { kind: "paste", name: "Your CV text" } : null);
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
    setResume(text.slice(0, maxResume));
    setSource(next);
    setNeedCv(false);
  };

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
    updateJourney((j) => ({ ...j, profile }));
    navigate("/paths", { state: { run: true, sample: false } });
  };

  const tracks = config.data?.tracks ?? [];
  const trackIndex = Math.max(0, tracks.findIndex((t) => t.id === profile.transitionPreference));
  const track = tracks[trackIndex];
  const budgetText = profile.monthlyLearningBudget === 0 ? "Free resources only" : `${profile.monthlyLearningBudget} ${profile.currency} a month`;

  return (
    <form className="start" onSubmit={submit} noValidate>
      <header className="page-head">
        <h1>Tell Bridge where you are now</h1>
        <p className="lead">Two minutes. Your CV is read on this device and sent only to the AI that suggests paths.</p>
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
          <PanelHeader title="Your CV" />
          <PanelBody className="stack">
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />

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
                  {reading ? "Reading your CV…" : "Upload CV"}
                </Button>
                <p className="muted small">PDF or .txt, or drop it here.</p>
              </div>
            ) : null}

            {fileError && <p className="text-danger small">{fileError}</p>}
            {needCv && (
              <p className="text-danger small" role="alert">
                Add your CV first: upload it, paste it, or try a sample.
              </p>
            )}

            {source?.kind === "paste" || (source && showText) ? (
              <div className="cv-text">
                <label className="sr-only" htmlFor="cv-text">
                  CV text
                </label>
                <textarea
                  id="cv-text"
                  className="ui-field ui-field--textarea"
                  value={resume}
                  rows={8}
                  maxLength={maxResume}
                  autoFocus={source?.kind === "paste" && !resume}
                  placeholder="Paste your CV, or describe your jobs, what you did in them and the results."
                  onChange={(e) => applyText(e.target.value, source?.kind === "paste" || !source ? { kind: "paste", name: "Your CV text" } : source)}
                />
                <p className="field__hint tabular">
                  {tooShort ? `At least ${minResume} characters, so the AI has something real to quote.` : `${words} words. Edit anything that came out wrong.`}
                </p>
              </div>
            ) : null}

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
                <button type="button" className="link-btn" onClick={() => setSource({ kind: "paste", name: "Your CV text" })}>
                  Paste text instead
                </button>
              )}
              {source?.kind === "paste" && !resume && (
                <button type="button" className="link-btn" onClick={() => setSource(null)}>
                  Upload a file instead
                </button>
              )}
              <button ref={sampleLink} type="button" className="link-btn" aria-expanded={samples} onClick={() => setSamples((v) => !v)}>
                Try a sample CV
              </button>
            </div>
            {samples && config.data && (
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
            options={BUDGETS.map((b) => ({ value: String(b), label: b === 0 ? "Free resources only" : `${b} ${profile.currency} a month` }))}
            display={budgetText}
            value={String(profile.monthlyLearningBudget)}
            onChange={(v) => set("monthlyLearningBudget", Number(v))}
          />
          <Picker label="Currency" title="Currency" options={currencyOptions} value={profile.currency} onChange={(v) => set("currency", v)} />
          <Picker
            label="City"
            title="Your city, for local job openings"
            placeholder="Optional"
            options={CITIES}
            searchable
            allowCustom
            value={profile.location}
            onChange={(v) => set("location", v)}
          />
          <Picker label="Country" title="Country" options={COUNTRIES} value={profile.country} onChange={(v) => set("country", v)} />
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
          <span>{profile.monthlyLearningBudget === 0 ? "Free only" : `${profile.monthlyLearningBudget} ${profile.currency}`}</span>
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
