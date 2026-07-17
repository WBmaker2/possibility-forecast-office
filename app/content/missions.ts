import { batch } from "./factories";
import type { ForecastActivity, ResultBatch } from "./schema";

const directionFirst = ["blue", "green", "blue", "gray", "green", "blue", "green", "green", "gray", "blue", "green", "blue"];
const directionNext = ["green", "blue", "green", "gray", "green", "blue", "green", "green", "gray", "blue", "green", "green"];
const redFirst = ["red", "red", "red", "red", "red"];
const redNext = ["red", "blue", "red", "blue", "blue"];
const directionLabels: Record<string, string> = {
  blue: "파랑 신호",
  green: "초록 신호",
  gray: "회색 신호",
};

function duplicateBatches(targetOutcome: string): ResultBatch[] {
  return [batch("first", redFirst, targetOutcome), batch("new", redNext, targetOutcome)];
}

export const missions: ForecastActivity[] = [
  {
    id: "known-direction-board",
    order: 1,
    title: "탐사 방향 신호판",
    contentVersion: "2026-07-17.1",
    activityKind: "mission",
    sourceKind: "known-model",
    outcomes: [
      { id: "blue", label: "파랑 신호" },
      { id: "green", label: "초록 신호" },
      { id: "gray", label: "회색 신호" },
    ],
    knownModel: {
      equallyLikely: true,
      outcomes: ["blue", "blue", "green", "green", "green", "gray"],
      eventOutcomesByStream: { blue: ["blue"], green: ["green"], gray: ["gray"] },
      replacementRule: "매번 같은 신호판으로 다시 실행합니다.",
    },
    streams: ["blue", "green", "gray"].map((targetOutcome) => ({
      id: targetOutcome,
      label: directionLabels[targetOutcome],
      targetOutcome,
      batches: [batch("first", directionFirst, targetOutcome), batch("new", directionNext, targetOutcome)],
    })),
    primaryStreamId: "blue",
    checkpoints: [
      { visibleBatchCount: 1, expectedCounts: { blue: { numerator: 5, denominator: 12 }, green: { numerator: 5, denominator: 12 }, gray: { numerator: 2, denominator: 12 } }, wordForecast: "less-likely", reviewedDecision: "green" },
      { visibleBatchCount: 2, expectedCounts: { blue: { numerator: 8, denominator: 24 }, green: { numerator: 12, denominator: 24 }, gray: { numerator: 4, denominator: 24 } }, wordForecast: "less-likely", reviewedDecision: "green" },
    ],
    publicDecisionRule: { kind: "higher-known-model", text: "장치에서 계산한 가능성이 더 큰 신호를 고릅니다.", options: ["blue", "green"] },
    evidenceOptions: ["파랑은 2/6, 초록은 3/6이에요."],
    explanation: "첫 관찰 자료에서 동수여도 장치 구조의 계산값은 바뀌지 않아요.",
    misconceptionNote: "관찰 횟수가 같다고 알려진 구조의 가능성도 같아지는 것은 아니에요.",
  },
  {
    id: "mystery-star-emitter",
    order: 2,
    title: "미스터리 별 신호기",
    contentVersion: "2026-07-17.1",
    activityKind: "mission",
    sourceKind: "observed-only",
    outcomes: [{ id: "star", label: "별 신호" }, { id: "circle", label: "동그라미 신호" }],
    streams: [{
      id: "star",
      label: "별 신호",
      targetOutcome: "star",
      batches: [batch("first", ["star", "star", "circle", "star", "star", "star", "circle", "star", "star", "star"], "star"), batch("new", ["star", "circle", "circle", "circle", "circle", "circle", "circle", "circle", "circle", "circle"], "star")],
    }],
    primaryStreamId: "star",
    checkpoints: [
      { visibleBatchCount: 1, expectedCounts: { star: { numerator: 8, denominator: 10 } }, wordForecast: "more-likely", reviewedDecision: "more-likely" },
      { visibleBatchCount: 2, expectedCounts: { star: { numerator: 9, denominator: 20 } }, wordForecast: "less-likely", reviewedDecision: "less-likely" },
    ],
    publicDecisionRule: { kind: "forecast-only", text: "누적 자료 비율로 지금의 말 예보를 고릅니다.", options: ["more-likely", "less-likely"] },
    evidenceOptions: ["첫 자료와 새 자료를 합친 9/20을 사용해요."],
    explanation: "새 묶음 1/10만 보지 않고 누적 9/20으로 예보를 다시 살펴봐요.",
    misconceptionNote: "자료가 0이나 1이 아니어도 다음 결과를 확정할 수 없어요.",
  },
  {
    id: "two-route-decision",
    order: 3,
    title: "탐사 통로 선택 회의",
    contentVersion: "2026-07-17.1",
    activityKind: "mission",
    sourceKind: "observed-only",
    outcomes: [{ id: "pass", label: "통과" }, { id: "stop", label: "멈춤" }],
    streams: [
      { id: "route-a", label: "A 통로 통과", targetOutcome: "pass", batches: [batch("first", ["pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass", "stop", "stop"], "pass"), batch("new", ["pass", "pass", "stop", "stop", "stop", "stop", "stop", "stop", "stop", "stop"], "pass")] },
      { id: "route-b", label: "B 통로 통과", targetOutcome: "pass", batches: [batch("first", ["pass", "pass", "pass", "pass", "pass", "pass", "stop", "stop", "stop", "stop"], "pass"), batch("new", ["pass", "pass", "pass", "pass", "pass", "pass", "pass", "stop", "stop", "stop"], "pass")] },
    ],
    primaryStreamId: "route-a",
    checkpoints: [
      { visibleBatchCount: 1, expectedCounts: { "route-a": { numerator: 8, denominator: 10 }, "route-b": { numerator: 6, denominator: 10 } }, wordForecast: "more-likely", reviewedDecision: "route-a" },
      { visibleBatchCount: 2, expectedCounts: { "route-a": { numerator: 10, denominator: 20 }, "route-b": { numerator: 13, denominator: 20 } }, wordForecast: "even", reviewedDecision: "route-b" },
    ],
    publicDecisionRule: { kind: "higher-observed-rate", text: "같은 횟수로 시험했고, 누적 통과 비율이 더 큰 통로를 고릅니다. 같으면 자료 더 보기를 고릅니다.", options: ["route-a", "route-b", "need-more-data"] },
    evidenceOptions: ["두 통로 모두 20번 자료를 비교해요."],
    explanation: "첫 선택을 고집하지 않고 누적 통과 비율로 바꿀 수 있어요.",
    misconceptionNote: "이 가상 장치 시험은 실제 통로나 안전을 보장하지 않아요.",
  },
  {
    id: "same-rate-different-count",
    order: 4,
    title: "같은 비율, 다른 자료량",
    contentVersion: "2026-07-17.1",
    activityKind: "mission",
    sourceKind: "observed-only",
    outcomes: [{ id: "blue", label: "파란 표식" }, { id: "white", label: "흰 표식" }],
    streams: [
      { id: "sample-a-blue", label: "A 자료의 파란 표식", targetOutcome: "blue", batches: [batch("first", ["blue", "blue", "blue", "blue", "white"], "blue"), batch("new", ["blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "white", "white", "white"], "blue")] },
      { id: "sample-b-blue", label: "B 자료의 파란 표식", targetOutcome: "blue", batches: [batch("first", [...Array(16).fill("blue"), ...Array(4).fill("white")], "blue"), batch("new", [...Array(16).fill("blue"), ...Array(4).fill("white")], "blue")] },
    ],
    primaryStreamId: "sample-a-blue",
    checkpoints: [
      { visibleBatchCount: 1, expectedCounts: { "sample-a-blue": { numerator: 4, denominator: 5 }, "sample-b-blue": { numerator: 16, denominator: 20 } }, wordForecast: "more-likely", reviewedDecision: "need-more-data" },
      { visibleBatchCount: 2, expectedCounts: { "sample-a-blue": { numerator: 16, denominator: 20 }, "sample-b-blue": { numerator: 32, denominator: 40 } }, wordForecast: "more-likely", reviewedDecision: "need-more-data" },
    ],
    publicDecisionRule: { kind: "same-rate-need-more-data", text: "자료 비율이 같으면 어느 쪽도 더 크다고 고르지 않고 자료 더 보기를 고릅니다.", options: ["sample-a-blue", "sample-b-blue", "need-more-data"] },
    evidenceOptions: ["4/5와 16/20은 같은 비율이에요.", "B 자료는 실험 횟수가 더 많아요."],
    explanation: "나온 횟수만으로 가능성이 더 크다고 말하지 않아요.",
    misconceptionNote: "더 많이 실험한 것과 가능성이 더 큰 것은 같은 말이 아니에요.",
  },
  {
    id: "streak-is-not-a-turn",
    order: 5,
    title: "연속 결과 경보",
    contentVersion: "2026-07-17.1",
    activityKind: "mission",
    sourceKind: "known-model",
    outcomes: [{ id: "red", label: "빨강" }, { id: "blue", label: "파랑" }],
    knownModel: {
      equallyLikely: true,
      outcomes: ["red", "blue"],
      eventOutcomesByStream: { red: ["red"], blue: ["blue"] },
      replacementRule: "앞 결과와 관계없이 매번 같은 조건으로 다시 실행합니다.",
    },
    streams: [
      { id: "red", label: "빨강", targetOutcome: "red", batches: duplicateBatches("red") },
      { id: "blue", label: "파랑", targetOutcome: "blue", batches: duplicateBatches("blue") },
    ],
    primaryStreamId: "red",
    checkpoints: [
      { visibleBatchCount: 1, expectedCounts: { red: { numerator: 5, denominator: 5 }, blue: { numerator: 0, denominator: 5 } }, wordForecast: "even", reviewedDecision: "even" },
      { visibleBatchCount: 2, expectedCounts: { red: { numerator: 7, denominator: 10 }, blue: { numerator: 3, denominator: 10 } }, wordForecast: "even", reviewedDecision: "even" },
    ],
    publicDecisionRule: { kind: "known-model-next-trial", text: "다음 한 번은 장치 구조의 가능성으로 판단합니다.", options: ["even"] },
    evidenceOptions: ["빨강이 이어져도 파랑이 나올 차례라고 정할 수 없어요."],
    explanation: "다음 빨강·파랑은 여전히 반반이에요.",
    misconceptionNote: "연속 결과가 다음 반대 결과를 보장하지 않아요.",
  },
];
