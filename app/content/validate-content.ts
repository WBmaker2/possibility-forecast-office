import { countOutcomes } from "../domain/accumulation";
import { addFractions, compareFractions, createFraction } from "../domain/fractions";
import { classifyWordForecast, isAllowedWordForecast } from "../domain/forecasts";
import { calculateKnownModelProbability } from "../domain/known-model";
import type { Fraction } from "../domain/types";
import type { ForecastActivity, ResultStream } from "./schema";

const prohibitedTerms = ["도박", "복권", "베팅", "투자", "보험", "실제 날씨", "학생 이름"];

function sameFraction(actual: Fraction, expected: Fraction): boolean {
  return actual.numerator === expected.numerator && actual.denominator === expected.denominator;
}

function cumulativeCount(stream: ResultStream, batchCount: number): Fraction {
  const visible = stream.batches.slice(0, batchCount);
  if (visible.length === 0) throw new Error("checkpoint needs at least one batch");
  return visible.slice(1).reduce(
    (total, batch) => addFractions(total, countOutcomes(batch.results, stream.targetOutcome)),
    countOutcomes(visible[0].results, stream.targetOutcome),
  );
}

function modelProbability(activity: ForecastActivity, streamId: string): Fraction | undefined {
  const model = activity.knownModel;
  if (!model) return undefined;
  const targetOutcomes = model.eventOutcomesByStream[streamId];
  if (!targetOutcomes) return undefined;
  return calculateKnownModelProbability({
    outcomes: model.outcomes,
    targetOutcomes,
    equallyLikely: model.equallyLikely,
  });
}

function reviewedDecision(activity: ForecastActivity, checkpointIndex: number): string | undefined {
  const checkpoint = activity.checkpoints[checkpointIndex];
  const rateFor = (streamId: string) => checkpoint.expectedCounts[streamId];

  if (activity.publicDecisionRule.kind === "forecast-only") {
    const fraction = activity.sourceKind === "known-model"
      ? modelProbability(activity, activity.primaryStreamId)
      : rateFor(activity.primaryStreamId);
    return fraction ? classifyWordForecast(activity.sourceKind, fraction) : undefined;
  }
  if (activity.publicDecisionRule.kind === "known-model-next-trial") {
    const fraction = modelProbability(activity, activity.primaryStreamId);
    return fraction ? classifyWordForecast("known-model", fraction) : undefined;
  }

  const optionFractions = activity.publicDecisionRule.options
    .filter((option) => option !== "need-more-data")
    .map((option) => ({
      option,
      fraction: activity.publicDecisionRule.kind === "higher-known-model"
        ? modelProbability(activity, option)
        : rateFor(option),
    }));
  if (optionFractions.some(({ fraction }) => !fraction)) return undefined;
  if (optionFractions.length === 0) return undefined;

  const typedOptions = optionFractions as Array<{ option: string; fraction: Fraction }>;
  const largest = typedOptions.reduce((best, candidate) =>
    compareFractions(candidate.fraction, best.fraction) > 0 ? candidate : best,
  );
  const tied = typedOptions.filter(({ fraction }) => compareFractions(fraction, largest.fraction) === 0);
  return tied.length > 1 ? "need-more-data" : largest.option;
}

function studentFacingStrings(activity: ForecastActivity): string[] {
  return [
    activity.title,
    activity.explanation,
    activity.misconceptionNote,
    activity.publicDecisionRule.text,
    ...activity.publicDecisionRule.options,
    ...activity.evidenceOptions,
    ...activity.outcomes.map((outcome) => outcome.label),
    ...activity.streams.map((stream) => stream.label),
    activity.knownModel?.replacementRule ?? "",
  ];
}

export function validateContent(activities: readonly ForecastActivity[]): string[] {
  const errors: string[] = [];
  const activityIds = new Set<string>();

  for (const activity of activities) {
    const prefix = `[${activity.id}]`;
    if (activityIds.has(activity.id)) errors.push(`${prefix} duplicate activity id`);
    activityIds.add(activity.id);

    if (activity.activityKind === "mission" && activity.streams.some((stream) => stream.batches.length !== 2)) {
      errors.push(`${prefix} missions require first and new result batches`);
    }
    if (activity.activityKind === "tutorial" && activity.streams.some((stream) => stream.batches.length < 1)) {
      errors.push(`${prefix} tutorial requires a practice result batch`);
    }
    if (activity.sourceKind === "known-model" && !activity.knownModel) {
      errors.push(`${prefix} known-model requires a known model`);
    }
    if (activity.sourceKind === "observed-only" && activity.knownModel) {
      errors.push(`${prefix} observed-only must not include a known model`);
    }

    const outcomeIds = new Set(activity.outcomes.map((outcome) => outcome.id));
    const streamIds = new Set(activity.streams.map((stream) => stream.id));
    if (!streamIds.has(activity.primaryStreamId)) errors.push(`${prefix} primary stream is missing`);

    for (const stream of activity.streams) {
      if (!outcomeIds.has(stream.targetOutcome)) errors.push(`${prefix}/${stream.id} target outcome is missing`);
      for (const batch of stream.batches) {
        if (batch.results.length !== batch.totalTrials) errors.push(`${prefix}/${stream.id}/${batch.id} totalTrials mismatch`);
        if (batch.results.some((result) => !outcomeIds.has(result))) errors.push(`${prefix}/${stream.id}/${batch.id} has unknown result`);
        const counted = countOutcomes(batch.results, stream.targetOutcome);
        if (counted.numerator !== batch.eventCount) errors.push(`${prefix}/${stream.id}/${batch.id} event count mismatch`);
      }
    }

    if (activity.knownModel) {
      if (activity.knownModel.equallyLikely !== true) errors.push(`${prefix} model outcomes are not equally likely`);
      if (activity.knownModel.outcomes.some((outcome) => !outcomeIds.has(outcome))) errors.push(`${prefix} model has unknown outcome`);
      for (const stream of activity.streams) {
        const eventOutcomes = activity.knownModel.eventOutcomesByStream[stream.id];
        if (!eventOutcomes) errors.push(`${prefix}/${stream.id} model event is missing`);
        else if (eventOutcomes.some((outcome) => !outcomeIds.has(outcome))) errors.push(`${prefix}/${stream.id} model event has unknown outcome`);
        else if (eventOutcomes.length !== 1 || eventOutcomes[0] !== stream.targetOutcome) errors.push(`${prefix}/${stream.id} model event does not match stream target outcome`);
      }
    }

    for (const [checkpointIndex, checkpoint] of activity.checkpoints.entries()) {
      if (checkpoint.visibleBatchCount < 1 || checkpoint.visibleBatchCount > Math.max(...activity.streams.map((stream) => stream.batches.length))) {
        errors.push(`${prefix}/checkpoint-${checkpointIndex + 1} invalid visible batch count`);
        continue;
      }
      for (const stream of activity.streams) {
        const expected = checkpoint.expectedCounts[stream.id];
        if (!expected) {
          errors.push(`${prefix}/checkpoint-${checkpointIndex + 1}/${stream.id} expected count is missing`);
          continue;
        }
        try {
          createFraction(expected.numerator, expected.denominator);
        } catch {
          errors.push(`${prefix}/checkpoint-${checkpointIndex + 1}/${stream.id} invalid fraction`);
          continue;
        }
        const actual = cumulativeCount(stream, checkpoint.visibleBatchCount);
        if (!sameFraction(actual, expected)) errors.push(`${prefix}/checkpoint-${checkpointIndex + 1}/${stream.id} cumulative count mismatch`);
      }

      const forecastFraction = activity.sourceKind === "known-model"
        ? modelProbability(activity, activity.primaryStreamId)
        : checkpoint.expectedCounts[activity.primaryStreamId];
      if (!isAllowedWordForecast(activity.sourceKind, checkpoint.wordForecast)) {
        errors.push(`${prefix}/checkpoint-${checkpointIndex + 1} observed-only cannot use impossible or certain`);
      }
      if (forecastFraction && classifyWordForecast(activity.sourceKind, forecastFraction) !== checkpoint.wordForecast) {
        errors.push(`${prefix}/checkpoint-${checkpointIndex + 1} word forecast mismatch`);
      }
      const expectedDecision = reviewedDecision(activity, checkpointIndex);
      if (!activity.publicDecisionRule.options.includes(checkpoint.reviewedDecision)) {
        errors.push(`${prefix}/checkpoint-${checkpointIndex + 1} reviewed decision is not a public option`);
      }
      if (expectedDecision && !activity.publicDecisionRule.options.includes(expectedDecision)) {
        errors.push(`${prefix}/checkpoint-${checkpointIndex + 1} recalculated decision is not a public option`);
      }
      if (expectedDecision !== checkpoint.reviewedDecision) errors.push(`${prefix}/checkpoint-${checkpointIndex + 1} reviewed decision mismatch`);
    }

    if (prohibitedTerms.some((term) => studentFacingStrings(activity).some((text) => text.includes(term)))) {
      errors.push(`${prefix} includes out-of-scope content`);
    }
  }
  return errors;
}
