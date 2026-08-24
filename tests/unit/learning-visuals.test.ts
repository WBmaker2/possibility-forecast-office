import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { missions } from "../../app/content/missions";
import { MissionFlow } from "../../app/forecast/MissionFlow";
import {
  activityCounts,
  knownModelFraction,
  type MissionAnswers,
} from "../../app/forecast/session";
import { ActivityCondition } from "../../app/forecast/visuals";

const noAnswers: MissionAnswers = { evidence: [] };
const ignore = () => {};

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
    const activity = missions[0];
    const html = renderToStaticMarkup(createElement(MissionFlow, {
      activity,
      stage: "revised-forecast",
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

    expect(html).toContain("신호판의 칸은 그대로예요:");
    expect(html).not.toContain("신호판의 칸은 그대로예요.:");
  });
});
