export interface ColinhaShareEnvironment {
  readonly canShare?: (data: ShareData) => boolean;
  readonly share?: (data: ShareData) => Promise<void>;
  readonly createFile: (blob: Blob, fileName: string) => File;
}

export type ColinhaShareResult =
  | Readonly<{ status: "shared" }>
  | Readonly<{ status: "cancelled" }>
  | Readonly<{ status: "unsupported" }>;

function browserShareEnvironment(): ColinhaShareEnvironment {
  const filesAvailable = typeof File === "function";
  const browserNavigator =
    typeof navigator === "undefined" ? null : navigator;
  return {
    ...(filesAvailable && typeof browserNavigator?.canShare === "function"
      ? { canShare: browserNavigator.canShare.bind(browserNavigator) }
      : {}),
    ...(filesAvailable && typeof browserNavigator?.share === "function"
      ? { share: browserNavigator.share.bind(browserNavigator) }
      : {}),
    createFile: (blob, fileName) =>
      new File([blob], fileName, { type: "image/png" }),
  };
}

function isCancellation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export function browserMayShareFiles(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    typeof File === "function"
  );
}

function shareData(
  blob: Blob,
  fileName: string,
  environment: ColinhaShareEnvironment,
): ShareData {
  return {
    title: "Minha Colinha",
    text: "Minha colinha eleitoral",
    files: [environment.createFile(blob, fileName)],
  };
}

export function canShareColinhaPng(
  blob: Blob,
  fileName: string,
  environment: ColinhaShareEnvironment = browserShareEnvironment(),
): boolean {
  if (!environment.share || !environment.canShare) return false;
  try {
    return environment.canShare(shareData(blob, fileName, environment));
  } catch {
    return false;
  }
}

export async function shareColinhaPng(
  blob: Blob,
  fileName: string,
  environment: ColinhaShareEnvironment = browserShareEnvironment(),
): Promise<ColinhaShareResult> {
  if (!environment.share || !environment.canShare) {
    return { status: "unsupported" };
  }
  const data = shareData(blob, fileName, environment);
  if (!environment.canShare(data)) {
    return { status: "unsupported" };
  }
  try {
    await environment.share(data);
    return { status: "shared" };
  } catch (error) {
    if (isCancellation(error)) {
      return { status: "cancelled" };
    }
    throw error;
  }
}
