CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  personality_name TEXT DEFAULT 'Friendly Helper',
  humor TEXT DEFAULT 'light',
  tone TEXT DEFAULT 'warm',
  formality TEXT DEFAULT 'casual',
  thinking_mode BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.voice_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  pitch FLOAT DEFAULT 1.0,
  rate FLOAT DEFAULT 1.0,
  volume FLOAT DEFAULT 1.0,
  voice_name TEXT DEFAULT '',
  language TEXT DEFAULT 'en-US',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  emotion TEXT DEFAULT 'neutral',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.emotion_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  emotion_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.message_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  chat_history_id UUID REFERENCES public.chat_history(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS message_embeddings_embedding_idx
  ON public.message_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

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

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own data" ON public.users;
CREATE POLICY "Users own data" ON public.users
  FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users own settings" ON public.ai_settings;
CREATE POLICY "Users own settings" ON public.ai_settings
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own voice" ON public.voice_settings;
CREATE POLICY "Users own voice" ON public.voice_settings
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own chat" ON public.chat_history;
CREATE POLICY "Users own chat" ON public.chat_history
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own emotions" ON public.emotion_data;
CREATE POLICY "Users own emotions" ON public.emotion_data
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own memories" ON public.message_embeddings;
CREATE POLICY "Users own memories" ON public.message_embeddings
  FOR ALL USING (auth.uid() = user_id);
