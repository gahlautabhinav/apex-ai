// Reserved words / keywords that cannot be used as identifier names.
export const RESERVED = new Set<string>([
  "def", "plot", "input", "rec", "declare", "script",
  "if", "then", "else", "do", "while", "switch", "case", "default",
  "and", "or", "not", "fold", "with", "from", "to",
  "yes", "no", "plotwidth", "reference",
]);

// Curated, intentionally INCOMPLETE set of known built-in functions.
// Unknown calls are warnings (TS100), never errors — list completeness is not guaranteed.
export const BUILTINS = new Set<string>([
  "Average", "SimpleMovingAvg", "ExpAverage", "MovingAverage", "WMA", "HullMovingAvg",
  "RSI", "MACD", "Stochastic", "StochasticFull", "BollingerBands", "ATR", "TrueRange",
  "Highest", "Lowest", "sum", "fold", "Crosses", "CompoundValue", "Min", "Max",
  "Abs", "AbsValue", "Round", "Floor", "Ceil", "Power", "Sqrt", "Log", "Sign", "IsNaN",
  "HighestAll", "LowestAll", "GetTime", "SecondsFromTime", "SecondsTillTime", "BarNumber",
  "AddLabel", "AddOrder", "Alert", "AddChartBubble", "AddVerticalLine", "AddCloud",
  "vwap", "VWAP",
]);

// Price/data fields treated as known value identifiers (not function calls).
export const FIELDS = new Set<string>([
  "open", "high", "low", "close", "volume", "hl2", "hlc3", "ohlc4",
]);
