import { NextResponse } from "next/server";

import {
  FORBIDDEN_SCOPE_ERROR,
  MISSING_CREDENTIALS_ERROR,
  qfApiRequest,
} from "@/lib/qf/contentApi";

export async function GET() {
  try {
    const response = await qfApiRequest("/chapters", { method: "GET" });

    if (!response.ok) {
      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") ?? "application/json",
        },
      });
    }

    const payload = await response.json();
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    if (message === MISSING_CREDENTIALS_ERROR) {
      return NextResponse.json({ message }, { status: 500 });
    }

    if (message === FORBIDDEN_SCOPE_ERROR) {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 502 });
  }
}
