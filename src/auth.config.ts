import type { NextAuthConfig } from "next-auth";

const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [],
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ auth, request }) => request.nextUrl.pathname.startsWith("/admin") ? Boolean(auth) : true,
  },
} satisfies NextAuthConfig;

export default authConfig;
