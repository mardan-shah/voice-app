"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { requestPasswordReset } from "@/lib/supabase/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      setStatus("Password reset email sent. Check your inbox and spam folder.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to send password reset email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <h1 className="text-xl font-semibold">Reset password</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {status ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{status}</p> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Remembered it?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
