"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { missions } from "../content/missions";
import { tutorialActivity } from "../content/tutorial";
import type { ForecastActivity } from "../content/schema";
import { MissionFlow, OfficeDialog, Summary } from "./MissionFlow";
import { journeyProgress } from "./progress";
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
type Feedback = { tone: "error" | "success" | "info"; message: string } | null;
const activeStages: LearningStage[] = ["condition", "first-count", "first-forecast", "provisional-decision", "reveal", "cumulative", "revised-forecast", "revised-decision", "evidence", "record"];

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
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [firstSelections, setFirstSelections] = useState<Record<string, { numerator?: string; denominator?: string }>>({});
  const [cumulativeSelections, setCumulativeSelections] = useState<Record<string, { numerator?: string; denominator?: string }>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const isMission = active?.activityKind === "mission";
  const stage = session.stage;
  const firstCounts = active ? activityCounts(active, 1) : {};
  const finalCounts = active ? activityCounts(active, 2) : {};
  const knownFraction = active ? knownModelFraction(active) : undefined;

  useEffect(() => { if (stage !== "start") headingRef.current?.focus(); }, [stage, active?.id]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("fixture") === "summary") setSession(summaryFixtureSession());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (feedback?.tone === "error") feedbackRef.current?.focus(); }, [feedback]);

  const progress = useMemo(() => journeyProgress({ stage, activeKind: active?.activityKind, missionIndex: session.missionIndex }), [active?.activityKind, session.missionIndex, stage]);
  const progressText = `${progress.activityLabel} · ${stageNames[stage]} · 전체 ${progress.currentActivity}/${progress.totalActivities}`;
  const changeAnswers = (patch: Partial<MissionAnswers>) => setSession((current) => ({ ...current, answers: { ...current.answers, ...patch } }));
  const move = (next: LearningStage) => { setFeedback(null); setSession((current) => ({ ...current, stage: next })); };
  const moveWithFeedback = (next: LearningStage, nextFeedback: Exclude<Feedback, null>) => { setFeedback(nextFeedback); setSession((current) => ({ ...current, stage: next })); };

  function beginTutorial() { setActive(tutorialActivity); setFirstSelections({}); setCumulativeSelections({}); setFeedback(null); setSession((current) => ({ ...current, stage: "condition", answers: freshAnswers() })); }
  function restartForecast() { setActive(tutorialActivity); setFirstSelections({}); setCumulativeSelections({}); setSession({ ...restartSession(), stage: "condition", answers: freshAnswers() }); setFeedback(null); }
  function startMission(index: number) { setActive(missions[index]); setFirstSelections({}); setCumulativeSelections({}); setFeedback(null); setSession((current) => ({ ...current, missionIndex: index, stage: "condition", answers: freshAnswers() })); }
  function confirmCount() {
    const error = countSelectionError(active!, 1, firstSelections);
    if (error) {
      setFeedback({ tone: "error", message: error === "fraction-mismatch" ? "분수의 위에는 나온 횟수, 아래에는 전체 횟수를 골라 주세요." : "모든 자료에서 목표 사건 횟수와 전체 횟수를 다시 세어 골라 주세요." });
      return;
    }
    moveWithFeedback("first-forecast", { tone: "success", message: "첫 자료의 횟수를 확인했어요. 이 값을 바탕으로 예보해 봐요." });
  }
  function confirmCumulative() {
    const error = countSelectionError(active!, 2, cumulativeSelections);
    if (error) { setFeedback({ tone: "error", message: error === "fraction-mismatch" ? "분수의 위에는 나온 횟수, 아래에는 전체 횟수를 골라 주세요." : "새 자료만 보지 말고 첫 자료와 새 자료를 모두 합친 횟수를 골라 주세요." }); return; }
    moveWithFeedback("revised-forecast", { tone: "success", message: "누적한 횟수를 확인했어요. 이제 이 자료로 최종 예보를 정해 봐요." });
  }
  function confirmForecast(batchCount: 1 | 2) {
    const forecast = batchCount === 1 ? session.answers.firstForecast : session.answers.finalForecast;
    if (!isForecastCorrect(active!, batchCount, forecast)) { setFeedback({ tone: "error", message: "자료의 출처와 분수의 위치를 다시 읽고 알맞은 말 예보를 골라 주세요." }); return; }
    moveWithFeedback(batchCount === 1 ? "provisional-decision" : "revised-decision", { tone: "success", message: batchCount === 1 ? "첫 예보를 정했어요. 이제 첫 자료로 임시 선택을 골라 봐요." : "최종 예보를 정했어요. 이제 누적 자료로 최종 선택을 골라 봐요." });
  }
  function confirmFirstDecision() {
    if (!isDecisionCorrect(active!, 1, session.answers.firstDecision)) { setFeedback({ tone: "error", message: "이번 미션의 판단 규칙과 첫 자료를 다시 비교해 골라 주세요." }); return; }
    const tutorial = active?.activityKind === "tutorial";
    moveWithFeedback(nextStageAfterDecision(active!), { tone: "success", message: tutorial ? "첫 자료로 임시 선택을 정했어요. 이제 근거를 연결해 봐요." : "첫 자료로 임시 선택을 정했어요. 다음 자료를 살펴봐요." });
  }
  function confirmFinalDecision() {
    if (!isDecisionCorrect(active!, 2, session.answers.finalDecision)) { setFeedback({ tone: "error", message: "누적 자료와 판단 규칙을 다시 비교해 골라 주세요." }); return; }
    const expected = expectedRevision(active!);
    if (session.answers.revision !== expected) { setFeedback({ tone: "error", message: "첫 예보·선택과 누적 자료를 비교해 예보 유지, 예보 수정, 자료 더 보기 중 알맞은 것을 골라 주세요." }); return; }
    moveWithFeedback("evidence", { tone: "success", message: "누적 자료로 최종 선택을 정했어요. 이제 근거를 연결해 봐요." });
  }
  function finishEvidence() {
    if (session.answers.evidence.length === 0) { setFeedback({ tone: "error", message: "내 예보와 선택에 맞는 근거를 하나 이상 골라 주세요." }); return; }
    if (isMission && active) {
      setFeedback({ tone: "success", message: "근거를 연결해 기록했어요. 처음과 나중의 예보를 비교해 봐요." });
      setSession((current) => ({ ...current, records: upsertRecord(current.records, saveRecord(current, active)) , stage: "record" }));
    }
    else moveWithFeedback("record", { tone: "success", message: "근거를 연결했어요. 처음과 나중의 예보를 비교해 봐요." });
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
    setFeedback({ tone: "info", message: "이전 단계로 돌아왔어요. 뒤 단계의 선택은 다시 확인해요." });
  }
  function reset() { setActive(null); setFirstSelections({}); setCumulativeSelections({}); setSession(createSession()); setFeedback(null); setDialog(null); }

  return <main className="forecast-office" data-testid="forecast-office" data-hydrated={hydrated ? "true" : "false"}>
    <header className="app-header">
      <div><p className="app-name">가능성 예보국</p><p className="app-subtitle">새 자료를 보고 예보와 선택을 다시 살펴봐요</p></div>
      <div className="progress" aria-label={`진행: ${progressText}`}><strong>{progressText}</strong><span aria-hidden="true"><i style={{ width: `${progress.percent}%` }} /></span></div>
      <nav aria-label="도움말"><button type="button" onClick={() => setDialog("how")}>활동 방법</button><button type="button" onClick={() => setDialog("teacher")}>교사용</button><button type="button" onClick={() => setDialog("updates")}>업데이트 내역</button><button type="button" onClick={() => setDialog("reset")}>처음으로</button></nav>
    </header>
    <section className="app-content" aria-describedby="reset-note">
      <p id="reset-note" className="reset-note">이 활동은 이 탭의 메모리에서만 진행돼요. 새로고침하면 처음부터 시작해요.</p>
      {feedback && <FeedbackBanner feedback={feedback} feedbackRef={feedbackRef} />}
      {stage === "start" && <StartScreen headingRef={headingRef} onConcept={() => move("concept")} onStart={beginTutorial} />}
      {stage === "concept" && <ConceptGuide headingRef={headingRef} onPractice={beginTutorial} />}
      {active && stage !== "start" && stage !== "concept" && <MissionFlow
        activity={active} stage={stage} answers={session.answers} headingRef={headingRef} firstCounts={firstCounts} finalCounts={finalCounts} knownFraction={knownFraction} firstSelections={firstSelections} cumulativeSelections={cumulativeSelections}
        onFirstSelections={setFirstSelections} onCumulativeSelections={setCumulativeSelections} onAnswers={changeAnswers} onMove={move} onCount={confirmCount} onCumulative={confirmCumulative} onForecast={confirmForecast} onFirstDecision={confirmFirstDecision} onFinalDecision={confirmFinalDecision} onEvidence={finishEvidence} onNext={nextAfterRecord}
      />}
      {active && activeStages.includes(stage) && stage !== "condition" && <button className="back-button" type="button" onClick={goBack}>이전 단계</button>}
      {stage === "summary" && <Summary headingRef={headingRef} records={session.records} onRestart={restartForecast} onConcept={() => move("concept")} />}
    </section>
    {dialog && <OfficeDialog name={dialog} onClose={() => setDialog(null)} onReset={reset} />}
  </main>;
}

function FeedbackBanner({ feedback, feedbackRef }: { feedback: Exclude<Feedback, null>; feedbackRef: React.RefObject<HTMLDivElement | null> }) {
  const label = feedback.tone === "error" ? "다시 확인해요" : feedback.tone === "success" ? "잘했어요" : "안내";
  return <div ref={feedbackRef} className={`feedback-banner ${feedback.tone}`} data-testid="learning-feedback" role={feedback.tone === "error" ? "alert" : "status"} tabIndex={-1}><strong>{label}</strong><span>{feedback.message}</span></div>;
}

function StartScreen({ headingRef, onConcept, onStart }: { headingRef: React.RefObject<HTMLHeadingElement | null>; onConcept: () => void; onStart: () => void }) {
  return <section className="start-screen panel"><p className="section-label">자료 관측판</p><h1 ref={headingRef} tabIndex={-1}>첫 자료로 예보하고, 새 자료로 다시 살펴봐요.</h1><p>가상의 반복 실험 자료를 읽는 수학 활동이에요. 실제 날씨·안전 예보가 아니며 점수나 경쟁도 없어요.</p><ol className="learning-path" aria-label="학습 순서"><li><span>1</span><strong>첫 자료 세기</strong><p>처음 보인 결과를 분수로 읽어요.</p></li><li><span>2</span><strong>새 자료 합치기</strong><p>새 자료와 첫 자료를 함께 세어요.</p></li><li><span>3</span><strong>예보 다시 보기</strong><p>자료를 보고 예보와 선택을 살펴봐요.</p></li></ol><dl className="quick-facts"><div><dt>시간</dt><dd>15~20분</dd></div><div><dt>미션</dt><dd>안내 연습 + 5개</dd></div><div><dt>저장</dt><dd>로그인·저장 없음</dd></div></dl><div className="button-row"><button className="primary" data-testid="activity-start" onClick={onStart}>예보 시작</button><button data-testid="concept-open" onClick={onConcept}>개념 먼저 보기</button></div></section>;
}

function ConceptGuide({ headingRef, onPractice }: { headingRef: React.RefObject<HTMLHeadingElement | null>; onPractice: () => void }) {
  const [overclaim, setOverclaim] = useState({ none: false, all: false, feedback: null as Feedback });
  const wrong = () => setOverclaim((current) => ({ ...current, feedback: { tone: "error", message: "자료에서 보인 횟수만으로 불가능이라고 할 수 없어요. 지금 자료에서 아직 나온 적이 없다는 뜻이에요." } }));
  const right = (key: "none" | "all") => setOverclaim((current) => ({ ...current, [key]: true, feedback: { tone: "success", message: key === "none" ? "맞아요. 0/10은 지금 자료에서 아직 나오지 않았다는 뜻이에요." : "맞아요. 10/10은 지금 자료에서 매번 나타났다는 뜻이에요." } }));
  return <section className="concept panel"><h1 ref={headingRef} tabIndex={-1}>가능성을 읽는 다섯 가지 약속</h1><div className="concept-grid"><article><h2>1. 말로 나타내기</h2><p>반반, 적게 나타남처럼 수의 위치를 말로 표현해요.</p></article><article><h2>2. 출처를 구분하기</h2><p><b>장치에서 계산:</b> 4/8 = 1/2<br /><b>자료에서 관찰:</b> 4/6 = 2/3</p></article><article><h2>3. 누적하기</h2><p>새 자료만 보지 않고 첫 자료와 함께 더해요.</p></article><article><h2>4. 확정하지 않기</h2><p>0/10이어도 불가능은 아니고, 10/10이어도 반드시는 아니에요.</p></article><article className="concept-wide"><h2>5. 차례라고 정하지 않기</h2><p>같은 결과가 이어져도 반대 결과가 나올 차례라고 말할 수 없어요.</p></article></div><SourceOverclaimPractice state={overclaim} onWrong={wrong} onRight={right} /><div className="practice-line"><strong>연습:</strong> 4/8은 어디에 있나요? <span>0보다 큼 · <b>1/2</b> · 1보다 작음</span></div><button className="primary" onClick={onPractice}>안내 연습 시작</button></section>;
}

function SourceOverclaimPractice({ state, onWrong, onRight }: { state: { none: boolean; all: boolean; feedback: Feedback }; onWrong: () => void; onRight: (key: "none" | "all") => void }) {
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (state.feedback?.tone === "error") feedbackRef.current?.focus(); }, [state.feedback]);
  return <section className="overclaim-practice" aria-labelledby="overclaim-title"><h2 id="overclaim-title">관찰 자료 말 고르기</h2><p>자료에서 보인 횟수는 다음 결과를 확정하지 않아요.</p><div className="overclaim-options"><fieldset><legend>0/10을 관찰했어요.</legend><button type="button" data-testid="source-overclaim-wrong-none" onClick={onWrong}>불가능</button><button type="button" data-testid="source-overclaim-right-none" onClick={() => onRight("none")}>지금 자료에서는 아직 나오지 않았어요</button>{state.none && <strong>확인</strong>}</fieldset><fieldset><legend>10/10을 관찰했어요.</legend><button type="button" data-testid="source-overclaim-wrong-all" onClick={onWrong}>반드시</button><button type="button" data-testid="source-overclaim-right-all" onClick={() => onRight("all")}>지금 자료에서는 매번 나타났어요</button>{state.all && <strong>확인</strong>}</fieldset></div>{state.feedback && <div ref={feedbackRef} className={`feedback-banner ${state.feedback.tone}`} data-testid="source-overclaim-feedback" role={state.feedback.tone === "error" ? "alert" : "status"} tabIndex={-1}><strong>{state.feedback.tone === "error" ? "다시 확인해요" : "잘했어요"}</strong><span>{state.feedback.message}</span></div>}</section>;
}
