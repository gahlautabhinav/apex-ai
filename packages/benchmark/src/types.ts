export type BenchMode = "generate" | "scan";

export interface BenchPrompt {
  id: string;
  category: string;
  mode: BenchMode;
  prompt: string;
  // Case-insensitive substrings the correct code should contain (ANDed).
  // A heuristic correctness proxy — not proof — so a "missing_expected" is a
  // review signal, not a definitive failure.
  expect: string[];
}
