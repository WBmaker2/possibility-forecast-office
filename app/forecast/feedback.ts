import type { ForecastActivity } from "../content/schema";
import type { CountSelectionError, RevisionChoice } from "./session";

export function countErrorMessage(
  activity: ForecastActivity,
  batchCount: 1 | 2,
  error: CountSelectionError,
): string {
  if (error === "incomplete") {
    const target = activity.streams.length === 1 ? `${activity.streams[0].label}의` : "각 결과의";
    return `아직 고르지 않은 칸이 있어요. ${target} 모든 나온 횟수와 전체 횟수를 골라요.`;
  }
  if (error === "fraction-mismatch") {
    return "분수 위에는 나온 횟수, 아래에는 전체 횟수를 골라요. 두 칸의 자리를 바꾸어 보세요.";
  }
  if (batchCount === 2) {
    return "위의 ‘첫 자료 + 새 자료’ 도움식을 보고, 손가락으로 두 자료를 한 칸씩 짚으며 다시 더해 봐요.";
  }
  const target = activity.streams.length === 1 ? activity.streams[0].label : "각 찾을 결과";
  return `손가락으로 결과 그림의 ${target}를 한 칸씩 짚어 보고, 전체 칸도 처음부터 다시 세어 봐요.`;
}

export function forecastErrorMessage(isMissing: boolean): string {
  return isMissing
    ? "아직 가능성 말을 고르지 않았어요. 분수가 수직선의 어디에 있는지 보고 한 가지를 골라요."
    : "예보에 쓰는 값이 신호판의 칸인지 실제로 나온 결과인지 확인하고, 수직선의 위치와 가능성 말을 다시 이어 보세요.";
}

export function decisionErrorMessage(batchCount: 1 | 2, isMissing: boolean): string {
  if (isMissing) {
    return batchCount === 1
      ? "아직 첫 선택을 고르지 않았어요. 바로 위 비교 자료를 보고 한 가지를 골라요."
      : "아직 최종 선택을 고르지 않았어요. 모두 합친 비교 자료를 보고 한 가지를 골라요.";
  }
  return batchCount === 1
    ? "바로 위의 첫 자료 비율과 고르는 기준을 한 줄씩 다시 읽어 보세요."
    : "바로 위의 모두 합친 비율과 고르는 기준을 한 줄씩 다시 읽어 보세요.";
}

export function revisionErrorMessage(activity: ForecastActivity, revision?: RevisionChoice): string {
  if (!revision) {
    return "아직 예보 변화를 고르지 않았어요. 처음과 나중을 비교해 한 가지를 골라요.";
  }
  if (activity.publicDecisionRule.kind === "same-rate-need-more-data") {
    return "두 자료의 비율이 같아 어느 쪽이 더 크다고 정할 수 없어요. ‘자료를 더 보기’를 골라요.";
  }
  return "첫 예보와 최종 예보, 첫 선택과 최종 선택이 바뀌었는지 차례로 비교해 다시 골라요.";
}
