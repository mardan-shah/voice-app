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
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 bg-zinc-50 p-4 dark:bg-black md:p-6">{children}</main>
      </div>
    </div>
  );
}
