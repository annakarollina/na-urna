import { useState } from "preact/hooks";

import type { FederativeUnit } from "../../election/types.ts";
import { STATE_NAMES, STATE_OPTIONS } from "../../location/states.ts";
import type { ApplicationState } from "../state.ts";
import { locationLabel } from "../state.ts";
import { CheckIcon, MapPinIcon, RefreshCwIcon } from "./Icon.tsx";
import { SelectField } from "./SelectField.tsx";

interface LocationPickerProps {
  state: ApplicationState;
  onSelectState: (uf: FederativeUnit) => boolean;
  onKeepCurrent: () => void;
  onEdit: () => void;
  onRequestLocation: () => void;
  onConfirmSuggestion: () => void;
}

function GeolocationOption({
  state,
  onRequestLocation,
  onConfirmSuggestion,
}: Pick<
  LocationPickerProps,
  "state" | "onRequestLocation" | "onConfirmSuggestion"
>) {
  return (
    <div
      id="location-assistance"
      class="geolocation-option"
      tabIndex={-1}
      aria-live="polite"
    >
      <button
        type="button"
        class="secondary-button geolocation-button"
        disabled={state.locationDetectionStatus === "requesting"}
        aria-describedby="geolocation-privacy"
        onClick={onRequestLocation}
      >
        <MapPinIcon />
        {state.locationDetectionStatus === "requesting"
          ? "Obtendo localização…"
          : "Usar minha localização"}
      </button>
      <p id="geolocation-privacy" class="geolocation-privacy">
        Opcional e privado: a comparação com limites do IBGE acontece neste
        dispositivo.
      </p>
      {state.locationDetectionStatus === "suggested" && state.suggestedUf ? (
        <div class="location-suggestion">
          <strong>
            UF sugerida: {STATE_NAMES[state.suggestedUf]} ({state.suggestedUf})
          </strong>
          <p>Confirme apenas se esta for a UF do seu domicílio eleitoral.</p>
          <div class="location-suggestion-actions">
            <button
              type="button"
              class="primary-button"
              onClick={onConfirmSuggestion}
            >
              <CheckIcon />
              Confirmar {state.suggestedUf}
            </button>
          </div>
        </div>
      ) : null}
      {state.locationDetectionStatus === "error" &&
      state.locationDetectionError ? (
        <p class="geolocation-error" role="alert">
          {state.locationDetectionError}
        </p>
      ) : null}
    </div>
  );
}

function LocationForm(props: LocationPickerProps) {
  const currentUf =
    props.state.session?.location.scope === "STATE"
      ? props.state.session.location.uf
      : undefined;
  const [selectedUf, setSelectedUf] = useState(currentUf ?? "");
  return (
    <form
      class="location-form"
      onSubmit={(event) => {
        event.preventDefault();
        const selectedState = STATE_OPTIONS.find(({ uf }) => uf === selectedUf);
        if (!selectedState) return;
        if (selectedState.uf === currentUf) {
          props.onKeepCurrent();
          return;
        }
        if (!props.onSelectState(selectedState.uf)) {
          setSelectedUf(currentUf ?? "");
        }
      }}
    >
      <label class="sr-only" for="voting-state">
        Selecione sua UF
      </label>
      <div class="location-controls">
        <SelectField>
          <select
            id="voting-state"
            name="uf"
            required
            value={selectedUf}
            onChange={(event) => setSelectedUf(event.currentTarget.value)}
          >
            <option value="">Selecione a UF</option>
            {STATE_OPTIONS.map((option) => (
              <option key={option.uf} value={option.uf}>
                {option.name} ({option.uf})
              </option>
            ))}
          </select>
        </SelectField>
        <button type="submit" class="primary-button">
          <CheckIcon />
          {currentUf ? "Alterar UF" : "Confirmar UF"}
        </button>
      </div>
      <GeolocationOption
        state={props.state}
        onRequestLocation={props.onRequestLocation}
        onConfirmSuggestion={props.onConfirmSuggestion}
      />
    </form>
  );
}

export function LocationPicker(props: LocationPickerProps) {
  return (
    <section
      class={`location-section${
        props.state.session && !props.state.locationEditing
          ? " location-section-confirmed"
          : ""
      }`}
      aria-labelledby="location-title"
    >
      <h2 id="location-title">Onde você vota?</h2>
      {props.state.session && !props.state.locationEditing ? (
        <div class="location-summary">
          <strong class="location-summary-value">
            {props.state.session.location.scope === "STATE"
              ? `${STATE_NAMES[props.state.session.location.uf]} — ${props.state.session.location.uf}`
              : locationLabel(props.state.session.location)}
          </strong>
          <button
            type="button"
            class="text-button location-change"
            onClick={props.onEdit}
          >
            <RefreshCwIcon />
            Alterar
          </button>
        </div>
      ) : (
        <LocationForm {...props} />
      )}
    </section>
  );
}
