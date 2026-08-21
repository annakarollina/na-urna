import { useState } from "preact/hooks";

import type { FederativeUnit } from "../../election/types.ts";
import { STATE_NAMES, STATE_OPTIONS } from "../../location/states.ts";
import type { ApplicationState } from "../state.ts";
import { locationLabel } from "../state.ts";
import { CheckIcon, MapPinIcon } from "./Icon.tsx";
import { SelectField } from "./SelectField.tsx";

interface LocationPickerProps {
  state: ApplicationState;
  onSelectState: (uf: FederativeUnit) => boolean;
  onKeepCurrent: () => void;
  onEdit: () => void;
  onRequestLocation: () => void;
  onConfirmSuggestion: () => void;
  onRejectSuggestion: () => void;
}

function GeolocationOption({
  state,
  onRequestLocation,
  onConfirmSuggestion,
  onRejectSuggestion,
}: Pick<
  LocationPickerProps,
  | "state"
  | "onRequestLocation"
  | "onConfirmSuggestion"
  | "onRejectSuggestion"
>) {
  return (
    <div
      id="location-assistance"
      class="geolocation-option"
      tabIndex={-1}
      aria-live="polite"
    >
      <p class="optional-label">Opcional</p>
      <p class="geolocation-description">
        Se preferir, o navegador pode sugerir sua UF. A seleção manual acima
        continua disponível.
      </p>
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
        As coordenadas são comparadas localmente com limites do IBGE, não são
        enviadas a serviços externos e não são armazenadas.
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
            <button
              type="button"
              class="text-button"
              onClick={onRejectSuggestion}
            >
              Escolher outra UF manualmente
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
      <label for="voting-state">Selecione sua UF</label>
      <p id="voting-state-hint" class="field-hint">
        Em 2026, apenas a UF do seu domicílio eleitoral é necessária.
      </p>
      <div class="location-controls">
        <SelectField>
          <select
            id="voting-state"
            name="uf"
            required
            aria-describedby="voting-state-hint"
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
        onRejectSuggestion={props.onRejectSuggestion}
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
            {locationLabel(props.state.session.location)}
          </strong>
          <button
            type="button"
            class="text-button location-change"
            onClick={props.onEdit}
          >
            Alterar
          </button>
        </div>
      ) : (
        <LocationForm {...props} />
      )}
    </section>
  );
}
