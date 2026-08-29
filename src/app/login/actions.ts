"use server";

import { signIn } from "@/auth";
import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { appUser } from "@/db/schema";

export const authenticate = async (formData: FormData) => {
  await signIn("credentials", {
    email: String(formData.get("identifier") || ""),
    password: String(formData.get("password") || ""),
    redirectTo: "/admin",
  });
};

export const createFirstUser = async (formData: FormData) => {
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmation") || "");

  if (password.length < 12 || password !== confirmation) {
    redirect("/login?setup=error");
  }

  const [{ userCount }] = await db.select({ userCount: count() }).from(appUser);
  if (userCount > 0) redirect("/login");

  await db.insert(appUser).values({
    email: "ranrabo",
    passwordHash: await bcrypt.hash(password, 12),
    displayName: "ranrabo",
  });

  redirect("/login?setup=complete");
};
