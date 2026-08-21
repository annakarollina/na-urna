import { CANDIDATE_DATASET_KIND } from "../../candidates/index.ts";
import { browserMayShareFiles, colinhaFileName } from "../../colinha/index.ts";
import { VOTE_CHOICE_TYPE, type VotingSlot } from "../../election/types.ts";
import {
  resolvedSelectionCount,
  selectedCandidate,
  type ApplicationState,
} from "../state.ts";
import {
  CandidateDetails,
  CandidatePhoto,
  ChoiceDetails,
} from "./CandidatePresentation.tsx";

function ExportRowPreference({
  state,
  onChange,
}: {
  state: ApplicationState;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div class="export-row-preference">
      <label class="switch-label" for="export-only-filled">
        <input
          id="export-only-filled"
          class="switch-control"
          type="checkbox"
          role="switch"
          aria-describedby="export-only-filled-description"
          checked={state.exportOnlyFilled}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span class="switch-track" aria-hidden="true" />
        <span class="switch-text">Mostrar somente o que preenchi na imagem</span>
      </label>
      <p id="export-only-filled-description" class="switch-description">
        {state.exportOnlyFilled
          ? "Ativado: posições sem escolha serão omitidas do PNG."
          : "Desativado: posições sem escolha aparecerão como “Não preenchido” no PNG."}
      </p>
    </div>
  );
}

function ExportActions({
  state,
  hasResolvedSelection,
  onDownload,
  onShare,
  onFallbackDownload,
}: {
  state: ApplicationState;
  hasResolvedSelection: boolean;
  onDownload: () => void;
  onShare: () => void;
  onFallbackDownload: (url: string) => void;
}) {
  if (state.exportStatus === "fallback" && state.exportUrl && state.session) {
    const fallbackUrl = state.exportUrl;
    return (
      <div id="export-actions" class="export-actions" tabIndex={-1} aria-busy="false">
        <p class="export-hint">
          Seu navegador bloqueou o início automático do download.
        </p>
        <a
          class="secondary-button download-button"
          href={fallbackUrl}
          download={colinhaFileName(state.election.year, state.session.location)}
          onClick={() => onFallbackDownload(fallbackUrl)}
        >
          O download não começou? Baixar manualmente
        </a>
      </div>
    );
  }

  const metadataReady =
    state.datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE ||
    state.metadata !== null;
  const generating = state.exportStatus === "generating";
  const shareReady = state.preparedShare !== null;
  return (
    <div
      id="export-actions"
      class="export-actions"
      tabIndex={-1}
      aria-busy={generating}
    >
      <button
        type="button"
        class="primary-button generate-button"
        disabled={!hasResolvedSelection || !metadataReady || generating}
        onClick={onDownload}
      >
        {generating && state.exportAction === "download"
          ? "Gerando sua colinha…"
          : "Baixar minha colinha"}
      </button>
      {browserMayShareFiles() ? (
        <button
          type="button"
          class="secondary-button share-colinha"
          disabled={!hasResolvedSelection || !metadataReady || generating}
          onClick={onShare}
        >
          {generating && state.exportAction === "share"
            ? shareReady
              ? "Compartilhando…"
              : "Preparando imagem…"
            : shareReady
              ? "Compartilhar imagem pronta"
              : "Compartilhar minha colinha"}
        </button>
      ) : hasResolvedSelection ? (
        <p class="export-hint">
          Para compartilhar, baixe a imagem e use o compartilhamento de arquivos
          do seu dispositivo.
        </p>
      ) : null}
      {!hasResolvedSelection ? (
        <p class="export-hint">
          Faça pelo menos uma escolha para liberar o download.
        </p>
      ) : !metadataReady ? (
        <p class="export-hint">
          Aguardando a confirmação da data dos dados oficiais.
        </p>
      ) : null}
      {generating ? (
        <p class="export-generating" role="status">
          Fotos e textos estão sendo compostos neste dispositivo…
        </p>
      ) : null}
      {state.exportStatus === "error" && state.exportError ? (
        <p class="error-state" role="alert">
          {state.exportError}
        </p>
      ) : null}
      {state.shareMessage ? (
        <p class="export-hint" role="status">
          {state.shareMessage}
        </p>
      ) : null}
    </div>
  );
}

export function Review({
  state,
  onEditSlot,
  onToggleOnlyFilled,
  onDownload,
  onShare,
  onFallbackDownload,
}: {
  state: ApplicationState;
  onEditSlot: (slot: VotingSlot) => void;
  onToggleOnlyFilled: (checked: boolean) => void;
  onDownload: () => void;
  onShare: () => void;
  onFallbackDownload: (url: string) => void;
}) {
  const session = state.session;
  if (!session) return null;
  const resolved = resolvedSelectionCount(state);
  const complete = resolved === session.slots.length;
  const hasResolvedSelection = resolved > 0;
  return (
    <section class="review" aria-labelledby="review-title">
      <h2 id="review-title">Revise sua colinha</h2>
      <p class="review-description">
        Confira candidaturas, legendas, votos em branco ou nulos antes de gerar
        a imagem.
      </p>
      <ol class="review-list">
        {session.slots.map((slot) => {
          const candidate = selectedCandidate(state, slot);
          const voteChoice = session.selections[slot.id];
          return (
            <li class="review-item" key={slot.id}>
              <div class="review-office">
                <span class="review-order">{slot.order}</span>
                <strong>{slot.label}</strong>
              </div>
              {voteChoice?.type === VOTE_CHOICE_TYPE.CANDIDATE && candidate ? (
                <div class="review-candidate">
                  <CandidatePhoto candidate={candidate} />
                  <CandidateDetails candidate={candidate} />
                </div>
              ) : voteChoice && voteChoice.type !== VOTE_CHOICE_TYPE.CANDIDATE ? (
                <div class="review-special-choice">
                  <ChoiceDetails choice={voteChoice} />
                </div>
              ) : (
                <p class="review-empty">
                  {voteChoice
                    ? "A escolha está em memória, mas seus dados estão temporariamente indisponíveis."
                    : "Ainda não preenchido"}
                </p>
              )}
              <button
                type="button"
                class="text-button"
                aria-label={`${voteChoice ? "Trocar" : "Escolher"} ${slot.label}`}
                onClick={() => onEditSlot(slot)}
              >
                {voteChoice ? "Trocar" : "Escolher"}
              </button>
            </li>
          );
        })}
      </ol>
      <p class={complete ? "review-ready" : "review-pending"} role="status">
        {complete
          ? "Todas as posições estão preenchidas. Sua colinha está pronta para virar imagem."
          : hasResolvedSelection
            ? state.exportOnlyFilled
              ? "Você já pode baixar a colinha. A imagem mostrará somente o que foi preenchido."
              : "Você já pode baixar a colinha. As posições restantes aparecerão como “Não preenchido”."
            : "Faça pelo menos uma escolha para baixar a colinha."}
      </p>
      <ExportRowPreference state={state} onChange={onToggleOnlyFilled} />
      {state.datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE ? (
        <p class="review-fixture-reminder">
          Revisão com dados fictícios de desenvolvimento — não use estes números
          para votar.
        </p>
      ) : null}
      <ExportActions
        state={state}
        hasResolvedSelection={hasResolvedSelection}
        onDownload={onDownload}
        onShare={onShare}
        onFallbackDownload={onFallbackDownload}
      />
    </section>
  );
}
