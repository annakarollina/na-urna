import { describe, expect, it, vi } from "vitest";

import {
  createVersionedPreparationCache,
  invalidateVersionedPreparation,
  prepareVersionedValue,
} from "./export-cache.ts";

describe("cache versionado da exportação local", () => {
  it("deduplica a geração e reutiliza o mesmo valor na mesma versão", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const generate = vi.fn(async () => blob);
    const cache = createVersionedPreparationCache<Blob>(3);

    const first = prepareVersionedValue(cache, 3, generate);
    const concurrent = prepareVersionedValue(cache, 3, generate);

    expect(concurrent).toBe(first);
    await expect(first).resolves.toBe(blob);
    await expect(prepareVersionedValue(cache, 3, generate)).resolves.toBe(blob);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("descarta o cache anterior depois da invalidação", async () => {
    const firstBlob = new Blob(["primeiro"]);
    const secondBlob = new Blob(["segundo"]);
    const cache = createVersionedPreparationCache<Blob>(8);

    await prepareVersionedValue(cache, 8, async () => firstBlob);
    invalidateVersionedPreparation(cache, 9);

    await expect(
      prepareVersionedValue(cache, 9, async () => secondBlob),
    ).resolves.toBe(secondBlob);
    expect(cache.prepared).toEqual({ version: 9, value: secondBlob });
  });
});
