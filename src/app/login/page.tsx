"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  ShieldCheck,
  Lock,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { clinicProfile } from "@/lib/mockData";

function LoginFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const isSuperAdmin =
        (session.user as any)?.role === "superadmin" ||
        Boolean((session.user as any)?.isSuperAdmin);
      router.replace(isSuperAdmin ? "/admin" : callbackUrl);
    }
  }, [status, session, router, callbackUrl]);

  const handleGoogleSignIn = async () => {
    setLoading("google");
    await signIn("google", { callbackUrl });
  };

  return (
    <div className="max-w-md w-full mx-auto my-8">
      <div className="bg-white rounded-3xl p-7 sm:p-9 border border-[#DCE2DE] shadow-[0_4px_20px_-4px_rgba(30,45,43,0.08)] space-y-6">
        
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto overflow-hidden shrink-0">
            <Image
              src="/logo.png"
              alt="Dentally Logo"
              width={56}
              height={56}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <h1 className="font-bold text-2xl text-[#1E2D2B] tracking-tight">
            Dentist Portal Sign In
          </h1>
          <p className="text-xs text-[#3D5450]">
            {clinicProfile.name} • Private Solo Practice Operatory OS
          </p>
        </div>

        {/* Access Warning / Error Banner */}
        {errorParam && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Access Restricted</strong>
              <span>
                {errorParam === "AccessDenied"
                  ? "Your Google account is not on the authorized dentist whitelist for this clinic."
                  : "An authentication error occurred. Please try again."}
              </span>
            </div>
          </div>
        )}

        {/* Login Action: Google Sign-in */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading !== null}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-[#F8FAF9] text-[#1E2D2B] border border-[#DCE2DE] font-semibold text-sm flex items-center justify-center gap-3 transition-all shadow-sm hover:border-[#2F8EAC] disabled:opacity-50 group"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-medium text-sm">
              {loading === "google" ? "Connecting to Google..." : "Continue with Google"}
            </span>
          </button>
        </div>

        {/* Security Features Info Box */}
        <div className="pt-4 border-t border-[#DCE2DE] space-y-2 text-xs font-mono text-[#3D5450]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2F8EAC] shrink-0" />
            <span>Google 2-Factor Authentication (2FA)</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#2F8EAC] shrink-0" />
            <span>JWE Encrypted HTTP-Only Sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2F8EAC] shrink-0" />
            <span>Isolated Multi-Tenant Clinic Database</span>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <p className="text-center text-[11px] text-[#3D5450] mt-4 font-mono">
        Authorized dentists only • Dentally Clinic Platform
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <Suspense
        fallback={
          <div className="max-w-md w-full mx-auto p-8 bg-white rounded-3xl border border-[#DCE2DE] text-center text-xs text-[#3D5450] animate-pulse">
            Loading secure authentication...
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
