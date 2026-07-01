"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/chat", label: "Chat", icon: "✦" },
  { href: "/personality", label: "Personality", icon: "◇" },
  { href: "/voice-settings", label: "Voice", icon: "◉" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 border-b border-slate-200/80 bg-white px-3 py-2 dark:border-white/8 dark:bg-[#0b0f18] md:flex md:w-56 md:flex-col md:border-b-0 md:border-r md:px-3 md:py-5">
      <p className="mb-3 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 md:block">
        Workspace
      </p>
      <nav className="flex gap-1 md:flex-col">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              )}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto hidden border-t border-slate-200/80 px-3 pt-4 dark:border-white/8 md:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Model</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Gemma 4 E2B
        </div>
      </div>
    </aside>
  );
}
