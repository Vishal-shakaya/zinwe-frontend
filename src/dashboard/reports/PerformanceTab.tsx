import { useCallback, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { TeamReport } from "../../lib/api";
import { getPerformanceInputs, rankPerformance, type PerformanceRow } from "../fixtures/performance";
import { clockOf } from "../features/reportFormat";
import { useShell } from "../shell/shellContext";
import { ErrorBlock, Sk } from "../ui/States";
import { TipBody } from "../ui/Tooltip";
import type { Tip } from "../ui/useTip";
import { useResource } from "../useResource";
import { midRange, rangeText } from "./dates";

const GRID = [0, 50, 100];

function steps(x: PerformanceRow): string[] {
  const out: string[] = [];
  const undone = x.assigned - x.done;
  const overdue = undone ? Math.max(1, Math.round(undone * 0.35)) : 0;
  if (overdue > 0) out.push(`Check in on ${overdue} overdue task${overdue === 1 ? "" : "s"} and ask if anything is in the way`);
  if (x.usualStart !== null && x.usualStart > 600)
    out.push(`Ask if a different start time would suit ${x.first} better (usually starts ${clockOf(x.usualStart)})`);
  if (x.wp < 0.85) out.push(`Ask if a set schedule would help (${Math.round(x.wp * 100)}% of usual time)`);
  return out;
}

/**
 * Performance (owner only, FR-34 — sample task numbers, see fixtures/performance.ts): everyone who worked in the
 * period, scored and ranked high to low. Pick a name for what is behind a score and what might help.
 */
export function PerformanceTab({
  report,
  pending,
  error,
  onRetry,
  selected,
  onSelect,
  tip,
}: {
  /** The team report for the period (always everyone). */
  report: TeamReport | undefined;
  pending: boolean;
  error: unknown;
  onRetry: () => void;
  /** Picked member id; "none" = closed even when a person is picked above. */
  selected: number | null;
  onSelect: (memberId: number | null) => void;
  tip: Tip;
}): ReactElement {
  const { members } = useShell();
  const loadInputs = useCallback((signal: AbortSignal) => getPerformanceInputs(signal, members), [members]);
  const inputs = useResource(loadInputs);
  const [hover, setHover] = useState<number | null>(null);

  const head = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <h2 id="perf-h" style={{ margin: 0, fontSize: 17 }}>
          Performance
        </h2>
        <span className="rp-k" style={{ fontSize: 13 }}>
          Score and rank first; the table under the chart shows the two things each score is worked out from.
        </span>
      </div>
      <span className="rp-pill" style={{ background: "#F5F5F5", color: "#404040" }}>
        Only you see this
      </span>
    </div>
  );
  const staffNote = (
    <p style={{ margin: 0, fontSize: 13, color: "#141210", background: "#FAFAFA", border: "1px solid #F5F5F5", borderRadius: 10, padding: "8px 12px" }}>
      Staff never see scores or ranks. They see their own hours and tasks.
    </p>
  );

  if (!report || !inputs.data) {
    const err = error ?? inputs.error;
    return (
      <section className="z-card" aria-labelledby="perf-h" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {head}
        {err && !pending && !inputs.pending ? (
          <ErrorBlock message="The scores couldn't be worked out just now." onRetry={() => (error ? onRetry() : inputs.reload())} />
        ) : (
          <div role="status" aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="z-sr">Working out the scores…</span>
            <Sk h={180} style={{ borderRadius: 12 }} />
            <Sk h={14} w="60%" />
            <Sk h={14} w="45%" />
          </div>
        )}
        {staffNote}
      </section>
    );
  }

  const rows = rankPerformance(report.people, inputs.data);
  const period = midRange(report.from, report.to);
  const selIx = rows.findIndex((x) => x.memberId === selected);
  const sel = selIx >= 0 ? rows[selIx] : null;
  const hov = hover !== null && hover < rows.length ? hover : null;

  const tipRows = (x: PerformanceRow, k: number) => [
    { label: "Tasks done · 50%", value: `${x.done} of ${x.assigned}` },
    { label: "Worked time · 50%", value: `${Math.round(x.wp * 100)}% of usual` },
    { label: "Score", value: `${x.score} / 100` },
    { label: "Rank", value: `#${k + 1} of ${rows.length}` },
  ];
  const pick = (x: PerformanceRow) => onSelect(x.memberId === selected ? null : x.memberId);
  const rowAria = (x: PerformanceRow, k: number) =>
    `${x.name}: tasks done ${x.done} of ${x.assigned}, worked ${Math.round(x.wp * 100)}% of usual time. Score ${x.score}, rank ${k + 1}.`;

  return (
    <section className="z-card" aria-labelledby="perf-h" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      {head}
      {rows.length > 0 ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Score and rank</h3>
            <span style={{ display: "flex", gap: 14, fontSize: 12, color: "#404040" }}>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#F26A0A" }} />
                Top
              </span>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FDEBDC", boxShadow: "inset 0 0 0 1px #A84505" }} />
                Under 50
              </span>
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "30px minmax(0, 1fr)", columnGap: 10, marginTop: 18 }}>
            <div style={{ position: "relative", height: 180 }} aria-hidden="true">
              {GRID.map((g) => (
                <span key={g} className="rp-axl" style={{ bottom: `${g}%` }}>
                  {g}
                </span>
              ))}
            </div>
            <div style={{ position: "relative", height: 180 }}>
              {GRID.map((g) => (
                <span key={g} style={{ position: "absolute", left: 0, right: 0, bottom: `${g}%`, height: 1, background: g === 0 ? "#D4D4D4" : "#F5F5F5" }} />
              ))}
              <div
                role="group"
                aria-label="Score and rank, by person"
                style={{ position: "absolute", inset: 0, display: "flex" }}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && hover !== null) {
                    e.stopPropagation();
                    setHover(null);
                    tip.hide();
                  }
                }}
              >
                {rows.map((x, k) => {
                  const top = k === 0;
                  const low = x.score < 50;
                  const on = x.memberId === selected;
                  const bg = top ? "#F26A0A" : low ? "#FDEBDC" : "#141210";
                  const fg = top ? "#141210" : low ? "#A84505" : "#fff";
                  const dimmed = hov !== null ? hov !== k : sel !== null && !on;
                  const show = (el: HTMLElement) => {
                    setHover(k);
                    const dot = el.querySelector<HTMLElement>("[data-tip-at]") ?? el;
                    tip.showAt(
                      `perf-${k}`,
                      <TipBody title={x.name} color={low ? "#A84505" : bg} sub={period} rows={tipRows(x, k)} hint="Click to see what is behind this score" />,
                      dot.getBoundingClientRect(),
                    );
                  };
                  const hide = () => {
                    setHover(null);
                    tip.hide();
                  };
                  return (
                    <div key={x.memberId} style={{ flex: 1, minWidth: 0, position: "relative", height: "100%" }}>
                      <button
                        type="button"
                        className={`rp-pcol${on ? " on" : ""}`}
                        style={{ width: "100%" }}
                        aria-pressed={on}
                        aria-label={`${x.name}, ${rangeText(report.from, report.to)}. ${tipRows(x, k)
                          .map((r) => `${r.label}: ${r.value}`)
                          .join(". ")}. Click to see what is behind this score.`}
                        onMouseEnter={(e) => show(e.currentTarget)}
                        onFocus={(e) => show(e.currentTarget)}
                        onMouseLeave={hide}
                        onBlur={hide}
                        onClick={() => pick(x)}
                      >
                        <span
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: "50%",
                            width: 2,
                            marginLeft: -1,
                            height: `${x.score}%`,
                            background: low ? "#A84505" : bg,
                            opacity: dimmed ? 0.2 : 0.55,
                          }}
                        />
                        <b
                          className="rp-num"
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: `calc(${x.score}% + 15px)`,
                            textAlign: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            color: low ? "#A84505" : "#141210",
                            opacity: dimmed ? 0.35 : 1,
                          }}
                        >
                          {x.score}
                        </b>
                        <span
                          data-tip-at
                          style={{
                            position: "absolute",
                            left: "50%",
                            bottom: `${x.score}%`,
                            width: 24,
                            height: 24,
                            margin: "0 0 -12px -12px",
                            borderRadius: "50%",
                            background: bg,
                            color: fg,
                            fontSize: 11,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: `0 0 0 2px #fff${low ? ", inset 0 0 0 1px #A84505" : ""}`,
                            opacity: dimmed ? 0.35 : 1,
                            transition: "opacity .15s",
                          }}
                        >
                          {k + 1}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <span />
            <div style={{ display: "flex", paddingTop: 8 }} aria-hidden="true">
              {rows.map((x) => (
                <span key={x.memberId} className={`rp-pname${x.memberId === selected ? " on" : ""}`}>
                  {x.first}
                </span>
              ))}
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#6B6B6B" }}>Score = tasks done 50% · worked time 50%. Pick a name to see what is behind a score.</p>

          <ul className="rp-cards rp-ph-only" aria-label="Score and rank, by person" style={{ padding: 0 }}>
            {rows.map((x, k) => (
              <li key={x.memberId} className={`rp-pcard${x.memberId === selected ? " hl" : ""}`}>
                <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <button type="button" className="rp-lnk" style={{ fontSize: 15 }} aria-pressed={x.memberId === selected} aria-label={rowAria(x, k)} onClick={() => pick(x)}>
                    {x.name}
                  </button>
                  <span className="rp-num" style={{ color: "#404040", fontSize: 13 }}>
                    #{k + 1}
                  </span>
                </span>
                <dl>
                  <div>
                    <dt>Tasks done · 50%</dt>
                    <dd>
                      {x.done} of {x.assigned}
                    </dd>
                  </div>
                  <div>
                    <dt>Worked time · 50%</dt>
                    <dd>{Math.round(x.wp * 100)}% of usual</dd>
                  </div>
                  <div>
                    <dt>Score</dt>
                    <dd>{x.score} / 100</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <div className="rp-ph-hide" style={{ overflowX: "auto", margin: "0 -18px" }}>
            <table className="rp-tbl rp-ptbl">
              <thead>
                <tr>
                  <th scope="col">Person</th>
                  <th scope="col">
                    Tasks done<span className="rp-wt">50%</span>
                  </th>
                  <th scope="col">
                    Worked time<span className="rp-wt">50%</span>
                  </th>
                  <th scope="col">Score</th>
                  <th scope="col">Rank</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x, k) => (
                  <tr key={x.memberId} className={x.memberId === selected ? "hl" : undefined}>
                    <td>
                      <button type="button" className="rp-lnk" aria-pressed={x.memberId === selected} aria-label={rowAria(x, k)} onClick={() => pick(x)}>
                        {x.name}
                      </button>
                    </td>
                    <td className="rp-num">
                      {x.done} of {x.assigned}
                    </td>
                    <td className="rp-num">{Math.round(x.wp * 100)}% of usual</td>
                    <td className="rp-num">
                      <b>{x.score}</b> <span className="rp-k">/ 100</span>
                    </td>
                    <td className="rp-num" style={{ color: "#404040" }}>
                      #{k + 1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sel ? (
            <SelectedScore x={sel} rank={selIx + 1} period={rangeText(report.from, report.to)} onClose={() => onSelect(null)} />
          ) : (
            <p className="rp-k" style={{ margin: 0, fontSize: 13 }}>
              Pick a name in the table or the chart to see what is behind a score and what might help.
            </p>
          )}
        </>
      ) : null}
      {staffNote}
      {rows.length === 0 ? <p style={{ margin: 0, color: "#6B6B6B", fontSize: 13 }}>No one worked in this period.</p> : null}
    </section>
  );
}

function SelectedScore({ x, rank, period, onClose }: { x: PerformanceRow; rank: number; period: string; onClose: () => void }): ReactElement {
  const low = x.score < 60;
  const help = low ? steps(x).slice(0, 2) : [];
  return (
    <div style={{ border: "1px solid #F5F5F5", borderRadius: 12, padding: 14, display: "flex", flexWrap: "wrap", gap: "14px 28px", alignItems: "flex-start" }}>
      <div style={{ minWidth: 150 }}>
        <b>{x.name}</b>
        <br />
        <span className="rp-k">{period}</span>
      </div>
      <div>
        <b className="rp-num" style={{ fontSize: 18, letterSpacing: "-0.01em" }}>
          {x.done} of {x.assigned}
        </b>
        <br />
        <span className="rp-k">tasks done · 50%</span>
      </div>
      <div>
        <b className="rp-num" style={{ fontSize: 18, letterSpacing: "-0.01em" }}>
          {Math.round(x.wp * 100)}%
        </b>
        <br />
        <span className="rp-k">of usual time · 50%</span>
      </div>
      <div>
        <b className="rp-num" style={{ fontSize: 18, letterSpacing: "-0.01em" }}>
          {x.score} / 100
        </b>
        <br />
        <span className="rp-num rp-k">score · rank #{rank}</span>
      </div>
      {help.length > 0 ? (
        <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="rp-k" style={{ fontWeight: 600 }}>
            What might help
          </span>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {help.map((t) => (
              <li key={t} style={{ background: "#FAFAFA", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}>
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <span style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
        <Link className="z-btn sm" to={`/app/chat#m=${x.first.toLowerCase()}`}>
          {low ? `Check in with ${x.first}` : "Say thanks in Chat"}
        </Link>
        <button type="button" className="z-btn sm" aria-label="Close" onClick={onClose}>
          ✕
        </button>
      </span>
    </div>
  );
}
