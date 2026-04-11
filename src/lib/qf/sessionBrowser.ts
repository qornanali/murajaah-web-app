export interface QfSessionStatus {
  linked: boolean;
  qfUserId: string | null;
  appUserId: string | null;
}

export async function fetchQfSessionStatus(): Promise<QfSessionStatus> {
  try {
    const response = await fetch("/api/user/session", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { linked: false, qfUserId: null, appUserId: null };
    }

    const payload = (await response
      .json()
      .catch(() => null)) as QfSessionStatus | null;

    if (!payload) {
      return { linked: false, qfUserId: null, appUserId: null };
    }

    return {
      linked: Boolean(payload.linked),
      qfUserId: payload.qfUserId ?? null,
      appUserId: payload.appUserId ?? null,
    };
  } catch {
    return { linked: false, qfUserId: null, appUserId: null };
  }
}
