"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { getChatHistory } from "@/lib/supabase/db";
import type { Message } from "@/types";

function toDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HistoryPage() {
  const { user } = useAuth(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    void (async () => {
      try {
        const rows = await getChatHistory(user.id, 50);
        setMessages(rows);
        setError(null);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to load history.");
      }
    })();
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map<string, Message[]>();
    for (const message of messages) {
      const key = toDateLabel(message.timestamp);
      const group = map.get(key) ?? [];
      group.push(message);
      map.set(key, group);
    }
    return Array.from(map.entries());
  }, [messages]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">History</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {grouped.length === 0 ? (
        <Card>No messages yet.</Card>
      ) : (
        grouped.map(([date, rows]) => (
          <section key={date} className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-500">{date}</h2>
            <div className="space-y-2">
              {rows.map((message) => (
                <Card key={message.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge>{message.role}</Badge>
                    {message.emotion ? <Badge variant="emotion">{message.emotion}</Badge> : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
