"use server";

import { signIn } from "@/auth";

export const authenticate = async (formData: FormData) => {
  await signIn("credentials", {
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    redirectTo: "/admin",
  });
};
