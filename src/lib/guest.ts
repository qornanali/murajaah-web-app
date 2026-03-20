const GUEST_STORAGE_KEY = "murajaah.guestUserId";

export function isGuestUserId(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("guest-");
}

export function getGuestUserId(): string {
  if (typeof window === "undefined") {
    return "guest-server";
  }

  const existing = window.localStorage.getItem(GUEST_STORAGE_KEY);
  if (existing && isGuestUserId(existing)) {
    return existing;
  }

  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `guest-${crypto.randomUUID()}`
      : `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(GUEST_STORAGE_KEY, generated);
  return generated;
}

export function isSupportedUserId(value: string): boolean {
  if (!value) {
    return false;
  }

  const uuidV4OrV1Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidV4OrV1Regex.test(value) || isGuestUserId(value);
}
