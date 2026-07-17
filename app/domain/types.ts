export type SourceKind = "known-model" | "observed-only";

export type WordForecast =
  | "impossible"
  | "observed-none"
  | "less-likely"
  | "even"
  | "more-likely"
  | "observed-all"
  | "certain";

export type Fraction = {
  numerator: number;
  denominator: number;
};

export type HalfRelation = "below" | "equal" | "above";
