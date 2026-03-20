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
    return localizedMap[code as keyof typeof localizedMap];
  }

  return fallbackMessage ?? DEFAULT_ERROR_MESSAGE;
}

export function toUserError(
  code: string,
  error?: unknown,
  fallbackMessage?: string,
): string {
  console.error(`[${code}]`, error);
  return `${resolveErrorMessage(code, fallbackMessage)} (Ref: ${code})`;
}
