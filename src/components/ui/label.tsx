import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink/60", className)} {...props} />
);
