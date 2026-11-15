import { useState } from "react";
import type { Roadmap } from "../api/types";
import { weekStatus } from "../lib/progress";
import {
  DAY_SHORT,
  TIMES,
  addDays,
  buddyMessage,
  dateLabel,
  ifThen,
  isoDate,
  nextMonday,
  sessionMinutes,
  sessions,
  timeLabel,
  toIcs,
  type StudySchedule,
} from "../lib/schedule";
import { updateJourney, useJourney } from "../state/journey";
import { CalendarIcon, CheckIcon, PeopleIcon } from "./Icons";
import { Button } from "./ui/Button";
import { Choices, MultiChoices } from "./ui/Choices";
import { Panel, PanelBody, PanelHeader } from "./ui/Panel";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Why({ children, href, cite }: { children: string; href: string; cite: string }) {
  return (
    <p className="fine">
      Why: {children} (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {cite}
      </a>
      ).
    </p>
  );
}

/** Three small, research-backed habits that help people finish a plan: an
 * if-then study slot in their calendar, one person who asks how it is going,
 * and progress they can see getting close. */
export function MakeItStick({ plan }: { plan: Roadmap }) {
  const saved = useJourney().schedule;
  const today = isoDate(new Date());
  const monday = nextMonday(new Date());
  const [copied, setCopied] = useState(false);
  const schedule: StudySchedule = saved ?? { days: [2, 4], time: "19:00", start: monday };
  const save = (patch: Partial<StudySchedule>) => updateJourney((j) => ({ ...j, schedule: { ...schedule, ...patch } }));

  const dayNames = schedule.days.map((d) => DAY_SHORT[d]);
  const list = sessions(plan, schedule);
  const minutes = sessionMinutes(plan.hoursPerWeek, schedule.days.length);
  const checkIn = dateLabel(addDays(schedule.start, 14));
  const message = buddyMessage(plan, schedule, checkIn);

  const current = plan.weeks.find((w) => weekStatus(w) !== "completed") ?? plan.weeks.at(-1);
  const weekDone = current?.tasks.filter((t) => t.completed).length ?? 0;
  const weekTotal = current?.tasks.length ?? 0;
  const left = weekTotal - weekDone;

  const download = () => {
    const ics = toIcs(plan, list, `${window.location.origin}/plan`);
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bridge-study-plan.ics";
    a.click();
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Panel className="stick">
      <PanelHeader title="Make it stick" note="Three habits that help people finish" />
      <PanelBody className="stack-lg">
        <section className="stick__step stack" aria-labelledby="stick-when">
          <h3 id="stick-when" className="stick__title">
            <CalendarIcon /> Pick when you'll study
          </h3>
          <MultiChoices
            label="Days"
            options={WEEKDAYS}
            value={WEEKDAYS.filter((d) => dayNames.includes(d))}
            max={7}
            onChange={(v) => save({ days: v.map((d) => DAY_SHORT.indexOf(d)) })}
          />
          <Choices
            label="Time"
            options={TIMES.map((t) => ({ value: t, label: timeLabel(t) }))}
            value={schedule.time}
            onChange={(time) => save({ time })}
          />
          <Choices
            label="Start"
            options={[
              ...(today === monday ? [] : [{ value: today, label: "Today" }]),
              { value: monday, label: `${dateLabel(monday)} · a fresh start` },
            ]}
            value={schedule.start === today || schedule.start === monday ? schedule.start : monday}
            onChange={(start) => save({ start })}
          />
          {schedule.days.length > 0 ? (
            <>
              <blockquote className="stick__plan">{ifThen(schedule)}</blockquote>
              <p className="muted small tabular">
                {list.length} sessions of {minutes} min over 4 weeks, each named after that week's next task.
              </p>
              <div>
                <Button onClick={download}>Add to my calendar (.ics)</Button>
              </div>
            </>
          ) : (
            <p className="muted small">Pick at least one day.</p>
          )}
          <Why
            href="https://doi.org/10.1016/S0065-2601(06)38002-1"
            cite="Gollwitzer & Sheeran, 2006: 94 studies"
          >
            people who decide in advance when and where they will act reach their goals more often than people who only
            intend to
          </Why>
        </section>

        <section className="stick__step stack" aria-labelledby="stick-who">
          <h3 id="stick-who" className="stick__title">
            <PeopleIcon /> Tell one person
          </h3>
          <p className="stick__message">{message}</p>
          <div className="row">
            <Button onClick={copy}>{copied ? "Copied" : "Copy this message"}</Button>
            {copied && (
              <span className="muted small" role="status">
                Paste it to a friend, partner or colleague.
              </span>
            )}
          </div>
          <Why href="https://doi.org/10.1037/bul0000025" cite="Harkin et al., 2016: 138 studies">
            tracking progress helps people reach goals, and it helps more when the progress is written down or shared
            with someone
          </Why>
        </section>

        {current && (
          <section className="stick__step stack" aria-labelledby="stick-close">
            <h3 id="stick-close" className="stick__title">
              <CheckIcon /> Watch the finish get closer
            </h3>
            <p>
              <strong className="tabular">
                {left === 0 ? "Week done." : `${left} task${left === 1 ? "" : "s"} to go in week ${current.week}.`}
              </strong>{" "}
              <span className="muted">
                {weekDone} of {weekTotal} done this week.
              </span>
            </p>
            <div
              className="stick__meter"
              role="progressbar"
              aria-label={`Week ${current.week} progress`}
              aria-valuemin={0}
              aria-valuemax={weekTotal}
              aria-valuenow={weekDone}
            >
              <span style={{ width: `${weekTotal ? (weekDone / weekTotal) * 100 : 0}%` }} />
            </div>
            <Why href="https://doi.org/10.1509/jmkr.43.1.39" cite="Kivetz, Urminsky & Zheng, 2006">
              people speed up as a goal gets close, so the plan counts down one week at a time instead of 30 days at
              once
            </Why>
          </section>
        )}
      </PanelBody>
    </Panel>
  );
}
