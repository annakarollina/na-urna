import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import {
  candidatePartyOptions,
  searchCandidates,
  type Candidate,
  type CandidatePartyOption,
} from "../../candidates/index.ts";
import {
  VOTE_CHOICE_TYPE,
  type NonCandidateVoteChoice,
  type VotingSlot,
} from "../../election/types.ts";
import { searchInputId } from "../state.ts";
import { CandidateDetails, CandidatePhoto } from "./CandidatePresentation.tsx";
import { ArrowLeftIcon, SearchIcon } from "./Icon.tsx";
import { SelectField } from "./SelectField.tsx";

const MOBILE_PICKER_QUERY = "(max-width: 767px), (pointer: coarse)";

interface CandidatePickerProps {
  slot: VotingSlot;
  candidates: readonly Candidate[];
  replacing: boolean;
  onClose?: (() => void) | undefined;
  closeSignal: number;
  onSelect: (candidate: Candidate) => void;
  onNonCandidate: (
    choice: NonCandidateVoteChoice,
    announcementLabel: string,
  ) => void;
}

function useMobilePicker(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia(MOBILE_PICKER_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_PICKER_QUERY);
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return mobile;
}

function supportsPopoverApi(): boolean {
  return (
    typeof HTMLElement !== "undefined" &&
    Object.hasOwn(HTMLElement.prototype, "popover") &&
    typeof HTMLElement.prototype.showPopover === "function"
  );
}

function hidePopoverIfOpen(surface: HTMLElement): void {
  if (
    typeof surface.hidePopover === "function" &&
    surface.matches(":popover-open")
  ) {
    surface.hidePopover();
  }
}

function positionDesktopPopover(
  surface: HTMLElement,
  trigger: HTMLElement,
): void {
  const margin = 16;
  const gap = 8;
  const triggerRectangle = trigger.getBoundingClientRect();
  const width = Math.min(640, window.innerWidth - margin * 2);
  const left = Math.min(
    Math.max(margin, triggerRectangle.left),
    window.innerWidth - width - margin,
  );
  const availableBelow = window.innerHeight - triggerRectangle.bottom - gap - margin;
  const availableAbove = triggerRectangle.top - gap - margin;
  const placeAbove = availableBelow < 280 && availableAbove > availableBelow;
  const maximumHeight = Math.max(
    220,
    Math.min(560, placeAbove ? availableAbove : availableBelow),
  );
  const top = placeAbove
    ? Math.max(margin, triggerRectangle.top - maximumHeight - gap)
    : triggerRectangle.bottom + gap;

  surface.style.setProperty("--picker-inline-size", `${width}px`);
  surface.style.setProperty("--picker-inline-start", `${left}px`);
  surface.style.setProperty("--picker-block-start", `${top}px`);
  surface.style.setProperty("--picker-max-block-size", `${maximumHeight}px`);
}

function CandidateResults({
  candidates,
  replacing,
  onSelect,
}: {
  candidates: readonly Candidate[];
  replacing: boolean;
  onSelect: (candidate: Candidate) => void;
}) {
  if (candidates.length === 0) {
    return (
      <p class="empty-state" role="status">
        Nenhum candidato encontrado.
      </p>
    );
  }

  return (
    <>
      <p class="result-count" role="status">
        {candidates.length}{" "}
        {candidates.length === 1 ? "candidatura encontrada" : "candidaturas encontradas"}
      </p>
      <ul class="candidate-results">
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            <button
              type="button"
              class="candidate-card"
              aria-label={`${replacing ? "Substituir por" : "Selecionar"} ${candidate.ballotName}, número ${candidate.number}, partido ${candidate.party}`}
              onClick={() => onSelect(candidate)}
            >
              <CandidateDetails candidate={candidate} />
              <CandidatePhoto candidate={candidate} />
              <span class="candidate-card-action">
                {replacing ? "Substituir" : "Selecionar"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function AlternativeChoices({
  slot,
  onNonCandidate,
}: Pick<CandidatePickerProps, "slot" | "onNonCandidate">) {
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
      </div>
    </div>
  );
}

function PartyVoteAction({
  option,
  onSelect,
}: {
  option: CandidatePartyOption;
  onSelect: () => void;
}) {
  return (
    <button type="button" class="party-vote-action" onClick={onSelect}>
      <strong>
        {option.partyNumber} · {option.party}
      </strong>
      <span>Usar como voto de legenda</span>
    </button>
  );
}

export function CandidatePicker({
  slot,
  candidates,
  replacing,
  onClose,
  closeSignal,
  onSelect,
  onNonCandidate,
}: CandidatePickerProps) {
  const [query, setQuery] = useState("");
  const [party, setParty] = useState("");
  const [open, setOpen] = useState(false);
  const mobile = useMobilePicker();
  const previousMobile = useRef(mobile);
  const autoOpened = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const nativePopover = !mobile && supportsPopoverApi();
  const inputId = searchInputId(slot);
  const normalizedSlotId = slot.id.replace(":", "-").toLowerCase();
  const triggerId = `candidate-picker-trigger-${normalizedSlotId}`;
  const partyFilterId = `party-filter-${normalizedSlotId}`;
  const resultsId = `results-${normalizedSlotId}`;
  const titleId = `candidate-picker-title-${normalizedSlotId}`;
  const partyOptions = useMemo(() => candidatePartyOptions(candidates), [candidates]);
  const matches = useMemo(
    () => searchCandidates(candidates, query, party || null),
    [candidates, party, query],
  );
  const selectedParty = partyOptions.find((option) => option.party === party);

  const closePicker = (restoreFocus: boolean): void => {
    const surface = surfaceRef.current;
    if (surface) hidePopoverIfOpen(surface);
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
    }
    onClose?.();
  };

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    if (!open) {
      hidePopoverIfOpen(surface);
      return;
    }

    if (nativePopover) {
      const trigger = triggerRef.current;
      if (trigger) positionDesktopPopover(surface, trigger);
      if (!surface.matches(":popover-open")) surface.showPopover();
    }
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }, [nativePopover, open]);

  useEffect(() => {
    if (previousMobile.current === mobile) return;
    previousMobile.current = mobile;
    if (open) closePicker(true);
  }, [mobile, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closePicker(true);
    };
    const onOutsidePointer = (event: PointerEvent) => {
      if (mobile || !(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target)) return;
      closePicker(true);
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onOutsidePointer);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onOutsidePointer);
    };
  }, [mobile, open]);

  useEffect(() => {
    if (!replacing || autoOpened.current) return;
    autoOpened.current = true;
    requestAnimationFrame(() => setOpen(true));
  }, [replacing]);

  useEffect(() => {
    if (open) closePicker(false);
  }, [closeSignal]);

  useEffect(
    () => () => {
      const surface = surfaceRef.current;
      if (surface) hidePopoverIfOpen(surface);
    },
    [],
  );

  return (
    <div class="candidate-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        class="primary-button candidate-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={resultsId}
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
        {replacing ? "Escolher outro candidato" : "Escolher candidato"}
      </button>
      <AlternativeChoices slot={slot} onNonCandidate={onNonCandidate} />
      <div
        ref={surfaceRef}
        class="candidate-picker-surface"
        data-mode={mobile ? "mobile" : "desktop"}
        data-native-popover={nativePopover ? "true" : "false"}
        popover={nativePopover ? "manual" : undefined}
        hidden={!nativePopover && !open}
        role="dialog"
        aria-modal={mobile ? "true" : undefined}
        aria-labelledby={titleId}
      >
        <header class="candidate-picker-header">
          <button
            type="button"
            class="text-button candidate-picker-close"
            aria-label={`Fechar seleção de ${slot.label}`}
            onClick={() => closePicker(true)}
          >
            <ArrowLeftIcon />
            <span>Voltar</span>
          </button>
          <h3 id={titleId}>{slot.label}</h3>
        </header>
        <div class="candidate-picker-tools">
          <div class="candidate-filters">
            <div class="candidate-filter-field party-filter-field">
              <label for={partyFilterId}>Partido</label>
              <SelectField>
                <select
                  id={partyFilterId}
                  class="party-filter"
                  value={party}
                  onChange={(event) => setParty(event.currentTarget.value)}
                >
                  <option value="">Todos os partidos</option>
                  {partyOptions.map((option) => (
                    <option key={option.party} value={option.party}>
                      {option.party}
                    </option>
                  ))}
                </select>
              </SelectField>
            </div>
            <div class="candidate-filter-field search-filter-field">
              <label for={inputId}>Nome ou número</label>
              <span class="search-field">
                <SearchIcon />
                <input
                  ref={inputRef}
                  id={inputId}
                  class="candidate-search"
                  type="search"
                  placeholder="Nome de urna ou número"
                  autocomplete="off"
                  enterKeyHint="search"
                  aria-controls={resultsId}
                  value={query}
                  onInput={(event) => setQuery(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowDown") return;
                    event.preventDefault();
                    resultsRef.current
                      ?.querySelector<HTMLButtonElement>(".candidate-card")
                      ?.focus();
                  }}
                />
              </span>
            </div>
          </div>
          {slot.allowPartyVote && selectedParty ? (
            <PartyVoteAction
              option={selectedParty}
              onSelect={() => {
                closePicker(false);
                onNonCandidate(
                  {
                    type: VOTE_CHOICE_TYPE.PARTY,
                    party: selectedParty.party,
                    partyNumber: selectedParty.partyNumber,
                  },
                  `Voto de legenda ${selectedParty.partyNumber} · ${selectedParty.party}`,
                );
              }}
            />
          ) : null}
        </div>
        <div
          ref={resultsRef}
          id={resultsId}
          class="results-region candidate-picker-results"
          role="region"
          aria-label={`Candidatos para ${slot.label}`}
          aria-live="polite"
        >
          <CandidateResults
            candidates={matches}
            replacing={replacing}
            onSelect={(candidate) => {
              closePicker(false);
              onSelect(candidate);
            }}
          />
        </div>
      </div>
    </div>
  );
}
