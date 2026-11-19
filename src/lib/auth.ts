import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "@/lib/db/connect";
import { ClinicProfileModel } from "@/lib/db/models/ClinicProfile";

const allowedEmails = (process.env.ALLOWED_DENTIST_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const adminEmails = (process.env.ADMIN_EMAILS || "")
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
      const normalizedEmail = user.email.toLowerCase();

      // Superadmins always have access
      const isSuperAdmin = adminEmails.includes(normalizedEmail);
      if (isSuperAdmin) return true;

      // If allowed emails whitelist is specified, verify the email
      if (allowedEmails.length > 0) {
        const isAllowed = allowedEmails.includes(normalizedEmail);
        if (!isAllowed) {
          console.warn(`[Auth] Blocked unauthorized login attempt from: ${user.email}`);
          return false;
        }
      }

      // Check if this clinic account has been suspended by platform admin
      try {
        await connectDB();
        const profile = await ClinicProfileModel.findOne({ dentistEmail: normalizedEmail }).lean();
        if (profile && (profile.status === "suspended" || profile.isActive === false)) {
          console.warn(`[Auth] Blocked suspended clinic login attempt: ${user.email}`);
          return false;
        }

        // Update last active timestamp
        if (profile) {
          await ClinicProfileModel.updateOne(
            { dentistEmail: normalizedEmail },
            { $set: { lastActiveAt: new Date() } }
          );
        }
      } catch (err) {
        console.warn("[Auth] Failed to check clinic profile status:", err);
      }

      return true;
    },
    async jwt({ token, user }) {
      const email = (user?.email || token?.email || "").toLowerCase();
      const isSuperAdmin = adminEmails.includes(email);

      if (user) {
        token.id = user.id;
      }
      token.role = isSuperAdmin ? "superadmin" : ((token.role as string) || "dentist");
      token.isSuperAdmin = isSuperAdmin;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = token.role || "dentist";
        (session.user as any).isSuperAdmin = Boolean(token.isSuperAdmin);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
