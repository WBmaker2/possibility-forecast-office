"use client";

import type { ForecastActivity, ResultBatch, ResultStream } from "../content/schema";
import { reduceFraction, relationToHalf } from "../domain/fractions";
import type { Fraction, SourceKind, WordForecast } from "../domain/types";
import { wordLabels } from "./session";

export function SourceBadge({ kind }: { kind: SourceKind }) {
  return <span className={`source-badge ${kind}`}>{kind === "known-model" ? "장치에서 계산" : "자료에서 관찰"}</span>;
}

export function FractionView({ fraction, label }: { fraction: Fraction; label?: string }) {
  const reduced = reduceFraction(fraction);
  const reducedText = `${reduced.numerator}/${reduced.denominator}`;
  return <span className="fraction" aria-label={`${label ? `${label}: ` : ""}${fraction.denominator}분의 ${fraction.numerator}`}>
    <strong>{fraction.numerator}</strong><span aria-hidden="true">/</span><strong>{fraction.denominator}</strong>
    {reducedText !== `${fraction.numerator}/${fraction.denominator}` && <small>= {reducedText}</small>}
  </span>;
}

export function NumberLine({ fraction, kind, label }: { fraction: Fraction; kind: "first" | "final" | "known"; label: string }) {
  const relation = relationToHalf(fraction);
  const position = fraction.numerator / fraction.denominator * 100;
  return <div className="number-line-wrap">
    <div className="number-line" aria-hidden="true">
      <span className="line-mark zero">0</span><span className="line-mark half">1/2</span><span className="line-mark one">1</span>
      <span className={`line-pointer ${kind}`} style={{ left: `${position}%` }} />
    </div>
    <p className="number-line-text">{label}: <FractionView fraction={fraction} /> · {relation === "below" ? "0과 1/2 사이" : relation === "equal" ? "1/2에 있음" : "1/2와 1 사이"}</p>
  </div>;
}

function OutcomeCell({ result, activity }: { result: string; activity: ForecastActivity }) {
  const label = activity.outcomes.find((outcome) => outcome.id === result)?.label ?? result;
  return <span className="outcome-cell" data-outcome={result}>{label}</span>;
}

export function ResultBoard({ activity, stream, batch, heading }: { activity: ForecastActivity; stream: ResultStream; batch: ResultBatch; heading: string }) {
  return <section className="result-board" aria-label={`${stream.label} ${heading}`}>
    <h3>{heading} · {stream.label}</h3>
    <div className="outcome-grid">
      {batch.results.map((result, index) => <OutcomeCell key={`${batch.id}-${index}`} result={result} activity={activity} />)}
    </div>
    <details className="result-details"><summary>자료를 표로 보기</summary><table className="compact-table"><caption>{heading} 결과 표</caption><tbody>
      {activity.outcomes.map((outcome) => <tr key={outcome.id}><th scope="row">{outcome.label}</th><td>{batch.results.filter((result) => result === outcome.id).length}번</td></tr>)}
      <tr><th scope="row">전체</th><td>{batch.totalTrials}번</td></tr>
    </tbody></table></details>
  </section>;
}

export function ForecastChoices({ kind, value, onChange }: { kind: SourceKind; value?: WordForecast; onChange: (forecast: WordForecast) => void }) {
  const choices: WordForecast[] = kind === "known-model"
    ? ["impossible", "less-likely", "even", "more-likely", "certain"]
    : ["observed-none", "less-likely", "even", "more-likely", "observed-all"];
  return <fieldset className="choice-set" data-error-target="forecast" tabIndex={-1}><legend>말 예보를 하나 고르세요</legend>
    <div className="choice-grid">{choices.map((choice) => <label className="choice-card" key={choice}><input type="radio" data-testid={`forecast-${choice}`} name="forecast" value={choice} checked={value === choice} onChange={() => onChange(choice)} /><span>{wordLabels[choice]}</span></label>)}</div>
    {kind === "observed-only" && <p className="hint">관찰 자료의 0/n, n/n은 ‘불가능’, ‘반드시’가 아니에요.</p>}
  </fieldset>;
}

export function DecisionChoices({ activity, value, onChange }: { activity: ForecastActivity; value?: string; onChange: (choice: string) => void }) {
  const labelFor = (option: string) => {
    if (option === "need-more-data") return "같음 · 자료 더 보기";
    if (option === "even") return "반반";
    return activity.streams.find((stream) => stream.id === option)?.label ?? option;
  };
  return <fieldset className="choice-set" data-error-target="decision" tabIndex={-1}><legend>현재 자료로 임시 선택을 하나 고르세요</legend>
    <p className="rule-text">이번 미션의 판단 규칙: {activity.publicDecisionRule.text}</p>
    <div className="choice-grid">{activity.publicDecisionRule.options.map((option) => <label className="choice-card" key={option}><input type="radio" data-testid={`decision-${option}`} name="decision" value={option} checked={value === option} onChange={() => onChange(option)} /><span>{labelFor(option)}</span></label>)}</div>
  </fieldset>;
}

export function ActivityCondition({ activity }: { activity: ForecastActivity }) {
  const primary = activity.streams.find((stream) => stream.id === activity.primaryStreamId)!;
  const labelForOutcome = (id: string) => activity.outcomes.find((outcome) => outcome.id === id)?.label ?? id;
  return <section className="panel condition-panel"><SourceBadge kind={activity.sourceKind} /><h2>실험 조건을 먼저 확인해요</h2>
    <dl className="condition-list"><div><dt>목표 사건</dt><dd>{primary.label}가 나타남</dd></div><div><dt>결과 종류</dt><dd>{activity.outcomes.map(({ label }) => label).join(", ")}</dd></div><div><dt>조건</dt><dd>{activity.knownModel?.replacementRule ?? "장치 안은 알 수 없고 결과 기록만 있어요."}</dd></div></dl>
    {activity.knownModel && <div className="model-note"><strong>알려진 구조</strong><p>같은 가능성의 칸: {activity.knownModel.outcomes.map(labelForOutcome).join(" · ")}</p></div>}
  </section>;
}
