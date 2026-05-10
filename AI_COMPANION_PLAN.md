# AI Chat Companion — Full Implementation Plan (Updated)
# Architecture: VPS + Supabase + pgvector Memory
# For Claude Code Execution

---

## DECISION LOG (from planning session)

| Decision | Chosen | Reason |
|---|---|---|
| Database | Supabase (not Firebase) | pgvector built-in = AI long-term memory |
| Hosting | VPS (not Vercel) | Already paid, always on, public URL |
| Ollama location | VPS (not laptop) | Always running, no laptop dependency |
| Dev machine | Laptop only | Write code, SSH to deploy |
| Model (dev) | gemma3:2b | Faster iteration, fits in RAM comfortably |
| Model (demo) | gemma4:e2b | Better quality for exam presentation |
| Streaming | Required | CPU-only = slow tokens, streaming hides latency |
| Supabase mode | Cloud free tier | Saves VPS RAM vs Docker self-host |

---

## MCPs TO CONNECT BEFORE STARTING

Connect these to Claude Code first.

### 1. GitHub MCP
```
claude mcp add github
```
Paste your GitHub personal access token. Claude Code creates repo, commits, pushes automatically.

### 2. Brave Search MCP
```
claude mcp add brave-search
```
Free key at brave.com/search/api. Claude Code searches docs live when it hits errors.

### 3. Filesystem MCP
Built into Claude Code. No setup needed.

### 4. Memory MCP
```
claude mcp add memory
```
Stores config decisions (Supabase URL, model name) across long sessions.

### 5. Puppeteer MCP
```
claude mcp add puppeteer
```
Claude Code opens browser, tests the PWA, clicks buttons, reports what broke.

---

## PROJECT OVERVIEW

| Property | Value |
|---|---|
| App Name | AI Chat Companion |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth |
| LLM | Gemma 4 E2B via Ollama (on VPS) |
| AI Memory | pgvector + nomic-embed-text embeddings |
| Voice Input | Web Speech API (browser native) |
| Voice Output | Web Speech Synthesis API (browser native) |
| Hosting | Your VPS (PM2 + Nginx) |
| PWA | next-pwa |

---

## MACHINE ROLES

```
┌──────────────────────────────────────────────────────────────┐
│  LAPTOP (dev machine)                                        │
│  - Write code in VS Code / editor                            │
│  - Run: npm run dev (points to VPS Ollama via env var)       │
│  - Deploy: git push → SSH into VPS → git pull → pm2 reload  │
└──────────────────────────────────────────────────────────────┘
                          │  SSH / git
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  VPS (Ubuntu 24.04, AMD EPYC, 16GB RAM)                      │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │  Next.js    │   │   Ollama     │   │     Nginx        │  │
│  │  (PM2)      │──▶│  gemma4:e2b  │   │  :80 → :3000     │  │
│  │  :3000      │   │  :11434      │   │  (reverse proxy) │  │
│  └─────────────┘   └──────────────┘   └──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Supabase Cloud (free tier)                                  │
│  - PostgreSQL tables (users, settings, chat, emotions)       │
│  - pgvector extension (message_embeddings table)             │
│  - Supabase Auth (email/password)                            │
│  - Row Level Security (replaces Firestore rules)             │
└──────────────────────────────────────────────────────────────┘
```

---

## PHASE 0 — VPS SETUP (do this manually before Claude Code)

SSH into your VPS and run these commands.

### 0.1 Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # Must be 20.x
```

### 0.2 Install Ollama
```bash
curl -fsSL https://ollama.com/install.sh | sh

# Pull both models
ollama pull gemma4:e2b          # 7.2GB — for demo
ollama pull gemma3:2b           # 1.9GB — for dev (faster)
ollama pull nomic-embed-text    # 274MB — for generating embeddings

# Start Ollama as a background service
sudo systemctl enable ollama
sudo systemctl start ollama

# Verify it's running
curl http://localhost:11434/api/tags
```

### 0.3 Install PM2 and Nginx
```bash
npm install -g pm2
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 0.4 Configure Nginx
Create `/etc/nginx/sites-available/ai-companion`:
```nginx
server {
    listen 80;
    server_name YOUR_VPS_IP;   # Replace with your IP or domain

    # Increase timeout for slow Ollama responses
    proxy_read_timeout 120s;
    proxy_connect_timeout 120s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # NEVER expose Ollama publicly — internal only
    # Next.js API routes proxy to it server-side
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ai-companion /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 0.5 Free Up VPS RAM Before Running Gemma 4
```bash
# Check current RAM usage
free -h
ps aux --sort=-%mem | head -15

# Stop any services you don't need
# Check what's running
systemctl list-units --type=service --state=running

# If using gemma4:e2b, target keeping system RAM under ~8GB used
# to leave headroom for the 7.2GB model
```

### 0.6 Model Switch Environment Variable
Add to `/etc/environment` on the VPS:
```
OLLAMA_MODEL=gemma4:e2b
```
During development on laptop, use `gemma3:2b` in `.env.local`.

---

## PHASE 1 — SUPABASE PROJECT SETUP (do this manually)

### 1.1 Create Project
1. Go to supabase.com → New Project
2. Name: `ai-chat-companion`
3. Region: choose closest to your VPS location
4. Password: save it
5. Free tier — no credit card needed

### 1.2 Enable pgvector Extension
In Supabase → SQL Editor, run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 1.3 Create All Tables
Run this entire block in the SQL Editor:

```sql
-- Users table (mirrors Supabase Auth)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI personality settings
CREATE TABLE public.ai_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  personality_name TEXT DEFAULT 'Friendly Helper',
  humor TEXT DEFAULT 'light',
  tone TEXT DEFAULT 'warm',
  formality TEXT DEFAULT 'casual',
  thinking_mode BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice settings
CREATE TABLE public.voice_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  pitch FLOAT DEFAULT 1.0,
  rate FLOAT DEFAULT 1.0,
  volume FLOAT DEFAULT 1.0,
  voice_name TEXT DEFAULT '',
  language TEXT DEFAULT 'en-US',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat history
CREATE TABLE public.chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  emotion TEXT DEFAULT 'neutral',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emotion tracking
CREATE TABLE public.emotion_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  emotion_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector memory table (THE KEY DIFFERENTIATOR)
-- Stores embeddings of every message for semantic recall
CREATE TABLE public.message_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  chat_history_id UUID REFERENCES public.chat_history(id) ON DELETE CASCADE,
  content TEXT NOT NULL,          -- Original message text
  role TEXT NOT NULL,             -- 'user' or 'assistant'
  embedding vector(768),          -- nomic-embed-text produces 768-dim vectors
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast vector similarity search
CREATE INDEX ON public.message_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 1.4 Create Memory Search Function
```sql
-- Function to find the most semantically similar past messages
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(768),
  match_user_id UUID,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  content TEXT,
  role TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE AS $$
  SELECT
    content,
    role,
    1 - (embedding <=> query_embedding) AS similarity,
    created_at
  FROM message_embeddings
  WHERE user_id = match_user_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### 1.5 Row Level Security (replaces Firestore rules)
```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_embeddings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users own data" ON public.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users own settings" ON public.ai_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own voice" ON public.voice_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own chat" ON public.chat_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own emotions" ON public.emotion_data
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own memories" ON public.message_embeddings
  FOR ALL USING (auth.uid() = user_id);
```

### 1.6 Get Your Keys
Supabase → Project Settings → API:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never expose)

---

## PHASE 2 — PROJECT SCAFFOLDING

### 2.1 Create Next.js Project (on laptop)
```bash
npx create-next-app@latest ai-chat-companion \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd ai-chat-companion
```

### 2.2 Install All Dependencies
```bash
npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  next-pwa \
  zustand \
  react-markdown \
  uuid \
  clsx \
  tailwind-merge

npm install -D \
  @types/uuid \
  @types/node
```

### 2.3 Environment Variables
Create `.env.local` in project root:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Ollama — points to VPS internally on VPS, to VPS IP on laptop
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:2b

# Embedding model
OLLAMA_EMBED_MODEL=nomic-embed-text

# On laptop during dev, set this to http://YOUR_VPS_IP:11434
# NEVER expose port 11434 publicly — use SSH tunnel instead:
# ssh -L 11434:localhost:11434 user@your_vps_ip
```

Create `.env.example` (same keys, empty values — commit this, never .env.local)

---

## PHASE 3 — FOLDER STRUCTURE

Claude Code must create this exact structure:

```
ai-chat-companion/
├── public/
│   ├── icons/
│   │   ├── icon-192x192.png
│   │   └── icon-512x512.png
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   ├── (main)/
│   │   │   ├── chat/
│   │   │   │   └── page.tsx
│   │   │   ├── personality/
│   │   │   │   └── page.tsx
│   │   │   ├── voice-settings/
│   │   │   │   └── page.tsx
│   │   │   └── history/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts      ← POST (full) + PUT (streaming)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Badge.tsx
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── MicButton.tsx
│   │   ├── personality/
│   │   │   └── PersonalitySelector.tsx
│   │   └── layout/
│   │       ├── Navbar.tsx
│   │       └── Sidebar.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         ← browser Supabase client
│   │   │   ├── server.ts         ← server-side Supabase client
│   │   │   ├── auth.ts           ← signUp, logIn, logOut, deleteAccount
│   │   │   └── db.ts             ← all database operations
│   │   ├── ollama/
│   │   │   ├── client.ts         ← chat + streaming
│   │   │   ├── embeddings.ts     ← generate embeddings via nomic-embed-text
│   │   │   └── promptBuilder.ts  ← system prompt + memory injection
│   │   └── voice/
│   │       ├── speechToText.ts
│   │       └── textToSpeech.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useChat.ts
│   │   ├── useVoice.ts
│   │   └── usePersonality.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── chatStore.ts
│   │   └── settingsStore.ts
│   └── types/
│       └── index.ts
├── next.config.ts
├── tailwind.config.ts
└── .env.local
```

---

## PHASE 4 — TYPE DEFINITIONS

### `src/types/index.ts`
```typescript
export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: Emotion;
}

export type Emotion = 'happy' | 'sad' | 'angry' | 'anxious' | 'neutral' | 'excited';
export type HumorLevel = 'none' | 'light' | 'moderate' | 'high';
export type FormalityLevel = 'casual' | 'neutral' | 'formal';
export type ToneType = 'warm' | 'professional' | 'playful' | 'serious';

export interface AISettings {
  id: string;
  userId: string;
  personalityName: string;
  humor: HumorLevel;
  tone: ToneType;
  formality: FormalityLevel;
  thinkingMode: boolean;
}

export interface VoiceSettings {
  id: string;
  userId: string;
  pitch: number;
  rate: number;
  volume: number;
  voiceName: string;
  language: string;
}

export interface Memory {
  content: string;
  role: string;
  similarity: number;
  createdAt: string;
}

export interface OllamaRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream: boolean;
  options?: {
    temperature: number;
    top_p: number;
    top_k: number;
    num_ctx: number;
    num_predict: number;
  };
}
```

---

## PHASE 5 — SUPABASE CLIENT SETUP

### `src/lib/supabase/client.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### `src/lib/supabase/server.ts`
```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Server-side client with service role key — only used in API routes
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

### `src/lib/supabase/auth.ts`
```typescript
import { createClient } from './client';

export async function signUp(email: string, password: string, username: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;

  // Create user row in public.users
  if (data.user) {
    const { error: dbError } = await supabase.from('users').insert({
      id: data.user.id,
      email,
      username,
    });
    if (dbError) throw dbError;

    // Create default settings rows
    await supabase.from('ai_settings').insert({ user_id: data.user.id });
    await supabase.from('voice_settings').insert({ user_id: data.user.id });
  }

  return data.user;
}

export async function logIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function logOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function deleteAccount() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  // Delete user row (cascades to all related tables via FK)
  await supabase.from('users').delete().eq('id', user.id);

  // Delete auth user (requires service role — do this in an API route)
  await fetch('/api/account/delete', { method: 'DELETE' });
}
```

### `src/lib/supabase/db.ts`
```typescript
import { createClient } from './client';
import type { AISettings, VoiceSettings, Message, Emotion } from '@/types';

// ─── AI SETTINGS ──────────────────────────────────────────────────────────────

export async function getAISettings(userId: string): Promise<AISettings | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function updateAISettings(userId: string, settings: Partial<AISettings>) {
  const supabase = createClient();
  await supabase
    .from('ai_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

// ─── VOICE SETTINGS ───────────────────────────────────────────────────────────

export async function getVoiceSettings(userId: string): Promise<VoiceSettings | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('voice_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function updateVoiceSettings(userId: string, settings: Partial<VoiceSettings>) {
  const supabase = createClient();
  await supabase
    .from('voice_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

// ─── CHAT HISTORY ─────────────────────────────────────────────────────────────

export async function saveChatMessage(
  userId: string,
  sessionId: string,
  message: Message
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('chat_history')
    .insert({
      user_id: userId,
      session_id: sessionId,
      role: message.role,
      content: message.content,
      emotion: message.emotion ?? 'neutral',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id; // Return ID so we can link the embedding
}

export async function getChatHistory(userId: string, limitCount = 50) {
  const supabase = createClient();
  const { data } = await supabase
    .from('chat_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limitCount);
  return data ?? [];
}

// ─── EMOTION DATA ─────────────────────────────────────────────────────────────

export async function saveEmotionData(userId: string, emotion: Emotion) {
  const supabase = createClient();
  await supabase.from('emotion_data').insert({
    user_id: userId,
    emotion_type: emotion,
  });
}

// ─── VECTOR MEMORY ────────────────────────────────────────────────────────────

export async function saveEmbedding(
  userId: string,
  chatHistoryId: string,
  content: string,
  role: string,
  embedding: number[]
) {
  const supabase = createClient();
  await supabase.from('message_embeddings').insert({
    user_id: userId,
    chat_history_id: chatHistoryId,
    content,
    role,
    embedding,
  });
}

export async function searchMemories(userId: string, queryEmbedding: number[], count = 3) {
  const supabase = createClient();
  const { data } = await supabase.rpc('match_memories', {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: count,
  });
  return data ?? [];
}
```

---

## PHASE 6 — OLLAMA CLIENT + EMBEDDINGS

### `src/lib/ollama/embeddings.ts`
```typescript
const BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBED_MODEL,
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding error: ${response.status}`);
  }

  const data = await response.json();
  return data.embedding as number[]; // 768-dimensional vector
}
```

### `src/lib/ollama/promptBuilder.ts`
```typescript
import type { AISettings, Message, Emotion, Memory } from '@/types';

export function buildSystemPrompt(settings: AISettings, memories: Memory[]): string {
  const thinkingToken = settings.thinkingMode ? '<|think|>\n' : '';

  // Inject relevant past memories into the system prompt
  const memorySection = memories.length > 0
    ? `\nRelevant things you remember from past conversations:\n${
        memories
          .filter(m => m.similarity > 0.75) // Only high-confidence memories
          .map(m => `- [${m.role} said, ${new Date(m.createdAt).toLocaleDateString()}]: "${m.content}"`)
          .join('\n')
      }\n`
    : '';

  return `${thinkingToken}You are an AI companion named ${settings.personalityName}.

Your personality:
- Humor: ${settings.humor} (none = never joke, high = often funny)
- Tone: ${settings.tone}
- Formality: ${settings.formality}
${memorySection}
Rules:
1. Always respond in the same language the user writes in.
2. Keep responses concise — 2 to 4 sentences unless the user asks for more.
3. Never break character.
4. If relevant memories are listed above, naturally weave them into your response.
   Do not say "I remember that..." explicitly — just use the knowledge naturally.
5. At the end of EVERY response, output exactly this line:
   EMOTION_DETECTED: <happy|sad|angry|anxious|neutral|excited>
   Base the emotion on what the USER said, not your response.`;
}

export function buildMessages(
  systemPrompt: string,
  history: Message[],
  newMessage: string
): { role: string; content: string }[] {
  const historyMessages = history.slice(-10).map((m) => ({
    role: m.role,
    content: m.content.replace(/\nEMOTION_DETECTED:.*$/m, '').trim(),
  }));

  return [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: newMessage },
  ];
}

export function parseEmotionFromResponse(raw: string): { content: string; emotion: Emotion } {
  const match = raw.match(/EMOTION_DETECTED:\s*(\w+)/i);
  const emotion = (match?.[1]?.toLowerCase() ?? 'neutral') as Emotion;
  const content = raw.replace(/\nEMOTION_DETECTED:.*$/m, '').trim();
  return { content, emotion };
}
```

### `src/lib/ollama/client.ts`
```typescript
import type { OllamaRequest } from '@/types';

const BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL ?? 'gemma3:2b';

export async function chatWithOllama(
  messages: { role: string; content: string }[],
  onToken?: (token: string) => void
): Promise<string> {
  const body: OllamaRequest = {
    model: MODEL,
    messages,
    stream: !!onToken,
    options: {
      temperature: 1.0,
      top_p: 0.95,
      top_k: 64,
      num_ctx: 8192,
      num_predict: 400,
    },
  };

  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  if (onToken && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            fullContent += parsed.message.content;
            onToken(parsed.message.content);
          }
        } catch {
          // Ignore partial chunk parse errors
        }
      }
    }

    return fullContent;
  }

  const data = await response.json();
  return data.message?.content ?? '';
}
```

---

## PHASE 7 — API ROUTE (The Brain)

### `src/app/api/chat/route.ts`

This is the most important file. It:
1. Receives the user message
2. Generates an embedding of it
3. Searches Supabase pgvector for similar past messages (memories)
4. Injects memories into the system prompt
5. Calls Ollama (Gemma) for the response
6. Saves the new message + its embedding back to Supabase
7. Returns the response

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { chatWithOllama } from '@/lib/ollama/client';
import { generateEmbedding } from '@/lib/ollama/embeddings';
import { buildSystemPrompt, buildMessages, parseEmotionFromResponse } from '@/lib/ollama/promptBuilder';
import { saveChatMessage, saveEmotionData, saveEmbedding, searchMemories } from '@/lib/supabase/db';
import type { AISettings, Message } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { userMessage, history, aiSettings, userId, sessionId } = await req.json() as {
      userMessage: string;
      history: Message[];
      aiSettings: AISettings;
      userId: string;
      sessionId: string;
    };

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // Step 1: Generate embedding for the user's message
    const queryEmbedding = await generateEmbedding(userMessage);

    // Step 2: Search for relevant memories in pgvector
    const memories = await searchMemories(userId, queryEmbedding, 3);

    // Step 3: Build system prompt with injected memories
    const systemPrompt = buildSystemPrompt(aiSettings, memories);
    const messages = buildMessages(systemPrompt, history, userMessage);

    // Step 4: Save user message to Supabase
    const userMsgId = await saveChatMessage(userId, sessionId, {
      id: '',
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Step 5: Save user message embedding (async, don't await — non-blocking)
    saveEmbedding(userId, userMsgId, userMessage, 'user', queryEmbedding).catch(console.error);

    // Step 6: Get AI response from Ollama
    const rawResponse = await chatWithOllama(messages);
    const { content, emotion } = parseEmotionFromResponse(rawResponse);

    // Step 7: Save AI response to Supabase
    const aiMsgId = await saveChatMessage(userId, sessionId, {
      id: '',
      role: 'assistant',
      content,
      emotion,
      timestamp: new Date(),
    });

    // Step 8: Save AI response embedding + emotion (async)
    generateEmbedding(content)
      .then(embedding => saveEmbedding(userId, aiMsgId, content, 'assistant', embedding))
      .catch(console.error);
    saveEmotionData(userId, emotion).catch(console.error);

    return NextResponse.json({ content, emotion, memoriesUsed: memories.length });

  } catch (error) {
    console.error('Chat API error:', error);
    if ((error as Error).message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'Ollama is not running. Run: ollama serve' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Streaming endpoint (PUT) — required for good UX at CPU inference speeds
export async function PUT(req: NextRequest) {
  const { userMessage, history, aiSettings, userId, sessionId } = await req.json();

  // Generate embedding and memories (same as POST)
  const queryEmbedding = await generateEmbedding(userMessage);
  const memories = await searchMemories(userId, queryEmbedding, 3);
  const systemPrompt = buildSystemPrompt(aiSettings, memories);
  const messages = buildMessages(systemPrompt, history, userMessage);

  // Save user message
  const userMsgId = await saveChatMessage(userId, sessionId, {
    id: '', role: 'user', content: userMessage, timestamp: new Date()
  });
  saveEmbedding(userId, userMsgId, userMessage, 'user', queryEmbedding).catch(console.error);

  const encoder = new TextEncoder();
  let fullContent = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await chatWithOllama(messages, (token) => {
          fullContent += token;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        });

        // After streaming completes, parse emotion and save
        const { content, emotion } = parseEmotionFromResponse(fullContent);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, emotion })}\n\n`)
        );
        controller.close();

        // Save to DB async after stream finishes
        saveChatMessage(userId, sessionId, {
          id: '', role: 'assistant', content, emotion, timestamp: new Date()
        }).then(aiMsgId => {
          generateEmbedding(content)
            .then(emb => saveEmbedding(userId, aiMsgId, content, 'assistant', emb))
            .catch(console.error);
        });
        saveEmotionData(userId, emotion).catch(console.error);

      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

---

## PHASE 8 — VOICE UTILITIES

### `src/lib/voice/speechToText.ts`
```typescript
export class SpeechToTextController {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;

  constructor(private language = 'en-US') {
    if (typeof window !== 'undefined') {
      const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        this.recognition = new SR();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = language;
      }
    }
  }

  get supported() { return this.recognition !== null; }

  listen(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      let finalTranscript = '';
      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
      };
      this.recognition.onend = () => { this.isListening = false; resolve(finalTranscript.trim()); };
      this.recognition.onerror = (e) => {
        this.isListening = false;
        e.error === 'no-speech' ? resolve('') : reject(new Error(e.error));
      };

      this.isListening = true;
      this.recognition.start();
    });
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}
```

### `src/lib/voice/textToSpeech.ts`
```typescript
import type { VoiceSettings } from '@/types';

export class TextToSpeechController {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      if (this.synth.getVoices().length > 0) {
        this.voices = this.synth.getVoices();
      } else {
        this.synth.onvoiceschanged = () => { this.voices = this.synth!.getVoices(); };
      }
    }
  }

  getAvailableVoices() { return this.voices; }

  speak(text: string, settings: VoiceSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) { reject(new Error('TTS not supported')); return; }
      this.synth.cancel();

      const clean = text
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\n/g, '. ');

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.pitch = settings.pitch;
      utterance.rate = settings.rate;
      utterance.volume = settings.volume;
      utterance.lang = settings.language;

      if (settings.voiceName) {
        const voice = this.voices.find(v => v.name === settings.voiceName);
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(new Error(e.error));
      this.synth.speak(utterance);
    });
  }

  stop() { this.synth?.cancel(); }
  get isSpeaking() { return this.synth?.speaking ?? false; }
}
```

---

## PHASE 9 — ZUSTAND STORES

### `src/store/authStore.ts`
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'auth-store' }
  )
);
```

### `src/store/chatStore.ts`
```typescript
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Message, Emotion } from '@/types';

interface ChatState {
  messages: Message[];
  isGenerating: boolean;
  currentEmotion: Emotion;
  sessionId: string;
  memoriesUsed: number;
  addUserMessage: (content: string) => Message;
  addAssistantMessage: (content: string, emotion: Emotion) => void;
  appendToLastMessage: (token: string) => void;
  setGenerating: (v: boolean) => void;
  setEmotion: (e: Emotion) => void;
  setMemoriesUsed: (n: number) => void;
  clearMessages: () => void;
  newSession: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isGenerating: false,
  currentEmotion: 'neutral',
  sessionId: uuidv4(),
  memoriesUsed: 0,

  addUserMessage: (content) => {
    const msg: Message = { id: uuidv4(), role: 'user', content, timestamp: new Date() };
    set((s) => ({ messages: [...s.messages, msg] }));
    return msg;
  },

  addAssistantMessage: (content, emotion) => {
    const msg: Message = { id: uuidv4(), role: 'assistant', content, emotion, timestamp: new Date() };
    set((s) => ({ messages: [...s.messages, msg], currentEmotion: emotion }));
  },

  appendToLastMessage: (token) => {
    set((s) => {
      const messages = [...s.messages];
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant') {
        messages[messages.length - 1] = { ...last, content: last.content + token };
      } else {
        messages.push({ id: uuidv4(), role: 'assistant', content: token, timestamp: new Date() });
      }
      return { messages };
    });
  },

  setGenerating: (isGenerating) => set({ isGenerating }),
  setEmotion: (currentEmotion) => set({ currentEmotion }),
  setMemoriesUsed: (memoriesUsed) => set({ memoriesUsed }),
  clearMessages: () => set({ messages: [] }),
  newSession: () => set({ messages: [], sessionId: uuidv4() }),
}));
```

### `src/store/settingsStore.ts`
Same as original plan — paste AISettings and VoiceSettings defaults with Zustand persist.

---

## PHASE 10 — CUSTOM HOOKS

### `src/hooks/useAuth.ts`
```typescript
'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export function useAuth(requireAuth = false) {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          username: session.user.user_metadata?.username ?? '',
          createdAt: new Date(),
        });
      } else {
        setUser(null);
        if (requireAuth) router.push('/login');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          username: session.user.user_metadata?.username ?? '',
          createdAt: new Date(),
        });
      } else {
        setUser(null);
        if (requireAuth) router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [requireAuth]);

  return { user, isLoading };
}
```

### `src/hooks/useChat.ts`
```typescript
'use client';
import { useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import type { Emotion } from '@/types';

export function useChat() {
  const { messages, isGenerating, addUserMessage, addAssistantMessage,
          appendToLastMessage, setGenerating, setEmotion, setMemoriesUsed, sessionId } = useChatStore();
  const { aiSettings } = useSettingsStore();
  const { user } = useAuthStore();

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isGenerating || !user) return;

    addUserMessage(content);
    setGenerating(true);

    try {
      // Use streaming endpoint (PUT) for better UX
      const response = await fetch('/api/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: content,
          history: messages.slice(-10),
          aiSettings,
          userId: user.id,
          sessionId,
        }),
      });

      if (!response.body) throw new Error('No stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) appendToLastMessage(parsed.token);
            if (parsed.done && parsed.emotion) setEmotion(parsed.emotion as Emotion);
            if (parsed.memoriesUsed !== undefined) setMemoriesUsed(parsed.memoriesUsed);
          } catch {}
        }
      }
    } catch (error) {
      addAssistantMessage(`Error: ${(error as Error).message}`, 'neutral');
    } finally {
      setGenerating(false);
    }
  }, [messages, aiSettings, user, isGenerating, sessionId]);

  return { messages, isGenerating, sendMessage };
}
```

---

## PHASE 11 — CORE PAGES

### `src/app/(auth)/login/page.tsx`
- Email + Password fields
- Calls `logIn()` from supabase auth
- Shows error on invalid credentials
- Link to /signup
- Redirects to /chat on success

### `src/app/(auth)/signup/page.tsx`
- Username, Email, Password, Confirm Password fields
- Client-side validation
- Calls `signUp()` from supabase auth
- Redirects to /chat on success

### `src/app/(main)/chat/page.tsx`
Must contain:
- `ChatWindow` — scrollable message list with auto-scroll
- `MessageInput` — text field + send button + enter key handler
- `MicButton` — toggles voice input
- Emotion indicator badge (color-coded, updates in real-time)
- Memory indicator — small badge showing "🧠 3 memories recalled" when relevant
- Loading skeleton while generating

### `src/app/(main)/personality/page.tsx`
- 3 preset personality cards (Friendly Helper, Tech Expert, Creative Companion)
- Custom personality form with sliders/selectors for humor, tone, formality
- Thinking Mode toggle
- Save → `updateAISettings()` + update settingsStore

### `src/app/(main)/voice-settings/page.tsx`
- Voice selector dropdown (from `getVoices()`)
- Pitch, Speed, Volume sliders
- Test button
- Language selector
- Save → `updateVoiceSettings()` + update settingsStore

### `src/app/(main)/history/page.tsx`
- Fetches last 50 messages via `getChatHistory()`
- Reverse chronological display
- Emotion badge on each message
- Date grouping headers

---

## PHASE 12 — KEY COMPONENTS

### `src/components/chat/MessageBubble.tsx`
Same as original plan — user messages right-aligned blue, assistant messages left-aligned with ReactMarkdown rendering, emotion badge, streaming cursor.

### `src/components/chat/MicButton.tsx`
Same as original plan — red pulsing when listening, calls `startListening()`, sends transcript via `sendMessage()`, then calls `speak()` on the AI response.

---

## PHASE 13 — PWA CONFIGURATION

### `public/manifest.json`
```json
{
  "name": "AI Chat Companion",
  "short_name": "AI Companion",
  "description": "Your personalized AI companion with voice and memory",
  "start_url": "/chat",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable any" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable any" }
  ]
}
```

### `next.config.ts`
```typescript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // No extra config needed
});
```

---

## PHASE 14 — VPS DEPLOYMENT

Run these on the VPS after pushing code to GitHub.

```bash
# On VPS — first time setup
git clone https://github.com/YOUR_USERNAME/ai-chat-companion.git
cd ai-chat-companion

# Create .env.local with production values
nano .env.local
# Set OLLAMA_BASE_URL=http://localhost:11434
# Set OLLAMA_MODEL=gemma4:e2b  (use the big model for production)
# Set all Supabase keys

# Install deps and build
npm install
npm run build

# Start with PM2
pm2 start npm --name "ai-companion" -- start
pm2 save
pm2 startup   # Follow the printed command to make it survive reboots

# Verify it's running
pm2 status
curl http://localhost:3000
```

For subsequent deploys:
```bash
# On VPS
cd ai-chat-companion
git pull
npm install
npm run build
pm2 reload ai-companion
```

Or add this as a deploy script:
```bash
# deploy.sh (run from laptop via SSH)
ssh user@YOUR_VPS_IP "cd ai-chat-companion && git pull && npm ci && npm run build && pm2 reload ai-companion"
```

---

## PHASE 15 — EXAM DEMO SCRIPT

Run through this in order. The app is at `http://YOUR_VPS_IP`.

1. **Share the URL** → examiner opens it on their own device — immediately impressive
2. **Sign Up** → create account → lands on chat
3. **Show Supabase dashboard** → users table has new row, ai_settings row auto-created
4. **Send 3-4 messages** about something personal (e.g., "I just started a new job as a developer")
5. **Show emotion badges** appearing after each response
6. **Go to Personality** → switch to "Tech Expert" → return → different tone immediately
7. **Enable Thinking Mode** → show Gemma reasoning before responding
8. **Start a new session** → ask "what do you know about me?" → AI recalls the job mention via pgvector
9. **Show Supabase** → `message_embeddings` table filling up, `emotion_data` filling up
10. **Mic button** → speak → transcript appears → AI responds in voice
11. **Voice Settings** → change pitch to 1.8 → return → AI sounds different
12. **History page** → all messages with emotion tags
13. **Browser DevTools** → Application → Manifest → show PWA configured
14. **Optional: install PWA** on phone by visiting the URL — shows "Add to Home Screen"

**Key exam talking point for pgvector:**
> "The AI remembers what we talked about in past sessions because every message is converted to a 768-dimensional vector using nomic-embed-text, stored in Supabase pgvector, and retrieved via cosine similarity search before every response. This is the same technique used in production RAG systems."

---

## FEATURE → SRS REQUIREMENT MAPPING

| Feature | SRS Requirement |
|---|---|
| Sign Up page | FR_01, UC_01 |
| Login page | FR_02, UC_02 |
| Logout button | FR_03, UC_03 |
| Profile/Settings page | FR_04, UC_04 |
| Delete account | FR_05, UC_05 |
| Mic button + voice response | FR_06, UC_06 |
| Personality settings | FR_07, UC_07 |
| Voice settings | FR_08, UC_08 |
| Emotion badge + Supabase logging | FR_09, UC_09 |
| Supabase Auth state listeners | FR_10, UC_10 |
| pgvector long-term memory | Non-functional: Performance, Differentiation |
| Gemma 4 thinking mode | Non-functional: Performance |
| PWA manifest | Non-functional: Portability |
| Streaming responses | Non-functional: Usability |
| VPS always-on hosting | Non-functional: Availability |

---

## WHAT TO TELL CLAUDE CODE

Paste this at the start of your Claude Code session:

```
You are building an AI Chat Companion PWA. The full plan is in AI_COMPANION_PLAN.md.

Architecture:
- Supabase (NOT Firebase) for auth and database
- pgvector in Supabase for AI long-term memory via message embeddings
- Ollama running at http://localhost:11434 with model from OLLAMA_MODEL env var
- Embedding model: nomic-embed-text (also via Ollama)
- Deployed to VPS with PM2 + Nginx (NOT Vercel)

Build phase by phase. Do not skip phases. After each phase:
1. Confirm all files were created
2. Run `npm run build` to check TypeScript errors
3. Fix any errors before moving to the next phase

Key constraints:
- Every API route that calls Ollama runs server-side only
- Never expose SUPABASE_SERVICE_ROLE_KEY to the client
- Streaming (PUT /api/chat) is required — not optional
- Every message must be embedded and saved to message_embeddings table
- All pages must be mobile-first responsive
- TypeScript strict mode must pass with zero errors
```

---

## RAM BUDGET REMINDER (VPS)

```
System + services:         ~8.0 GiB (current baseline)
Gemma 4 E2B (demo model):  ~7.2 GiB
Next.js production:        ~0.3 GiB
Nginx:                     ~0.1 GiB
────────────────────────────────────
Total:                    ~15.6 GiB  ← tight but under 16 GiB limit
Remaining:                 ~0.4 GiB  ← thin

If this is too tight, switch to gemma3:2b on the VPS:
Total with gemma3:2b:     ~10.3 GiB  ← comfortable
Remaining:                 ~5.7 GiB  ← solid headroom

Switch model: edit .env.local on VPS → OLLAMA_MODEL=gemma3:2b → pm2 reload
```
