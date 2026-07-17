import type { LearningStage } from "./session";

const ACTIVITY_TOTAL = 6;
const ACTIVE_STAGES: LearningStage[] = [
  "condition",
  "first-count",
  "first-forecast",
  "provisional-decision",
  "reveal",
  "cumulative",
  "revised-forecast",
  "revised-decision",
  "evidence",
  "record",
];

type JourneyInput = {
  stage: LearningStage;
  activeKind?: "tutorial" | "mission";
  missionIndex?: number;
};

export type JourneyProgress = {
  activityLabel: string;
  currentActivity: number;
  totalActivities: number;
  percent: number;
};

export function journeyProgress({ stage, activeKind, missionIndex = 0 }: JourneyInput): JourneyProgress {
  if (stage === "summary") return { activityLabel: "최종 요약", currentActivity: ACTIVITY_TOTAL, totalActivities: ACTIVITY_TOTAL, percent: 100 };
  if (!activeKind) return { activityLabel: stage === "concept" ? "개념 안내" : "활동 준비", currentActivity: 0, totalActivities: ACTIVITY_TOTAL, percent: 0 };

  const completedActivities = activeKind === "tutorial" ? 0 : missionIndex + 1;
  const currentActivity = completedActivities + 1;
  const stageIndex = Math.max(0, ACTIVE_STAGES.indexOf(stage));
  const withinActivity = (stageIndex + 1) / ACTIVE_STAGES.length;
  const percent = Math.round(Math.min(1, (completedActivities + withinActivity) / ACTIVITY_TOTAL) * 100);

  return {
    activityLabel: activeKind === "tutorial" ? "안내 연습" : `미션 ${missionIndex + 1}`,
    currentActivity,
    totalActivities: ACTIVITY_TOTAL,
    percent,
  };
}
