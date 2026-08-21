import { isCandidateSelectable } from "./availability.ts";
import type { Candidate } from "./model.ts";

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function searchTokens(value: string): readonly string[] {
  return normalizeSearchText(value).match(/[a-z0-9]+/g) ?? [];
}

function compareCandidates(first: Candidate, second: Candidate): number {
  const numberLength = first.number.length - second.number.length;
  if (numberLength !== 0) {
    return numberLength;
  }

  const numberOrder = first.number.localeCompare(second.number);
  if (numberOrder !== 0) {
    return numberOrder;
  }

  const nameOrder = normalizeSearchText(first.ballotName).localeCompare(
    normalizeSearchText(second.ballotName),
  );
  return nameOrder !== 0 ? nameOrder : first.id.localeCompare(second.id);
}

export function searchCandidates(
  candidates: readonly Candidate[],
  query: string,
  party: string | null = null,
): readonly Candidate[] {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = searchTokens(query);
  const isNumericQuery = /^\d+$/.test(normalizedQuery);

  return candidates
    .filter(
      (candidate) =>
        isCandidateSelectable(candidate) &&
        (party === null || candidate.party === party) &&
        (normalizedQuery.length === 0 ||
          (isNumericQuery
            ? candidate.number.startsWith(normalizedQuery)
            : queryTokens.every((queryToken) =>
                searchTokens(candidate.ballotName).some((nameToken) =>
                  nameToken.startsWith(queryToken),
                ),
              ))),
    )
    .sort(compareCandidates);
}

export interface CandidatePartyOption {
  readonly party: string;
  readonly partyNumber: string;
}

export function candidatePartyOptions(
  candidates: readonly Candidate[],
): readonly CandidatePartyOption[] {
  const numbers = new Map<string, string>();
  for (const candidate of candidates) {
    if (!isCandidateSelectable(candidate)) continue;
    const partyNumber = candidate.number.slice(0, 2);
    if (!/^\d{2}$/.test(partyNumber)) {
      throw new Error(`Número partidário inválido para ${candidate.party}.`);
    }
    const existing = numbers.get(candidate.party);
    if (existing && existing !== partyNumber) {
      throw new Error(`O partido ${candidate.party} possui números divergentes.`);
    }
    numbers.set(candidate.party, partyNumber);
  }
  return [...numbers.entries()]
    .map(([party, partyNumber]) => ({ party, partyNumber }))
    .sort(
      (first, second) =>
        first.party.localeCompare(second.party, "pt-BR") ||
        first.partyNumber.localeCompare(second.partyNumber),
    );
}
