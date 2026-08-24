import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { missions } from "../../app/content/missions";
import type { ForecastActivity } from "../../app/content/schema";
import { MissionFlow } from "../../app/forecast/MissionFlow";
import {
  activityCounts,
  knownModelFraction,
  type LearningStage,
  type MissionAnswers,
} from "../../app/forecast/session";
import { ActivityCondition } from "../../app/forecast/visuals";

const noAnswers: MissionAnswers = { evidence: [] };
const ignore = () => {};

function renderMissionStage(activity: ForecastActivity, stage: LearningStage) {
  return renderToStaticMarkup(createElement(MissionFlow, {
    activity,
    stage,
    answers: noAnswers,
    headingRef: createRef<HTMLHeadingElement>(),
    firstCounts: activityCounts(activity, 1),
    finalCounts: activityCounts(activity, 2),
    knownFraction: knownModelFraction(activity),
    firstSelections: {},
    cumulativeSelections: {},
    onFirstSelections: ignore,
    onCumulativeSelections: ignore,
    onAnswers: ignore,
    onMove: ignore,
    onCount: ignore,
    onCumulative: ignore,
    onForecast: ignore,
    onFirstDecision: ignore,
    onFinalDecision: ignore,
    onEvidence: ignore,
    onNext: ignore,
  }));
}

describe("학생 화면 문장", () => {
  it("찾을 결과의 받침에 맞춰 '이'와 '가'를 자연스럽게 붙입니다", () => {
    const marker = renderToStaticMarkup(createElement(ActivityCondition, { activity: missions[3] }));
    const color = renderToStaticMarkup(createElement(ActivityCondition, { activity: missions[4] }));

    expect(marker).toContain("파란 표식이 나타남");
    expect(color).toContain("빨강이 나타남");
    expect(marker).not.toContain("파란 표식가 나타남");
    expect(color).not.toContain("빨강가 나타남");
  });

  it("최종 예보의 설명 뒤에는 마침표와 쌍점이 겹치지 않습니다", () => {
    const html = renderMissionStage(missions[0], "revised-forecast");

    expect(html).toContain("신호판의 칸은 그대로예요:");
    expect(html).not.toContain("신호판의 칸은 그대로예요.:");
  });

  it("같은 실행 결과를 여러 항목이 함께 셀 때 결과 그림은 한 번만 보여 줍니다", () => {
    const direction = renderMissionStage(missions[0], "first-count");
    const streak = renderMissionStage(missions[4], "first-count");

    expect(direction.match(/class="result-board"/g)).toHaveLength(1);
    expect(streak.match(/class="result-board"/g)).toHaveLength(1);
    expect(direction).toContain("함께 세는 결과");
  });

  it("모두 합친 횟수 옆에 첫 자료와 새 자료의 덧셈값을 보여 줍니다", () => {
    const html = renderMissionStage(missions[0], "cumulative");

    expect(html).toContain("첫 자료 5번 + 새 자료 3번 = ?");
    expect(html).toContain("전체 12번 + 12번 = ?");
  });

  it("첫 선택 화면에 바로 비교할 자료값을 다시 보여 줍니다", () => {
    const star = renderMissionStage(missions[1], "provisional-decision");
    const routes = renderMissionStage(missions[2], "provisional-decision");

    expect(star).toContain("첫 자료의 별 신호 비율");
    expect(star).toContain("8/10");
    expect(star).not.toContain("모두 합친 결과의 비율");
    expect(routes).toContain("A 통로 통과 8/10");
    expect(routes).toContain("B 통로 통과 6/10");
  });

  it("신호판 예보에는 실제 결과와 예보에 쓸 분수를 나란히 설명합니다", () => {
    const html = renderMissionStage(missions[4], "first-forecast");

    expect(html).toContain("이번에 나온 결과");
    expect(html).toContain("5/5");
    expect(html).toContain("예보에 쓸 신호판의 칸");
    expect(html).toContain("1/2");
  });
});
