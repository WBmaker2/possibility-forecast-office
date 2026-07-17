import { describe, expect, it } from "vitest";

import {
  addFractions,
  compareFractions,
  createFraction,
  reduceFraction,
  relationToHalf,
} from "../../app/domain/fractions";
import { classifyWordForecast } from "../../app/domain/forecasts";
import { calculateKnownModelProbability } from "../../app/domain/known-model";
import { accumulateBatches, countOutcomes } from "../../app/domain/accumulation";
import { tutorialActivity } from "../../app/content/tutorial";
import { missions } from "../../app/content/missions";
import { validateContent } from "../../app/content/validate-content";

describe("분수와 누적 도메인", () => {
  it("0/n, n/n, 일반 분수를 약분하고 범위를 벗어난 분수는 거부합니다", () => {
    expect(reduceFraction(createFraction(0, 24))).toEqual({ numerator: 0, denominator: 1 });
    expect(reduceFraction(createFraction(24, 24))).toEqual({ numerator: 1, denominator: 1 });
    expect(reduceFraction(createFraction(8, 24))).toEqual({ numerator: 1, denominator: 3 });
    expect(() => createFraction(1, 0)).toThrow("denominator");
    expect(() => createFraction(-1, 3)).toThrow("numerator");
    expect(() => createFraction(4, 3)).toThrow("numerator");
  });

  it("부동소수점 대신 교차 곱으로 비교하고 1/2 위치를 구분합니다", () => {
    expect(compareFractions(createFraction(1, 3), createFraction(2, 5))).toBeLessThan(0);
    expect(compareFractions(createFraction(4, 5), createFraction(16, 20))).toBe(0);
    expect(relationToHalf(createFraction(9, 20))).toBe("below");
    expect(relationToHalf(createFraction(1, 2))).toBe("equal");
    expect(relationToHalf(createFraction(13, 20))).toBe("above");
  });

  it("첫 묶음과 새 묶음을 사건 횟수와 전체 횟수로 누적합니다", () => {
    const first = countOutcomes(["star", "star", "circle"], "star");
    const next = countOutcomes(["circle", "star"], "star");
    expect(first).toEqual({ numerator: 2, denominator: 3 });
    expect(addFractions(first, next)).toEqual({ numerator: 3, denominator: 5 });
    expect(accumulateBatches(["star", "star", "circle"], ["circle", "star"], "star"))
      .toEqual({ numerator: 3, denominator: 5 });
  });
});

describe("출처별 말 예보와 알려진 구조", () => {
  it("known-model의 0/1과 observed-only의 0/n, n/n을 다르게 표현합니다", () => {
    expect(classifyWordForecast("known-model", createFraction(0, 8))).toBe("impossible");
    expect(classifyWordForecast("known-model", createFraction(8, 8))).toBe("certain");
    expect(classifyWordForecast("observed-only", createFraction(0, 8))).toBe("observed-none");
    expect(classifyWordForecast("observed-only", createFraction(8, 8))).toBe("observed-all");
    expect(classifyWordForecast("observed-only", createFraction(4, 6))).toBe("more-likely");
  });

  it("같은 가능성의 기본 결과에서 사건 확률을 다시 계산합니다", () => {
    expect(calculateKnownModelProbability({
      outcomes: ["blue", "blue", "green", "green", "green", "gray"],
      targetOutcomes: ["blue"],
      equallyLikely: true,
    })).toEqual({ numerator: 2, denominator: 6 });
    expect(() => calculateKnownModelProbability({
      outcomes: ["blue"], targetOutcomes: ["blue"], equallyLikely: false,
    })).toThrow("equally likely");
  });
});

type BatchExpectation = {
  first: [number, number];
  next: [number, number];
  cumulative: [number, number];
};

const expectedMissionCounts: Record<string, Record<string, BatchExpectation>> = {
  "known-direction-board": {
    blue: { first: [5, 12], next: [3, 12], cumulative: [8, 24] },
    green: { first: [5, 12], next: [7, 12], cumulative: [12, 24] },
    gray: { first: [2, 12], next: [2, 12], cumulative: [4, 24] },
  },
  "mystery-star-emitter": { star: { first: [8, 10], next: [1, 10], cumulative: [9, 20] } },
  "two-route-decision": {
    "route-a": { first: [8, 10], next: [2, 10], cumulative: [10, 20] },
    "route-b": { first: [6, 10], next: [7, 10], cumulative: [13, 20] },
  },
  "same-rate-different-count": {
    "sample-a-blue": { first: [4, 5], next: [12, 15], cumulative: [16, 20] },
    "sample-b-blue": { first: [16, 20], next: [16, 20], cumulative: [32, 40] },
  },
  "streak-is-not-a-turn": {
    red: { first: [5, 5], next: [2, 5], cumulative: [7, 10] },
    blue: { first: [0, 5], next: [3, 5], cumulative: [3, 10] },
  },
};

describe("고정 콘텐츠", () => {
  it("안내 활동과 일반 미션 5개가 콘텐츠 불변 조건을 충족합니다", () => {
    expect(tutorialActivity.id).toBe("tutorial-color-signal");
    expect(missions).toHaveLength(5);
    expect(validateContent([tutorialActivity, ...missions])).toEqual([]);
  });

  it("안내 활동의 관찰 자료는 파랑 4/6입니다", () => {
    const stream = tutorialActivity.streams[0];
    expect(countOutcomes(stream.batches[0].results, stream.targetOutcome))
      .toEqual({ numerator: 4, denominator: 6 });
  });

  it.each(Object.entries(expectedMissionCounts))("%s의 첫·새·누적 기대값이 맞습니다", (id, expected) => {
    const mission = missions.find((candidate) => candidate.id === id);
    expect(mission).toBeDefined();

    for (const stream of mission!.streams) {
      const [first, next] = stream.batches;
      const target = stream.targetOutcome;
      const counts = expected[stream.id];

      expect(countOutcomes(first.results, target)).toEqual({
        numerator: counts.first[0], denominator: counts.first[1],
      });
      expect(countOutcomes(next.results, target)).toEqual({
        numerator: counts.next[0], denominator: counts.next[1],
      });
      expect(accumulateBatches(first.results, next.results, target)).toEqual({
        numerator: counts.cumulative[0], denominator: counts.cumulative[1],
      });
    }
  });

  it("알려진 구조의 사건은 스트림 목표 결과와 같은 모델 결과를 연결해야 합니다", () => {
    const invalidMission = structuredClone(missions[0]);
    invalidMission.knownModel!.eventOutcomesByStream.blue = ["green"];

    expect(validateContent([invalidMission])).toContainEqual(
      expect.stringContaining("does not match stream target outcome"),
    );
  });

  it("검수된 판단과 재계산된 판단은 모두 공개 선택지 안에 있어야 합니다", () => {
    const invalidReviewedDecision = structuredClone(missions[0]);
    invalidReviewedDecision.checkpoints[0].reviewedDecision = "not-an-option";

    expect(validateContent([invalidReviewedDecision])).toContainEqual(
      expect.stringContaining("reviewed decision is not a public option"),
    );

    const missingTieOption = structuredClone(missions[3]);
    missingTieOption.publicDecisionRule.options = ["sample-a-blue", "sample-b-blue"];

    expect(validateContent([missingTieOption])).toContainEqual(
      expect.stringContaining("recalculated decision is not a public option"),
    );
  });

  it("모든 학생 노출 문자열에서 범위 밖 주제를 찾습니다", () => {
    const invalidMission = structuredClone(missions[0]);
    invalidMission.publicDecisionRule.text = "도박 규칙";
    invalidMission.evidenceOptions = ["복권 자료"];
    invalidMission.outcomes[0].label = "투자 신호";
    invalidMission.streams[0].label = "보험 신호";

    expect(validateContent([invalidMission])).toContainEqual(
      expect.stringContaining("includes out-of-scope content"),
    );
  });

  it.each([
    ["0/n", "circle", "impossible"],
    ["n/n", "star", "certain"],
  ] as const)("관찰 자료 %s를 불가능·확실로 과장하면 콘텐츠 오류입니다", (_, result, wordForecast) => {
    const invalidMission = structuredClone(missions[1]);
    const firstBatch = invalidMission.streams[0].batches[0];
    firstBatch.results = Array(firstBatch.totalTrials).fill(result);
    firstBatch.eventCount = result === "star" ? firstBatch.totalTrials : 0;
    invalidMission.checkpoints[0].expectedCounts.star = {
      numerator: firstBatch.eventCount,
      denominator: firstBatch.totalTrials,
    };
    invalidMission.checkpoints[0].wordForecast = wordForecast;

    expect(validateContent([invalidMission])).toContainEqual(
      expect.stringContaining("observed-only"),
    );
  });
});
