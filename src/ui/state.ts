import {
  CANDIDATE_DATASET_KIND,
  isCandidateSelectable,
  type Candidate,
  type CandidateDatasetKind,
  type CandidateFile,
  type CandidateSnapshotMetadata,
} from "../candidates/index.ts";
import {
  TERRITORIAL_SCOPE,
  VOTE_CHOICE_TYPE,
  type ElectionConfig,
  type ElectoralLocation,
  type ElectoralOffice,
  type FederativeUnit,
  type VoteChoice,
  type VotingSlot,
  type VotingSlotId,
} from "../election/types.ts";
import { STATE_NAMES } from "../location/states.ts";
import type { SelectionSession } from "../selection/session.ts";

export interface PreparedExport {
  readonly blob: Blob;
  readonly fileName: string;
  readonly shareable: boolean;
}

export interface ApplicationState {
  readonly election: ElectionConfig;
  readonly datasetKind: CandidateDatasetKind;
  session: SelectionSession | null;
  metadata: CandidateSnapshotMetadata | null;
  metadataStatus: "loading" | "ready" | "error" | "not-applicable";
  metadataError: string | null;
  locationDetectionStatus: "idle" | "requesting" | "suggested" | "error";
  suggestedUf: FederativeUnit | null;
  locationDetectionError: string | null;
  locationDetectionVersion: number;
  files: ReadonlyMap<ElectoralOffice, CandidateFile>;
  errors: ReadonlyMap<ElectoralOffice, Error>;
  selectionErrors: ReadonlyMap<VotingSlotId, string>;
  choosingSlots: ReadonlySet<VotingSlotId>;
  loading: boolean;
  announcement: string;
  loadVersion: number;
  exportStatus: "idle" | "generating" | "fallback" | "error";
  exportUrl: string | null;
  exportError: string | null;
  exportVersion: number;
  exportAction: "download" | "share" | null;
  exportPreparationStatus: "idle" | "scheduled" | "generating" | "ready" | "error";
  preparedExport: PreparedExport | null;
  shareMessage: string | null;
  exportOnlyFilled: boolean;
  aboutOpen: boolean;
  locationEditing: boolean;
}

export function createApplicationState(
  election: ElectionConfig,
  datasetKind: CandidateDatasetKind,
): ApplicationState {
  return {
    election,
    datasetKind,
    session: null,
    metadata: null,
    metadataStatus:
      datasetKind === CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT
        ? "loading"
        : "not-applicable",
    metadataError: null,
    locationDetectionStatus: "idle",
    suggestedUf: null,
    locationDetectionError: null,
    locationDetectionVersion: 0,
    files: new Map(),
    errors: new Map(),
    selectionErrors: new Map(),
    choosingSlots: new Set(),
    loading: false,
    announcement: "",
    loadVersion: 0,
    exportStatus: "idle",
    exportUrl: null,
    exportError: null,
    exportVersion: 0,
    exportAction: null,
    exportPreparationStatus: "idle",
    preparedExport: null,
    shareMessage: null,
    exportOnlyFilled: false,
    aboutOpen: false,
    locationEditing: true,
  };
}

export function selectedChoice(
  state: ApplicationState,
  slot: VotingSlot,
): VoteChoice | undefined {
  return state.session?.selections[slot.id];
}

export function selectedCandidate(
  state: ApplicationState,
  slot: VotingSlot,
): Candidate | undefined {
  const choice = selectedChoice(state, slot);
  if (choice?.type !== VOTE_CHOICE_TYPE.CANDIDATE) return undefined;
  return state.files
    .get(slot.office)
    ?.candidates.find(
      (candidate) =>
        candidate.id === choice.candidateId && isCandidateSelectable(candidate),
    );
}

export function hasSelections(session: SelectionSession): boolean {
  return Object.keys(session.selections).length > 0;
}

export function locationLabel(location: ElectoralLocation): string {
  if (location.scope === TERRITORIAL_SCOPE.NATIONAL) return "Brasil";
  if (location.scope === TERRITORIAL_SCOPE.MUNICIPALITY) {
    return `${location.municipalityName} (${location.uf})`;
  }
  return `${STATE_NAMES[location.uf]} (${location.uf})`;
}

export function searchInputId(slot: VotingSlot): string {
  return `search-${slot.id.replace(":", "-").toLowerCase()}`;
}

export function focusAfterRender(id: string): void {
  requestAnimationFrame(() => {
    const target = document.getElementById(id);
    target?.focus({ preventScroll: true });
  });
}

export function selectionCount(session: SelectionSession): number {
  return session.slots.filter((slot) => session.selections[slot.id]).length;
}

export function resolvedSelectionCount(state: ApplicationState): number {
  return (
    state.session?.slots.filter((slot) => {
      const choice = selectedChoice(state, slot);
      return (
        choice !== undefined &&
        (choice.type !== VOTE_CHOICE_TYPE.CANDIDATE ||
          selectedCandidate(state, slot) !== undefined)
      );
    }).length ?? 0
  );
}

export function invalidateExport(state: ApplicationState): void {
  if (state.exportUrl) URL.revokeObjectURL(state.exportUrl);
  state.exportStatus = "idle";
  state.exportUrl = null;
  state.exportError = null;
  state.exportAction = null;
  state.exportPreparationStatus = "idle";
  state.preparedExport = null;
  state.shareMessage = null;
  state.exportVersion += 1;
}

export function resetLocationDetection(state: ApplicationState): void {
  state.locationDetectionVersion += 1;
  state.locationDetectionStatus = "idle";
  state.suggestedUf = null;
  state.locationDetectionError = null;
}
