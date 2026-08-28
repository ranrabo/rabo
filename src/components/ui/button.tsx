import * as React from "react";
import { cn } from "@/lib/utils";

export const Button = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-paper transition hover:bg-slate disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua focus-visible:ring-offset-2 focus-visible:ring-offset-paper", className)} {...props} />
);
