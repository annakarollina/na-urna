export interface VersionedPreparationCache<Value> {
  version: number;
  prepared: Readonly<{ version: number; value: Value }> | null;
  inFlight: Readonly<{ version: number; promise: Promise<Value> }> | null;
}

export function createVersionedPreparationCache<Value>(
  version: number,
): VersionedPreparationCache<Value> {
  return { version, prepared: null, inFlight: null };
}

export function invalidateVersionedPreparation<Value>(
  cache: VersionedPreparationCache<Value>,
  version: number,
): void {
  cache.version = version;
  cache.prepared = null;
  cache.inFlight = null;
}

export function prepareVersionedValue<Value>(
  cache: VersionedPreparationCache<Value>,
  version: number,
  generate: () => Promise<Value>,
): Promise<Value> {
  if (cache.version !== version) {
    invalidateVersionedPreparation(cache, version);
  }
  if (cache.prepared?.version === version) {
    return Promise.resolve(cache.prepared.value);
  }
  if (cache.inFlight?.version === version) {
    return cache.inFlight.promise;
  }

  const promise = generate().then((value) => {
    if (cache.version === version) {
      cache.prepared = { version, value };
    }
    return value;
  });
  cache.inFlight = { version, promise };
  const clearInFlight = () => {
    if (cache.inFlight?.promise === promise) {
      cache.inFlight = null;
    }
  };
  void promise.then(clearInFlight, clearInFlight);
  return promise;
}
