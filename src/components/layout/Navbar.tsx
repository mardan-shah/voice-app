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
    <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur dark:border-white/8 dark:bg-[#0b0f18]/90 md:px-6">
      <Link href="/chat" className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20">
          A
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-tight text-slate-900 dark:text-white">AI Companion</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Private workspace</span>
        </span>
      </Link>
      <div className="flex items-center gap-2 sm:gap-4">
        <span className="hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
          {user?.email}
        </span>
        <Button variant="ghost" className="h-9 px-3 text-xs" onClick={() => void handleLogout()}>
          Log out
        </Button>
      </div>
    </header>
  );
}
