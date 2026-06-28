CREATE EXTENSION IF NOT EXISTS pgcrypto;
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

CREATE INDEX IF NOT EXISTS chat_history_user_created_at_idx
  ON public.chat_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS emotion_data_user_created_at_idx
  ON public.emotion_data (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS message_embeddings_user_created_at_idx
  ON public.message_embeddings (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS message_embeddings_chat_history_id_idx
  ON public.message_embeddings (chat_history_id);

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
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    content,
    role,
    1 - (embedding <=> query_embedding) AS similarity,
    created_at
  FROM public.message_embeddings
  WHERE user_id = match_user_id
    AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  derived_username TEXT;
BEGIN
  derived_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'User'
  );

  INSERT INTO public.users (id, email, username)
  VALUES (NEW.id, COALESCE(NEW.email, ''), derived_username)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        username = EXCLUDED.username;

  INSERT INTO public.ai_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.voice_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_memories(vector, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_memories(vector, uuid, integer) TO service_role;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.voice_settings TO authenticated;
GRANT SELECT ON TABLE public.chat_history TO authenticated;
GRANT SELECT ON TABLE public.emotion_data TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.users,
  public.ai_settings,
  public.voice_settings,
  public.chat_history,
  public.emotion_data,
  public.message_embeddings
TO service_role;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own data" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users own settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Users can read own ai settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Users can insert own ai settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Users can update own ai settings" ON public.ai_settings;
CREATE POLICY "Users can read own ai settings" ON public.ai_settings
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own ai settings" ON public.ai_settings
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own ai settings" ON public.ai_settings
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users own voice" ON public.voice_settings;
DROP POLICY IF EXISTS "Users can read own voice settings" ON public.voice_settings;
DROP POLICY IF EXISTS "Users can insert own voice settings" ON public.voice_settings;
DROP POLICY IF EXISTS "Users can update own voice settings" ON public.voice_settings;
CREATE POLICY "Users can read own voice settings" ON public.voice_settings
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own voice settings" ON public.voice_settings
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own voice settings" ON public.voice_settings
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users own chat" ON public.chat_history;
DROP POLICY IF EXISTS "Users can read own chat" ON public.chat_history;
CREATE POLICY "Users can read own chat" ON public.chat_history
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users own emotions" ON public.emotion_data;
DROP POLICY IF EXISTS "Users can read own emotions" ON public.emotion_data;
CREATE POLICY "Users can read own emotions" ON public.emotion_data
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users own memories" ON public.message_embeddings;
DROP POLICY IF EXISTS "Users can read own memories" ON public.message_embeddings;
CREATE POLICY "Users can read own memories" ON public.message_embeddings
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
