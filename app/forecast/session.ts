import { accumulateBatches, countOutcomes } from "../domain/accumulation";
import { classifyWordForecast } from "../domain/forecasts";
import { calculateKnownModelProbability } from "../domain/known-model";
import type { Fraction, WordForecast } from "../domain/types";
import type { ForecastActivity } from "../content/schema";

export type RevisionChoice = "keep" | "change" | "need-more-data";

export type LearningStage =
  | "start"
  | "concept"
  | "condition"
  | "first-count"
  | "first-forecast"
  | "provisional-decision"
  | "reveal"
  | "cumulative"
  | "revised-forecast"
  | "revised-decision"
  | "evidence"
  | "record"
  | "summary";

export type MissionAnswers = {
  firstForecast?: WordForecast;
  finalForecast?: WordForecast;
  firstDecision?: string;
  finalDecision?: string;
  revision?: RevisionChoice;
  evidence: string[];
};

export type CountSelection = { numerator?: string; denominator?: string };
export type CountSelections = Record<string, CountSelection>;

export type ForecastRecord = {
  missionId: string;
  title: string;
  sourceKind: ForecastActivity["sourceKind"];
  first: { primary: Fraction; all: Record<string, Fraction> };
  final: { primary: Fraction; all: Record<string, Fraction> };
  firstForecast?: WordForecast;
  finalForecast?: WordForecast;
  firstDecision?: string;
  finalDecision?: string;
  firstDecisionLabel?: string;
  finalDecisionLabel?: string;
  revision?: RevisionChoice;
  evidence: string[];
};

export type Session = {
  missionIndex: number;
  stage: LearningStage;
  answers: MissionAnswers;
  records: ForecastRecord[];
};

export function createSession(): Session {
  return { missionIndex: 0, stage: "start", answers: { evidence: [] }, records: [] };
}

export function restartSession(): Session {
  return createSession();
}

export function activityCounts(
  activity: ForecastActivity,
  batchCount: 1 | 2,
): Record<string, Fraction> {
  return Object.fromEntries(activity.streams.map((stream) => {
    const first = stream.batches[0].results;
    const next = stream.batches[1];
    const fraction = batchCount === 1 || !next
      ? countOutcomes(first, stream.targetOutcome)
      : accumulateBatches(first, next.results, stream.targetOutcome);
    return [stream.id, fraction];
  }));
}

export function isFirstCountChoiceCorrect(
  activity: ForecastActivity,
  numerator?: string,
  denominator?: string,
): boolean {
  const expected = activityCounts(activity, 1)[activity.primaryStreamId];
  return Number(numerator) === expected.numerator && Number(denominator) === expected.denominator;
}

export function isCountSelectionCorrect(
  activity: ForecastActivity,
  batchCount: 1 | 2,
  selections: CountSelections,
): boolean {
  const expected = activityCounts(activity, batchCount);
  return activity.streams.every((stream) => {
    const choice = selections[stream.id];
    const fraction = expected[stream.id];
    if (choice?.numerator === undefined || choice.numerator === "" || choice?.denominator === undefined || choice.denominator === "") return false;
    return Number(choice.numerator) === fraction.numerator
      && Number(choice?.denominator) === fraction.denominator;
  });
}

export function countSelectionError(
  activity: ForecastActivity,
  batchCount: 1 | 2,
  selections: CountSelections,
): "fraction-mismatch" | "count-mismatch" | null {
  if (isCountSelectionCorrect(activity, batchCount, selections)) return null;
  const expected = activityCounts(activity, batchCount);
  const incomplete = activity.streams.some((stream) => {
    const choice = selections[stream.id];
    return choice?.numerator === undefined || choice.numerator === "" || choice?.denominator === undefined || choice.denominator === "";
  });
  if (incomplete) return "count-mismatch";
  const reversed = activity.streams.some((stream) => {
    const choice = selections[stream.id];
    const fraction = expected[stream.id];
    return fraction.numerator !== fraction.denominator
      && Number(choice?.numerator) === fraction.denominator
      && Number(choice?.denominator) === fraction.numerator;
  });
  return reversed ? "fraction-mismatch" : "count-mismatch";
}

export function isForecastCorrect(
  activity: ForecastActivity,
  batchCount: 1 | 2,
  forecast?: WordForecast,
): boolean {
  return forecast === activity.checkpoints[batchCount - 1]?.wordForecast;
}

export function isDecisionCorrect(
  activity: ForecastActivity,
  batchCount: 1 | 2,
  decision?: string,
): boolean {
  return decision === activity.checkpoints[batchCount - 1]?.reviewedDecision;
}

export function expectedRevision(activity: ForecastActivity): RevisionChoice {
  const first = activity.checkpoints[0];
  const final = activity.checkpoints[1];
  if (!final || final.reviewedDecision === "need-more-data") return "need-more-data";
  return first.wordForecast === final.wordForecast && first.reviewedDecision === final.reviewedDecision
    ? "keep"
    : "change";
}

export function nextStageAfterDecision(activity: ForecastActivity): LearningStage {
  return activity.activityKind === "tutorial" ? "evidence" : "reveal";
}

export function upsertRecord(records: ForecastRecord[], record: ForecastRecord): ForecastRecord[] {
  const existingIndex = records.findIndex(({ missionId }) => missionId === record.missionId);
  if (existingIndex === -1) return [...records, record];
  return records.map((current) => current.missionId === record.missionId ? record : current);
}

export function answersAfterGoingBack(stage: LearningStage, answers: MissionAnswers): MissionAnswers {
  const base = { ...answers, evidence: [] as string[] };
  if (stage === "record") return base;
  if (stage === "evidence") return { ...base, revision: undefined };
  if (stage === "revised-decision") return { ...base, finalDecision: undefined, revision: undefined };
  if (stage === "revised-forecast") return { ...base, finalForecast: undefined, finalDecision: undefined, revision: undefined };
  if (stage === "cumulative" || stage === "reveal") return { ...base, finalForecast: undefined, finalDecision: undefined, revision: undefined };
  if (stage === "provisional-decision") return { ...base, firstDecision: undefined, finalForecast: undefined, finalDecision: undefined, revision: undefined };
  return { evidence: [] };
}

export function knownModelFraction(activity: ForecastActivity): Fraction | undefined {
  if (!activity.knownModel) return undefined;
  const stream = activity.streams.find(({ id }) => id === activity.primaryStreamId);
  if (!stream) return undefined;
  return calculateKnownModelProbability({
    outcomes: activity.knownModel.outcomes,
    targetOutcomes: activity.knownModel.eventOutcomesByStream[stream.id],
    equallyLikely: activity.knownModel.equallyLikely,
  });
}

export function expectedForecast(
  activity: ForecastActivity,
  batchCount: 1 | 2,
): WordForecast {
  const fraction = activity.sourceKind === "known-model"
    ? knownModelFraction(activity)!
    : activityCounts(activity, batchCount)[activity.primaryStreamId];
  return classifyWordForecast(activity.sourceKind, fraction);
}

export function saveRecord(
  session: Session,
  activity: ForecastActivity,
  answers: MissionAnswers = session.answers,
): ForecastRecord {
  const first = activityCounts(activity, 1);
  const final = activityCounts(activity, 2);
  return {
    missionId: activity.id,
    title: activity.title,
    sourceKind: activity.sourceKind,
    first: { primary: first[activity.primaryStreamId], all: first },
    final: { primary: final[activity.primaryStreamId], all: final },
    firstForecast: answers.firstForecast,
    finalForecast: answers.finalForecast,
    firstDecision: answers.firstDecision,
    finalDecision: answers.finalDecision,
    firstDecisionLabel: decisionLabel(activity, answers.firstDecision),
    finalDecisionLabel: decisionLabel(activity, answers.finalDecision),
    revision: answers.revision,
    evidence: answers.evidence,
  };
}

export function decisionLabel(activity: ForecastActivity, decision?: string): string | undefined {
  if (!decision) return undefined;
  if (decision === "need-more-data") return "같음 · 자료 더 보기";
  if (decision === "even") return "반반";
  return activity.streams.find((stream) => stream.id === decision)?.label ?? decision;
}

export const wordLabels: Record<WordForecast, string> = {
  impossible: "일어날 수 없어요",
  "observed-none": "지금 자료에서는 아직 나오지 않았어요",
  "less-likely": "일어날 것 같지 않아요",
  even: "반반이에요",
  "more-likely": "일어날 것 같아요",
  "observed-all": "지금 자료에서는 매번 나타났어요",
  certain: "반드시 일어나요",
};

export const stageNames: Record<LearningStage, string> = {
  start: "시작",
  concept: "개념 안내",
  condition: "조건 확인",
  "first-count": "첫 자료",
  "first-forecast": "첫 예보",
  "provisional-decision": "임시 선택",
  reveal: "새 자료",
  cumulative: "누적 자료",
  "revised-forecast": "최종 예보",
  "revised-decision": "최종 선택",
  evidence: "근거 연결",
  record: "전후 기록",
  summary: "최종 요약",
};
