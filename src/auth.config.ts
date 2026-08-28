import type { NextAuthConfig } from "next-auth";

const authConfig = {
  providers: [],
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ auth, request }) => request.nextUrl.pathname.startsWith("/admin") ? Boolean(auth) : true,
  },
} satisfies NextAuthConfig;

export default authConfig;
