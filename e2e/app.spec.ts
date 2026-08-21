import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const snapshotStylePath = join(process.cwd(), "e2e", "snapshot.css");

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
      .getByRole("combobox", { name: "Buscar nome ou número" }),
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
  await slot.getByRole("combobox", { name: "Buscar nome ou número" }).focus();
  await page
    .getByRole("button", {
      name: "Selecionar EXEMPLO FEDERAL A, número 1010, partido EXM",
    })
    .click();
  await expect(slot.getByText("EXEMPLO FEDERAL A", { exact: true })).toBeVisible();

  await slot.getByRole("button", { name: "Trocar" }).click();
  await slot.getByRole("combobox", { name: "Buscar nome ou número" }).focus();
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

test("baseline visual das telas principais", async ({ page, browserName }) => {
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
  if (browserName === "webkit") {
    await page.getByRole("link", { name: "Ir para o conteúdo" }).focus();
  }
  await expect(page).toHaveScreenshot("voting-flow.png", {
    fullPage: true,
    stylePath: snapshotStylePath,
  });
});
