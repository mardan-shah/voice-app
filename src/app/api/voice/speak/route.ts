import { NextRequest, NextResponse } from "next/server";

import { createElevenLabsSpeechStream } from "@/lib/elevenlabs/client";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { VoiceSettings } from "@/types";

type SpeakRequestBody = {
  text?: string;
  settings?: Partial<VoiceSettings>;
};

const MAX_TEXT_LENGTH = 5000;

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedUser(request.headers.get("authorization"));

    const body = (await request.json()) as SpeakRequestBody;
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    const response = await createElevenLabsSpeechStream(text, body.settings);
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create speech.";
    const status = message.includes("authorization token") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
