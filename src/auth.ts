import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import authConfig from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  // Admin sessions time out after 30 minutes of inactivity. updateAge re-signs
  // the JWT (at most once a minute) whenever an authenticated request comes in,
  // so real activity keeps it alive; the admin shell also runs a client-side
  // idle watch that drops back to the public board on an untouched tab.
  session: { strategy: "jwt", maxAge: 30 * 60, updateAge: 60 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === "string" ? credentials.email.toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;
        const user = await db.query.appUser.findFirst({ where: eq(appUser.email, email) });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
        return { id: String(user.id), email: user.email, name: user.displayName };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt: ({ token, user }) => {
      if (user) token.displayName = user.name;
      return token;
    },
    session: ({ session, token }) => {
      if (session.user && token.displayName) session.user.name = String(token.displayName);
      return session;
    },
  },
});
