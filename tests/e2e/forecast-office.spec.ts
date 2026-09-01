import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { missions } from "../../app/content/missions";
import type { ForecastActivity } from "../../app/content/schema";
import { tutorialActivity } from "../../app/content/tutorial";

async function openReadyPage(page: import("@playwright/test").Page, path = "/") {
  await page.goto(path);
  await expect(page.getByTestId("forecast-office")).toHaveAttribute("data-hydrated", "true");
}

test("starts with the learning activity and no framework error", async ({ page }) => {
  await openReadyPage(page);
  await expect(page).toHaveTitle(/가능성 예보국/);
  await expect(page.getByRole("heading", { name: "첫 자료로 예보하고, 새 자료로 다시 살펴봐요." })).toBeVisible();
  await expect(page.locator("text=Application error")).toHaveCount(0);
});

test("experiences the observed-data overclaim correction", async ({ page }) => {
  await openReadyPage(page);
  await page.getByRole("button", { name: "개념 먼저 보기" }).click();
  await page.getByTestId("source-overclaim-wrong-none").click();
  await expect(page.getByTestId("source-overclaim-feedback")).toHaveText(/불가능은 아니에요/);
  await expect(page.locator("body")).not.toContainText("source-overclaim");
  await page.getByTestId("source-overclaim-right-none").click();
  await expect(page.getByTestId("source-overclaim-feedback")).toHaveText(/10번 중 0번/);
  await page.getByTestId("source-overclaim-right-all").click();
  await expect(page.getByTestId("source-overclaim-feedback")).toHaveText(/10번 중 10번/);
});

test("shows a visible, focused count feedback banner before moving on", async ({ page }) => {
  await openReadyPage(page);
  await page.getByTestId("activity-start").click();
  await page.getByTestId("condition-confirm").click();
  await page.getByTestId("first-count-confirm").click();
  const feedback = page.getByTestId("learning-feedback");
  await expect(feedback).toHaveText(/아직 고르지 않은 칸.*모든 나온 횟수와 전체 횟수/);
  await expect(feedback).toBeFocused();
  await expect(page.locator("body")).not.toContainText("count-mismatch");
  await chooseCounts(page, tutorialActivity, 0, "first");
  await page.getByTestId("first-count-confirm").click();
  await page.getByTestId("first-forecast-confirm").click();
  await expect(feedback).toHaveText(/아직 가능성 말을 고르지 않았어요/);
  await page.getByTestId(`forecast-${tutorialActivity.checkpoints[0].wordForecast}`).check();
  await page.getByTestId("first-forecast-confirm").click();
  await page.getByTestId("first-decision-confirm").click();
  await expect(feedback).toHaveText(/아직 첫 선택을 고르지 않았어요/);
});

test("returns focus after closing update history and has no serious axe violations", async ({ page }) => {
  await openReadyPage(page);
  const updateButton = page.getByRole("button", { name: "업데이트 내역" });
  await updateButton.focus();
  await updateButton.click();
  await expect(page.getByRole("dialog", { name: "업데이트 내역" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(updateButton).toBeFocused();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});

test("fits the start, concept, and summary fixture at 320px without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/", "/?fixture=summary"]) {
    await openReadyPage(page, path);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
  await openReadyPage(page);
  await page.getByRole("button", { name: "개념 먼저 보기" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

async function chooseCounts(page: import("@playwright/test").Page, activity: ForecastActivity, checkpointIndex: 0 | 1, prefix: "first" | "cumulative") {
  const counts = activity.checkpoints[checkpointIndex].expectedCounts;
  for (const stream of activity.streams) {
    const fraction = counts[stream.id];
    await page.getByTestId(`${prefix}-${stream.id}-numerator`).selectOption(`${fraction.numerator}`);
    await page.getByTestId(`${prefix}-${stream.id}-denominator`).selectOption(`${fraction.denominator}`);
  }
}

function revisionFor(activity: ForecastActivity) {
  const [first, final] = activity.checkpoints;
  if (final.reviewedDecision === "need-more-data") return "need-more-data";
  return first.wordForecast === final.wordForecast && first.reviewedDecision === final.reviewedDecision ? "keep" : "change";
}

async function finishActivity(page: import("@playwright/test").Page, activity: ForecastActivity) {
  await page.getByTestId("condition-confirm").click();
  await chooseCounts(page, activity, 0, "first");
  await page.getByTestId("first-count-confirm").click();
  await page.getByTestId(`forecast-${activity.checkpoints[0].wordForecast}`).check();
  await page.getByTestId("first-forecast-confirm").click();
  await page.getByTestId(`decision-${activity.checkpoints[0].reviewedDecision}`).check();
  await page.getByTestId("first-decision-confirm").click();

  if (activity.activityKind === "tutorial") {
    await page.getByTestId("evidence-0").check();
    await page.getByTestId("evidence-confirm").click();
    await page.getByTestId("record-next").click();
    return;
  }

  await page.getByTestId("reveal-next").click();
  await chooseCounts(page, activity, 1, "cumulative");
  await page.getByTestId("cumulative-count-confirm").click();
  await page.getByTestId(`forecast-${activity.checkpoints[1].wordForecast}`).check();
  await page.getByTestId("final-forecast-confirm").click();
  await page.getByTestId(`decision-${activity.checkpoints[1].reviewedDecision}`).check();
  await page.getByTestId(`revision-${revisionFor(activity)}`).check();
  await page.getByTestId("final-decision-confirm").click();
  await page.getByTestId("evidence-0").check();
  await page.getByTestId("evidence-confirm").click();
  await page.getByTestId("record-next").click();
}

test("completes the tutorial and all five deterministic missions", async ({ page }) => {
  test.setTimeout(60_000);
  await openReadyPage(page);
  await page.getByTestId("activity-start").click();
  await finishActivity(page, tutorialActivity);
  for (const mission of missions) await finishActivity(page, mission);
  await expect(page.getByTestId("summary")).toBeVisible();
  await expect(page.locator(".summary-table tbody tr")).toHaveCount(5);
});

test("replaces an old error banner with record success feedback", async ({ page }) => {
  await openReadyPage(page);
  await page.getByTestId("activity-start").click();
  await finishActivity(page, tutorialActivity);
  const mission = missions[0];
  await page.getByTestId("condition-confirm").click();
  await chooseCounts(page, mission, 0, "first");
  await page.getByTestId("first-count-confirm").click();
  await page.getByTestId(`forecast-${mission.checkpoints[0].wordForecast}`).check();
  await page.getByTestId("first-forecast-confirm").click();
  await page.getByTestId(`decision-${mission.checkpoints[0].reviewedDecision}`).check();
  await page.getByTestId("first-decision-confirm").click();
  await page.getByTestId("reveal-next").click();
  await chooseCounts(page, mission, 1, "cumulative");
  await page.getByTestId("cumulative-count-confirm").click();
  await page.getByTestId(`forecast-${mission.checkpoints[1].wordForecast}`).check();
  await page.getByTestId("final-forecast-confirm").click();
  await page.getByTestId(`decision-${mission.checkpoints[1].reviewedDecision}`).check();
  await page.getByTestId(`revision-${revisionFor(mission)}`).check();
  await page.getByTestId("final-decision-confirm").click();
  await page.getByTestId("evidence-confirm").click();
  await expect(page.getByTestId("learning-feedback")).toHaveText(/이유를 하나 이상/);
  await page.getByTestId("evidence-0").check();
  await page.getByTestId("evidence-confirm").click();
  await expect(page.getByRole("heading", { name: "내 예보 돌아보기" })).toBeVisible();
  await expect(page.getByTestId("learning-feedback")).toHaveText(/이유를 골라 기록했어요/);
  await expect(page.getByTestId("learning-feedback")).toHaveClass(/success/);
});

test("shows an info banner after going back from a step", async ({ page }) => {
  await openReadyPage(page);
  await page.getByTestId("activity-start").click();
  await page.getByTestId("condition-confirm").click();
  await page.getByRole("button", { name: "이전 단계" }).click();
  await expect(page.getByTestId("learning-feedback")).toHaveText(/이전 단계로 돌아왔어요/);
  await expect(page.getByTestId("learning-feedback")).toHaveClass(/info/);
});

test("requires an explicit zero after returning a 0/5 choice to placeholder", async ({ page }) => {
  test.setTimeout(60_000);
  await openReadyPage(page);
  await page.getByTestId("activity-start").click();
  await finishActivity(page, tutorialActivity);
  for (const mission of missions.slice(0, 4)) await finishActivity(page, mission);
  await page.getByTestId("condition-confirm").click();
  await page.getByTestId("first-red-numerator").selectOption("5");
  await page.getByTestId("first-red-denominator").selectOption("5");
  await page.getByTestId("first-blue-numerator").selectOption("0");
  await page.getByTestId("first-blue-numerator").selectOption("1");
  await page.getByTestId("first-blue-numerator").selectOption("");
  await page.getByTestId("first-blue-denominator").selectOption("5");
  await page.getByTestId("first-count-confirm").click();
  await expect(page.getByTestId("learning-feedback")).toHaveText(/아직 고르지 않은 칸/);
  await expect(page.getByRole("heading", { name: "첫 자료를 세어 봐요" })).toBeVisible();
});

test("shows success feedback after every forecast and decision transition", async ({ page }) => {
  await openReadyPage(page);
  await page.getByTestId("activity-start").click();
  await page.getByTestId("condition-confirm").click();
  await chooseCounts(page, tutorialActivity, 0, "first");
  await page.getByTestId("first-count-confirm").click();
  await page.getByTestId(`forecast-${tutorialActivity.checkpoints[0].wordForecast}`).check();
  await page.getByTestId("first-forecast-confirm").click();
  await expect(page.getByTestId("learning-feedback")).toHaveText(/첫 예보를 정했어요/);
  await expect(page.getByTestId("learning-feedback")).toHaveClass(/success/);
  await page.getByTestId(`decision-${tutorialActivity.checkpoints[0].reviewedDecision}`).check();
  await page.getByTestId("first-decision-confirm").click();
  await expect(page.getByTestId("learning-feedback")).toHaveText(/이제 이유를 골라 봐요/);
  await expect(page.getByTestId("learning-feedback")).toHaveClass(/success/);
  await page.getByTestId("evidence-0").check();
  await page.getByTestId("evidence-confirm").click();
  await page.getByTestId("record-next").click();

  const mission = missions[0];
  await page.getByTestId("condition-confirm").click();
  await chooseCounts(page, mission, 0, "first");
  await page.getByTestId("first-count-confirm").click();
  await page.getByTestId(`forecast-${mission.checkpoints[0].wordForecast}`).check();
  await page.getByTestId("first-forecast-confirm").click();
  await expect(page.getByTestId("learning-feedback")).toHaveText(/첫 예보를 정했어요/);
  await page.getByTestId(`decision-${mission.checkpoints[0].reviewedDecision}`).check();
  await page.getByTestId("first-decision-confirm").click();
  await expect(page.getByTestId("learning-feedback")).toHaveText(/다음 자료를 살펴봐요/);
  await page.getByTestId("reveal-next").click();
  await chooseCounts(page, mission, 1, "cumulative");
  await page.getByTestId("cumulative-count-confirm").click();
  await page.getByTestId(`forecast-${mission.checkpoints[1].wordForecast}`).check();
  await page.getByTestId("final-forecast-confirm").click();
  await expect(page.getByTestId("learning-feedback")).toHaveText(/최종 예보를 정했어요/);
  await page.getByTestId(`decision-${mission.checkpoints[1].reviewedDecision}`).check();
  await page.getByTestId(`revision-${revisionFor(mission)}`).check();
  await page.getByTestId("final-decision-confirm").click();
  await expect(page.getByTestId("learning-feedback")).toHaveText(/모두 합친 자료로 최종 선택을 정했어요/);
  await expect(page.getByTestId("learning-feedback")).toHaveClass(/success/);
});

test("keeps the first action visible and uses child-friendly learning words", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openReadyPage(page);
  const startButton = page.getByTestId("activity-start");
  await expect(startButton).toBeVisible();
  expect((await startButton.boundingBox())?.y).toBeLessThanOrEqual(700);
  await expect(page.getByRole("button", { name: "선생님 안내" })).toBeVisible();
  await page.getByTestId("concept-open").click();
  await expect(page.getByText("신호판의 칸은 파랑 4칸, 모두 8칸이에요.")).toBeVisible();
  await expect(page.getByText("실제로 나온 결과는 파랑이 6번 중 4번이에요.")).toBeVisible();
  await expect(page.locator(".progress")).not.toContainText("개념 안내 · 개념 안내");
  await page.getByRole("button", { name: "안내 연습 시작" }).click();
  await page.getByTestId("condition-confirm").click();
  await page.getByTestId("first-count-confirm").click();
  const feedback = page.getByTestId("learning-feedback");
  await expect(feedback).toHaveText(/파랑 신호/);
  const feedbackSize = await feedback.evaluate((banner) => {
    const message = banner.querySelector("span");
    const bannerRect = banner.getBoundingClientRect();
    const messageRect = message?.getBoundingClientRect();
    const styles = getComputedStyle(banner);
    const innerWidth = bannerRect.width - Number.parseFloat(styles.paddingLeft) - Number.parseFloat(styles.paddingRight) - Number.parseFloat(styles.borderLeftWidth) - Number.parseFloat(styles.borderRightWidth);
    return { messageWidth: messageRect?.width ?? 0, messageHeight: messageRect?.height ?? 0, innerWidth };
  });
  expect(feedbackSize.messageWidth / feedbackSize.innerWidth).toBeGreaterThanOrEqual(0.8);
  expect(feedbackSize.messageHeight).toBeLessThanOrEqual(80);
  await expect(page.locator("main")).not.toContainText(/목표 사건|결과 배열|알려진 구조|판단 규칙|임시 선택|근거 연결|전후 기록/);
  await openReadyPage(page, "/?fixture=summary");
  await expect(page.locator(".progress")).not.toContainText("최종 요약 · 최종 요약");
  await expect(page.getByRole("heading", { name: "내 예보 돌아보기" })).toBeVisible();
  await expect(page.locator('[data-label="모두 합친 자료"]').first()).toBeVisible();
  await expect(page.getByText("신호판의 칸과 실제로 나온 결과를 구분했어요.")).toBeVisible();
});

test("makes the next action wide and gently noticeable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openReadyPage(page);
  expect((await page.getByTestId("activity-start").boundingBox())?.width).toBeGreaterThanOrEqual(280);
  await page.getByTestId("activity-start").click();

  const nextButton = page.getByTestId("condition-confirm");
  await expect(page.getByText("지금 할 일")).toBeVisible();
  await expect(nextButton).toHaveClass(/guided-action/);
  expect((await nextButton.boundingBox())?.width).toBeGreaterThanOrEqual(280);
  await expect.poll(() => nextButton.evaluate((button) => getComputedStyle(button).animationName)).toContain("gi-pulse-aura");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => nextButton.evaluate((button) => getComputedStyle(button).animationName)).toBe("none");
});

test("makes concept practice and summary next actions discoverable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openReadyPage(page);
  await page.getByTestId("concept-open").click();
  const conceptJump = page.getByTestId("concept-jump");
  await expect(conceptJump).toBeVisible();
  await expect(conceptJump).toHaveAttribute("href", "#concept-practice");
  await conceptJump.click();
  await expect(page.getByRole("heading", { name: "나온 결과 말 고르기" })).toBeVisible();
  await expect.poll(() => page.locator("#concept-practice").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.top < window.innerHeight;
  })).toBe(true);

  await openReadyPage(page, "/?fixture=summary");
  await expect(page.getByTestId("summary-next")).toBeVisible();
  await expect(page.getByTestId("summary-next")).toHaveText(/표를 하나씩 읽은 뒤, 표 아래 버튼/);
});

test("uses a natural count error for a mission with several results", async ({ page }) => {
  await openReadyPage(page);
  await page.getByTestId("activity-start").click();
  await finishActivity(page, tutorialActivity);
  await page.getByTestId("condition-confirm").click();
  await page.getByTestId("first-count-confirm").click();
  await expect(page.getByTestId("learning-feedback")).toHaveText(/아직 고르지 않은 칸/);
  await expect(page.getByTestId("learning-feedback")).not.toContainText(/파랑 신호, 초록 신호가/);
});
