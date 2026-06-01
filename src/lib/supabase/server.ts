import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function getAuthenticatedUser(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing authorization token.");
  }

  const accessToken = authorization.slice("Bearer ".length).trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing Supabase authentication environment variables.");
  }

  const client = createSupabaseClient(supabaseUrl, publishableKey);
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    throw new Error("Invalid authorization token.");
  }

  return user;
}

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createSupabaseClient(supabaseUrl, secretKey);
}
