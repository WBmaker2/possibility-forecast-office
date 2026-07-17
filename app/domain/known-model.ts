import { createFraction } from "./fractions";
import type { Fraction } from "./types";

export type KnownModelInput = {
  outcomes: readonly string[];
  targetOutcomes: readonly string[];
  equallyLikely: boolean;
};

export function calculateKnownModelProbability(input: KnownModelInput): Fraction {
  if (!input.equallyLikely) {
    throw new Error("known model outcomes must be equally likely");
  }
  if (input.outcomes.length === 0) {
    throw new Error("known model needs outcomes");
  }
  const targetSet = new Set(input.targetOutcomes);
  return createFraction(
    input.outcomes.filter((outcome) => targetSet.has(outcome)).length,
    input.outcomes.length,
  );
}
