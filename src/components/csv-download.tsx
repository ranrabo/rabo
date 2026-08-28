"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CsvRow = { person: string; scheduled: string; logged: string; difference: string };

export const CsvDownload = ({ rows, from, to }: { rows: CsvRow[]; from: string; to: string }) => {
  const download = () => {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = ["Person,Scheduled hours,Logged hours,Difference", ...rows.map((row) => [row.person, row.scheduled, row.logged, row.difference].map(escape).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `rabo-lab-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return <Button type="button" onClick={download} className="bg-slate"><Download size={16} /> Export CSV</Button>;
};
