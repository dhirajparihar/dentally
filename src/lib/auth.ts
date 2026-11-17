import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowedEmails = (process.env.ALLOWED_DENTIST_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "dentally-secret-key-change-in-production-2026",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // If allowed emails whitelist is specified, verify the email
      if (allowedEmails.length > 0) {
        const isAllowed = allowedEmails.includes(user.email.toLowerCase());
        if (!isAllowed) {
          console.warn(`[Auth] Blocked unauthorized login attempt from: ${user.email}`);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "dentist";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = token.role || "dentist";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
