"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { missions } from "../content/missions";
import { tutorialActivity } from "../content/tutorial";
import type { ForecastActivity } from "../content/schema";
import { MissionFlow, OfficeDialog, Summary } from "./MissionFlow";
import {
  activityCounts,
  countSelectionError,
  answersAfterGoingBack,
  createSession,
  expectedRevision,
  isDecisionCorrect,
  isForecastCorrect,
  knownModelFraction,
  nextStageAfterDecision,
  saveRecord,
  restartSession,
  stageNames,
  upsertRecord,
  type LearningStage,
  type MissionAnswers,
  type Session,
} from "./session";

type DialogName = "how" | "teacher" | "updates" | "reset" | null;

const mainStages: LearningStage[] = ["condition", "first-count", "first-forecast", "provisional-decision", "reveal", "cumulative", "revised-forecast", "revised-decision", "evidence", "record"];

function freshAnswers(): MissionAnswers { return { evidence: [] }; }

function summaryFixtureSession(): Session {
  const base = createSession();
  return { ...base, stage: "summary", records: missions.map((mission) => saveRecord(base, mission)) };
}

export function ForecastOffice() {
  const [session, setSession] = useState<Session>(createSession);
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState<ForecastActivity | null>(null);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [notice, setNotice] = useState("");
  const [firstSelections, setFirstSelections] = useState<Record<string, { numerator?: string; denominator?: string }>>({});
  const [cumulativeSelections, setCumulativeSelections] = useState<Record<string, { numerator?: string; denominator?: string }>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isMission = active?.activityKind === "mission";
  const stage = session.stage;
  const firstCounts = active ? activityCounts(active, 1) : {};
  const finalCounts = active ? activityCounts(active, 2) : {};
  const knownFraction = active ? knownModelFraction(active) : undefined;
  const visibleMission = isMission ? session.missionIndex + 1 : 0;

  useEffect(() => { if (stage !== "start") headingRef.current?.focus(); }, [stage, active?.id]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("fixture") === "summary") setSession(summaryFixtureSession());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const target = notice.includes("revision") ? "revision" : notice.includes("근거") ? "evidence" : notice.includes("count") || notice.includes("new-batch") ? "count" : notice.includes("rule") ? "decision" : "forecast";
    document.querySelector<HTMLElement>(`[data-error-target="${target}"]`)?.focus();
  }, [notice]);

  const progress = useMemo(() => isMission ? `${visibleMission}/5 · ${stageNames[stage]}` : stage === "start" ? "활동 준비" : stageNames[stage], [isMission, visibleMission, stage]);
  const changeAnswers = (patch: Partial<MissionAnswers>) => setSession((current) => ({ ...current, answers: { ...current.answers, ...patch } }));
  const move = (next: LearningStage) => { setNotice(""); setSession((current) => ({ ...current, stage: next })); };

  function beginTutorial() { setActive(tutorialActivity); setFirstSelections({}); setCumulativeSelections({}); setSession((current) => ({ ...current, stage: "condition", answers: freshAnswers() })); }
  function restartForecast() { setActive(tutorialActivity); setFirstSelections({}); setCumulativeSelections({}); setSession({ ...restartSession(), stage: "condition", answers: freshAnswers() }); setNotice(""); }
  function startMission(index: number) { setActive(missions[index]); setFirstSelections({}); setCumulativeSelections({}); setSession((current) => ({ ...current, missionIndex: index, stage: "condition", answers: freshAnswers() })); }
  function requireChoice(value: unknown, next: LearningStage, message: string) { if (!value) { setNotice(message); return; } move(next); }
  function confirmCount() {
    const error = countSelectionError(active!, 1, firstSelections);
    if (error) {
      setNotice(error === "fraction-mismatch" ? "fraction-mismatch: 나온 횟수가 위, 전체 횟수가 아래에 와요." : "count-mismatch: 모든 자료의 목표 사건 횟수와 전체 횟수를 자료에서 다시 세어 보세요.");
      return;
    }
    setNotice("모든 첫 자료 횟수를 확인했어요. 이 값을 바탕으로 예보해요.");
    setSession((current) => ({ ...current, stage: "first-forecast" }));
  }
  function confirmCumulative() {
    const error = countSelectionError(active!, 2, cumulativeSelections);
    if (error) { setNotice(error === "fraction-mismatch" ? "fraction-mismatch: 나온 횟수가 위, 전체 횟수가 아래에 와요." : "new-batch-only: 새 자료만 보지 말고 첫 자료와 새 자료를 모두 합친 횟수를 다시 고르세요."); return; }
    move("revised-forecast");
  }
  function confirmForecast(batchCount: 1 | 2) {
    const forecast = batchCount === 1 ? session.answers.firstForecast : session.answers.finalForecast;
    if (!isForecastCorrect(active!, batchCount, forecast)) { setNotice("word-number-source mismatch: 자료 출처와 분수의 위치를 다시 읽고 말 예보를 고르세요."); return; }
    move(batchCount === 1 ? "provisional-decision" : "revised-decision");
  }
  function confirmFirstDecision() {
    if (!isDecisionCorrect(active!, 1, session.answers.firstDecision)) { setNotice("rule-mismatch: 이번 미션의 판단 규칙과 첫 자료를 다시 비교하세요."); return; }
    move(nextStageAfterDecision(active!));
  }
  function confirmFinalDecision() {
    if (!isDecisionCorrect(active!, 2, session.answers.finalDecision)) { setNotice("rule-mismatch: 누적 자료와 판단 규칙을 다시 비교하세요."); return; }
    const expected = expectedRevision(active!);
    if (session.answers.revision !== expected) { setNotice("revision-mismatch: 첫 예보·선택과 누적 자료를 비교해 유지, 수정, 자료 더 보기 중 알맞은 것을 고르세요."); return; }
    move("evidence");
  }
  function finishEvidence() {
    if (session.answers.evidence.length === 0) { setNotice("근거를 하나 이상 골라 주세요."); return; }
    if (isMission && active) setSession((current) => ({ ...current, records: upsertRecord(current.records, saveRecord(current, active)) , stage: "record" }));
    else move("record");
  }
  function nextAfterRecord() {
    if (!active || active.activityKind === "tutorial") { startMission(0); return; }
    if (session.missionIndex === missions.length - 1) { setActive(null); move("summary"); return; }
    startMission(session.missionIndex + 1);
  }
  function goBack() {
    if (!active || stage === "condition") return;
    const previous: Partial<Record<LearningStage, LearningStage>> = { "first-count": "condition", "first-forecast": "first-count", "provisional-decision": "first-forecast", reveal: "provisional-decision", cumulative: "reveal", "revised-forecast": "cumulative", "revised-decision": "revised-forecast", evidence: active.activityKind === "tutorial" ? "provisional-decision" : "revised-decision", record: "evidence" };
    const next = previous[stage];
    if (!next) return;
    setSession((current) => ({ ...current, stage: next, answers: answersAfterGoingBack(stage, current.answers), records: stage === "record" ? current.records.filter((record) => record.missionId !== active.id) : current.records }));
    setNotice("이전 단계로 돌아왔어요. 뒤 단계의 선택은 다시 확인해요.");
  }
  function reset() { setActive(null); setFirstSelections({}); setCumulativeSelections({}); setSession(createSession()); setNotice(""); setDialog(null); }

  return <main className="forecast-office" data-testid="forecast-office" data-hydrated={hydrated ? "true" : "false"}>
    <header className="app-header">
      <div><p className="app-name">가능성 예보국</p><p className="app-subtitle">새 자료를 보고 예보와 선택을 다시 살펴봐요</p></div>
      <div className="progress" aria-label={`진행: ${progress}`}><strong>{progress}</strong><span aria-hidden="true"><i style={{ width: `${isMission ? (visibleMission - 1 + Math.max(1, mainStages.indexOf(stage) + 1) / mainStages.length) / 5 * 100 : 0}%` }} /></span></div>
      <nav aria-label="도움말"><button type="button" onClick={() => setDialog("how")}>활동 방법</button><button type="button" onClick={() => setDialog("teacher")}>교사용</button><button type="button" onClick={() => setDialog("updates")}>업데이트 내역</button><button type="button" onClick={() => setDialog("reset")}>처음으로</button></nav>
    </header>
    <p className="sr-only" aria-live="polite">{notice}</p>
    <section className="app-content" aria-describedby="reset-note">
      <p id="reset-note" className="reset-note">이 활동은 이 탭의 메모리에서만 진행돼요. 새로고침하면 처음부터 시작해요.</p>
      {stage === "start" && <StartScreen headingRef={headingRef} onConcept={() => move("concept")} onStart={beginTutorial} />}
      {stage === "concept" && <ConceptGuide headingRef={headingRef} onPractice={beginTutorial} />}
      {active && stage !== "start" && stage !== "concept" && <MissionFlow
        activity={active} stage={stage} answers={session.answers} headingRef={headingRef} firstCounts={firstCounts} finalCounts={finalCounts} knownFraction={knownFraction} firstSelections={firstSelections} cumulativeSelections={cumulativeSelections} notice={notice}
        onFirstSelections={setFirstSelections} onCumulativeSelections={setCumulativeSelections} onAnswers={changeAnswers} onMove={move} onCount={confirmCount} onCumulative={confirmCumulative} onForecast={confirmForecast} onFirstDecision={confirmFirstDecision} onFinalDecision={confirmFinalDecision} onRequire={requireChoice} onEvidence={finishEvidence} onNext={nextAfterRecord}
      />}
      {active && mainStages.includes(stage) && stage !== "condition" && <button className="back-button" type="button" onClick={goBack}>이전 단계</button>}
      {stage === "summary" && <Summary headingRef={headingRef} records={session.records} onRestart={restartForecast} onConcept={() => move("concept")} />}
    </section>
    {dialog && <OfficeDialog name={dialog} onClose={() => setDialog(null)} onReset={reset} />}
  </main>;
}

function StartScreen({ headingRef, onConcept, onStart }: { headingRef: React.RefObject<HTMLHeadingElement | null>; onConcept: () => void; onStart: () => void }) {
  return <section className="start-screen panel"><p className="section-label">자료 관측판</p><h1 ref={headingRef} tabIndex={-1}>첫 자료로 예보하고, 새 자료로 다시 살펴봐요.</h1><p>가상의 반복 실험 자료를 읽는 수학 활동이에요. 실제 날씨·안전 예보가 아니며 점수나 경쟁도 없어요.</p><dl className="quick-facts"><div><dt>시간</dt><dd>15~20분</dd></div><div><dt>미션</dt><dd>안내 연습 + 5개</dd></div><div><dt>저장</dt><dd>로그인·저장 없음</dd></div></dl><div className="button-row"><button className="primary" data-testid="activity-start" onClick={onStart}>예보 시작</button><button data-testid="concept-open" onClick={onConcept}>개념 먼저 보기</button></div></section>;
}

function ConceptGuide({ headingRef, onPractice }: { headingRef: React.RefObject<HTMLHeadingElement | null>; onPractice: () => void }) {
  const [overclaim, setOverclaim] = useState({ none: false, all: false, feedback: "" });
  const wrong = () => setOverclaim((current) => ({ ...current, feedback: "source-overclaim: 자료에서 아직/매번 나왔다는 뜻과 불가능/반드시 뜻은 달라요" }));
  const right = (key: "none" | "all") => setOverclaim((current) => ({ ...current, [key]: true, feedback: key === "none" ? "맞아요. 0/10은 지금 자료에서 아직 나오지 않았다는 뜻이에요." : "맞아요. 10/10은 지금 자료에서 매번 나타났다는 뜻이에요." }));
  return <section className="concept panel"><h1 ref={headingRef} tabIndex={-1}>가능성을 읽는 다섯 가지 약속</h1><div className="concept-grid"><article><h2>1. 말로 나타내기</h2><p>반반, 적게 나타남처럼 수의 위치를 말로 표현해요.</p></article><article><h2>2. 출처를 구분하기</h2><p><b>장치에서 계산:</b> 4/8 = 1/2<br /><b>자료에서 관찰:</b> 4/6 = 2/3</p></article><article><h2>3. 누적하기</h2><p>새 자료만 보지 않고 첫 자료와 함께 더해요.</p></article><article><h2>4. 확정하지 않기</h2><p>0/10이어도 불가능은 아니고, 10/10이어도 반드시는 아니에요.</p></article><article><h2>5. 차례라고 정하지 않기</h2><p>같은 결과가 이어져도 반대 결과가 나올 차례라고 말할 수 없어요.</p></article></div><SourceOverclaimPractice state={overclaim} onWrong={wrong} onRight={right} /><div className="practice-line"><strong>연습:</strong> 4/8은 어디에 있나요? <span>0보다 큼 · <b>1/2</b> · 1보다 작음</span></div><button className="primary" onClick={onPractice}>안내 연습 시작</button></section>;
}

function SourceOverclaimPractice({ state, onWrong, onRight }: { state: { none: boolean; all: boolean; feedback: string }; onWrong: () => void; onRight: (key: "none" | "all") => void }) {
  return <section className="overclaim-practice" aria-labelledby="overclaim-title"><h2 id="overclaim-title">관찰 자료 말 고르기</h2><p>자료에서 보인 횟수는 다음 결과를 확정하지 않아요.</p><div className="overclaim-options"><fieldset><legend>0/10을 관찰했어요.</legend><button type="button" data-testid="source-overclaim-wrong-none" onClick={onWrong}>불가능</button><button type="button" data-testid="source-overclaim-right-none" onClick={() => onRight("none")}>지금 자료에서는 아직 나오지 않았어요</button>{state.none && <strong>확인</strong>}</fieldset><fieldset><legend>10/10을 관찰했어요.</legend><button type="button" data-testid="source-overclaim-wrong-all" onClick={onWrong}>반드시</button><button type="button" data-testid="source-overclaim-right-all" onClick={() => onRight("all")}>지금 자료에서는 매번 나타났어요</button>{state.all && <strong>확인</strong>}</fieldset></div><p role="status" aria-live="polite" data-testid="source-overclaim-feedback">{state.feedback}</p></section>;
}
