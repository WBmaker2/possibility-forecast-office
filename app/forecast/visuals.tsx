"use client";

import type { ForecastActivity, ResultBatch, ResultStream } from "../content/schema";
import { reduceFraction, relationToHalf } from "../domain/fractions";
import { calculateKnownModelProbability } from "../domain/known-model";
import type { Fraction, SourceKind, WordForecast } from "../domain/types";
import { withSubjectParticle } from "./korean";
import { decisionLabel, wordLabels } from "./session";

export function SourceBadge({ kind }: { kind: SourceKind }) {
  return <span className={`source-badge ${kind}`}>{kind === "known-model" ? "신호판의 칸으로 계산" : "실제로 나온 결과로 계산"}</span>;
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

export function ResultBoard({ activity, stream, batch, heading, displayLabel }: { activity: ForecastActivity; stream: ResultStream; batch: ResultBatch; heading: string; displayLabel?: string }) {
  const label = displayLabel ?? stream.label;
  return <section className="result-board" aria-label={`${label} ${heading}`}>
    <h3>{heading} · {label}</h3>
    <div className="outcome-grid">
      {batch.results.map((result, index) => <OutcomeCell key={`${batch.id}-${index}`} result={result} activity={activity} />)}
    </div>
    <details className="result-details"><summary>자료를 표로 보기</summary><table className="compact-table"><caption>{heading} 결과 표</caption><tbody>
      {activity.outcomes.map((outcome) => <tr key={outcome.id}><th scope="row">{outcome.label}</th><td>{batch.results.filter((result) => result === outcome.id).length}번</td></tr>)}
      <tr><th scope="row">전체</th><td>{batch.totalTrials}번</td></tr>
    </tbody></table></details>
  </section>;
}

export function ResultBoards({ activity, batchIndex, heading }: { activity: ForecastActivity; batchIndex: 0 | 1; heading: string }) {
  const groups = new Map<string, ResultStream[]>();
  activity.streams.forEach((stream) => {
    const batch = stream.batches[batchIndex];
    const key = JSON.stringify([batch.totalTrials, batch.results]);
    groups.set(key, [...(groups.get(key) ?? []), stream]);
  });
  return <div className="stream-list">{[...groups.values()].map((streams) => {
    const stream = streams[0];
    return <ResultBoard key={`${stream.id}-${batchIndex}`} activity={activity} stream={stream} batch={stream.batches[batchIndex]} heading={heading} displayLabel={streams.length > 1 ? "함께 세는 결과" : undefined} />;
  })}</div>;
}

export function ForecastChoices({ kind, value, onChange }: { kind: SourceKind; value?: WordForecast; onChange: (forecast: WordForecast) => void }) {
  const choices: WordForecast[] = kind === "known-model"
    ? ["impossible", "less-likely", "even", "more-likely", "certain"]
    : ["observed-none", "less-likely", "even", "more-likely", "observed-all"];
  return <fieldset className="choice-set" data-error-target="forecast" tabIndex={-1}><legend>가능성 말을 하나 고르세요</legend>
    <div className="choice-grid">{choices.map((choice) => <label className="choice-card" key={choice}><input type="radio" data-testid={`forecast-${choice}`} name="forecast" value={choice} checked={value === choice} onChange={() => onChange(choice)} /><span>{wordLabels[choice]}</span></label>)}</div>
    {kind === "observed-only" && <p className="hint">실제로 나온 결과가 0번이나 모두 나온 경우도 ‘불가능’, ‘반드시’는 아니에요.</p>}
  </fieldset>;
}

function plainFraction(fraction: Fraction) {
  return `${fraction.numerator}/${fraction.denominator}`;
}

function DecisionDataSummary({ activity, batchCount }: { activity: ForecastActivity; batchCount: 1 | 2 }) {
  const modelBased = activity.publicDecisionRule.kind === "higher-known-model" || activity.publicDecisionRule.kind === "known-model-next-trial";
  const optionStreams = activity.streams.filter((stream) => activity.publicDecisionRule.options.includes(stream.id));
  const streams = activity.publicDecisionRule.kind === "known-model-next-trial"
    ? activity.streams
    : optionStreams.length > 0
      ? optionStreams
      : activity.streams.filter((stream) => stream.id === activity.primaryStreamId);
  const values = streams.map((stream) => {
    if (modelBased && activity.knownModel) {
      return {
        label: `신호판의 ${stream.label} 칸 비율`,
        fraction: calculateKnownModelProbability({
          outcomes: activity.knownModel.outcomes,
          targetOutcomes: activity.knownModel.eventOutcomesByStream[stream.id],
          equallyLikely: activity.knownModel.equallyLikely,
        }),
      };
    }
    return { label: stream.label, fraction: activity.checkpoints[batchCount - 1].expectedCounts[stream.id] };
  });
  const singleObserved = !modelBased && values.length === 1;
  return <aside className="decision-data-summary" aria-label="선택에 쓸 자료">
    <strong>{modelBased ? "신호판의 칸을 바로 비교해요" : batchCount === 1 ? "첫 자료를 바로 비교해요" : "모두 합친 자료를 바로 비교해요"}</strong>
    <ul>{values.map(({ label, fraction }) => <li key={label}>{singleObserved ? `${batchCount === 1 ? "첫 자료의" : "모두 합친 자료의"} ${label} 비율` : label} {plainFraction(fraction)}</li>)}</ul>
  </aside>;
}

export function DecisionChoices({ activity, batchCount, value, onChange }: { activity: ForecastActivity; batchCount: 1 | 2; value?: string; onChange: (choice: string) => void }) {
  return <fieldset className="choice-set" data-error-target="decision" tabIndex={-1}><legend>지금 자료를 보고 하나 골라요</legend>
    <DecisionDataSummary activity={activity} batchCount={batchCount} />
    <p className="rule-text">고르는 기준: {activity.publicDecisionRule.text}</p>
    <div className="choice-grid">{activity.publicDecisionRule.options.map((option) => <label className="choice-card" key={option}><input type="radio" data-testid={`decision-${option}`} name="decision" value={option} checked={value === option} onChange={() => onChange(option)} /><span>{decisionLabel(activity, option) ?? option}</span></label>)}</div>
  </fieldset>;
}

export function KnownModelComparison({ observed, known, batchCount }: { observed: Fraction; known: Fraction; batchCount: 1 | 2 }) {
  return <aside className="source-comparison" aria-label="실제 결과와 신호판 비교">
    <p><strong>{batchCount === 1 ? "이번에 나온 결과" : "모두 합친 실제 결과"}</strong> <span>{plainFraction(observed)}</span></p>
    <p><strong>{batchCount === 1 ? "예보에 쓸 신호판의 칸" : "신호판의 칸은 그대로예요: 예보에 쓸 값"}</strong> <span>{plainFraction(known)}</span></p>
    <small>이번에 나온 횟수와 신호판의 칸은 다를 수 있어요. 다음 한 번을 예보할 때는 바뀌지 않는 신호판의 칸을 봐요.</small>
  </aside>;
}

export function ActivityCondition({ activity }: { activity: ForecastActivity }) {
  const primary = activity.streams.find((stream) => stream.id === activity.primaryStreamId)!;
  const labelForOutcome = (id: string) => activity.outcomes.find((outcome) => outcome.id === id)?.label ?? id;
  return <section className="panel condition-panel"><SourceBadge kind={activity.sourceKind} /><h2>무엇을 찾을지 먼저 확인해요</h2>
    <dl className="condition-list"><div><dt>찾을 결과</dt><dd>{withSubjectParticle(primary.label)} 나타남</dd></div><div><dt>결과 그림</dt><dd>{activity.outcomes.map(({ label }) => label).join(", ")}</dd></div><div><dt>확인 방법</dt><dd>{activity.knownModel?.replacementRule ?? "안쪽은 알 수 없고, 실제로 나온 결과만 봐요."}</dd></div></dl>
    {activity.knownModel && <div className="model-note"><strong>신호판의 칸</strong><p>각 칸은 뽑힐 기회가 같아요: {activity.knownModel.outcomes.map(labelForOutcome).join(" · ")}</p></div>}
  </section>;
}
