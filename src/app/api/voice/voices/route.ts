import { NextRequest, NextResponse } from "next/server";

import { listElevenLabsVoices } from "@/lib/elevenlabs/client";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUser(request.headers.get("authorization"));
    const voices = await listElevenLabsVoices();
    return NextResponse.json({ voices });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load voices.";
    const status = message.includes("authorization token") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
