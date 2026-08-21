import { useEffect, useRef, useState } from "preact/hooks";

import {
  MAX_VISIBLE_CANDIDATE_RESULTS,
  candidatePartyOptions,
  visibleCandidateSearchResults,
  type Candidate,
} from "../../candidates/index.ts";
import {
  VOTE_CHOICE_TYPE,
  type NonCandidateVoteChoice,
  type VotingSlot,
} from "../../election/types.ts";
import {
  CANDIDATE_PANEL_ACTION,
  initialCandidatePanelState,
  updateCandidatePanelState,
} from "../candidate-panel.ts";
import { searchInputId } from "../state.ts";
import { CandidateDetails, CandidatePhoto } from "./CandidatePresentation.tsx";

interface CandidatePickerProps {
  slot: VotingSlot;
  candidates: readonly Candidate[];
  replacing: boolean;
  onSelect: (candidate: Candidate) => void;
  onNonCandidate: (
    choice: NonCandidateVoteChoice,
    announcementLabel: string,
  ) => void;
}

function CandidateResults({
  candidates,
  query,
  party,
  limit,
  replacing,
  onSelect,
  onShowMore,
}: {
  candidates: readonly Candidate[];
  query: string;
  party: string | null;
  limit: number;
  replacing: boolean;
  onSelect: (candidate: Candidate) => void;
  onShowMore: () => void;
}) {
  const matches = visibleCandidateSearchResults(candidates, query, party, limit);
  if (matches.total === 0) {
    return (
      <p class="empty-state" role="status">
        Nenhum candidato encontrado.
      </p>
    );
  }
  return (
    <>
      {matches.hasMore ? (
        <p class="result-limit">
          Mostrando {matches.candidates.length} de {matches.total} candidaturas.
        </p>
      ) : null}
      <ul class="candidate-results">
        {matches.candidates.map((candidate) => (
          <li key={candidate.id}>
            <button
              type="button"
              class="candidate-card"
              aria-label={`${replacing ? "Substituir por" : "Selecionar"} ${candidate.ballotName}, número ${candidate.number}, partido ${candidate.party}`}
              onClick={() => onSelect(candidate)}
            >
              <CandidatePhoto candidate={candidate} />
              <CandidateDetails candidate={candidate} />
              <span class="candidate-card-action">
                {replacing ? "Substituir" : "Selecionar"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {matches.hasMore ? (
        <button
          type="button"
          class="secondary-button show-more"
          onClick={onShowMore}
        >
          Mostrar mais
        </button>
      ) : null}
    </>
  );
}

function AlternativeChoices({
  slot,
  candidates,
  onNonCandidate,
}: Pick<CandidatePickerProps, "slot" | "candidates" | "onNonCandidate">) {
  const [partyValue, setPartyValue] = useState("");
  const partySelectRef = useRef<HTMLSelectElement>(null);
  const partySelectId = `party-choice-${slot.id.replace(":", "-").toLowerCase()}`;
  return (
    <div
      class="alternative-choices"
      role="group"
      aria-label={`Outras escolhas para ${slot.label}`}
    >
      <span class="alternative-label">Outras escolhas</span>
      <div class="alternative-actions">
        <button
          type="button"
          class="text-button"
          onClick={() =>
            onNonCandidate({ type: VOTE_CHOICE_TYPE.BLANK }, "Voto em branco")
          }
        >
          Votar em branco
        </button>
        <button
          type="button"
          class="text-button"
          onClick={() =>
            onNonCandidate({ type: VOTE_CHOICE_TYPE.NULL }, "Voto nulo")
          }
        >
          Votar nulo
        </button>
        {slot.allowPartyVote ? (
          <details class="party-choice">
            <summary>Votar na legenda</summary>
            <div class="party-choice-controls">
              <label for={partySelectId}>Partido</label>
              <select
                ref={partySelectRef}
                id={partySelectId}
                value={partyValue}
                onChange={(event) => setPartyValue(event.currentTarget.value)}
              >
                <option value="">Selecione o partido</option>
                {candidatePartyOptions(candidates).map((option) => (
                  <option
                    key={`${option.partyNumber}:${option.party}`}
                    value={`${option.partyNumber}:${option.party}`}
                  >
                    {option.partyNumber} · {option.party}
                  </option>
                ))}
              </select>
              <button
                type="button"
                class="secondary-button"
                onClick={() => {
                  const [partyNumber, ...partyParts] = partyValue.split(":");
                  const party = partyParts.join(":");
                  if (!/^\d{2}$/.test(partyNumber ?? "") || party.length === 0) {
                    partySelectRef.current?.focus();
                    return;
                  }
                  onNonCandidate(
                    {
                      type: VOTE_CHOICE_TYPE.PARTY,
                      party,
                      partyNumber: partyNumber ?? "",
                    },
                    `Voto de legenda ${partyNumber} · ${party}`,
                  );
                }}
              >
                Confirmar legenda
              </button>
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

export function CandidatePicker({
  slot,
  candidates,
  replacing,
  onSelect,
  onNonCandidate,
}: CandidatePickerProps) {
  const [query, setQuery] = useState("");
  const [party, setParty] = useState("");
  const [panelState, setPanelState] = useState(() =>
    initialCandidatePanelState(MAX_VISIBLE_CANDIDATE_RESULTS),
  );
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const suppressFocusOpen = useRef(false);
  const inputId = searchInputId(slot);
  const partyFilterId = `party-filter-${slot.id.replace(":", "-").toLowerCase()}`;
  const resultsId = `results-${slot.id.replace(":", "-").toLowerCase()}`;

  const setOpen = (open: boolean) => {
    setPanelState((current) =>
      updateCandidatePanelState(
        current,
        open ? CANDIDATE_PANEL_ACTION.OPEN : CANDIDATE_PANEL_ACTION.CLOSE,
        MAX_VISIBLE_CANDIDATE_RESULTS,
      ),
    );
  };
  const applyFilter = () => {
    setPanelState((current) =>
      updateCandidatePanelState(
        current,
        CANDIDATE_PANEL_ACTION.FILTER,
        MAX_VISIBLE_CANDIDATE_RESULTS,
      ),
    );
  };

  useEffect(() => {
    if (!panelState.open) return;
    const handleOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [panelState.open]);

  return (
    <>
      <AlternativeChoices
        slot={slot}
        candidates={candidates}
        onNonCandidate={onNonCandidate}
      />
      <div
        ref={pickerRef}
        class={`candidate-picker${panelState.open ? " candidate-picker-open" : ""}`}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !panelState.open) return;
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          if (document.activeElement !== inputRef.current) {
            suppressFocusOpen.current = true;
            inputRef.current?.focus();
            suppressFocusOpen.current = false;
          }
        }}
      >
        <div class="candidate-filters">
          <div class="candidate-filter-field">
            <label class="search-label" for={inputId}>
              Buscar nome ou número
            </label>
            <input
              ref={inputRef}
              id={inputId}
              class="candidate-search"
              type="search"
              placeholder="Nome de urna ou número"
              autocomplete="off"
              enterKeyHint="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={panelState.open}
              aria-controls={resultsId}
              value={query}
              onFocus={() => {
                if (!suppressFocusOpen.current) setOpen(true);
              }}
              onClick={() => setOpen(true)}
              onInput={(event) => {
                setQuery(event.currentTarget.value);
                applyFilter();
              }}
              onKeyDown={(event) => {
                if (event.key !== "ArrowDown") return;
                event.preventDefault();
                setOpen(true);
                requestAnimationFrame(() =>
                  resultsRef.current
                    ?.querySelector<HTMLButtonElement>(".candidate-card")
                    ?.focus(),
                );
              }}
            />
          </div>
          <div class="candidate-filter-field party-filter-field">
            <label class="party-filter-label" for={partyFilterId}>
              Partido
            </label>
            <select
              id={partyFilterId}
              class="party-filter"
              value={party}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              onChange={(event) => {
                setParty(event.currentTarget.value);
                applyFilter();
              }}
            >
              <option value="">Todos os partidos</option>
              {candidatePartyOptions(candidates).map((option) => (
                <option key={option.party} value={option.party}>
                  {option.party}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div
          ref={resultsRef}
          id={resultsId}
          class="results-region candidate-panel"
          hidden={!panelState.open}
          role="region"
          aria-label={`Candidatos para ${slot.label}`}
          aria-live="polite"
        >
          <CandidateResults
            candidates={candidates}
            query={query}
            party={party || null}
            limit={panelState.visibleLimit}
            replacing={replacing}
            onSelect={onSelect}
            onShowMore={() =>
              setPanelState((current) =>
                updateCandidatePanelState(
                  current,
                  CANDIDATE_PANEL_ACTION.SHOW_MORE,
                  MAX_VISIBLE_CANDIDATE_RESULTS,
                ),
              )
            }
          />
        </div>
      </div>
    </>
  );
}
