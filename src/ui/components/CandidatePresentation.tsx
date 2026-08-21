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

export function CandidatePhoto({ candidate }: { candidate: Candidate }) {
  const [failed, setFailed] = useState(false);
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
          onError={() => setFailed(true)}
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
      <span class="candidate-party">{candidate.party}</span>
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
  onChange,
}: {
  choice: VoteChoice;
  candidate: Candidate | undefined;
  onChange: () => void;
}) {
  const classes = ["selected-candidate"];
  if (choice.type !== VOTE_CHOICE_TYPE.CANDIDATE) {
    classes.push("selected-special-choice");
  }
  return (
    <div
      class={classes.join(" ")}
      aria-label={`Escolha atual: ${choiceAccessibleLabel(choice, candidate)}`}
    >
      {choice.type === VOTE_CHOICE_TYPE.CANDIDATE && candidate ? (
        <CandidatePhoto candidate={candidate} />
      ) : null}
      <ChoiceDetails choice={choice} candidate={candidate} />
      <span class="selected-label">Escolha atual</span>
      <button
        type="button"
        class="secondary-button change-choice"
        onClick={onChange}
      >
        Trocar
      </button>
    </div>
  );
}
