import { addFractions, createFraction } from "./fractions";
import type { Fraction } from "./types";

export function countOutcomes(results: readonly string[], targetOutcome: string): Fraction {
  if (results.length === 0) {
    throw new Error("result batches must not be empty");
  }
  return createFraction(
    results.filter((outcome) => outcome === targetOutcome).length,
    results.length,
  );
}

export function accumulateBatches(
  firstResults: readonly string[],
  nextResults: readonly string[],
  targetOutcome: string,
): Fraction {
  return addFractions(
    countOutcomes(firstResults, targetOutcome),
    countOutcomes(nextResults, targetOutcome),
  );
}
