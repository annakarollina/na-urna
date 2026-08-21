import { CANDIDATE_DATASET_KIND } from "../../candidates/index.ts";
import { electionCalendar } from "../../election/calendar.ts";
import type { ElectionConfig } from "../../election/types.ts";
import type { ApplicationState } from "../state.ts";
import { ExternalLinkIcon } from "./Icon.tsx";

function formatSnapshotDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function DataSource({ state }: { state: ApplicationState }) {
  if (state.datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE) {
    return (
      <p class="data-source data-source-fixture">
        Fonte: fixtures fictícias habilitadas explicitamente para desenvolvimento.
      </p>
    );
  }
  if (state.metadataStatus === "loading") {
    return (
      <p class="data-source" role="status">
        Carregando procedência dos dados eleitorais…
      </p>
    );
  }
  if (state.metadataStatus === "error" || !state.metadata) {
    return (
      <p class="data-source data-source-error" role="alert">
        {state.metadataError ??
          "Não foi possível confirmar a procedência dos dados eleitorais."}
      </p>
    );
  }
  return (
    <p class="data-source">
      Fonte:{" "}
      <a href={state.metadata.sourceUrl} target="_blank" rel="noopener noreferrer">
        {state.metadata.provider} <ExternalLinkIcon />
      </a>{" "}
      · {state.metadata.dataset} · dados gerados em{" "}
      <time dateTime={state.metadata.sourceGeneratedAt}>
        {formatSnapshotDate(state.metadata.sourceGeneratedAt)}
      </time>{" "}
      · snapshot atualizado em{" "}
      <time dateTime={state.metadata.importedAt}>
        {formatSnapshotDate(state.metadata.importedAt)}
      </time>
    </p>
  );
}

function ElectionCalendar({ election }: { election: ElectionConfig }) {
  return (
    <p class="election-calendar">
      {electionCalendar(election).map((entry, index) => (
        <span key={entry.date}>
          {index > 0 ? " · " : ""}
          {entry.label} · <time dateTime={entry.date}>{entry.dateLabel}</time>
        </span>
      ))}
    </p>
  );
}

export function ElectionContext({ state }: { state: ApplicationState }) {
  return (
    <section class="intro app-context">
      <h1>Sua colinha para as Eleições {state.election.year}</h1>
      <p class="lead">
        Escolha sua UF e organize candidatos na ordem oficial de votação.
      </p>
      <ElectionCalendar election={state.election} />
      <DataSource state={state} />
      {state.datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE ? (
        <div class="fixture-notice" role="note">
          <strong>Ambiente de desenvolvimento: </strong>
          esta demonstração usa apenas dados fictícios. Use SP ou DF para testar o
          fluxo completo; as demais UFs exibem o estado de indisponibilidade.
        </div>
      ) : null}
    </section>
  );
}
