import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "emotion" | "memory" | "danger";

type BadgeProps = PropsWithChildren<{
  className?: string;
  variant?: BadgeVariant;
}>;

const variantClass: Record<BadgeVariant, string> = {
  default: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
  emotion: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  memory: "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100",
  danger: "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100",
};

export function Badge({ className, variant = "default", children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        variantClass[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
