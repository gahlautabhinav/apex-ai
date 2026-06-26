import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validate } from "../src/index";

const here = dirname(fileURLToPath(import.meta.url));
const corpusDir = resolve(here, "../../../corpus/thinkscript");

interface Manifest {
  valid: string[];
  invalid: { file: string; expect: string }[];
}

const manifest: Manifest = JSON.parse(
  readFileSync(resolve(corpusDir, "manifest.json"), "utf8"),
);

const read = (rel: string) => readFileSync(resolve(corpusDir, rel), "utf8");

describe("ThinkScript correctness corpus", () => {
  for (const file of manifest.valid) {
    it(`valid: ${file} passes with zero errors`, () => {
      const res = validate(read(file));
      expect(res.errors, JSON.stringify(res.errors)).toEqual([]);
      expect(res.ok).toBe(true);
    });
  }

  for (const { file, expect: code } of manifest.invalid) {
    it(`invalid: ${file} is rejected with ${code}`, () => {
      const res = validate(read(file));
      expect(res.ok).toBe(false);
      expect(res.errors.some((e) => e.code === code)).toBe(true);
    });
  }
});
