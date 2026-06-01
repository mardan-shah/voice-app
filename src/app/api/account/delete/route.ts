import { NextRequest, NextResponse } from "next/server";

import { createServiceClient, getAuthenticatedUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  let user;
  try {
    user = await getAuthenticatedUser(request.headers.get("authorization"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid authorization token.";
    const status = message.includes("authorization token") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
