import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { clinicProfile } from "@/lib/mockData";

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
    // 1. Google OAuth Provider (Active whenever credentials are provided)
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

    // 2. Dentist Quick Demo Access (Allows seamless development & clinic demo login)
    CredentialsProvider({
      id: "dentist-demo",
      name: "Dentist Chairside Access",
      credentials: {
        email: { label: "Email", type: "email", placeholder: clinicProfile.email },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Allows Dr. Ananya or demo login
        return {
          id: "usr_dentist_01",
          name: clinicProfile.dentistName,
          email: credentials?.email || clinicProfile.email,
          image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256&h=256",
          role: "dentist",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
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
        (session.user as any).id = token.id as string;
        (session.user as any).role = (token.role as string) || "dentist";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

