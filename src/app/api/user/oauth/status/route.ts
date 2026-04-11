import { NextRequest, NextResponse } from "next/server";

import { QF_OAUTH_COOKIES } from "@/lib/qf/oauth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const qfUserId = request.cookies.get(QF_OAUTH_COOKIES.userId)?.value;

  if (!qfUserId) {
    return NextResponse.json({ linked: false }, { status: 200 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("qf_user_identities")
      .select("qf_user_id, access_token_expires_at")
      .eq("qf_user_id", qfUserId)
      .maybeSingle();

    if (error || !data) {
      const response = NextResponse.json({ linked: false }, { status: 200 });
      response.cookies.delete(QF_OAUTH_COOKIES.userId);
      return response;
    }

    const expiresAtMs = Date.parse(data.access_token_expires_at as string);
    const expiresSoon = Number.isFinite(expiresAtMs)
      ? expiresAtMs - Date.now() < 5 * 60 * 1000
      : true;

    return NextResponse.json(
      {
        linked: true,
        qfUserId,
        expiresSoon,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ linked: false }, { status: 200 });
  }
}
