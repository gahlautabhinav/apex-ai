# @apex/thinkscript-validator

Static validator for ThinkScript. Lexes source and runs deterministic rules,
returning structured diagnostics. This is APEX's correctness gate: generated
ThinkScript must pass `validate()` (no error-severity diagnostics) before it
is shown to a user. (See `docs/02-ARCHITECTURE.md` §8.4.)

## Usage

```ts
import { validate } from "@apex/thinkscript-validator";

const res = validate("plot SMA = Average(close, 20);");
// res.ok === true, res.errors === [], res.warnings === []
```

## Diagnostic codes

| Code  | Severity | Meaning |
|-------|----------|---------|
| TS001 | error    | Unbalanced / mismatched `()` or `[]` |
| TS002 | error    | Curly braces — treated as an error (the simple-study/scanner wedge does not use them; advanced inline `script { ... }` definitions are not yet supported) |
| TS003 | error    | Unterminated string literal |
| TS004 | error    | Reserved word used as a declaration name |
| TS005 | error    | Declaration (`def`/`plot`/`input`/`rec`) with no name |
| TS100 | warning  | Unknown function call (built-in list is intentionally incomplete) |
| TS101 | warning  | `declare` not at the top of the script |

`ok === (errors.length === 0)`. Warnings never flip `ok`. The built-in list is
intentionally incomplete, so unknown functions warn rather than error — the
validator never falsely rejects valid code.

## Test / build

```bash
npm test          # vitest (lexer, rules, corpus regression gate)
npm run typecheck
npm run build --workspace @apex/thinkscript-validator
```
