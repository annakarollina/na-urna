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

async function padCandidateResults(
  page: Page,
  slotName: string,
  totalCards: number,
): Promise<void> {
  await page
    .getByRole("dialog", { name: slotName })
    .locator(".candidate-results")
    .evaluate((list, total) => {
      const template = list.querySelector("li");
      if (!template) return;
      while (list.children.length < total) {
        list.append(template.cloneNode(true));
      }
    }, totalCards);
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

  await slot.getByRole("button", { name: /^Alterar escolha de Deputado Federal/ }).click();
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
    page.getByRole("button", { name: "Baixar", exact: true }),
  ).toBeEnabled();
});

test("Candidate Picker desktop: superfície ancorada ao trigger, toggle e scroll da página", async ({
  page,
}) => {
  test.skip(
    page.viewportSize()?.width !== 1440,
    "Geometria do picker desktop; mobile usa a superfície fullscreen dedicada.",
  );
  await openApplication(page);
  await selectSaoPaulo(page);
  await openCandidatePicker(page, "Deputado Federal");

  const trigger = page.locator("#candidate-picker-trigger-federal_deputy-1");
  const surface = page.getByRole("dialog", { name: "Deputado Federal" });

  // Gap pequeno e consistente: a superfície fica ancorada ao TRIGGER que a
  // abre (top = triggerRect.bottom + gap), não ao fim do wrapper. "Votar em
  // branco" fica antes do trigger no fluxo, então nunca compete por espaço
  // com a superfície. Usa --picker-trigger-gap (0.25rem = 4px a 16px/rem).
  const triggerBox = (await trigger.boundingBox())!;
  const surfaceBox = (await surface.boundingBox())!;
  expect(Math.abs(surfaceBox.width - triggerBox.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(surfaceBox.x - triggerBox.x)).toBeLessThanOrEqual(1);
  expect(surfaceBox.y).toBeGreaterThan(triggerBox.y + triggerBox.height);
  const gap = surfaceBox.y - (triggerBox.y + triggerBox.height);
  expect(gap).toBeGreaterThan(0);
  expect(gap).toBeLessThanOrEqual(6);

  // Toggle: clicar de novo no mesmo trigger fecha, sem depender de Escape/Voltar.
  await trigger.click();
  await expect(surface).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  // Reabrir e rolar a página: a superfície não é position:fixed, então segue o
  // trigger no documento sem nenhuma coordenada persistida em JS.
  await trigger.click();
  await expect(surface).toBeVisible();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

  const triggerBoxAfterScroll = (await trigger.boundingBox())!;
  const surfaceBoxAfterScroll = (await surface.boundingBox())!;
  expect(
    Math.abs(surfaceBoxAfterScroll.width - triggerBoxAfterScroll.width),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(surfaceBoxAfterScroll.x - triggerBoxAfterScroll.x),
  ).toBeLessThanOrEqual(1);
  expect(surfaceBoxAfterScroll.y).toBeGreaterThan(
    triggerBoxAfterScroll.y + triggerBoxAfterScroll.height,
  );
  const gapAfterScroll =
    surfaceBoxAfterScroll.y -
    (triggerBoxAfterScroll.y + triggerBoxAfterScroll.height);
  expect(Math.abs(gapAfterScroll - gap)).toBeLessThanOrEqual(1);
});

test("Candidate Picker desktop: altura da lista acompanha o espaço disponível até o limite confortável", async ({
  page,
}) => {
  test.skip(
    page.viewportSize()?.width !== 1440,
    "Geometria do picker desktop; mobile usa a superfície fullscreen dedicada.",
  );
  await openApplication(page);
  await selectSaoPaulo(page);
  await openCandidatePicker(page, "Deputado Federal");
  await padCandidateResults(page, "Deputado Federal", 20);

  const results = page
    .getByRole("dialog", { name: "Deputado Federal" })
    .locator(".candidate-picker-results");

  await page.setViewportSize({ width: 1440, height: 500 });
  let shortHeight = 0;
  await expect
    .poll(async () => {
      shortHeight = (await results.boundingBox())?.height ?? 0;
      return shortHeight;
    })
    .toBeGreaterThan(0);

  await page.setViewportSize({ width: 1440, height: 1200 });
  let tallHeight = 0;
  await expect
    .poll(async () => {
      tallHeight = (await results.boundingBox())?.height ?? 0;
      return tallHeight > shortHeight;
    })
    .toBe(true);

  // Cresce com mais espaço, mas não passa do limite confortável de ~4 cards
  // (--candidate-picker-comfortable-max: 35.5rem ≈ 568px a 16px/rem).
  expect(tallHeight).toBeLessThanOrEqual(600);

  // O cabeçalho de busca continua visível; só a lista de resultados rola.
  await expect(page.getByRole("searchbox", { name: "Nome ou número" })).toBeVisible();
  const scrollMetrics = await results.evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
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

  const download = page.getByRole("button", { name: "Baixar", exact: true });
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
    await slot.getByRole("button", { name: /^Alterar escolha de Deputado Federal/ }).click();
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

  // Reabrir a edição expande o picker (superfície auto-aberta com
  // resultados), o que altera bastante a altura do documento antes de
  // recolher para a escolha em branco. A estabilidade de scroll durante essa
  // expansão é responsabilidade da geometria do picker (Etapa 2); aqui
  // validamos apenas que a transição de estado A → BLANK funciona.
  // No desktop, "Votar em branco" fica acima do trigger (Etapa 2.1), fora da
  // superfície, e continua clicável com o picker aberto. No mobile, a
  // superfície é um modal fullscreen (`aria-modal="true"`, `inset: 0`) que
  // cobriria essa mesma ação se ela ficasse fora dela — por isso "Votar em
  // branco" também é renderizado dentro do cabeçalho do picker mobile
  // (sempre visível, acima da lista de resultados), permanecendo clicável
  // com o picker aberto em ambos os modos.
  await slot.getByRole("button", { name: /^Alterar escolha de Deputado Federal/ }).click();
  await slot.getByRole("button", { name: "Votar em branco" }).click();
  await expect(slot.getByText("BRANCO", { exact: true })).toBeVisible();

  // Fora do wrapper de preservação de scroll de propósito: quando o trigger
  // está perto do fim do viewport, a abertura do picker rola a página o
  // suficiente para caber um mínimo legível de resultados (Etapa 2.1) — um
  // ajuste de scroll intencional, não uma instabilidade a ser proibida.
  await slot.getByRole("button", { name: /^Alterar escolha de Deputado Federal/ }).click();
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
