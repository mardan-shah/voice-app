import { NextRequest, NextResponse } from "next/server";

import { chatWithOllama } from "@/lib/ollama/client";
import { generateEmbedding } from "@/lib/ollama/embeddings";
import { buildMessages, buildSystemPrompt, parseEmotionFromResponse } from "@/lib/ollama/promptBuilder";
import {
  ensureUserDataServer,
  saveChatMessageServer,
  saveEmbeddingServer,
  saveEmotionDataServer,
  searchMemoriesServer,
} from "@/lib/supabase/db-server";
import { createServiceClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { AISettings, Memory, Message } from "@/types";

type ChatRequestBody = {
  userMessage: string;
  history: Message[];
  aiSettings: AISettings;
  sessionId: string;
};

function validateBody(body: Partial<ChatRequestBody>): body is ChatRequestBody {
  return Boolean(
    body.userMessage &&
      body.userMessage.trim().length > 0 &&
      body.aiSettings &&
      body.sessionId &&
      Array.isArray(body.history)
  );
}

function getErrorStatus(message: string) {
  if (message.includes("authorization token")) {
    return 401;
  }
  return message.includes("ECONNREFUSED") ? 503 : 500;
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ChatRequestBody>;
    if (!validateBody(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const user = await getAuthenticatedUser(request.headers.get("authorization"));
    const serviceClient = createServiceClient();
    await ensureUserDataServer(user, serviceClient);
    const queryEmbedding = await generateEmbedding(body.userMessage);
    const memories = await searchMemoriesServer(user.id, queryEmbedding, 3, serviceClient);

    const systemPrompt = buildSystemPrompt(body.aiSettings, memories);
    const messages = buildMessages(systemPrompt, body.history, body.userMessage);

    const userMessageId = await saveChatMessageServer(
      user.id,
      body.sessionId,
      {
        id: "",
        role: "user",
        content: body.userMessage,
        timestamp: new Date(),
      },
      serviceClient
    );
    await saveEmbeddingServer(
      user.id,
      userMessageId,
      body.userMessage,
      "user",
      queryEmbedding,
      serviceClient
    );

    const rawResponse = await chatWithOllama(messages);
    const { content, emotion } = parseEmotionFromResponse(rawResponse);

    const assistantMessageId = await saveChatMessageServer(
      user.id,
      body.sessionId,
      {
        id: "",
        role: "assistant",
        content,
        emotion,
        timestamp: new Date(),
      },
      serviceClient
    );

    const responseEmbedding = await generateEmbedding(content);
    await saveEmbeddingServer(
      user.id,
      assistantMessageId,
      content,
      "assistant",
      responseEmbedding,
      serviceClient
    );
    await saveEmotionDataServer(user.id, emotion, serviceClient);

    return NextResponse.json({ content, emotion, memoriesUsed: memories.length });
  } catch (error) {
    console.error("Chat API Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: getErrorStatus(message) });
  }
}

export async function PUT(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = (await request.json()) as Partial<ChatRequestBody>;
    if (!validateBody(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const user = await getAuthenticatedUser(request.headers.get("authorization"));
    const serviceClient = createServiceClient();
    await ensureUserDataServer(user, serviceClient);

    let queryEmbedding: number[] | null = null;
    let memories: Memory[] = [];

    try {
      queryEmbedding = await generateEmbedding(body.userMessage);
      memories = await searchMemoriesServer(user.id, queryEmbedding, 3, serviceClient);
    } catch (embeddingError) {
      console.warn("Embedding generation or search failed (PUT):", embeddingError);
    }

    const systemPrompt = buildSystemPrompt(body.aiSettings, memories);
    const messages = buildMessages(systemPrompt, body.history, body.userMessage);

    const userMessageId = await saveChatMessageServer(
      user.id,
      body.sessionId,
      {
        id: "",
        role: "user",
        content: body.userMessage,
        timestamp: new Date(),
      },
      serviceClient
    );

    if (queryEmbedding) {
      try {
        await saveEmbeddingServer(
          user.id,
          userMessageId,
          body.userMessage,
          "user",
          queryEmbedding,
          serviceClient
        );
      } catch (e) {
        console.warn("Saving user embedding failed (PUT):", e);
      }
    }

    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await chatWithOllama(messages, (token) => {
            fullContent += token;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
          });

          const { content, emotion } = parseEmotionFromResponse(fullContent);
          const assistantMessageId = await saveChatMessageServer(
            user.id,
            body.sessionId,
            {
              id: "",
              role: "assistant",
              content,
              emotion,
              timestamp: new Date(),
            },
            serviceClient
          );

          try {
            const responseEmbedding = await generateEmbedding(content);
            await saveEmbeddingServer(
              user.id,
              assistantMessageId,
              content,
              "assistant",
              responseEmbedding,
              serviceClient
            );
          } catch (e) {
            console.warn("Saving assistant embedding failed (PUT):", e);
          }

          await saveEmotionDataServer(user.id, emotion, serviceClient);

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, content, emotion, memoriesUsed: memories.length })}\n\n`)
          );
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Streaming failed.";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: getErrorStatus(message) });
  }
}
