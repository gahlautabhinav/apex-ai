import { Token } from "./tokens";

const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
const isIdentPart = (c: string) => /[A-Za-z0-9_]/.test(c);
const isDigit = (c: string) => c >= "0" && c <= "9";
const TWO_CHAR = new Set(["==", "!=", ">=", "<="]);

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const n = source.length;
  let i = 0;
  let line = 1;
  let col = 1;

  const advance = (count = 1): void => {
    for (let k = 0; k < count; k++) {
      if (source[i] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  };

  while (i < n) {
    const c = source[i];

    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      advance();
      continue;
    }

    // comment: '#' to end of line
    if (c === "#") {
      while (i < n && source[i] !== "\n") advance();
      continue;
    }

    const startLine = line;
    const startCol = col;

    // string literal
    if (c === '"') {
      advance(); // consume opening quote
      let value = "";
      let terminated = false;
      while (i < n) {
        const ch = source[i];
        if (ch === '"') {
          advance();
          terminated = true;
          break;
        }
        if (ch === "\n") break; // unterminated at end of line
        value += ch;
        advance();
      }
      tokens.push({ kind: "string", value, line: startLine, col: startCol, terminated });
      continue;
    }

    // number
    if (isDigit(c) || (c === "." && isDigit(source[i + 1] ?? ""))) {
      let value = "";
      while (i < n && (isDigit(source[i]) || source[i] === ".")) {
        value += source[i];
        advance();
      }
      tokens.push({ kind: "number", value, line: startLine, col: startCol });
      continue;
    }

    // identifier / keyword
    if (isIdentStart(c)) {
      let value = "";
      while (i < n && isIdentPart(source[i])) {
        value += source[i];
        advance();
      }
      tokens.push({ kind: "ident", value, line: startLine, col: startCol });
      continue;
    }

    // two-char punctuation
    const two = source.slice(i, i + 2);
    if (TWO_CHAR.has(two)) {
      tokens.push({ kind: "punct", value: two, line: startLine, col: startCol });
      advance(2);
      continue;
    }

    // single-char punctuation (covers ( ) [ ] { } ; , . = + - * / < > ! etc.)
    tokens.push({ kind: "punct", value: c, line: startLine, col: startCol });
    advance();
  }

  tokens.push({ kind: "eof", value: "", line, col });
  return tokens;
}
