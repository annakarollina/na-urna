import type { Candidate } from "../../candidates/index.ts";
import type {
  NonCandidateVoteChoice,
  VotingSlot as VotingSlotModel,
} from "../../election/types.ts";
import type { ApplicationState } from "../state.ts";
import { selectedCandidate, selectedChoice } from "../state.ts";
import { CandidatePicker } from "./CandidatePicker.tsx";
import { SelectedChoice } from "./CandidatePresentation.tsx";
import { RefreshCwIcon } from "./Icon.tsx";

export function VotingSlot({
  slot,
  state,
  onChange,
  onSelect,
  onNonCandidate,
  onRetry,
}: {
  slot: VotingSlotModel;
  state: ApplicationState;
  onChange: () => void;
  onSelect: (candidate: Candidate) => void;
  onNonCandidate: (
    choice: NonCandidateVoteChoice,
    announcementLabel: string,
  ) => void;
  onRetry: () => void;
}) {
  const choice = selectedChoice(state, slot);
  const candidate = selectedCandidate(state, slot);
  const isChoosing = state.choosingSlots.has(slot.id);
  const selected =
    !isChoosing && choice && (choice.type !== "CANDIDATE" || candidate) ? (
      <SelectedChoice
        choice={choice}
        candidate={candidate}
        onChange={onChange}
      />
    ) : null;

  let content;
  if (state.loading) {
    content = (
      <p class="loading-state" role="status">
        Carregando candidatos…
      </p>
    );
  } else {
    const loadError = state.errors.get(slot.office);
    const file = state.files.get(slot.office);
    if (loadError) {
      content = (
        <>
          <p class="error-state" role="alert">
            {loadError.message}
          </p>
          <button
            type="button"
            class="secondary-button retry-button"
            onClick={onRetry}
          >
            <RefreshCwIcon />
            Tentar novamente
          </button>
        </>
      );
    } else if (!file) {
      content = (
        <p class="error-state" role="alert">
          Os dados deste cargo não estão disponíveis.
        </p>
      );
    } else if (choice && !isChoosing) {
      content = null;
    } else {
      content = (
        <>
          <CandidatePicker
            slot={slot}
            candidates={file.candidates}
            replacing={choice !== undefined}
            onSelect={onSelect}
            onNonCandidate={onNonCandidate}
          />
          {state.selectionErrors.get(slot.id) ? (
            <p class="error-state" role="alert">
              {state.selectionErrors.get(slot.id)}
            </p>
          ) : null}
        </>
      );
    }
  }

  return (
    <section
      class="slot"
      data-office={slot.office}
      aria-labelledby={`slot-title-${slot.order}`}
    >
      <h2
        id={`slot-title-${slot.order}`}
        class="slot-title"
        tabIndex={-1}
      >
        {slot.label}
      </h2>
      {selected}
      {content}
    </section>
  );
}
