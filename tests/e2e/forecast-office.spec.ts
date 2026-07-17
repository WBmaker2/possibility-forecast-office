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
  await expect(page.getByTestId("source-overclaim-feedback")).toHaveText(/source-overclaim/);
  await page.getByTestId("source-overclaim-right-none").click();
  await expect(page.getByTestId("source-overclaim-feedback")).toHaveText(/아직 나오지 않았다는 뜻/);
  await page.getByTestId("source-overclaim-right-all").click();
  await expect(page.getByTestId("source-overclaim-feedback")).toHaveText(/매번 나타났다는 뜻/);
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
    await page.getByTestId(`${prefix}-${stream.id}-numerator-${fraction.numerator}`).check();
    await page.getByTestId(`${prefix}-${stream.id}-denominator-${fraction.denominator}`).check();
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
