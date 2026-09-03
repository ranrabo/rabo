import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn("h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink outline-none focus:border-aqua focus:ring-2 focus:ring-aqua/30", className)} {...props} />
));
Select.displayName = "Select";
