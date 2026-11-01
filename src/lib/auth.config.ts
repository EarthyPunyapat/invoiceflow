import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe configuration: middleware must never import Prisma's Node runtime.
export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth }) { return !!auth?.user; },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
