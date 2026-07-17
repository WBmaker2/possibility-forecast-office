import { describe, expect, it } from "vitest";

import { missions } from "../../app/content/missions";
import { tutorialActivity } from "../../app/content/tutorial";
import {
  activityCounts,
  countSelectionError,
  createSession,
  expectedForecast,
  isFirstCountChoiceCorrect,
  isCountSelectionCorrect,
  isDecisionCorrect,
  isForecastCorrect,
  expectedRevision,
  nextStageAfterDecision,
  upsertRecord,
  answersAfterGoingBack,
  saveRecord,
  restartSession,
} from "../../app/forecast/session";
import { journeyProgress } from "../../app/forecast/progress";

describe("학습 세션 계산", () => {
  it("안내 연습과 다섯 미션을 하나의 여섯 활동 여정으로 계산합니다", () => {
    expect(journeyProgress({ stage: "start" })).toMatchObject({ currentActivity: 0, totalActivities: 6, percent: 0 });
    expect(journeyProgress({ stage: "first-count", activeKind: "tutorial" })).toMatchObject({ activityLabel: "안내 연습", currentActivity: 1, totalActivities: 6, percent: 3 });
    expect(journeyProgress({ stage: "condition", activeKind: "mission", missionIndex: 0 })).toMatchObject({ activityLabel: "미션 1", currentActivity: 2, totalActivities: 6, percent: 18 });
    expect(journeyProgress({ stage: "record", activeKind: "mission", missionIndex: 4 })).toMatchObject({ currentActivity: 6, totalActivities: 6, percent: 100 });
    expect(journeyProgress({ stage: "summary" })).toMatchObject({ currentActivity: 6, totalActivities: 6, percent: 100 });
  });

  it("첫 자료와 두 묶음 누적값을 콘텐츠 결과에서 계산합니다", () => {
    const mission = missions[1];
    expect(activityCounts(mission, 1).star).toEqual({ numerator: 8, denominator: 10 });
    expect(activityCounts(mission, 2).star).toEqual({ numerator: 9, denominator: 20 });
  });

  it("알려진 구조와 관찰 자료의 예보 근거를 구분합니다", () => {
    expect(expectedForecast(missions[0], 1)).toBe("less-likely");
    expect(expectedForecast(missions[1], 2)).toBe("less-likely");
  });

  it("새 묶음이 없는 안내 연습도 누적 표시 경로에서 안전하게 첫 자료를 사용합니다", () => {
    expect(activityCounts(tutorialActivity, 2).blue).toEqual({ numerator: 4, denominator: 6 });
  });

  it("첫 자료의 횟수가 맞을 때만 다음 단계로 갈 수 있습니다", () => {
    expect(isFirstCountChoiceCorrect(missions[1], "8", "10")).toBe(true);
    expect(isFirstCountChoiceCorrect(missions[1], "1", "10")).toBe(false);
    expect(isFirstCountChoiceCorrect(missions[1], undefined, "10")).toBe(false);
  });

  it("안내 연습은 임시 선택 뒤 새 자료 공개가 아니라 근거 단계로 안전하게 이동합니다", () => {
    expect(nextStageAfterDecision(tutorialActivity)).toBe("evidence");
    expect(nextStageAfterDecision(missions[0])).toBe("reveal");
  });

  it("모든 스트림의 첫·누적 횟수를 콘텐츠 값과 비교합니다", () => {
    expect(isCountSelectionCorrect(missions[2], 1, {
      "route-a": { numerator: "8", denominator: "10" },
      "route-b": { numerator: "6", denominator: "10" },
    })).toBe(true);
    expect(isCountSelectionCorrect(missions[2], 2, {
      "route-a": { numerator: "10", denominator: "20" },
      "route-b": { numerator: "7", denominator: "20" },
    })).toBe(false);
  });

  it("분자와 분모를 뒤집으면 일반 횟수 오류와 다르게 안내합니다", () => {
    expect(countSelectionError(missions[1], 1, {
      star: { numerator: "10", denominator: "8" },
    })).toBe("fraction-mismatch");
    expect(countSelectionError(missions[1], 1, {
      star: { numerator: "7", denominator: "10" },
    })).toBe("count-mismatch");
    expect(countSelectionError(missions[1], 1, {
      star: { numerator: "8", denominator: "10" },
    })).toBeNull();
  });

  it("0을 고른 뒤 다시 고르기로 되돌린 빈 선택은 0/5 정답으로 처리하지 않습니다", () => {
    const streakMission = missions[4];
    const selections = {
      red: { numerator: "5", denominator: "5" },
      blue: { numerator: "", denominator: "5" },
    };

    expect(isCountSelectionCorrect(streakMission, 1, selections)).toBe(false);
    expect(countSelectionError(streakMission, 1, selections)).toBe("count-mismatch");
  });

  it("예보·판단·유지 수정 선택을 checkpoint와 비교합니다", () => {
    expect(isForecastCorrect(missions[1], 1, "more-likely")).toBe(true);
    expect(isForecastCorrect(missions[1], 1, "less-likely")).toBe(false);
    expect(isDecisionCorrect(missions[2], 2, "route-b")).toBe(true);
    expect(isDecisionCorrect(missions[2], 2, "route-a")).toBe(false);
    expect(expectedRevision(missions[0])).toBe("keep");
    expect(expectedRevision(missions[1])).toBe("change");
    expect(expectedRevision(missions[2])).toBe("change");
    expect(expectedRevision(missions[3])).toBe("need-more-data");
    expect(expectedRevision(missions[4])).toBe("keep");
  });

  it("한 미션 기록은 upsert되고 이전 단계로 돌아가면 뒤 답을 무효화합니다", () => {
    const session = createSession();
    const first = saveRecord(session, missions[1], { firstForecast: "more-likely", finalForecast: "less-likely", firstDecision: "more-likely", finalDecision: "less-likely", revision: "change", evidence: ["x"] });
    const replacement = { ...first, revision: "keep" as const };
    expect(upsertRecord([first], replacement)).toEqual([replacement]);
    expect(answersAfterGoingBack("revised-decision", { firstForecast: "more-likely", finalForecast: "less-likely", firstDecision: "more-likely", finalDecision: "less-likely", revision: "change", evidence: ["x"] })).toEqual({ firstForecast: "more-likely", finalForecast: "less-likely", firstDecision: "more-likely", evidence: [] });
  });

  it("다시 예보하기는 기존 기록을 버린 새 세션으로 시작합니다", () => {
    const record = saveRecord(createSession(), missions[0]);
    const completedSession = { ...createSession(), missionIndex: 4, stage: "summary" as const, records: [record] };
    const restarted = restartSession();
    expect(completedSession.records).toHaveLength(1);
    expect(restarted).toEqual(createSession());
  });

  it("기록은 점수 없이 전후 선택만 읽기 전용 요약으로 남깁니다", () => {
    const session = createSession();
    const record = saveRecord(session, missions[1], {
      firstForecast: "more-likely",
      finalForecast: "less-likely",
      firstDecision: "more-likely",
      finalDecision: "less-likely",
      revision: "change",
      evidence: ["첫 자료와 새 자료를 합친 9/20을 사용해요."],
    });

    expect(record.first.primary).toEqual({ numerator: 8, denominator: 10 });
    expect(record.final.primary).toEqual({ numerator: 9, denominator: 20 });
    expect(record.revision).toBe("change");
    expect(JSON.stringify(record)).not.toMatch(/score|time|attempt/i);
  });
});
