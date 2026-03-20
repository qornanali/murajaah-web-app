import errorMessages from "@/config/errorMessages.json";
import { getCurrentLocale } from "@/lib/i18n";

const DEFAULT_LOCALE = "en";
const DEFAULT_ERROR_MESSAGE = errorMessages[DEFAULT_LOCALE]["GENERIC-000"];

function resolveErrorMessage(code: string, fallbackMessage?: string): string {
  const locale = getCurrentLocale();
  const localizedMap =
    errorMessages[locale as keyof typeof errorMessages] ??
    errorMessages[DEFAULT_LOCALE];

  if (code in localizedMap) {
    const localized = localizedMap[code as keyof typeof localizedMap];

    if (fallbackMessage && code.startsWith("AUTH-")) {
      return `${localized} ${fallbackMessage}`;
    }

    return localized;
  }

  return fallbackMessage ?? DEFAULT_ERROR_MESSAGE;
}

function extractErrorMessage(error?: unknown): string | undefined {
  if (!error) {
    return undefined;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return undefined;
}

export function toUserError(
  code: string,
  error?: unknown,
  fallbackMessage?: string,
): string {
  console.error(`[${code}]`, error);
  const extracted = extractErrorMessage(error);
  const resolvedFallback = fallbackMessage ?? extracted;
  return `${resolveErrorMessage(code, resolvedFallback)} (Ref: ${code})`;
}
