import { describe, expect, it } from "vitest";

import { fitImageContain } from "./png.ts";

const BOX = { x: 200, y: 100, width: 120, height: 160 };

function expectWithinBox(fit: ReturnType<typeof fitImageContain>) {
  expect(fit.width).toBeLessThanOrEqual(BOX.width);
  expect(fit.height).toBeLessThanOrEqual(BOX.height);
  expect(fit.x).toBeGreaterThanOrEqual(BOX.x);
  expect(fit.y).toBeGreaterThanOrEqual(BOX.y);
  expect(fit.x + fit.width).toBeLessThanOrEqual(BOX.x + BOX.width);
  expect(fit.y + fit.height).toBeLessThanOrEqual(BOX.y + BOX.height);
}

describe("fitImageContain", () => {
  it("encolhe uma imagem mais vertical que o box sem cortar nada", () => {
    const fit = fitImageContain({ width: 300, height: 900 }, BOX);

    expectWithinBox(fit);
    expect(fit.height).toBeCloseTo(BOX.height, 5);
    expect(fit.width / fit.height).toBeCloseTo(300 / 900, 5);
    expect(fit.x).toBeCloseTo(BOX.x + (BOX.width - fit.width) / 2, 5);
  });

  it("encolhe uma imagem mais horizontal que o box sem cortar nada", () => {
    const fit = fitImageContain({ width: 900, height: 300 }, BOX);

    expectWithinBox(fit);
    expect(fit.width).toBeCloseTo(BOX.width, 5);
    expect(fit.width / fit.height).toBeCloseTo(900 / 300, 5);
    expect(fit.y).toBeCloseTo(BOX.y + (BOX.height - fit.height) / 2, 5);
  });

  it("preenche o box inteiro quando a proporção já é igual", () => {
    const fit = fitImageContain(
      { width: BOX.width * 2, height: BOX.height * 2 },
      BOX,
    );

    expectWithinBox(fit);
    expect(fit.width).toBeCloseTo(BOX.width, 5);
    expect(fit.height).toBeCloseTo(BOX.height, 5);
    expect(fit.x).toBeCloseTo(BOX.x, 5);
    expect(fit.y).toBeCloseTo(BOX.y, 5);
  });
});
