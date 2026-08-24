// @vitest-environment happy-dom
import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";

import { CANDIDATE_STATUS, type Candidate } from "../../candidates/model.ts";
import { ELECTORAL_OFFICE, TERRITORIAL_SCOPE } from "../../election/types.ts";
import { CandidatePhoto } from "./CandidatePresentation.tsx";

const container = document.createElement("div");

function candidate(
  id: string,
  ballotName: string,
  photoPath: string,
): Candidate {
  return {
    id,
    electionYear: 2026,
    office: ELECTORAL_OFFICE.PRESIDENT,
    number: "10",
    ballotName,
    party: "EXM",
    photoPath,
    status: CANDIDATE_STATUS.DISPLAYABLE,
    jurisdiction: { scope: TERRITORIAL_SCOPE.NATIONAL },
  };
}

afterEach(() => {
  act(() => render(null, container));
  container.replaceChildren();
});

describe("CandidatePhoto", () => {
  it("não preserva a falha da foto ao trocar de candidato", () => {
    const firstCandidate = candidate(
      "candidate-a",
      "CANDIDATA A",
      "data/photos/a.jpg",
    );
    const secondCandidate = candidate(
      "candidate-b",
      "CANDIDATO B",
      "data/photos/b.jpg",
    );

    act(() => render(h(CandidatePhoto, { candidate: firstCandidate }), container));
    const firstImage = container.querySelector("img");
    expect(firstImage?.getAttribute("src")).toContain("data/photos/a.jpg");

    act(() => firstImage?.dispatchEvent(new Event("error")));
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("Falha ao carregar a foto");

    act(() => render(h(CandidatePhoto, { candidate: secondCandidate }), container));
    const secondImage = container.querySelector("img");
    expect(secondImage?.getAttribute("src")).toContain("data/photos/b.jpg");
    expect(secondImage?.getAttribute("alt")).toBe("Foto de CANDIDATO B");
    expect(container.textContent).not.toContain("Falha ao carregar a foto");
  });
});
