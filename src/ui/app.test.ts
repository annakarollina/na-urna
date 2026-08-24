// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "preact/test-utils";

import presidentFixture from "../../public/data/development-fixtures/2026/BR/president/candidates.json";
import federalDeputyFixture from "../../public/data/development-fixtures/2026/SP/federal-deputy/candidates.json";
import governorFixture from "../../public/data/development-fixtures/2026/SP/governor/candidates.json";
import senatorFixture from "../../public/data/development-fixtures/2026/SP/senator/candidates.json";
import stateDeputyFixture from "../../public/data/development-fixtures/2026/SP/state-deputy/candidates.json";
import { CANDIDATE_DATASET_KIND } from "../candidates/index.ts";
import { mountApplication } from "./App.tsx";

// Esta suíte cobre apenas a fiação UI -> domínio -> DOM. As regras de negócio
// (senadores, legenda, branco/nulo, busca, etc.) já têm testes unitários próprios.

interface FakeFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

const NOT_FOUND: FakeFetchResponse = { ok: false, status: 404, json: async () => ({}) };

function fixtureResponse(body: unknown): FakeFetchResponse {
  return { ok: true, status: 200, json: async () => body };
}

function stubFixtureFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const path = String(input);
      if (path.includes("SP/federal-deputy/candidates.json")) {
        return fixtureResponse(federalDeputyFixture);
      }
      if (path.includes("SP/state-deputy/candidates.json")) {
        return fixtureResponse(stateDeputyFixture);
      }
      if (path.includes("SP/senator/candidates.json")) {
        return fixtureResponse(senatorFixture);
      }
      if (path.includes("SP/governor/candidates.json")) {
        return fixtureResponse(governorFixture);
      }
      if (path.includes("BR/president/candidates.json")) {
        return fixtureResponse(presidentFixture);
      }
      return NOT_FOUND;
    }),
  );
}

// happy-dom cobre a maior parte do DOM usado por app.ts; estes três pontos não
// são implementados por padrão e não são o que este teste avalia (foco visual,
// media query real e o agendamento de frame), então um shim inofensivo basta.
function ensureBrowserShims(): void {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = ((query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
  }
  if (typeof window.requestAnimationFrame !== "function") {
    window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
      window.setTimeout(() => callback(Date.now()), 0) as unknown as number;
  }
}

function findSlotSection(container: HTMLElement, slotLabel: string): HTMLElement {
  const heading = [...container.querySelectorAll<HTMLHeadingElement>(".slot-title")].find(
    (element) => element.textContent === slotLabel,
  );
  const section = heading?.closest(".slot");
  if (!section) {
    throw new Error(`Posição "${slotLabel}" não encontrada na colinha.`);
  }
  return section as HTMLElement;
}

function findReviewItem(container: HTMLElement, slotLabel: string): HTMLElement {
  const item = [...container.querySelectorAll<HTMLElement>(".review-item")].find(
    (element) =>
      element.querySelector(".review-office strong")?.textContent === slotLabel,
  );
  if (!item) {
    throw new Error(`Item de revisão "${slotLabel}" não encontrado.`);
  }
  return item;
}

async function selectCandidate(
  container: HTMLElement,
  slotId: string,
  ballotName: string,
): Promise<void> {
  const input = container.querySelector<HTMLInputElement>(`#search-${slotId}`);
  const results = container.querySelector<HTMLElement>(`#results-${slotId}`);
  if (!input || !results) {
    throw new Error(`Busca não encontrada para o slot ${slotId}.`);
  }
  const trigger = container.querySelector<HTMLButtonElement>(
    `#candidate-picker-trigger-${slotId}`,
  );
  if (trigger?.getAttribute("aria-expanded") !== "true") {
    await act(async () => trigger?.click());
  }
  await vi.waitFor(() => {
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
  });
  let card: HTMLButtonElement | undefined;
  await vi.waitFor(() => {
    card = [...results.querySelectorAll<HTMLButtonElement>(".candidate-card")].find(
      (button) => button.textContent?.includes(ballotName),
    );
    if (!card) throw new Error(`Candidato "${ballotName}" ainda não encontrado.`);
  });
  if (!card) {
    throw new Error(`Candidato "${ballotName}" não encontrado no slot ${slotId}.`);
  }
  await act(async () => card?.click());
}

async function mountSpSession(): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.append(container);
  mountApplication(container, 2026, CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE);

  const select = container.querySelector<HTMLSelectElement>("#voting-state");
  if (!select) {
    throw new Error("Seletor de UF não encontrado.");
  }
  await act(async () => {
    select.value = "SP";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => {
    select
      .closest("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });

  await vi.waitFor(() => {
    if (!container.querySelector("#search-federal_deputy-1")) {
      throw new Error("Candidatos de SP ainda não carregados.");
    }
  });

  return container;
}

function expectNoImperativeScrollLock(): void {
  expect(document.documentElement.style.overflow).toBe("");
  expect(document.documentElement.style.overscrollBehavior).toBe("");
  expect(document.body.style.position).toBe("");
  expect(document.body.style.overflow).toBe("");
  expect(document.body.style.top).toBe("");
  expect(document.body.style.left).toBe("");
  expect(document.body.style.width).toBe("");
  expect(document.body.style.overscrollBehavior).toBe("");
  expect(document.body.style.paddingRight).toBe("");
}

beforeEach(() => {
  ensureBrowserShims();
  stubFixtureFetch();
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("integração da UI Preact", () => {
  it("oferece branco, mas não expõe voto nulo na interface", async () => {
    const container = await mountSpSession();

    expect(
      container.querySelector<HTMLButtonElement>(
        '[data-office="FEDERAL_DEPUTY"] .vote-blank-action button',
      )?.textContent,
    ).toContain("Votar em branco");
    expect(container.textContent).not.toContain("Votar nulo");
  });

  it("picker de candidatos: abre por ação explícita, fecha ao selecionar e reabre ao trocar", async () => {
    const container = await mountSpSession();
    const trigger = container.querySelector<HTMLButtonElement>(
      "#candidate-picker-trigger-federal_deputy-1",
    );
    if (!trigger) {
      throw new Error("Abertura do picker de Deputado Federal não encontrada.");
    }

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await act(async () => trigger.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    await selectCandidate(container, "federal_deputy-1", "EXEMPLO FEDERAL A");

    expect(container.querySelector("#results-federal_deputy-1")).toBeNull();
    expect(container.querySelector('[data-office="FEDERAL_DEPUTY"] .selected-candidate')).not.toBeNull();

    const slot = findSlotSection(container, "Deputado Federal");

    async function reopenEditing(): Promise<HTMLButtonElement> {
      await act(async () =>
        slot.querySelector<HTMLButtonElement>(".selected-choice-trigger")?.click(),
      );
      const reopenedTrigger = slot.querySelector<HTMLButtonElement>(
        "#candidate-picker-trigger-federal_deputy-1",
      );
      await vi.waitFor(() => {
        expect(reopenedTrigger?.getAttribute("aria-expanded")).toBe("true");
      });
      if (!reopenedTrigger) {
        throw new Error("Reabertura do picker de Deputado Federal não encontrada.");
      }
      return reopenedTrigger;
    }

    // Fechar sem escolher (Escape) não remove a escolha canônica: A continua
    // selecionado e o card volta a mostrá-la, em vez de ficar preso no picker.
    await reopenEditing();
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(slot.querySelector("#candidate-picker-trigger-federal_deputy-1")).toBeNull();
    expect(slot.querySelector(".selected-candidate")?.textContent).toContain(
      "EXEMPLO FEDERAL A",
    );

    // O mesmo vale para fechar clicando fora.
    await reopenEditing();
    await act(async () => {
      document.body.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
    });
    expect(slot.querySelector("#candidate-picker-trigger-federal_deputy-1")).toBeNull();
    expect(slot.querySelector(".selected-candidate")?.textContent).toContain(
      "EXEMPLO FEDERAL A",
    );
  });

  it("trocar candidato: volta direto ao seletor original, preserva as demais escolhas e o Review passa para o novo candidato", async () => {
    const container = await mountSpSession();

    await selectCandidate(container, "federal_deputy-1", "EXEMPLO FEDERAL A");
    await selectCandidate(container, "governor-1", "EXEMPLO GOVERNO");

    expect(
      findReviewItem(container, "Deputado Federal").textContent,
    ).toContain("EXEMPLO FEDERAL A");

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-office="FEDERAL_DEPUTY"] .selected-choice-trigger')
        ?.click(),
    );

    expect(container.querySelector("#search-federal_deputy-1")).not.toBeNull();
    expect(
      container.querySelector('[data-office="GOVERNOR"] .selected-candidate')?.textContent,
    ).toContain("EXEMPLO GOVERNO");
    expect(
      findReviewItem(container, "Deputado Federal").textContent,
    ).toContain("EXEMPLO FEDERAL A");

    await selectCandidate(container, "federal_deputy-1", "EXEMPLO FEDERAL B");

    const selectedCard = container.querySelector('[data-office="FEDERAL_DEPUTY"] .selected-candidate');
    expect(selectedCard?.textContent).toContain("2020");
    expect(selectedCard?.textContent).not.toContain("1010");
    const reviewItem = findReviewItem(container, "Deputado Federal");
    expect(reviewItem.textContent).toContain("EXEMPLO FEDERAL B");
    expect(reviewItem.textContent).not.toContain("EXEMPLO FEDERAL A");
    expect(
      container.querySelector('[data-office="GOVERNOR"] .selected-candidate')?.textContent,
    ).toContain("EXEMPLO GOVERNO");
  });

  it("esvaziar seleção: remove a escolha canônica, zera o Review e não abre o picker", async () => {
    const container = await mountSpSession();
    await selectCandidate(container, "federal_deputy-1", "EXEMPLO FEDERAL A");

    expect(
      findReviewItem(container, "Deputado Federal").textContent,
    ).toContain("EXEMPLO FEDERAL A");

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[data-office="FEDERAL_DEPUTY"] .clear-selection-button',
        )
        ?.click(),
    );

    const slot = findSlotSection(container, "Deputado Federal");
    expect(slot.querySelector(".selected-candidate")).toBeNull();
    expect(slot.querySelector("#candidate-picker-trigger-federal_deputy-1")).not.toBeNull();
    expect(
      slot.querySelector<HTMLButtonElement>("#candidate-picker-trigger-federal_deputy-1")
        ?.getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      [...slot.querySelectorAll("button")].some((button) =>
        button.textContent?.includes("Votar em branco"),
      ),
    ).toBe(true);

    const reviewItem = findReviewItem(container, "Deputado Federal");
    expect(reviewItem.textContent).not.toContain("EXEMPLO FEDERAL A");
    expect(reviewItem.textContent).toContain("Ainda não preenchido");
  });

  it("Trocar minhas escolhas: fecha o picker aberto sem limpar escolhas e sem escolher cargo automaticamente", async () => {
    const container = await mountSpSession();
    await selectCandidate(container, "governor-1", "EXEMPLO GOVERNO");

    const trigger = container.querySelector<HTMLButtonElement>(
      "#candidate-picker-trigger-federal_deputy-1",
    );
    await act(async () => trigger?.click());
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(".review-edit-all")
        ?.click(),
    );

    expect(
      container.querySelector("#candidate-picker-trigger-federal_deputy-1")
        ?.getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      container.querySelector('[data-office="GOVERNOR"] .selected-candidate')?.textContent,
    ).toContain("EXEMPLO GOVERNO");
  });

  it("oferece voto de legenda dentro do picker após filtrar um partido", async () => {
    const container = await mountSpSession();
    const trigger = container.querySelector<HTMLButtonElement>(
      "#candidate-picker-trigger-federal_deputy-1",
    );
    await act(async () => trigger?.click());

    const party = container.querySelector<HTMLSelectElement>(
      "#party-filter-federal_deputy-1",
    );
    if (!party) throw new Error("Filtro partidário não encontrado.");
    await act(async () => {
      party.value = "EXM";
      party.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const partyVote = container.querySelector<HTMLButtonElement>(
      '[data-office="FEDERAL_DEPUTY"] .party-vote-action',
    );
    expect(partyVote?.textContent).toContain("10 · EXM");
    expect(partyVote?.textContent).toContain("Usar como voto de legenda");
    await act(async () => partyVote?.click());

    expect(
      container.querySelector(
        '[data-office="FEDERAL_DEPUTY"] .selected-special-choice',
      )?.textContent,
    ).toContain("Voto de legenda");
    expect(container.querySelector("details")).toBeNull();
    expect(container.textContent).not.toContain("Mostrar mais");
  });

  it("dois senadores: impede repetir o mesmo candidato na segunda escolha", async () => {
    const container = await mountSpSession();

    await selectCandidate(container, "senator-1", "EXEMPLO SENADO A");
    await selectCandidate(container, "senator-2", "EXEMPLO SENADO A");

    const secondChoice = findSlotSection(container, "Senador — 2ª escolha");
    expect(secondChoice.querySelector(".error-state")?.textContent).toContain(
      "não pode ocupar as duas escolhas",
    );
    expect(secondChoice.querySelector(".selected-candidate")).toBeNull();

    const firstChoice = findSlotSection(container, "Senador — 1ª escolha");
    expect(firstChoice.querySelector(".selected-candidate")?.textContent).toContain(
      "EXEMPLO SENADO A",
    );
  });

  it("alterar UF: exige confirmação destrutiva e só limpa a colinha quando confirmada", async () => {
    const container = await mountSpSession();
    await selectCandidate(container, "governor-1", "EXEMPLO GOVERNO");
    expect(container.querySelector('[data-office="GOVERNOR"] .selected-candidate')).not.toBeNull();

    // happy-dom não implementa window.confirm; o mock simula a confirmação
    // destrutiva exercitada pelo teste.
    const confirmMock = vi.fn();
    vi.stubGlobal("confirm", confirmMock);

    async function attemptChangeTo(uf: string): Promise<void> {
      await act(async () =>
        container.querySelector<HTMLButtonElement>(".location-change")?.click(),
      );
      const select = container.querySelector<HTMLSelectElement>("#voting-state");
      if (!select) {
        throw new Error("Seletor de UF não encontrado.");
      }
      await act(async () => {
        select.value = uf;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await act(async () => {
        select
          .closest("form")
          ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
    }

    confirmMock.mockReturnValueOnce(false);
    await attemptChangeTo("RJ");

    expect(confirmMock).toHaveBeenCalledWith(
      expect.stringContaining("apagará as escolhas atuais"),
    );
    expect(container.querySelector('[data-office="GOVERNOR"] .selected-candidate')).not.toBeNull();

    confirmMock.mockReturnValueOnce(true);
    await attemptChangeTo("RJ");

    await vi.waitFor(() => {
      if (!container.querySelector(".location-summary-value")?.textContent?.includes("RJ")) {
        throw new Error("A UF ainda não foi trocada para RJ.");
      }
    });
    expect(container.querySelector('[data-office="GOVERNOR"] .selected-candidate')).toBeNull();
  });

  it("modal Sobre: inicia fechado e permanece sem lock imperativo após ciclos e novo render", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    mountApplication(container, 2026, CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE);

    const initialDialog = container.querySelector<HTMLDialogElement>(".about-dialog");
    if (!initialDialog) {
      throw new Error("Modal Sobre não encontrado.");
    }

    expect(initialDialog.open).toBe(false);
    expectNoImperativeScrollLock();

    container.querySelector<HTMLButtonElement>("#about-button")?.click();

    await vi.waitFor(() => {
      expect(
        container.querySelector<HTMLDialogElement>(".about-dialog")?.open,
      ).toBe(true);
    });
    const firstOpenDialog = container.querySelector<HTMLDialogElement>(".about-dialog");
    firstOpenDialog?.querySelector<HTMLButtonElement>(".dialog-close")?.click();

    await vi.waitFor(() => expect(firstOpenDialog?.open).toBe(false));
    expectNoImperativeScrollLock();

    container.querySelector<HTMLButtonElement>("#about-button")?.click();

    await vi.waitFor(() => {
      expect(
        container.querySelector<HTMLDialogElement>(".about-dialog")?.open,
      ).toBe(true);
    });
    const secondOpenDialog = container.querySelector<HTMLDialogElement>(".about-dialog");
    secondOpenDialog?.querySelector<HTMLButtonElement>(".dialog-close")?.click();

    await vi.waitFor(() => expect(secondOpenDialog?.open).toBe(false));
    expectNoImperativeScrollLock();

    const select = container.querySelector<HTMLSelectElement>("#voting-state");
    if (!select) {
      throw new Error("Seletor de UF não encontrado.");
    }
    await act(async () => {
      select.value = "SP";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      select
        .closest("form")
        ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      const renderedDialog = container.querySelector<HTMLDialogElement>(".about-dialog");
      expect(renderedDialog?.open).toBe(false);
      expect(container.querySelector("#search-federal_deputy-1")).not.toBeNull();
    });
    expectNoImperativeScrollLock();
  });

  it("exportação: fica disponível assim que a colinha tem ao menos uma escolha preenchida", async () => {
    const container = await mountSpSession();
    const generateButton = container.querySelector<HTMLButtonElement>(".generate-button");
    if (!generateButton) {
      throw new Error("Botão de exportação não encontrado.");
    }
    expect(generateButton.disabled).toBe(true);

    await selectCandidate(container, "governor-1", "EXEMPLO GOVERNO");

    expect(
      container.querySelector<HTMLButtonElement>(".generate-button")?.disabled,
    ).toBe(false);
  });
});
