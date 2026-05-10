# AI Chat Companion

Next.js App Router project for a personalized AI companion with:

- Supabase auth + data storage
- pgvector long-term memory search
- Ollama chat + embeddings
- Emotion tagging
- Voice input/output
- PWA manifest support

## 1. Install dependencies

```bash
bun install
```

## 2. Configure environment

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_EMBED_MODEL`

## 3. Create Supabase schema

Run `supabase/schema.sql` in your Supabase SQL editor.

## 4. Run locally

```bash
bun run dev
```

## MCP configuration for Copilot CLI

Two MCP config files are prepared:

- Repository-level: `.github/mcp.json`
- User-level: `~/.copilot/mcp-config.json`

The Context7 server expects this optional secret variable:

- `COPILOT_MCP_CONTEXT7_API_KEY`

Use Copilot CLI `/mcp show` to verify connected servers.
