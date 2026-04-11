import "server-only";

import { NextRequest } from "next/server";

import { QF_OAUTH_COOKIES } from "@/lib/qf/oauth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function getLinkedAppUserId(
  request: NextRequest,
): Promise<string | null> {
  const appUserId = request.cookies.get(QF_OAUTH_COOKIES.appUserId)?.value;
  const qfUserId = request.cookies.get(QF_OAUTH_COOKIES.userId)?.value;

  if (!appUserId || !qfUserId) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("id")
    .eq("id", appUserId)
    .eq("qf_user_id", qfUserId)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return data.id as string;
}
