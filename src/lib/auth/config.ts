import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import type { Role } from "@/generated/prisma";
import { db } from "@/lib/db";

import { verifyPassword } from "./password";

declare module "next-auth" {
  interface User {
    role: Role;
    /** False until the person has confirmed they are 18 or over. */
    ageConfirmed: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      /** Null until the person has confirmed they are 18 or over. */
      ageConfirmed: boolean;
    };
  }
}

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });

        // Always do the work, even with no user. Returning early on an unknown address
        // would let someone time the response to find out who has an account here — and an
        // account here can imply a diagnosis.
        const hash = user?.passwordHash ?? "$argon2id$v=19$m=19456,t=2,p=1$aaaaaaaaaaaaaaaa$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const ok = await verifyPassword(hash, password);

        if (!user || !ok || user.deletedAt) return null;

        return {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          role: user.role,
          ageConfirmed: user.ageConfirmedAt !== null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.ageConfirmed = user.ageConfirmed;
      }

      // Re-read on an explicit update so a role change or an age confirmation takes effect
      // without making the person sign in again.
      if (trigger === "update" && token.id) {
        const fresh = await db.user.findUnique({ where: { id: token.id as string } });
        if (!fresh || fresh.deletedAt) return null;
        token.role = fresh.role;
        token.ageConfirmed = fresh.ageConfirmedAt !== null;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user = {
          ...session.user,
          id: token.id as string,
          email: token.email as string,
          role: token.role as Role,
          ageConfirmed: Boolean(token.ageConfirmed),
        };
      }
      return session;
    },
  },
};
