"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { logOut } from "@/lib/supabase/auth";
import { useAuthStore } from "@/store/authStore";

import { Button } from "@/components/ui/Button";

export function Navbar() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const handleLogout = async () => {
    await logOut();
    setUser(null);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
      <Link href="/chat" className="font-semibold">
        AI Companion
      </Link>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-zinc-600 dark:text-zinc-300 sm:block">{user?.email}</span>
        <Button variant="secondary" onClick={() => void handleLogout()}>
          Log out
        </Button>
      </div>
    </header>
  );
}
