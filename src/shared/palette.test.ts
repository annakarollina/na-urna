import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  PNG_PALETTE,
  PNG_PALETTE_PRIMITIVE_TOKENS,
} from "./palette.ts";

describe("shared visual palette", () => {
  it("keeps every Canvas color mapped to an explicit primitive CSS token", () => {
    const css = readFileSync(
      new URL("../styles/tokens.css", import.meta.url),
      "utf8",
    );

    for (const [key, token] of Object.entries(PNG_PALETTE_PRIMITIVE_TOKENS)) {
      const value = PNG_PALETTE[key as keyof typeof PNG_PALETTE];
      expect(css).toContain(`--${token}: ${value};`);
    }
  });
});
