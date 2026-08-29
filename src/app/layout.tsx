import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RABOランラボ",
  description: "A shared view of time in the lab.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
