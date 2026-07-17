import { relationToHalf } from "./fractions";
import type { Fraction, SourceKind, WordForecast } from "./types";

export function classifyWordForecast(
  sourceKind: SourceKind,
  fraction: Fraction,
): WordForecast {
  if (fraction.numerator === 0) {
    return sourceKind === "known-model" ? "impossible" : "observed-none";
  }
  if (fraction.numerator === fraction.denominator) {
    return sourceKind === "known-model" ? "certain" : "observed-all";
  }
  const relation = relationToHalf(fraction);
  if (relation === "below") return "less-likely";
  if (relation === "above") return "more-likely";
  return "even";
}

export function isAllowedWordForecast(
  sourceKind: SourceKind,
  wordForecast: WordForecast,
): boolean {
  return sourceKind === "known-model"
    ? wordForecast !== "observed-none" && wordForecast !== "observed-all"
    : wordForecast !== "impossible" && wordForecast !== "certain";
}
