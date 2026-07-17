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
    text: "신호판의 칸으로 가능성 말을 고릅니다.",
    options: ["even"],
  },
  evidenceOptions: ["장치의 같은 크기 칸은 파랑 4개, 노랑 4개예요."],
  explanation: "실제로 6번 중 4번 나왔어도 신호판의 칸은 4/8 그대로예요.",
  misconceptionNote: "짧게 본 결과만으로 신호판의 칸이 바뀌었다고 말하지 않아요.",
};
