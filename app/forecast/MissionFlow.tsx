"use client";

import type { ForecastActivity } from "../content/schema";
import type { Fraction } from "../domain/types";
import { Dialog } from "./Dialog";
import type { CountSelections, LearningStage, MissionAnswers } from "./session";
import { decisionLabel, expectedForecast, wordLabels } from "./session";
import { ActivityCondition, DecisionChoices, ForecastChoices, FractionView, NumberLine, ResultBoard, SourceBadge } from "./visuals";

type Props = {
  activity: ForecastActivity; stage: LearningStage; answers: MissionAnswers; headingRef: React.RefObject<HTMLHeadingElement | null>;
  firstCounts: Record<string, Fraction>; finalCounts: Record<string, Fraction>; knownFraction?: Fraction; firstSelections: CountSelections; cumulativeSelections: CountSelections; notice: string;
  onFirstSelections: (value: CountSelections) => void; onCumulativeSelections: (value: CountSelections) => void; onAnswers: (patch: Partial<MissionAnswers>) => void; onMove: (stage: LearningStage) => void;
  onCount: () => void; onCumulative: () => void; onForecast: (batchCount: 1 | 2) => void; onFirstDecision: () => void; onFinalDecision: () => void; onRequire: (value: unknown, stage: LearningStage, message: string) => void; onEvidence: () => void; onNext: () => void;
};

function fractionText(fraction: Fraction) { return `${fraction.numerator}/${fraction.denominator}`; }

export function MissionFlow(props: Props) {
  const { activity, stage, headingRef } = props;
  const primary = activity.streams.find((stream) => stream.id === activity.primaryStreamId)!;
  const first = props.firstCounts[primary.id];
  const final = props.finalCounts[primary.id];
  const displayFraction = activity.sourceKind === "known-model" ? props.knownFraction! : first;
  const finalDisplay = activity.sourceKind === "known-model" ? props.knownFraction! : final;
  if (stage === "condition") return <section><h1 className="step-heading" ref={headingRef} tabIndex={-1}>{activity.title}</h1><ActivityCondition activity={activity} /><button className="primary" data-testid="condition-confirm" onClick={() => props.onMove("first-count")}>조건을 확인했어요</button></section>;
  if (stage === "first-count") return <CountStep {...props} batchCount={1} selections={props.firstSelections} onSelections={props.onFirstSelections} onConfirm={props.onCount} />;
  if (stage === "first-forecast") return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>첫 자료로 예보해요</h1><SourceBadge kind={activity.sourceKind} /><p>{activity.sourceKind === "known-model" ? "장치 구조로 계산한 가능성" : "첫 자료에서 나타난 비율"}: <FractionView fraction={displayFraction} /></p>{activity.activityKind === "tutorial" && <p className="comparison-note">장치 계산 4/8 = 1/2와 첫 관찰 4/6 = 2/3은 출처가 달라요.</p>}<NumberLine fraction={displayFraction} kind="first" label="첫 예보 근거" /><ForecastChoices kind={activity.sourceKind} value={props.answers.firstForecast} onChange={(firstForecast) => props.onAnswers({ firstForecast })} /><button className="primary" data-testid="first-forecast-confirm" onClick={() => props.onForecast(1)}>첫 예보 정하기</button></section>;
  if (stage === "provisional-decision") return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>첫 자료로 임시 선택해요</h1><DecisionChoices activity={activity} value={props.answers.firstDecision} onChange={(firstDecision) => props.onAnswers({ firstDecision })} /><button className="primary" data-testid="first-decision-confirm" onClick={props.onFirstDecision}>임시 선택 확인</button></section>;
  if (stage === "reveal") return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>새 자료가 도착했어요</h1><p>새 자료만으로 정하면 될까요? 첫 자료와 함께 누적해서 살펴봐요.</p><div className="stream-list">{activity.streams.map((stream) => <ResultBoard key={stream.id} activity={activity} stream={stream} batch={stream.batches[1]} heading="새 자료" />)}</div><button className="primary" data-testid="reveal-next" onClick={() => props.onMove("cumulative")}>모두 합친 자료 세기</button></section>;
  if (stage === "cumulative") return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>모두 합친 자료를 세어 봐요</h1><p>새 자료만 쓰지 말고 첫 자료와 새 자료를 모두 합친 횟수를 고르세요.</p><CountPicker activity={activity} counts={props.finalCounts} selections={props.cumulativeSelections} onSelections={props.onCumulativeSelections} prefix="cumulative" /><button className="primary" data-testid="cumulative-count-confirm" onClick={props.onCumulative}>누적 횟수 확인</button></section>;
  if (stage === "revised-forecast") return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>누적 자료로 최종 예보해요</h1><SourceBadge kind={activity.sourceKind} /><p>{activity.sourceKind === "known-model" ? "장치 구조는 그대로예요." : "누적 자료에서 나타난 비율"}: <FractionView fraction={finalDisplay} /></p><NumberLine fraction={finalDisplay} kind="final" label="최종 예보 근거" /><ForecastChoices kind={activity.sourceKind} value={props.answers.finalForecast} onChange={(finalForecast) => props.onAnswers({ finalForecast })} /><button className="primary" data-testid="final-forecast-confirm" onClick={() => props.onForecast(2)}>최종 예보 정하기</button></section>;
  if (stage === "revised-decision") return <FinalDecision {...props} />;
  if (stage === "evidence") return <EvidenceStep {...props} />;
  return <BeforeAfter {...props} first={first} final={final} />;
}

function CountStep({ activity, headingRef, firstCounts, firstSelections, onFirstSelections, onCount }: Props & { batchCount: 1; selections: CountSelections; onSelections: (value: CountSelections) => void; onConfirm: () => void }) {
  return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>첫 자료를 세어 봐요</h1><p>결과 배열을 보고 모든 자료의 목표 사건 횟수와 전체 횟수를 고르세요.</p><div className="stream-list">{activity.streams.map((stream) => <ResultBoard key={stream.id} activity={activity} stream={stream} batch={stream.batches[0]} heading="첫 자료" />)}</div><CountPicker activity={activity} counts={firstCounts} selections={firstSelections} onSelections={onFirstSelections} prefix="first" /><button className="primary" data-testid="first-count-confirm" onClick={onCount}>횟수 확인</button></section>;
}

function CountPicker({ activity, counts, selections, onSelections, prefix }: { activity: ForecastActivity; counts: Record<string, Fraction>; selections: CountSelections; onSelections: (value: CountSelections) => void; prefix: string }) {
  const choose = (id: string, field: "numerator" | "denominator", value: number) => onSelections({ ...selections, [id]: { ...selections[id], [field]: `${value}` } });
  return <div className="count-picker" data-error-target="count" tabIndex={-1}>{activity.streams.map((stream) => { const correct = counts[stream.id]; const choice = selections[stream.id] ?? {}; return <fieldset key={stream.id}><legend>{stream.label}: 목표 사건과 전체 횟수</legend><div className="number-options">{Array.from({ length: correct.denominator + 1 }, (_, value) => <label key={`n-${value}`}><input type="radio" data-testid={`${prefix}-${stream.id}-numerator-${value}`} name={`${prefix}-${stream.id}-n`} checked={choice.numerator === `${value}`} onChange={() => choose(stream.id, "numerator", value)} />목표 {value}</label>)}</div><div className="number-options">{Array.from({ length: correct.denominator }, (_, index) => index + 1).map((value) => <label key={`d-${value}`}><input type="radio" data-testid={`${prefix}-${stream.id}-denominator-${value}`} name={`${prefix}-${stream.id}-d`} checked={choice.denominator === `${value}`} onChange={() => choose(stream.id, "denominator", value)} />전체 {value}</label>)}</div></fieldset>; })}</div>;
}

function FinalDecision({ activity, headingRef, answers, onAnswers, onFinalDecision }: Props) {
  return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>최종 선택과 예보 변화를 정해요</h1><DecisionChoices activity={activity} value={answers.finalDecision} onChange={(finalDecision) => onAnswers({ finalDecision })} /><fieldset className="choice-set" data-error-target="revision" tabIndex={-1}><legend>새 자료 뒤 내 예보는?</legend><div className="choice-grid">{(["keep", "change", "need-more-data"] as const).map((revision) => <label className="choice-card" key={revision}><input type="radio" data-testid={`revision-${revision}`} name="revision" checked={answers.revision === revision} onChange={() => onAnswers({ revision })} /><span>{revision === "keep" ? "예보 유지" : revision === "change" ? "예보 수정" : "아직 더 자료가 필요"}</span></label>)}</div></fieldset><button className="primary" data-testid="final-decision-confirm" onClick={onFinalDecision}>근거 고르기</button></section>;
}

function EvidenceStep({ activity, headingRef, answers, onAnswers, onEvidence }: Props) {
  const toggle = (evidence: string) => onAnswers({ evidence: answers.evidence.includes(evidence) ? answers.evidence.filter((item) => item !== evidence) : [...answers.evidence, evidence] });
  return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>자료 근거를 연결해요</h1><p>{activity.explanation}</p><fieldset className="evidence-set" data-error-target="evidence" tabIndex={-1}><legend>내 예보와 선택에 맞는 근거를 하나 이상 고르세요</legend>{activity.evidenceOptions.map((evidence, index) => <label key={evidence}><input type="checkbox" data-testid={`evidence-${index}`} checked={answers.evidence.includes(evidence)} onChange={() => toggle(evidence)} /> {evidence}</label>)}</fieldset><aside className="misconception"><strong>꼭 기억해요</strong><p>{activity.misconceptionNote}</p></aside><button className="primary" data-testid="evidence-confirm" onClick={onEvidence}>전후 기록 보기</button></section>;
}

function BeforeAfter({ activity, headingRef, answers, first, final, knownFraction, onNext }: Props & { first: Fraction; final: Fraction }) {
  const expected = expectedForecast(activity, 2);
  const known = activity.sourceKind === "known-model" ? knownFraction : undefined;
  return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>예보 수정 기록</h1><div className="before-after"><article><h2>처음</h2><p>관찰 비율 <FractionView fraction={first} /></p><p>{answers.firstForecast ? wordLabels[answers.firstForecast] : "첫 예보 없음"}</p><p>선택: {decisionLabel(activity, answers.firstDecision) ?? "없음"}</p></article><article><h2>{activity.activityKind === "tutorial" ? "비교" : "나중"}</h2>{activity.activityKind === "tutorial" ? <><p>장치에서 계산한 가능성 <FractionView fraction={known!} /></p><p>자료에서 관찰한 비율 <FractionView fraction={first} /></p></> : <><p>누적 관찰 비율 <FractionView fraction={final} /></p>{known && <p>장치에서 계산한 가능성 <FractionView fraction={known} /></p>}<p>{answers.finalForecast ? wordLabels[answers.finalForecast] : wordLabels[expected]}</p><p>선택: {decisionLabel(activity, answers.finalDecision) ?? "없음"}</p></>}</article></div><p className="misconception"><strong>다음 한 번의 결과는 확정할 수 없어요.</strong> 지금 자료와 장치 구조는 예보의 근거이지 약속이 아니에요.</p><button className="primary" data-testid="record-next" onClick={onNext}>{activity.activityKind === "tutorial" ? "미션 1 시작" : "다음으로"}</button></section>;
}

export function OfficeDialog({ name, onClose, onReset }: { name: "how" | "teacher" | "updates" | "reset"; onClose: () => void; onReset: () => void }) {
  const contents = { how: ["조건을 확인하고 첫 자료를 세어요.", "말 예보와 임시 선택을 한 뒤 새 자료를 누적해요.", "예보를 유지하거나 수정하고 근거를 연결해요."], teacher: ["학생 이름·점수·시간은 저장하지 않습니다.", "관찰 자료 비율과 장치에서 계산한 가능성을 구분하도록 질문해 주세요.", "새로고침하면 현재 탭의 기록이 초기화됩니다."], updates: ["2026-07-17 · 최초 개발: 5개 미션과 안내 연습을 포함한 가능성 예보 활동을 구현했습니다.", "2026-07-17 · 개선: 알려진 구조·관찰 비율의 출처와 누적 자료, 예보 수정 기록을 분리해 표시했습니다."] } as const;
  if (name === "reset") return <Dialog title="처음으로 돌아갈까요?" onClose={onClose}><p>현재 탭의 예보 기록은 사라지고 시작 화면으로 돌아가요.</p><div className="button-row"><button className="primary" onClick={onReset}>처음으로</button><button onClick={onClose}>계속 활동하기</button></div></Dialog>;
  const title = name === "how" ? "활동 방법" : name === "teacher" ? "교사용 안내" : "업데이트 내역";
  return <Dialog title={title} onClose={onClose}><ul className="dialog-list">{contents[name].map((item) => <li key={item}>{item}</li>)}</ul></Dialog>;
}

export function Summary({ headingRef, records, onRestart, onConcept }: { headingRef: React.RefObject<HTMLHeadingElement | null>; records: ReturnType<typeof import("./session").saveRecord>[]; onRestart: () => void; onConcept: () => void }) {
  return <section className="summary panel" data-testid="summary"><h1 ref={headingRef} tabIndex={-1}>최종 예보 수정 기록</h1><p>점수나 순위 없이, 자료를 어떻게 읽고 다시 살폈는지 정리했어요.</p><div className="summary-table-wrap"><table className="summary-table"><thead><tr><th>미션</th><th>첫 자료</th><th>누적 자료</th><th>예보 변화</th><th>선택 변화</th></tr></thead><tbody>{records.map((record) => <tr key={record.missionId}><th scope="row" data-label="미션">{record.title}</th><td data-label="첫 자료">{fractionText(record.first.primary)}</td><td data-label="누적 자료">{fractionText(record.final.primary)}</td><td data-label="예보 변화">{record.revision === "keep" ? "근거가 유지되어 그대로 둠" : record.revision === "change" ? "자료에 따라 바꿈" : "자료 더 보기"}</td><td data-label="선택 변화">{record.firstDecisionLabel ?? "-"} → {record.finalDecisionLabel ?? "-"}</td></tr>)}</tbody></table></div><p className="completion-note">관찰 비율과 계산한 가능성을 구분했고, 다음 결과를 확정하지 않았어요.</p><div className="button-row"><button className="primary" onClick={onRestart}>다시 예보하기</button><button onClick={onConcept}>개념 다시 보기</button></div></section>;
}
