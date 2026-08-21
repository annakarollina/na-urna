import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import {
  CANDIDATE_DATASET_KIND,
  loadCandidateFile,
  loadCandidateMetadata,
  loadCandidatesForSlots,
  type Candidate,
  type CandidateDatasetKind,
} from "../candidates/index.ts";
import {
  colinhaFileName,
  composeColinhaModel,
  generateColinhaPng,
  shareColinhaPng,
  triggerBlobDownload,
} from "../colinha/index.ts";
import { electionForYear } from "../election/elections.ts";
import {
  TERRITORIAL_SCOPE,
  type FederativeUnit,
  type NonCandidateVoteChoice,
  type VotingSlot as VotingSlotModel,
} from "../election/types.ts";
import { detectStateFromGeolocation } from "../location/geolocation.ts";
import { STATE_NAMES } from "../location/states.ts";
import {
  changeSelectionLocation,
  selectCandidateInSession,
  selectNonCandidateInSession,
  startSelectionSession,
} from "../selection/session.ts";
import { ElectionContext } from "./components/ElectionContext.tsx";
import { AboutDialog, Footer, Header, UnsupportedView } from "./components/Layout.tsx";
import { LocationPicker } from "./components/LocationPicker.tsx";
import { Review } from "./components/Review.tsx";
import { VotingSlot } from "./components/VotingSlot.tsx";
import {
  createApplicationState,
  focusAfterRender,
  hasSelections,
  invalidateExport,
  locationLabel,
  resetLocationDetection,
  resolvedSelectionCount,
  searchInputId,
  selectionCount,
  type ApplicationState,
} from "./state.ts";

interface AppProps {
  currentYear?: number;
  datasetKind?: CandidateDatasetKind;
}

function ConfiguredApplication({
  electionYear,
  datasetKind,
}: {
  electionYear: number;
  datasetKind: CandidateDatasetKind;
}) {
  const election = electionForYear(electionYear);
  if (!election) return null;
  const stateRef = useRef<ApplicationState>(
    createApplicationState(election, datasetKind),
  );
  const [, setRenderVersion] = useState(0);
  const state = stateRef.current;
  const refresh = () => setRenderVersion((version) => version + 1);

  useEffect(() => {
    if (datasetKind !== CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT) return;
    let active = true;
    void loadCandidateMetadata(election.year)
      .then((metadata) => {
        if (!active) return;
        state.metadata = metadata;
        state.metadataStatus = "ready";
        state.metadataError = null;
      })
      .catch((error: unknown) => {
        if (!active) return;
        state.metadata = null;
        state.metadataStatus = "error";
        state.metadataError =
          error instanceof Error
            ? error.message
            : "Não foi possível confirmar a procedência dos dados eleitorais.";
      })
      .finally(() => {
        if (active) refresh();
      });
    return () => {
      active = false;
    };
  }, [datasetKind, election.year]);

  useEffect(() => {
    const releaseExportUrl = () => {
      if (state.exportUrl) URL.revokeObjectURL(state.exportUrl);
    };
    window.addEventListener("beforeunload", releaseExportUrl, { once: true });
    return () => window.removeEventListener("beforeunload", releaseExportUrl);
  }, []);

  const canApplyStateChoice = (uf: FederativeUnit): boolean => {
    const currentUf =
      state.session?.location.scope === TERRITORIAL_SCOPE.STATE
        ? state.session.location.uf
        : undefined;
    return (
      currentUf === uf ||
      !state.session ||
      !hasSelections(state.session) ||
      window.confirm("Alterar a UF apagará as escolhas atuais. Deseja continuar?")
    );
  };

  const loadCurrentCandidates = async (moveFocus: boolean): Promise<void> => {
    const session = state.session;
    if (!session) return;
    if (state.exportStatus !== "idle") invalidateExport(state);
    state.errors = new Map();
    state.loading = true;
    state.announcement = `Carregando candidatos para ${locationLabel(session.location)}.`;
    state.loadVersion += 1;
    const requestedVersion = state.loadVersion;
    refresh();

    const batch = await loadCandidatesForSlots(
      state.election.year,
      session.location,
      session.slots,
      (request) => loadCandidateFile(request, { datasetKind: state.datasetKind }),
    );
    if (requestedVersion !== state.loadVersion) return;
    state.files = batch.files;
    state.errors = batch.errors;
    state.loading = false;
    state.announcement =
      batch.errors.size === 0
        ? `Candidatos de ${locationLabel(session.location)} carregados.`
        : "Alguns dados eleitorais não puderam ser carregados.";
    refresh();
    if (moveFocus) focusAfterRender("choices-title");
  };

  const selectState = (uf: FederativeUnit): void => {
    invalidateExport(state);
    const location = { scope: TERRITORIAL_SCOPE.STATE, uf } as const;
    state.session = state.session
      ? changeSelectionLocation(state.session, location)
      : startSelectionSession(state.election, location);
    state.files = new Map();
    state.errors = new Map();
    state.selectionErrors = new Map();
    state.choosingSlots = new Set();
    state.locationEditing = false;
    void loadCurrentCandidates(true);
  };

  const requestLocationSuggestion = async (): Promise<void> => {
    state.locationDetectionVersion += 1;
    const requestVersion = state.locationDetectionVersion;
    state.locationDetectionStatus = "requesting";
    state.suggestedUf = null;
    state.locationDetectionError = null;
    state.announcement = "Solicitando sua localização ao navegador.";
    refresh();
    try {
      const uf = await detectStateFromGeolocation();
      if (requestVersion !== state.locationDetectionVersion) return;
      state.locationDetectionStatus = "suggested";
      state.suggestedUf = uf;
      state.announcement = `${STATE_NAMES[uf]} foi sugerido. Confirme antes de aplicar.`;
    } catch (error) {
      if (requestVersion !== state.locationDetectionVersion) return;
      state.locationDetectionStatus = "error";
      state.suggestedUf = null;
      state.locationDetectionError =
        error instanceof Error
          ? error.message
          : "Não foi possível determinar sua UF. Selecione-a manualmente.";
      state.announcement = state.locationDetectionError;
    }
    refresh();
    focusAfterRender("location-assistance");
  };

  const chooseCandidate = (slot: VotingSlotModel, candidate: Candidate): void => {
    if (!state.session) return;
    const result = selectCandidateInSession(state.session, slot.id, candidate);
    if (!result.ok) {
      state.selectionErrors = new Map(state.selectionErrors).set(
        slot.id,
        result.error.message,
      );
      state.announcement = result.error.message;
    } else {
      invalidateExport(state);
      state.session = result.session;
      const errors = new Map(state.selectionErrors);
      errors.delete(slot.id);
      state.selectionErrors = errors;
      const choosingSlots = new Set(state.choosingSlots);
      choosingSlots.delete(slot.id);
      state.choosingSlots = choosingSlots;
      state.announcement = `${candidate.ballotName} foi selecionado para ${slot.label}.`;
    }
    refresh();
    focusAfterRender(`slot-title-${slot.order}`);
  };

  const chooseNonCandidate = (
    slot: VotingSlotModel,
    choice: NonCandidateVoteChoice,
    announcementLabel: string,
  ): void => {
    if (!state.session) return;
    const result = selectNonCandidateInSession(state.session, slot.id, choice);
    if (!result.ok) {
      state.selectionErrors = new Map(state.selectionErrors).set(
        slot.id,
        result.error.message,
      );
      state.announcement = result.error.message;
    } else {
      invalidateExport(state);
      state.session = result.session;
      const errors = new Map(state.selectionErrors);
      errors.delete(slot.id);
      state.selectionErrors = errors;
      const choosingSlots = new Set(state.choosingSlots);
      choosingSlots.delete(slot.id);
      state.choosingSlots = choosingSlots;
      state.announcement = `${announcementLabel} marcado para ${slot.label}.`;
    }
    refresh();
    focusAfterRender(`slot-title-${slot.order}`);
  };

  const generateExport = async (action: "download" | "share"): Promise<void> => {
    const session = state.session;
    if (!session || resolvedSelectionCount(state) === 0) {
      state.exportStatus = "error";
      state.exportError = "Faça pelo menos uma escolha antes de baixar a colinha.";
      refresh();
      return;
    }
    if (
      state.datasetKind === CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT &&
      !state.metadata
    ) {
      state.exportStatus = "error";
      state.exportError =
        "Aguarde a confirmação da data do snapshot oficial antes de baixar.";
      refresh();
      return;
    }

    invalidateExport(state);
    state.exportStatus = "generating";
    state.exportAction = action;
    state.announcement = "Gerando a imagem da colinha neste dispositivo.";
    const requestedVersion = state.exportVersion;
    refresh();
    const candidates = [...state.files.values()].flatMap((file) => file.candidates);
    const model = composeColinhaModel(session, candidates, {
      notice:
        state.datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE
          ? "DADOS FICTÍCIOS — DESENVOLVIMENTO — NÃO USE PARA VOTAR"
          : null,
      snapshotImportedAt: state.metadata?.importedAt ?? null,
      omitEmptyRows: state.exportOnlyFilled,
    });

    try {
      const blob = await generateColinhaPng(model);
      if (requestedVersion !== state.exportVersion) return;
      const fileName = colinhaFileName(state.election.year, session.location);
      if (action === "share") {
        state.preparedShare = { blob, fileName };
        state.exportStatus = "idle";
        state.exportAction = null;
        state.shareMessage =
          "Imagem pronta. Use o botão novamente para abrir o compartilhamento do dispositivo.";
        state.announcement = state.shareMessage;
      } else {
        const download = triggerBlobDownload(blob, fileName);
        if (download.started) {
          state.exportStatus = "idle";
          state.exportAction = null;
          state.announcement = "Download da colinha iniciado.";
        } else {
          state.exportUrl = download.fallbackUrl;
          state.exportStatus = "fallback";
          state.exportAction = null;
          state.announcement =
            "O download automático não começou. Use o link manual disponível.";
        }
      }
    } catch (error) {
      if (requestedVersion !== state.exportVersion) return;
      state.exportStatus = "error";
      state.exportAction = null;
      state.exportError =
        error instanceof Error ? error.message : "Não foi possível gerar a imagem PNG.";
      state.announcement = state.exportError;
    }
    refresh();
    focusAfterRender("export-actions");
  };

  const sharePreparedExport = (): void => {
    const prepared = state.preparedShare;
    if (!prepared) {
      void generateExport("share");
      return;
    }
    const shareOperation = shareColinhaPng(prepared.blob, prepared.fileName);
    state.exportStatus = "generating";
    state.exportAction = "share";
    state.exportError = null;
    state.shareMessage = null;
    state.announcement = "Abrindo o compartilhamento do dispositivo.";
    refresh();
    void shareOperation
      .then((result) => {
        state.exportStatus = "idle";
        state.exportAction = null;
        if (result.status === "shared") {
          state.announcement = "Compartilhamento concluído.";
        } else if (result.status === "cancelled") {
          state.announcement = "Compartilhamento cancelado.";
        } else {
          state.shareMessage =
            "Este navegador não compartilha arquivos diretamente. Baixe a imagem e compartilhe o arquivo salvo.";
          state.announcement = state.shareMessage;
        }
      })
      .catch((error: unknown) => {
        state.exportStatus = "error";
        state.exportAction = null;
        state.exportError =
          error instanceof Error
            ? error.message
            : "Não foi possível compartilhar a imagem PNG.";
        state.announcement = state.exportError;
      })
      .finally(() => {
        refresh();
        focusAfterRender("export-actions");
      });
  };

  return (
    <>
      <Header
        datasetKind={state.datasetKind}
        onAbout={() => {
          state.aboutOpen = true;
          refresh();
        }}
      />
      <main class="page" id="conteudo">
        <ElectionContext state={state} />
        <div class="electoral-flow">
          <LocationPicker
            state={state}
            onSelectState={(uf) => {
              if (!canApplyStateChoice(uf)) return false;
              resetLocationDetection(state);
              selectState(uf);
              return true;
            }}
            onKeepCurrent={() => {
              resetLocationDetection(state);
              state.locationEditing = false;
              refresh();
            }}
            onEdit={() => {
              state.locationEditing = true;
              state.announcement = "Seleção de UF aberta para alteração.";
              refresh();
              focusAfterRender("voting-state");
            }}
            onRequestLocation={() => void requestLocationSuggestion()}
            onConfirmSuggestion={() => {
              const suggestedUf = state.suggestedUf;
              if (!suggestedUf || !canApplyStateChoice(suggestedUf)) return;
              const currentUf =
                state.session?.location.scope === TERRITORIAL_SCOPE.STATE
                  ? state.session.location.uf
                  : undefined;
              resetLocationDetection(state);
              if (currentUf === suggestedUf) {
                state.locationEditing = false;
                state.announcement = `${STATE_NAMES[suggestedUf]} já é a UF selecionada.`;
                refresh();
              } else {
                selectState(suggestedUf);
              }
            }}
            onRejectSuggestion={() => {
              resetLocationDetection(state);
              state.announcement = "Sugestão descartada. Escolha sua UF manualmente.";
              refresh();
              focusAfterRender("voting-state");
            }}
          />
          {state.session ? (
            <>
              <div class="slots-header">
                <h2 id="choices-title" tabIndex={-1}>
                  Monte suas escolhas
                </h2>
                <p>
                  {locationLabel(state.session.location)} ·{" "}
                  {state.session.slots.length} posições na ordem de votação
                </p>
                <p class="choices-count">
                  {selectionCount(state.session)} de {state.session.slots.length}{" "}
                  preenchidas
                </p>
                <progress
                  class="selection-progress compact-progress"
                  max={state.session.slots.length}
                  value={selectionCount(state.session)}
                  aria-label={`${selectionCount(state.session)} de ${state.session.slots.length} escolhas preenchidas`}
                />
              </div>
              <div class="slots">
                {state.session.slots.map((slot) => (
                  <VotingSlot
                    key={slot.id}
                    slot={slot}
                    state={state}
                    onChange={() => {
                      state.choosingSlots = new Set(state.choosingSlots).add(slot.id);
                      refresh();
                      focusAfterRender(searchInputId(slot));
                    }}
                    onSelect={(candidate) => chooseCandidate(slot, candidate)}
                    onNonCandidate={(choice, label) =>
                      chooseNonCandidate(slot, choice, label)
                    }
                    onRetry={() => void loadCurrentCandidates(false)}
                  />
                ))}
              </div>
              <Review
                state={state}
                onEditSlot={(slot) => {
                  state.choosingSlots = new Set(state.choosingSlots).add(slot.id);
                  refresh();
                  focusAfterRender(searchInputId(slot));
                }}
                onToggleOnlyFilled={(checked) => {
                  state.exportOnlyFilled = checked;
                  invalidateExport(state);
                  state.announcement = checked
                    ? "A imagem mostrará somente as escolhas preenchidas."
                    : "A imagem também mostrará as posições não preenchidas.";
                  refresh();
                  focusAfterRender("export-only-filled");
                }}
                onDownload={() => void generateExport("download")}
                onShare={sharePreparedExport}
                onFallbackDownload={(fallbackUrl) => {
                  state.announcement = "Download da colinha iniciado.";
                  window.setTimeout(() => {
                    if (state.exportUrl !== fallbackUrl) return;
                    URL.revokeObjectURL(fallbackUrl);
                    state.exportUrl = null;
                    state.exportStatus = "idle";
                    refresh();
                  }, 1_000);
                }}
              />
            </>
          ) : null}
        </div>
      </main>
      <Footer />
      <p class="sr-only" aria-live="polite">
        {state.announcement}
      </p>
      <AboutDialog
        open={state.aboutOpen}
        onClose={() => {
          state.aboutOpen = false;
          refresh();
        }}
        onAnnouncement={(message) => {
          state.announcement = message;
          refresh();
        }}
      />
    </>
  );
}

export function App({
  currentYear = new Date().getFullYear(),
  datasetKind = CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT,
}: AppProps) {
  const election = electionForYear(currentYear);
  if (!election) {
    return (
      <>
        <Header datasetKind={datasetKind} />
        <UnsupportedView year={currentYear} />
        <Footer />
      </>
    );
  }
  return (
    <ConfiguredApplication
      key={`${currentYear}:${datasetKind}`}
      electionYear={currentYear}
      datasetKind={datasetKind}
    />
  );
}

export function mountApplication(
  root: HTMLElement,
  currentYear: number = new Date().getFullYear(),
  datasetKind: CandidateDatasetKind = CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT,
): void {
  render(<App currentYear={currentYear} datasetKind={datasetKind} />, root);
}
