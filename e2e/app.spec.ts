import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __exportProbe: { generations: number; shareCalls: number };
  }
}

const snapshotStylePath = join(process.cwd(), "e2e", "snapshot.css");

function cssTimeToMs(value: string): number {
  const match = /^(-?[\d.]+(?:e-?\d+)?)(ms|s)$/.exec(value.trim());
  if (!match) return Number.POSITIVE_INFINITY;
  const [, amount, unit] = match;
  const numeric = Number(amount);
  return unit === "s" ? numeric * 1000 : numeric;
}

async function openApplication(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Sua colinha para as Eleições 2026",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Modo de desenvolvimento · dados fictícios, não oficiais", {
      exact: true,
    }),
  ).toBeVisible();
}

async function selectSaoPaulo(page: Page): Promise<void> {
  await page.getByLabel("Selecione sua UF").selectOption("SP");
  await page.getByRole("button", { name: "Confirmar UF" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Monte suas escolhas" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Deputado Federal" })
      .getByRole("button", { name: "Escolher candidato" }),
  ).toBeVisible();
}

async function openCandidatePicker(page: Page, slotName: string): Promise<void> {
  const slot = page.getByRole("region", { name: slotName });
  await slot.getByRole("button", { name: "Escolher candidato" }).click();
  await expect(page.getByRole("dialog", { name: slotName })).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Nome ou número" }),
  ).toBeVisible();
}

async function scrollDown(
  page: Page,
  browserName: string,
  amount: number,
): Promise<void> {
  if (browserName === "webkit") {
    await page.keyboard.press("PageDown");
    return;
  }
  await page.mouse.wheel(0, amount);
}

async function prepareVisualSnapshot(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo(0, 0);
  });
}

async function expectActionToPreserveScroll(
  page: Page,
  action: () => Promise<void>,
): Promise<void> {
  const before = await page.evaluate(() => window.scrollY);
  await action();
  await expect
    .poll(async () =>
      Math.abs((await page.evaluate(() => window.scrollY)) - before),
    )
    .toBeLessThanOrEqual(2);
}

async function installExportProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe = { generations: 0, shareCalls: 0 };
    Object.assign(window, { __exportProbe: probe });
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (
      callback,
      type,
      quality,
    ): void {
      probe.generations += 1;
      originalToBlob.call(this, callback, type, quality);
    };
    Object.defineProperties(Navigator.prototype, {
      canShare: {
        configurable: true,
        value: (data: ShareData) => Boolean(data.files?.length),
      },
      share: {
        configurable: true,
        value: async () => {
          probe.shareCalls += 1;
        },
      },
    });
  });
}

test("a página monta e mantém o scroll normal", async ({ page, browserName }) => {
  await openApplication(page);
  await selectSaoPaulo(page);

  await page.evaluate(() => window.scrollTo(0, 0));
  await scrollDown(page, browserName, 600);

  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(100);
});

test("Sobre abre, fecha e não prende o scroll da página", async ({
  page,
  browserName,
}) => {
  await openApplication(page);
  await selectSaoPaulo(page);
  await page.evaluate(() => window.scrollTo(0, 500));

  await page.getByRole("button", { name: "Sobre" }).click();
  const dialog = page.getByRole("dialog", { name: "Sobre a Minha Colinha" });
  await expect(dialog).toBeVisible();

  const motionDurations = await page.evaluate(() => {
    const about = document.querySelector(".about-dialog");
    if (!(about instanceof HTMLElement)) return null;
    return {
      dialog: getComputedStyle(about).animationDuration,
      backdrop: getComputedStyle(about, "::backdrop").animationDuration,
    };
  });
  expect(cssTimeToMs(motionDurations?.dialog ?? "1s")).toBeLessThan(1);
  expect(cssTimeToMs(motionDurations?.backdrop ?? "1s")).toBeLessThan(1);

  const lockedScroll = await page.evaluate(() => window.scrollY);
  await scrollDown(page, browserName, 500);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(lockedScroll);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Sobre" }).click();
  await expect(dialog).toBeVisible();
  await page
    .getByRole("button", { name: "Fechar informações sobre a Minha Colinha" })
    .click();
  await expect(dialog).toBeHidden();

  const restoredScroll = await page.evaluate(() => window.scrollY);
  await scrollDown(page, browserName, 500);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(restoredScroll + 100);
});

test("UF, escolha, troca e disponibilidade da exportação funcionam", async ({
  page,
}) => {
  await openApplication(page);
  await selectSaoPaulo(page);

  const slot = page.getByRole("region", { name: "Deputado Federal" });
  await openCandidatePicker(page, "Deputado Federal");
  await page
    .getByRole("button", {
      name: "Selecionar EXEMPLO FEDERAL A, número 1010, partido EXM",
    })
    .click();
  await expect(slot.getByText("EXEMPLO FEDERAL A", { exact: true })).toBeVisible();
  expect(
    cssTimeToMs(
      await slot
        .locator(".selected-candidate")
        .evaluate((element) => getComputedStyle(element).animationDuration),
    ),
  ).toBeLessThan(1);

  await slot.getByRole("button", { name: "Trocar" }).click();
  await expect(
    page.getByRole("searchbox", { name: "Nome ou número" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Substituir por EXEMPLO FEDERAL B, número 2020, partido TST",
    })
    .click();

  await expect(slot.getByText("EXEMPLO FEDERAL B", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Baixar minha colinha" }),
  ).toBeEnabled();
});

test("compartilha em um toque e reutiliza o PNG preparado", async ({ page }) => {
  await installExportProbe(page);
  await openApplication(page);
  await selectSaoPaulo(page);

  await openCandidatePicker(page, "Deputado Federal");
  await page
    .getByRole("button", {
      name: "Selecionar EXEMPLO FEDERAL A, número 1010, partido EXM",
    })
    .click();

  const share = page.getByRole("button", { name: "Compartilhar", exact: true });
  await expect(share).toBeDisabled();
  await expect(share).toBeEnabled({ timeout: 10_000 });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__exportProbe.generations,
      ),
    )
    .toBe(1);

  await share.click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__exportProbe.shareCalls,
      ),
    )
    .toBe(1);

  const download = page.getByRole("button", { name: "Baixar minha colinha" });
  await Promise.all([page.waitForEvent("download"), download.click()]);
  expect(
    await page.evaluate(
      () => window.__exportProbe.generations,
    ),
  ).toBe(1);
});

test("ações de escolha preservam a posição da página", async ({ page }) => {
  await openApplication(page);
  await selectSaoPaulo(page);

  const slot = page.getByRole("region", { name: "Deputado Federal" });
  await slot.evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, top - 96));
  });

  await expectActionToPreserveScroll(page, async () => {
    await openCandidatePicker(page, "Deputado Federal");
    await page
      .getByRole("button", {
        name: "Selecionar EXEMPLO FEDERAL A, número 1010, partido EXM",
      })
      .click();
    await expect(slot.getByText("EXEMPLO FEDERAL A", { exact: true })).toBeVisible();
  });

  await expectActionToPreserveScroll(page, async () => {
    await slot.getByRole("button", { name: "Trocar" }).click();
    await expect(
      page.getByRole("searchbox", { name: "Nome ou número" }),
    ).toBeVisible();
    const mobile = await page.evaluate(() =>
      window.matchMedia("(max-width: 767px), (pointer: coarse)").matches,
    );
    if (mobile) {
      await page
        .getByRole("button", { name: "Fechar seleção de Deputado Federal" })
        .click();
    } else {
      await page.keyboard.press("Escape");
    }
    await expect(
      page.getByRole("searchbox", { name: "Nome ou número" }),
    ).toBeHidden();
  });

  await expectActionToPreserveScroll(page, async () => {
    await slot.getByRole("button", { name: "Votar em branco" }).click();
    await expect(slot.getByText("BRANCO", { exact: true })).toBeVisible();
  });

  await expectActionToPreserveScroll(page, async () => {
    await slot.getByRole("button", { name: "Trocar" }).click();
    await expect(
      page.getByRole("searchbox", { name: "Nome ou número" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Fechar seleção de Deputado Federal" })
      .click();
    await expect(
      page.getByRole("searchbox", { name: "Nome ou número" }),
    ).toBeHidden();
  });
});

test("baseline visual das telas principais", async ({ page }) => {
  test.skip(
    process.platform !== "win32",
    "Os goldens visuais da Fase 0 usam Windows como ambiente canônico.",
  );

  await openApplication(page);
  await prepareVisualSnapshot(page);
  await expect(page).toHaveScreenshot("initial-page.png", {
    fullPage: true,
    stylePath: snapshotStylePath,
  });

  await selectSaoPaulo(page);
  await prepareVisualSnapshot(page);
  await expect(page).toHaveScreenshot("voting-flow.png", {
    fullPage: true,
    stylePath: snapshotStylePath,
  });
});
