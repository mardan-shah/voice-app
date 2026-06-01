"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { resendSignupConfirmation, signInWithGoogle, signUp } from "@/lib/supabase/auth";

export default function SignupPage() {
  const router = useRouter();
  const { user } = useAuth(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.push("/chat");
    }
  }, [router, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await signUp(email, password, username);
      if (data.session) {
        router.push("/chat");
        return;
      }
      setConfirmationEmail(email);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to sign up.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!confirmationEmail) {
      return;
    }

    setIsResending(true);
    setResendStatus(null);
    try {
      await resendSignupConfirmation(confirmationEmail);
      setResendStatus("Confirmation email sent again. Check your inbox and spam folder.");
    } catch (caughtError) {
      setResendStatus(caughtError instanceof Error ? caughtError.message : "Unable to resend email.");
    } finally {
      setIsResending(false);
    }
  };

  if (confirmationEmail) {
    return (
      <Card className="space-y-4">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-lg text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          @
        </div>
        <div>
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Supabase created your account, but you need to confirm <strong>{confirmationEmail}</strong> before
            signing in.
          </p>
        </div>
        <Button type="button" variant="secondary" className="w-full" onClick={() => void handleResend()} disabled={isResending}>
          {isResending ? "Sending..." : "Resend confirmation email"}
        </Button>
        {resendStatus ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{resendStatus}</p> : null}
        <Link href="/login" className="block text-center text-sm text-blue-600 hover:underline">
          Return to login
        </Link>
      </Card>
    );
  }

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
      <h1 className="text-xl font-semibold">Create account</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Set up your AI companion profile.</p>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <Input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
          required
        />
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
        <Input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm password"
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting || isGoogleSubmitting}>
          {isSubmitting ? "Creating..." : "Create account"}
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
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
