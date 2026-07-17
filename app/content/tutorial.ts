import { batch } from "./factories";
import type { ForecastActivity } from "./schema";

export const tutorialActivity: ForecastActivity = {
  id: "tutorial-color-signal",
  order: 0,
  title: "색 신호판 읽기",
  contentVersion: "2026-07-17.1",
  activityKind: "tutorial",
  sourceKind: "known-model",
  outcomes: [
    { id: "blue", label: "파랑 신호" },
    { id: "yellow", label: "노랑 신호" },
  ],
  knownModel: {
    equallyLikely: true,
    outcomes: ["blue", "blue", "blue", "blue", "yellow", "yellow", "yellow", "yellow"],
    eventOutcomesByStream: { blue: ["blue"] },
    replacementRule: "매번 같은 조건으로 신호판을 다시 확인합니다.",
  },
  streams: [{
    id: "blue",
    label: "파랑 신호",
    targetOutcome: "blue",
    batches: [batch("practice", ["blue", "yellow", "blue", "blue", "yellow", "blue"], "blue")],
  }],
  primaryStreamId: "blue",
  checkpoints: [{
    visibleBatchCount: 1,
    expectedCounts: { blue: { numerator: 4, denominator: 6 } },
    wordForecast: "even",
    reviewedDecision: "even",
  }],
  publicDecisionRule: {
    kind: "forecast-only",
    text: "장치에서 계산한 가능성으로 말 예보를 고릅니다.",
    options: ["even"],
  },
  evidenceOptions: ["장치의 같은 크기 칸은 파랑 4개, 노랑 4개예요."],
  explanation: "관찰 비율이 2/3이라고 장치의 가능성이 2/3으로 바뀐 것은 아니에요.",
  misconceptionNote: "짧은 관찰 자료만으로 장치의 구조를 바꾸어 말하지 않아요.",
};
