"use client";

import type { ForecastActivity } from "../content/schema";
import type { Fraction } from "../domain/types";
import { Dialog } from "./Dialog";
import { StepAction } from "./StepAction";
import type { CountSelections, LearningStage, MissionAnswers } from "./session";
import { decisionLabel, expectedForecast, wordLabels } from "./session";
import { ActivityCondition, DecisionChoices, ForecastChoices, FractionView, KnownModelComparison, NumberLine, ResultBoards, SourceBadge } from "./visuals";

type Props = {
  activity: ForecastActivity; stage: LearningStage; answers: MissionAnswers; headingRef: React.RefObject<HTMLHeadingElement | null>;
  firstCounts: Record<string, Fraction>; finalCounts: Record<string, Fraction>; knownFraction?: Fraction; firstSelections: CountSelections; cumulativeSelections: CountSelections;
  onFirstSelections: (value: CountSelections) => void; onCumulativeSelections: (value: CountSelections) => void; onAnswers: (patch: Partial<MissionAnswers>) => void; onMove: (stage: LearningStage) => void;
  onCount: () => void; onCumulative: () => void; onForecast: (batchCount: 1 | 2) => void; onFirstDecision: () => void; onFinalDecision: () => void; onEvidence: () => void; onNext: () => void;
};

function fractionText(fraction: Fraction) { return `${fraction.numerator}/${fraction.denominator}`; }

export function MissionFlow(props: Props) {
  const { activity, stage, headingRef } = props;
  const primary = activity.streams.find((stream) => stream.id === activity.primaryStreamId)!;
  const first = props.firstCounts[primary.id];
  const final = props.finalCounts[primary.id];
  const displayFraction = activity.sourceKind === "known-model" ? props.knownFraction! : first;
  const finalDisplay = activity.sourceKind === "known-model" ? props.knownFraction! : final;
  if (stage === "condition") return <section><h1 className="step-heading" ref={headingRef} tabIndex={-1}>{activity.title}</h1><ActivityCondition activity={activity} /><StepAction cue="찾을 결과를 읽고 아래 버튼을 눌러요." data-testid="condition-confirm" onClick={() => props.onMove("first-count")}>찾을 결과를 확인했어요</StepAction></section>;
  if (stage === "first-count") return <CountStep {...props} batchCount={1} selections={props.firstSelections} onSelections={props.onFirstSelections} onConfirm={props.onCount} />;
  if (stage === "first-forecast") return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>첫 자료로 예보해요</h1><SourceBadge kind={activity.sourceKind} />{activity.sourceKind === "known-model" ? <KnownModelComparison observed={first} known={displayFraction} batchCount={1} /> : <p>첫 자료에서 실제로 나온 결과의 비율: <FractionView fraction={displayFraction} /></p>}<NumberLine fraction={displayFraction} kind="first" label="첫 예보에 쓸 분수" /><ForecastChoices kind={activity.sourceKind} value={props.answers.firstForecast} onChange={(firstForecast) => props.onAnswers({ firstForecast })} /><StepAction cue="분수의 위치를 보고 가능성 말 하나를 고른 뒤 확인해요." data-testid="first-forecast-confirm" onClick={() => props.onForecast(1)}>첫 예보 정하기</StepAction></section>;
  if (stage === "provisional-decision") return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>첫 자료를 보고 첫 선택해요</h1><DecisionChoices activity={activity} batchCount={1} value={props.answers.firstDecision} onChange={(firstDecision) => props.onAnswers({ firstDecision })} /><StepAction cue="바로 위 자료를 비교해 한 가지를 고른 뒤 확인해요." data-testid="first-decision-confirm" onClick={props.onFirstDecision}>첫 선택 확인</StepAction></section>;
  if (stage === "reveal") return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>새 자료가 도착했어요</h1><p>새 자료만 보지 말고 첫 자료와 모두 합쳐서 살펴봐요.</p><ResultBoards activity={activity} batchIndex={1} heading="새 자료" /><StepAction cue="새 자료를 다 살펴본 뒤 첫 자료와 합쳐 세러 가요." data-testid="reveal-next" onClick={() => props.onMove("cumulative")}>모두 합친 자료 세기</StepAction></section>;
  if (stage === "cumulative") return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>모두 합친 자료를 세어 봐요</h1><p>새 자료만 쓰지 말고 첫 자료와 새 자료를 모두 합친 횟수를 고르세요.</p><CountPicker activity={activity} counts={props.finalCounts} firstCounts={props.firstCounts} selections={props.cumulativeSelections} onSelections={props.onCumulativeSelections} prefix="cumulative" /><StepAction cue="도움식을 보고 모든 분수 칸을 고른 뒤 확인해요." data-testid="cumulative-count-confirm" onClick={props.onCumulative}>모두 합친 횟수 확인</StepAction></section>;
  if (stage === "revised-forecast") return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>모두 합친 자료로 최종 예보해요</h1><SourceBadge kind={activity.sourceKind} />{activity.sourceKind === "known-model" ? <KnownModelComparison observed={final} known={finalDisplay} batchCount={2} /> : <p>모두 합친 실제 결과의 비율: <FractionView fraction={finalDisplay} /></p>}<NumberLine fraction={finalDisplay} kind="final" label="최종 예보에 쓸 분수" /><ForecastChoices kind={activity.sourceKind} value={props.answers.finalForecast} onChange={(finalForecast) => props.onAnswers({ finalForecast })} /><StepAction cue="최종 분수의 위치를 보고 가능성 말 하나를 고른 뒤 확인해요." data-testid="final-forecast-confirm" onClick={() => props.onForecast(2)}>최종 예보 정하기</StepAction></section>;
  if (stage === "revised-decision") return <FinalDecision {...props} />;
  if (stage === "evidence") return <EvidenceStep {...props} />;
  return <BeforeAfter {...props} first={first} final={final} />;
}

function CountStep({ activity, headingRef, firstCounts, firstSelections, onFirstSelections, onCount }: Props & { batchCount: 1; selections: CountSelections; onSelections: (value: CountSelections) => void; onConfirm: () => void }) {
  return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>첫 자료를 세어 봐요</h1><p>결과 그림에서 찾을 결과가 몇 번인지와 모두 몇 번인지 골라요.</p><ResultBoards activity={activity} batchIndex={0} heading="첫 자료" /><CountPicker activity={activity} counts={firstCounts} selections={firstSelections} onSelections={onFirstSelections} prefix="first" /><StepAction cue="결과 그림을 세어 모든 분수 칸을 고른 뒤 확인해요." data-testid="first-count-confirm" onClick={onCount}>횟수 확인</StepAction></section>;
}

function CountPicker({ activity, counts, firstCounts, selections, onSelections, prefix }: { activity: ForecastActivity; counts: Record<string, Fraction>; firstCounts?: Record<string, Fraction>; selections: CountSelections; onSelections: (value: CountSelections) => void; prefix: string }) {
  const choose = (id: string, field: "numerator" | "denominator", value: string) => onSelections({ ...selections, [id]: { ...selections[id], [field]: value || undefined } });
  return <div className="count-picker">{activity.streams.map((stream) => {
    const correct = counts[stream.id];
    const choice = selections[stream.id] ?? {};
    const values = Array.from({ length: correct.denominator + 1 }, (_, value) => value);
    return <fieldset key={stream.id}>
      <legend>{stream.label}: 나온 횟수와 모두 몇 번인지</legend>
      {firstCounts && <p className="addition-guide"><span>첫 자료 {firstCounts[stream.id].numerator}번 + 새 자료 {correct.numerator - firstCounts[stream.id].numerator}번 = ?</span><span>전체 {firstCounts[stream.id].denominator}번 + {correct.denominator - firstCounts[stream.id].denominator}번 = ?</span></p>}
      <div className="count-fraction">
        <label>분수 위 · 나온 횟수<select data-testid={`${prefix}-${stream.id}-numerator`} aria-label={`${stream.label} 나온 횟수`} value={choice.numerator ?? ""} onChange={(event) => choose(stream.id, "numerator", event.target.value)}><option value="">고르기</option>{values.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <span aria-hidden="true">―</span>
        <label>분수 아래 · 전체 횟수<select data-testid={`${prefix}-${stream.id}-denominator`} aria-label={`${stream.label} 전체 횟수`} value={choice.denominator ?? ""} onChange={(event) => choose(stream.id, "denominator", event.target.value)}><option value="">고르기</option>{values.slice(1).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>
    </fieldset>;
  })}</div>;
}

function FinalDecision({ activity, headingRef, answers, onAnswers, onFinalDecision }: Props) {
  return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>최종 선택과 예보 변화를 정해요</h1><DecisionChoices activity={activity} batchCount={2} value={answers.finalDecision} onChange={(finalDecision) => onAnswers({ finalDecision })} /><fieldset className="choice-set" data-error-target="revision" tabIndex={-1}><legend>새 자료 뒤 내 예보는?</legend><div className="choice-grid">{(["keep", "change", "need-more-data"] as const).map((revision) => <label className="choice-card" key={revision}><input type="radio" data-testid={`revision-${revision}`} name="revision" checked={answers.revision === revision} onChange={() => onAnswers({ revision })} /><span>{revision === "keep" ? "예보 그대로 두기" : revision === "change" ? "예보 바꾸기" : "자료를 더 보기"}</span></label>)}</div></fieldset><StepAction cue="최종 선택과 예보 변화를 하나씩 고른 뒤 이유를 보러 가요." data-testid="final-decision-confirm" onClick={onFinalDecision}>이유 고르기</StepAction></section>;
}

function EvidenceStep({ activity, headingRef, answers, onAnswers, onEvidence }: Props) {
  const toggle = (evidence: string) => onAnswers({ evidence: answers.evidence.includes(evidence) ? answers.evidence.filter((item) => item !== evidence) : [...answers.evidence, evidence] });
  return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>이유를 골라요</h1><p>{activity.explanation}</p><fieldset className="evidence-set" data-error-target="evidence" tabIndex={-1}><legend>내 예보와 선택에 맞는 이유를 하나 이상 골라요</legend>{activity.evidenceOptions.map((evidence, index) => <label key={evidence}><input type="checkbox" data-testid={`evidence-${index}`} checked={answers.evidence.includes(evidence)} onChange={() => toggle(evidence)} /> {evidence}</label>)}</fieldset><aside className="misconception"><strong>꼭 기억해요</strong><p>{activity.misconceptionNote}</p></aside><StepAction cue="맞는 이유를 하나 이상 고른 뒤 처음과 나중을 비교해요." data-testid="evidence-confirm" onClick={onEvidence}>처음과 나중 비교</StepAction></section>;
}

function BeforeAfter({ activity, headingRef, answers, first, final, knownFraction, onNext }: Props & { first: Fraction; final: Fraction }) {
  const expected = expectedForecast(activity, 2);
  const known = activity.sourceKind === "known-model" ? knownFraction : undefined;
  return <section className="step panel"><h1 ref={headingRef} tabIndex={-1}>내 예보 돌아보기</h1><div className="before-after"><article><h2>처음</h2><p>처음 나온 결과의 비율 <FractionView fraction={first} /></p><p>{answers.firstForecast ? wordLabels[answers.firstForecast] : "첫 예보 없음"}</p><p>선택: {decisionLabel(activity, answers.firstDecision) ?? "없음"}</p></article><article><h2>{activity.activityKind === "tutorial" ? "비교" : "나중"}</h2>{activity.activityKind === "tutorial" ? <><p>신호판의 칸으로 계산 <FractionView fraction={known!} /></p><p>실제로 나온 결과 <FractionView fraction={first} /></p></> : <><p>모두 합친 자료의 비율 <FractionView fraction={final} /></p>{known && <p>신호판의 칸으로 계산 <FractionView fraction={known} /></p>}<p>{answers.finalForecast ? wordLabels[answers.finalForecast] : wordLabels[expected]}</p><p>선택: {decisionLabel(activity, answers.finalDecision) ?? "없음"}</p></>}</article></div><p className="misconception"><strong>다음 한 번의 결과는 딱 정할 수 없어요.</strong> 지금 나온 결과와 신호판의 칸은 예보에 도움을 주지만 약속은 아니에요.</p><StepAction cue={activity.activityKind === "tutorial" ? "비교를 읽고 미션 1을 시작해요." : "처음과 나중을 읽고 다음 미션으로 가요."} data-testid="record-next" onClick={onNext}>{activity.activityKind === "tutorial" ? "미션 1 시작" : "다음으로"}</StepAction></section>;
}

export function OfficeDialog({ name, onClose, onReset }: { name: "how" | "teacher" | "updates" | "reset"; onClose: () => void; onReset: () => void }) {
  const contents = { how: ["첫 자료를 세고 가능성 말을 골라요.", "새 자료를 첫 자료와 모두 합쳐 세어요.", "예보와 선택을 다시 보고, 그렇게 생각한 이유를 골라요."], teacher: ["학생 이름·점수·시간은 저장하지 않습니다.", "신호판의 칸으로 계산한 값과 실제로 나온 결과를 구분하도록 질문해 주세요.", "새로고침하면 현재 화면에서 한 기록은 처음부터 다시 시작합니다."], updates: ["2026-07-17 · 최초 개발: 5개 미션과 안내 연습을 포함한 가능성 예보 활동을 구현했습니다.", "2026-07-17 · 개선: 신호판의 칸과 실제로 나온 결과, 모두 합친 자료, 예보 돌아보기를 나누어 표시했습니다.", "2026-07-17 · 기능·UI 개선: 화면 피드백, 두 칸 횟수 선택, 전체 6활동 진행률, 모바일 터치 영역을 보완했습니다.", "2026-07-17 · 안정화: 빈 선택은 정답으로 처리하지 않고, 단계 성공 뒤 다음 할 일을 안내합니다.", "2026-07-18 · 학생 실사용 개선: 시작 버튼을 위로 옮기고, 어려운 말을 쉬운 말과 구체적인 안내로 바꿨습니다.", "2026-08-25 · 학생 실사용 재점검: 지금 할 일, 합치기 도움식, 판단 자료 요약, 쉬운 한국어 선택지, 버튼 강조를 추가했습니다."] } as const;
  if (name === "reset") return <Dialog title="처음으로 돌아갈까요?" onClose={onClose}><p>지금까지 한 예보 기록은 사라지고 시작 화면으로 돌아가요.</p><div className="button-row"><button className="primary" onClick={onReset}>처음으로</button><button onClick={onClose}>계속 활동하기</button></div></Dialog>;
  const title = name === "how" ? "활동 방법" : name === "teacher" ? "선생님 안내" : "업데이트 내역";
  return <Dialog title={title} onClose={onClose}><ul className="dialog-list">{contents[name].map((item) => <li key={item}>{item}</li>)}</ul></Dialog>;
}

export function Summary({ headingRef, records, onRestart, onConcept }: { headingRef: React.RefObject<HTMLHeadingElement | null>; records: ReturnType<typeof import("./session").saveRecord>[]; onRestart: () => void; onConcept: () => void }) {
  return <section className="summary panel" data-testid="summary"><h1 ref={headingRef} tabIndex={-1}>내 예보 돌아보기</h1><p>점수나 순위 없이, 처음과 나중에 예보가 어떻게 달라졌는지 정리했어요.</p><div className="summary-table-wrap"><table className="summary-table"><thead><tr><th>미션</th><th>첫 자료</th><th>모두 합친 자료</th><th>예보가 어떻게 바뀌었나요</th><th>선택이 어떻게 바뀌었나요</th></tr></thead><tbody>{records.map((record) => <tr key={record.missionId}><th scope="row" data-label="미션">{record.title}</th><td data-label="첫 자료">{fractionText(record.first.primary)}</td><td data-label="모두 합친 자료">{fractionText(record.final.primary)}</td><td data-label="예보가 어떻게 바뀌었나요">{record.revision === "keep" ? "그대로 두었어요" : record.revision === "change" ? "자료를 보고 바꿨어요" : "자료를 더 보기로 했어요"}</td><td data-label="선택이 어떻게 바뀌었나요">{record.firstDecisionLabel ?? "-"} → {record.finalDecisionLabel ?? "-"}</td></tr>)}</tbody></table></div><p className="completion-note">신호판의 칸과 실제로 나온 결과를 구분했어요. 다음 결과는 딱 정할 수 없어요.</p><div className="button-row"><button className="primary" onClick={onRestart}>다시 예보하기</button><button onClick={onConcept}>개념 다시 보기</button></div></section>;
}
