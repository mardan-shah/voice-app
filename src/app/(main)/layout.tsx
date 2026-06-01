"use client";

import type { PropsWithChildren } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";

export default function MainLayout({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth(true);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-[#080b12]">
      <Navbar />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
