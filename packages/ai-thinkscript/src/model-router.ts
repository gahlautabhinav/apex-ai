export type TaskClass = "generate" | "explain" | "debug" | "refactor" | "refine";

// Exact model ids — no date suffixes. Complex reasoning/codegen -> Sonnet;
// fast/cheap completions -> Haiku. Routing is the only place model ids live.
const COMPLEX_MODEL = "claude-sonnet-4-6";
const FAST_MODEL = "claude-haiku-4-5";

const ROUTING: Record<TaskClass, string> = {
  generate: COMPLEX_MODEL,
  debug: COMPLEX_MODEL,
  refactor: COMPLEX_MODEL,
  refine: COMPLEX_MODEL,
  explain: FAST_MODEL,
};

export function routeModel(task: TaskClass): string {
  return ROUTING[task];
}
