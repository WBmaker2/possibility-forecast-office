import type { ResultBatch } from "./schema";

export function batch(id: string, results: string[], targetOutcome: string): ResultBatch {
  return {
    id,
    results,
    totalTrials: results.length,
    eventCount: results.filter((outcome) => outcome === targetOutcome).length,
  };
}
