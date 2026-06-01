"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { logIn, signInWithGoogle } from "@/lib/supabase/auth";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.push("/chat");
    }
  }, [router, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await logIn(email, password);
      router.push("/chat");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to sign in with Google.");
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <Card>
      <h1 className="text-xl font-semibold">Login</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Welcome back to AI Companion.</p>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting || isGoogleSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting || isGoogleSubmitting}
      >
        {isGoogleSubmitting ? "Connecting..." : "Google"}
      </Button>

      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-blue-600 hover:underline">
          Create one
        </Link>
      </p>
    </Card>
  );
}
