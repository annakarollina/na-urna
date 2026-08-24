import type { Candidate } from "../candidates/model.ts";
import {
  isCandidatePendingOrAmbiguous,
  isCandidateSelectable,
} from "../candidates/availability.ts";
import {
  ELECTION_TYPE,
  TERRITORIAL_SCOPE,
  VOTE_CHOICE_TYPE,
} from "../election/types.ts";
import { STATE_NAMES } from "../location/states.ts";
import type { SelectionSession } from "../selection/session.ts";

export interface ColinhaCandidateChoice {
  readonly type: typeof VOTE_CHOICE_TYPE.CANDIDATE;
  readonly id: string;
  readonly number: string;
  readonly ballotName: string;
  readonly party: string;
  readonly photoPath: string | null;
  readonly pendingOrAmbiguous: boolean;
}

export interface ColinhaPartyChoice {
  readonly type: typeof VOTE_CHOICE_TYPE.PARTY;
  readonly party: string;
  readonly partyNumber: string;
}

export interface ColinhaBlankChoice {
  readonly type: typeof VOTE_CHOICE_TYPE.BLANK;
}

export interface ColinhaNullChoice {
  readonly type: typeof VOTE_CHOICE_TYPE.NULL;
}

export type ColinhaChoice =
  | ColinhaCandidateChoice
  | ColinhaPartyChoice
  | ColinhaBlankChoice
  | ColinhaNullChoice;

export interface ColinhaRow {
  readonly slotId: string;
  readonly order: number;
  readonly officeLabel: string;
  readonly choice: ColinhaChoice | null;
}

export interface ColinhaModel {
  readonly title: "Minha Colinha";
  readonly electionLocationLabel: string;
  readonly notice: string | null;
  readonly dataUpdatedLabel: string | null;
  readonly rows: readonly ColinhaRow[];
}

export interface ComposeColinhaOptions {
  readonly notice?: string | null;
  readonly snapshotSourceGeneratedAt?: string | null;
  readonly omitEmptyRows?: boolean;
}

function electionLocationLabel(session: SelectionSession): string {
  const electionName =
    session.election.type === ELECTION_TYPE.GENERAL
      ? "Eleições Gerais"
      : session.election.type === ELECTION_TYPE.MUNICIPAL
        ? "Eleições Municipais"
        : "Eleição";
  const location =
    session.location.scope === TERRITORIAL_SCOPE.NATIONAL
      ? "Brasil"
      : session.location.scope === TERRITORIAL_SCOPE.STATE
        ? `${STATE_NAMES[session.location.uf]} (${session.location.uf})`
        : `${session.location.municipalityName} (${session.location.uf})`;
  return `${electionName} ${session.election.year} · ${location}`;
}

function dataGeneratedLabel(
  sourceGeneratedAt: string | null | undefined,
): string | null {
  if (!sourceGeneratedAt) {
    return null;
  }
  const sourceGeneratedDate = new Date(sourceGeneratedAt);
  if (Number.isNaN(sourceGeneratedDate.getTime())) {
    throw new Error("A data de geração da fonte do snapshot é inválida.");
  }
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(sourceGeneratedDate);
  return `Dados do TSE gerados em ${formattedDate}`;
}

export function composeColinhaModel(
  session: SelectionSession,
  candidates: readonly Candidate[],
  options: ComposeColinhaOptions = {},
): ColinhaModel {
  const candidatesById = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  );
  const rows = session.slots.map((slot): ColinhaRow => {
    const selection = session.selections[slot.id];
    const candidate =
      selection?.type === VOTE_CHOICE_TYPE.CANDIDATE
        ? candidatesById.get(selection.candidateId)
        : undefined;
    const validCandidate =
      candidate?.office === slot.office && isCandidateSelectable(candidate)
        ? candidate
        : undefined;

    return {
      slotId: slot.id,
      order: slot.order,
      officeLabel: slot.label,
      choice:
        selection?.type === VOTE_CHOICE_TYPE.CANDIDATE && validCandidate
          ? {
            type: VOTE_CHOICE_TYPE.CANDIDATE,
            id: validCandidate.id,
            number: validCandidate.number,
            ballotName: validCandidate.ballotName,
            party: validCandidate.party,
            photoPath: validCandidate.photoPath,
            pendingOrAmbiguous:
              isCandidatePendingOrAmbiguous(validCandidate),
          }
          : selection?.type === VOTE_CHOICE_TYPE.PARTY &&
              slot.allowPartyVote &&
              selection.party.trim().length > 0 &&
              /^\d{2}$/.test(selection.partyNumber)
            ? selection
            : selection?.type === VOTE_CHOICE_TYPE.BLANK ||
                selection?.type === VOTE_CHOICE_TYPE.NULL
              ? selection
              : null,
    };
  });

  return {
    title: "Minha Colinha",
    electionLocationLabel: electionLocationLabel(session),
    notice: options.notice ?? null,
    dataUpdatedLabel: dataGeneratedLabel(options.snapshotSourceGeneratedAt),
    rows: options.omitEmptyRows
      ? rows.filter(({ choice }) => choice !== null)
      : rows,
  };
}
