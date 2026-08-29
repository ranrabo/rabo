"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import bcrypt from "bcryptjs";
import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { appUser } from "@/db/schema";

export const authenticate = async (formData: FormData) => {
  try {
    await signIn("credentials", {
      email: String(formData.get("identifier") || ""),
      password: String(formData.get("password") || ""),
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=credentials");
    }
    throw error;
  }
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
