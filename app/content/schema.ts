import type { Fraction, SourceKind, WordForecast } from "../domain/types";

export type Outcome = { id: string; label: string };

export type ResultBatch = {
  id: string;
  results: string[];
  totalTrials: number;
  eventCount: number;
};

export type ResultStream = {
  id: string;
  label: string;
  targetOutcome: string;
  batches: ResultBatch[];
};

export type KnownModel = {
  equallyLikely: true;
  outcomes: string[];
  eventOutcomesByStream: Record<string, string[]>;
  replacementRule: string;
};

export type Checkpoint = {
  visibleBatchCount: number;
  expectedCounts: Record<string, Fraction>;
  wordForecast: WordForecast;
  reviewedDecision: string;
};

export type DecisionRule = {
  kind: "higher-known-model" | "higher-observed-rate" | "same-rate-need-more-data" | "known-model-next-trial" | "forecast-only";
  text: string;
  options: string[];
};

export type ForecastActivity = {
  id: string;
  order: number;
  title: string;
  contentVersion: string;
  activityKind: "tutorial" | "mission";
  sourceKind: SourceKind;
  outcomes: Outcome[];
  knownModel?: KnownModel;
  streams: ResultStream[];
  primaryStreamId: string;
  checkpoints: Checkpoint[];
  publicDecisionRule: DecisionRule;
  evidenceOptions: string[];
  explanation: string;
  misconceptionNote: string;
};
