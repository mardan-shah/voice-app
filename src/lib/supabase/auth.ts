import { createClient } from "./client";

function getOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configuredOrigin) {
    return configuredOrigin;
  }
  return typeof window !== "undefined" ? window.location.origin : "";
}

export async function signUp(email: string, password: string, username: string) {
  const supabase = createClient();
  const origin = getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${origin}/auth/confirm?next=/chat`,
    },
  });
  if (error) {
    throw error;
  }

  return data;
}

export async function resendSignupConfirmation(email: string) {
  const supabase = createClient();
  const origin = getOrigin();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/chat`,
    },
  });
  if (error) {
    throw error;
  }
}

export async function logIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  return data.user;
}

/*
export async function signInWithGoogle() {
  const supabase = createClient();
  const origin = getOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) {
    throw error;
  }
  return data;
}
*/

export async function requestPasswordReset(email: string) {
  const supabase = createClient();
  const origin = getOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });
  if (error) {
    throw error;
  }
}

export async function updatePassword(password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw error;
  }
}

export async function logOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getSession() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export async function deleteAccount() {
  const supabase = createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  if (!session?.access_token) {
    throw new Error("You must be logged in to delete your account.");
  }

  const response = await fetch("/api/account/delete", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Unable to delete account.");
  }
}
