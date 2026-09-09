import { describe, expect, it } from "vitest";
import { CANDIDATE_STATUS } from "../../src/candidates/model.ts";
import { ELECTORAL_OFFICE } from "../../src/election/types.ts";
import {
  mapTseCandidacyStatus,
  mapTseJudgmentStatus,
  mapTseOffice,
  resolveTseCandidateStatus,
} from "./mappings.ts";

describe("mapeamentos explícitos do TSE 2026", () => {
  it("mapeia apenas os seis cargos da aplicação e ignora companheiros de chapa", () => {
    expect(mapTseOffice("1", "PRESIDENTE")).toBe(ELECTORAL_OFFICE.PRESIDENT);
    expect(mapTseOffice("5", "SENADOR")).toBe(ELECTORAL_OFFICE.SENATOR);
    expect(mapTseOffice("7", "DEPUTADO ESTADUAL")).toBe(ELECTORAL_OFFICE.STATE_DEPUTY);
    expect(mapTseOffice("8", "DEPUTADO DISTRITAL")).toBe(ELECTORAL_OFFICE.DISTRICT_DEPUTY);
    expect(mapTseOffice("2", "VICE-PRESIDENTE")).toBeNull();
    expect(mapTseOffice("9", "1º SUPLENTE")).toBeNull();
    expect(() => mapTseOffice("99", "CARGO NOVO")).toThrow(/Cargo TSE desconhecido/);
  });

  it("mapeia explicitamente as situações conhecidas e preserva seu reconhecimento", () => {
    expect(mapTseJudgmentStatus("2", "DEFERIDO")).toEqual({
      status: CANDIDATE_STATUS.DISPLAYABLE,
      recognized: true,
      externalCode: "2",
      externalDescription: "DEFERIDO",
    });
    expect(
      mapTseJudgmentStatus("16", "DEFERIDO EM PRAZO RECURSAL OU COM RECURSO"),
    ).toMatchObject({ status: CANDIDATE_STATUS.DISPLAYABLE, recognized: true });
    expect(mapTseJudgmentStatus("8", "AGUARDANDO JULGAMENTO")).toMatchObject({
      status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
      recognized: true,
    });
    expect(
      mapTseJudgmentStatus("4", "INDEFERIDO EM PRAZO RECURSAL OU COM RECURSO"),
    ).toMatchObject({ status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS, recognized: true });
    expect(mapTseJudgmentStatus("17", "PENDENTE DE JULGAMENTO")).toEqual({
      status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
      recognized: true,
      externalCode: "17",
      externalDescription: "PENDENTE DE JULGAMENTO",
    });
    expect(mapTseJudgmentStatus("5", "CANCELADO")).toMatchObject({
      status: CANDIDATE_STATUS.NOT_DISPLAYABLE,
      recognized: true,
    });
    expect(mapTseJudgmentStatus("6", "RENÚNCIA")).toMatchObject({
      status: CANDIDATE_STATUS.NOT_DISPLAYABLE,
      recognized: true,
    });
    expect(mapTseJudgmentStatus("13", "PEDIDO NÃO CONHECIDO")).toMatchObject({
      status: CANDIDATE_STATUS.NOT_DISPLAYABLE,
      recognized: true,
    });
    expect(mapTseJudgmentStatus("14", "INDEFERIDO")).toMatchObject({
      status: CANDIDATE_STATUS.NOT_DISPLAYABLE,
      recognized: true,
    });
  });

  it("classifica pares desconhecidos conservadoramente sem perder os dados externos", () => {
    expect(mapTseJudgmentStatus("999", "SITUAÇÃO NOVA")).toEqual({
      status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
      recognized: false,
      externalCode: "999",
      externalDescription: "SITUAÇÃO NOVA",
    });
    expect(mapTseJudgmentStatus("17", "DESCRIÇÃO QUE NÃO CORRESPONDE AO MAPPING")).toEqual({
      status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
      recognized: false,
      externalCode: "17",
      externalDescription: "DESCRIÇÃO QUE NÃO CORRESPONDE AO MAPPING",
    });
  });

  it("não trata o único valor geral observado em 2026 como situação eleitoral", () => {
    expect(mapTseCandidacyStatus("-3", "#NE")).toBeNull();
    expect(() => mapTseCandidacyStatus("12", "APTO")).toThrow(
      /Situação geral de candidatura TSE desconhecida/,
    );
    expect(() => mapTseCandidacyStatus("99", "NOVA")).toThrow(
      /Situação geral de candidatura TSE desconhecida/,
    );
  });

  it("resolve o ciclo 2026 a partir do julgamento complementar", () => {
    expect(resolveTseCandidateStatus("-3", "#NE", "2", "DEFERIDO")).toMatchObject({
      status: CANDIDATE_STATUS.DISPLAYABLE,
      recognized: true,
    });
    expect(
      resolveTseCandidateStatus(
        "-3",
        "#NE",
        "4",
        "INDEFERIDO EM PRAZO RECURSAL OU COM RECURSO",
      ),
    ).toMatchObject({ status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS, recognized: true });
    expect(
      resolveTseCandidateStatus("-3", "#NE", "17", "PENDENTE DE JULGAMENTO"),
    ).toMatchObject({ status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS, recognized: true });
    expect(resolveTseCandidateStatus("-3", "#NE", "6", "RENÚNCIA")).toMatchObject({
      status: CANDIDATE_STATUS.NOT_DISPLAYABLE,
      recognized: true,
    });
    expect(resolveTseCandidateStatus("-3", "#NE", "5", "CANCELADO")).toMatchObject({
      status: CANDIDATE_STATUS.NOT_DISPLAYABLE,
      recognized: true,
    });
    expect(resolveTseCandidateStatus("-3", "#NE", "999", "SITUAÇÃO NOVA")).toMatchObject({
      status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
      recognized: false,
    });
  });
});
