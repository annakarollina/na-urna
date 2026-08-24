import { useState } from "preact/hooks";

import {
  isCandidatePendingOrAmbiguous,
  type Candidate,
} from "../../candidates/index.ts";
import {
  VOTE_CHOICE_TYPE,
  type VoteChoice,
} from "../../election/types.ts";
import { PHOTO_PLACEHOLDER_SHAPE } from "../../shared/photo-placeholder.ts";
import { publicPath } from "../../shared/paths.ts";
import { XCircleIcon } from "./Icon.tsx";

export function CandidatePhoto({ candidate }: { candidate: Candidate }) {
  const photoIdentity = `${candidate.id}:${candidate.photoPath ?? ""}`;
  const [failedPhotoIdentity, setFailedPhotoIdentity] = useState<string | null>(
    null,
  );
  const failed = failedPhotoIdentity === photoIdentity;
  return (
    <div class="candidate-photo">
      {!candidate.photoPath || failed ? (
        <>
          <svg
            class="photo-placeholder"
            viewBox={`0 0 ${PHOTO_PLACEHOLDER_SHAPE.viewBox.width} ${PHOTO_PLACEHOLDER_SHAPE.viewBox.height}`}
            aria-hidden="true"
            focusable="false"
          >
            <circle
              cx={PHOTO_PLACEHOLDER_SHAPE.head.cx}
              cy={PHOTO_PLACEHOLDER_SHAPE.head.cy}
              r={PHOTO_PLACEHOLDER_SHAPE.head.radius}
            />
            <ellipse
              cx={PHOTO_PLACEHOLDER_SHAPE.shoulders.cx}
              cy={PHOTO_PLACEHOLDER_SHAPE.shoulders.cy}
              rx={PHOTO_PLACEHOLDER_SHAPE.shoulders.radiusX}
              ry={PHOTO_PLACEHOLDER_SHAPE.shoulders.radiusY}
            />
          </svg>
          <span class="sr-only">
            {failed ? "Falha ao carregar a foto" : "Foto não disponível"}
          </span>
        </>
      ) : (
        <img
          src={publicPath(candidate.photoPath)}
          alt={`Foto de ${candidate.ballotName}`}
          loading="lazy"
          onError={() => setFailedPhotoIdentity(photoIdentity)}
        />
      )}
    </div>
  );
}

export function CandidateDetails({ candidate }: { candidate: Candidate }) {
  return (
    <div class="candidate-details">
      <strong class="candidate-number">{candidate.number}</strong>
      <span class="candidate-name">{candidate.ballotName}</span>
      <span class="candidate-party">Partido · {candidate.party}</span>
      {isCandidatePendingOrAmbiguous(candidate) ? (
        <span class="candidate-status">
          Situação da candidatura ainda não definitiva
        </span>
      ) : null}
    </div>
  );
}

export function ChoiceDetails({
  choice,
  candidate,
}: {
  choice: VoteChoice;
  candidate?: Candidate | undefined;
}) {
  if (choice.type === VOTE_CHOICE_TYPE.CANDIDATE && candidate) {
    return <CandidateDetails candidate={candidate} />;
  }
  return (
    <div class="choice-details">
      {choice.type === VOTE_CHOICE_TYPE.PARTY ? (
        <>
          <strong class="choice-value">
            {choice.partyNumber} · {choice.party}
          </strong>
          <span class="choice-kind">Voto de legenda</span>
        </>
      ) : (
        <strong class="choice-value">
          {choice.type === VOTE_CHOICE_TYPE.BLANK ? "BRANCO" : "NULO"}
        </strong>
      )}
    </div>
  );
}

function choiceAccessibleLabel(choice: VoteChoice, candidate?: Candidate): string {
  if (choice.type === VOTE_CHOICE_TYPE.CANDIDATE && candidate) {
    return `${candidate.ballotName}, número ${candidate.number}`;
  }
  if (choice.type === VOTE_CHOICE_TYPE.PARTY) {
    return `voto de legenda ${choice.partyNumber}, ${choice.party}`;
  }
  return choice.type === VOTE_CHOICE_TYPE.BLANK ? "voto em branco" : "voto nulo";
}

export function SelectedChoice({
  choice,
  candidate,
  slotLabel,
  onEdit,
  onClear,
}: {
  choice: VoteChoice;
  candidate: Candidate | undefined;
  slotLabel: string;
  onEdit: () => void;
  onClear: () => void;
}) {
  const classes = ["selected-candidate"];
  if (choice.type !== VOTE_CHOICE_TYPE.CANDIDATE) {
    classes.push("selected-special-choice");
  }
  return (
    <div class={classes.join(" ")}>
      <button
        type="button"
        class="selected-choice-trigger"
        aria-label={`Alterar escolha de ${slotLabel}: atualmente ${choiceAccessibleLabel(choice, candidate)}`}
        onClick={onEdit}
      >
        <ChoiceDetails choice={choice} candidate={candidate} />
        {choice.type === VOTE_CHOICE_TYPE.CANDIDATE && candidate ? (
          <CandidatePhoto candidate={candidate} />
        ) : null}
        <span class="selected-label">Escolha atual</span>
      </button>
      <button
        type="button"
        class="text-button clear-selection-button"
        aria-label={`Esvaziar escolha de ${slotLabel}`}
        onClick={onClear}
      >
        <XCircleIcon />
        Esvaziar seleção
      </button>
    </div>
  );
}
