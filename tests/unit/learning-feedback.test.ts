import { describe, expect, it } from "vitest";

import { missions } from "../../app/content/missions";
import { tutorialActivity } from "../../app/content/tutorial";
import {
  countErrorMessage,
  decisionErrorMessage,
  forecastErrorMessage,
  revisionErrorMessage,
} from "../../app/forecast/feedback";

describe("초등학생용 다시 풀기 안내", () => {
  it("빈 횟수 칸과 틀린 횟수에 서로 다른 다음 행동을 알려 줍니다", () => {
    expect(countErrorMessage(tutorialActivity, 1, "incomplete")).toContain("아직 고르지 않은 칸");
    expect(countErrorMessage(tutorialActivity, 1, "incomplete")).toContain("모든 나온 횟수와 전체 횟수");
    expect(countErrorMessage(tutorialActivity, 1, "count-mismatch")).toContain("손가락으로");
  });

  it("가능성 말과 선택을 고르지 않은 경우 먼저 한 가지를 고르라고 알려 줍니다", () => {
    expect(forecastErrorMessage(true)).toContain("아직 가능성 말을 고르지 않았어요");
    expect(decisionErrorMessage(1, true)).toContain("아직 첫 선택을 고르지 않았어요");
    expect(decisionErrorMessage(2, true)).toContain("아직 최종 선택을 고르지 않았어요");
  });

  it("같은 비율 미션에서는 왜 자료를 더 봐야 하는지 바로 설명합니다", () => {
    expect(revisionErrorMessage(missions[3], "keep")).toContain("두 자료의 비율이 같아");
    expect(revisionErrorMessage(missions[3], "keep")).toContain("자료를 더 보기");
  });
});
