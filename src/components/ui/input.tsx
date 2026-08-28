import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink outline-none placeholder:text-ink/45 focus:border-aqua focus:ring-2 focus:ring-aqua/30", className)} {...props} />
));
Input.displayName = "Input";
