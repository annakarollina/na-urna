import { CANDIDATE_STATUS, type CandidateStatus } from "../../src/candidates/model.ts";
import { ELECTORAL_OFFICE, type ElectoralOffice } from "../../src/election/types.ts";

interface OfficeMapping {
  readonly description: string;
  readonly office: ElectoralOffice | null;
}

const OFFICE_MAPPINGS: Readonly<Record<string, OfficeMapping>> = {
  "1": { description: "PRESIDENTE", office: ELECTORAL_OFFICE.PRESIDENT },
  "2": { description: "VICE-PRESIDENTE", office: null },
  "3": { description: "GOVERNADOR", office: ELECTORAL_OFFICE.GOVERNOR },
  "4": { description: "VICE-GOVERNADOR", office: null },
  "5": { description: "SENADOR", office: ELECTORAL_OFFICE.SENATOR },
  "6": { description: "DEPUTADO FEDERAL", office: ELECTORAL_OFFICE.FEDERAL_DEPUTY },
  "7": { description: "DEPUTADO ESTADUAL", office: ELECTORAL_OFFICE.STATE_DEPUTY },
  "8": { description: "DEPUTADO DISTRITAL", office: ELECTORAL_OFFICE.DISTRICT_DEPUTY },
  "9": { description: "1º SUPLENTE", office: null },
  "10": { description: "2º SUPLENTE", office: null },
};

interface JudgmentMapping {
  readonly description: string;
  readonly status: CandidateStatus;
}

export interface JudgmentResolution {
  readonly status: CandidateStatus;
  readonly recognized: boolean;
  readonly externalCode: string;
  readonly externalDescription: string;
}

interface CandidacyMapping {
  readonly description: string;
  readonly status: CandidateStatus | null;
}

// O pacote oficial 2026 usa apenas -3/#NE neste campo geral. Ele não fornece
// sinal de exibição; o julgamento complementar é a fonte efetiva do ciclo.
const CANDIDACY_MAPPINGS: Readonly<Record<string, CandidacyMapping>> = {
  "-3": { description: "#NE", status: null },
};

const JUDGMENT_MAPPINGS: Readonly<Record<string, JudgmentMapping>> = {
  "2": { description: "DEFERIDO", status: CANDIDATE_STATUS.DISPLAYABLE },
  "4": {
    description: "INDEFERIDO EM PRAZO RECURSAL OU COM RECURSO",
    status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
  },
  "5": { description: "CANCELADO", status: CANDIDATE_STATUS.NOT_DISPLAYABLE },
  "6": { description: "RENÚNCIA", status: CANDIDATE_STATUS.NOT_DISPLAYABLE },
  "8": {
    description: "AGUARDANDO JULGAMENTO",
    status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
  },
  "13": {
    description: "PEDIDO NÃO CONHECIDO",
    status: CANDIDATE_STATUS.NOT_DISPLAYABLE,
  },
  "14": { description: "INDEFERIDO", status: CANDIDATE_STATUS.NOT_DISPLAYABLE },
  "16": {
    description: "DEFERIDO EM PRAZO RECURSAL OU COM RECURSO",
    status: CANDIDATE_STATUS.DISPLAYABLE,
  },
  "17": {
    description: "PENDENTE DE JULGAMENTO",
    status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
  },
};

export function mapTseOffice(
  code: string,
  description: string,
): ElectoralOffice | null {
  const mapping = OFFICE_MAPPINGS[code];
  if (!mapping || mapping.description !== description) {
    throw new Error(`Cargo TSE desconhecido ou divergente: ${code} / ${description}.`);
  }
  return mapping.office;
}

export function mapTseJudgmentStatus(
  code: string,
  description: string,
): JudgmentResolution {
  const mapping = JUDGMENT_MAPPINGS[code];
  if (!mapping || mapping.description !== description) {
    return {
      status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
      recognized: false,
      externalCode: code,
      externalDescription: description,
    };
  }
  return {
    status: mapping.status,
    recognized: true,
    externalCode: code,
    externalDescription: description,
  };
}

export function mapTseCandidacyStatus(
  code: string,
  description: string,
): CandidateStatus | null {
  const mapping = CANDIDACY_MAPPINGS[code];
  if (!mapping || mapping.description !== description) {
    throw new Error(
      `Situação geral de candidatura TSE desconhecida ou divergente: ${code} / ${description}.`,
    );
  }
  return mapping.status;
}

export function resolveTseCandidateStatus(
  candidacyCode: string,
  candidacyDescription: string,
  judgmentCode: string,
  judgmentDescription: string,
): JudgmentResolution {
  const candidacy = mapTseCandidacyStatus(
    candidacyCode,
    candidacyDescription,
  );
  const judgment = mapTseJudgmentStatus(judgmentCode, judgmentDescription);

  // Falha fechada: qualquer sinal impeditivo prevalece caso o campo geral
  // adquira futuramente um valor explicitamente revisado para 2026.
  if (
    candidacy === CANDIDATE_STATUS.NOT_DISPLAYABLE ||
    judgment.status === CANDIDATE_STATUS.NOT_DISPLAYABLE
  ) {
    return { ...judgment, status: CANDIDATE_STATUS.NOT_DISPLAYABLE };
  }
  if (
    candidacy === CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS ||
    judgment.status === CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS
  ) {
    return { ...judgment, status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS };
  }
  return { ...judgment, status: CANDIDATE_STATUS.DISPLAYABLE };
}
