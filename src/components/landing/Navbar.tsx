"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { ArrowRight, Menu, X, Cpu } from "lucide-react";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 bg-[#FAFBFC]/90 backdrop-blur-md border-b border-[#E4E9F0]" onKeyDown={(event) => {
      if (event.key !== "Escape" || !mobileMenuOpen) return;
      setMobileMenuOpen(false);
      event.currentTarget.querySelector<HTMLButtonElement>("[aria-controls='landing-mobile-navigation']")?.focus();
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo with Brand Teal Dot */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="Dentally Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex items-baseline">
              <span className="font-bold text-2xl tracking-tight text-[#111C3A] font-sans">
                Dentally
              </span>
              <span className="w-2 h-2 rounded-full bg-[#0089A8] ml-1" />
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#52627A]">
            <Link href="/dashboard/patients" className="hover:text-[#0089A8] transition-colors">
              Patients
            </Link>
            <Link href="/dashboard/appointments" className="hover:text-[#0089A8] transition-colors">
              Appointments
            </Link>
            <Link href="/dashboard/fees" className="hover:text-[#0089A8] transition-colors">
              Fees & Collections
            </Link>
            <Link href="/dashboard/mcp" className="hover:text-[#0089A8] transition-colors">
              ChatGPT MCP Hub
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/dashboard/mcp"
              className="px-3 py-1.5 text-xs font-mono font-medium rounded-xl text-[#00738E] bg-[#EDF7FA] border border-[#D4EDF3] hover:bg-[#DDF1F6] transition-all flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5 text-[#0089A8]" />
              /api/mcp
            </Link>
            {session ? (
              <Link
                href={
                  (session.user as any)?.role === "superadmin" ||
                  Boolean((session.user as any)?.isSuperAdmin)
                    ? "/admin"
                    : "/dashboard"
                }
                className="px-4.5 py-2 text-sm font-semibold rounded-xl text-white bg-[#0089A8] hover:bg-[#00738E] transition-all shadow-xs flex items-center gap-2 group"
              >
                <span>
                  {(session.user as any)?.role === "superadmin" ||
                  Boolean((session.user as any)?.isSuperAdmin)
                    ? "Admin Console"
                    : "Clinic Dashboard"}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4.5 py-2 text-sm font-semibold rounded-xl text-white bg-[#0089A8] hover:bg-[#00738E] transition-all shadow-xs flex items-center gap-2 group"
              >
                <span>Dentist Sign In</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-navigation"
              className="size-11 grid place-items-center rounded-xl text-[#52627A] hover:text-[#111C3A] hover:bg-[#EDF7FA] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <nav id="landing-mobile-navigation" aria-label="Main navigation" className="md:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-y-contain bg-white border-b border-[#E4E9F0] px-4 pt-2 pb-6 space-y-3 shadow-lg">
          <Link
            href="/dashboard/patients"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-[#111C3A] hover:text-[#0089A8]"
          >
            Patients & EHR
          </Link>
          <Link
            href="/dashboard/appointments"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-[#111C3A] hover:text-[#0089A8]"
          >
            Appointments & Schedule
          </Link>
          <Link
            href="/dashboard/fees"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-[#111C3A] hover:text-[#0089A8]"
          >
            Fees & Collections
          </Link>
          <Link
            href="/dashboard/mcp"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-[#111C3A] hover:text-[#0089A8]"
          >
            ChatGPT MCP Hub
          </Link>
          <div className="pt-3 border-t border-[#E4E9F0] flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="w-full text-center block py-2.5 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-sm shadow-xs transition-colors"
            >
              Open Clinic Dashboard
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
};
