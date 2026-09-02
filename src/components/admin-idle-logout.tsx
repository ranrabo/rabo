"use client";

import { useEffect, useRef } from "react";

const IDLE_MS = 30 * 60 * 1000; // sign out after this long with no activity
const KEEPALIVE_MS = 5 * 60 * 1000; // while active, roll the server session this often
const CHECK_MS = 20 * 1000; // how often the watcher wakes up

// Watches for pointer / keyboard / scroll activity in the admin shell. After
// IDLE_MS with none of it, submit the hidden sign-out form (server action) and
// land back on the public board. While the admin is active, ping the session
// endpoint so the server-side JWT keeps rolling and doesn't expire underneath.
export function AdminIdleLogout({ action }: { action: () => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastActive = useRef(Date.now());
  const lastPing = useRef(Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    let lastMark = 0;
    const mark = () => {
      const now = Date.now();
      if (now - lastMark > 5000) {
        lastMark = now;
        lastActive.current = now;
      }
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "scroll"];
    for (const type of events) window.addEventListener(type, mark, { passive: true });

    const tick = () => {
      if (firedRef.current) return;
      const now = Date.now();
      if (now - lastActive.current >= IDLE_MS) {
        firedRef.current = true;
        formRef.current?.requestSubmit();
        return;
      }
      if (now - lastPing.current >= KEEPALIVE_MS && lastActive.current > lastPing.current) {
        lastPing.current = now;
        fetch("/api/auth/session", { cache: "no-store" }).catch(() => {});
      }
    };
    const timer = window.setInterval(tick, CHECK_MS);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      for (const type of events) window.removeEventListener(type, mark);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <form ref={formRef} action={action} className="hidden" aria-hidden="true">
      <button type="submit" tabIndex={-1} aria-hidden="true" />
    </form>
  );
}
