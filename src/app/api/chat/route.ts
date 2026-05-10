import { NextRequest, NextResponse } from "next/server";

import { chatWithOllama } from "@/lib/ollama/client";
import { generateEmbedding } from "@/lib/ollama/embeddings";
import { buildMessages, buildSystemPrompt, parseEmotionFromResponse } from "@/lib/ollama/promptBuilder";
import {
  saveChatMessageServer,
  saveEmbeddingServer,
  saveEmotionDataServer,
  searchMemoriesServer,
} from "@/lib/supabase/db-server";
import { createServiceClient } from "@/lib/supabase/server";
import type { AISettings, Message } from "@/types";

type ChatRequestBody = {
  userMessage: string;
  history: Message[];
  aiSettings: AISettings;
  userId: string;
  sessionId: string;
};

function validateBody(body: Partial<ChatRequestBody>): body is ChatRequestBody {
  return Boolean(
    body.userMessage &&
      body.userMessage.trim().length > 0 &&
      body.aiSettings &&
      body.userId &&
      body.sessionId &&
      Array.isArray(body.history)
  );
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ChatRequestBody>;
    if (!validateBody(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const queryEmbedding = await generateEmbedding(body.userMessage);
    const memories = await searchMemoriesServer(body.userId, queryEmbedding, 3, serviceClient);

    const systemPrompt = buildSystemPrompt(body.aiSettings, memories);
    const messages = buildMessages(systemPrompt, body.history, body.userMessage);

    const userMessageId = await saveChatMessageServer(
      body.userId,
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
      body.userId,
      userMessageId,
      body.userMessage,
      "user",
      queryEmbedding,
      serviceClient
    );

    const rawResponse = await chatWithOllama(messages);
    const { content, emotion } = parseEmotionFromResponse(rawResponse);

    const assistantMessageId = await saveChatMessageServer(
      body.userId,
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
      body.userId,
      assistantMessageId,
      content,
      "assistant",
      responseEmbedding,
      serviceClient
    );
    await saveEmotionDataServer(body.userId, emotion, serviceClient);

    return NextResponse.json({ content, emotion, memoriesUsed: memories.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("ECONNREFUSED") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = (await request.json()) as Partial<ChatRequestBody>;
    if (!validateBody(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const queryEmbedding = await generateEmbedding(body.userMessage);
    const memories = await searchMemoriesServer(body.userId, queryEmbedding, 3, serviceClient);
    const systemPrompt = buildSystemPrompt(body.aiSettings, memories);
    const messages = buildMessages(systemPrompt, body.history, body.userMessage);

    const userMessageId = await saveChatMessageServer(
      body.userId,
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
      body.userId,
      userMessageId,
      body.userMessage,
      "user",
      queryEmbedding,
      serviceClient
    );

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
            body.userId,
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
            body.userId,
            assistantMessageId,
            content,
            "assistant",
            responseEmbedding,
            serviceClient
          );
          await saveEmotionDataServer(body.userId, emotion, serviceClient);

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, emotion, memoriesUsed: memories.length })}\n\n`)
          );
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Streaming failed.";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
          controller.error(error);
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
