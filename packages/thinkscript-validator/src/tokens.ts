export type TokenKind = "ident" | "number" | "string" | "punct" | "eof";

export interface Token {
  kind: TokenKind;
  value: string;
  line: number; // 1-based
  col: number; // 1-based
  terminated?: boolean; // strings only: false if no closing quote before EOL/EOF
}
