"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Menu, X, Cpu, Users, Calendar, CreditCard } from "lucide-react";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo with Bio-Mint Neural Dot */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#2F8EAC] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2">
                <path d="M7 4C5 4 4 6 4 9C4 13 6 17 8 20C9 21.5 10 21.5 10.5 20C11 18.5 11.5 16 12 16C12.5 16 13 18.5 13.5 20C14 21.5 15 21.5 16 20C18 17 20 13 20 9C20 6 19 4 17 4C14.5 4 13.5 6 12 6C10.5 6 9.5 4 7 4Z" />
              </svg>
            </div>
            <div className="flex items-baseline">
              <span className="font-serif font-bold text-2xl tracking-tight text-[#1E2D2B]">
                Dentally
              </span>
              <span className="w-2 h-2 rounded-full bg-[#BDDBD1] ml-1" />
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#586B67]">
            <Link href="/dashboard/patients" className="hover:text-[#1E2D2B] transition-colors">
              Patients
            </Link>
            <Link href="/dashboard/appointments" className="hover:text-[#1E2D2B] transition-colors">
              Appointments
            </Link>
            <Link href="/dashboard/fees" className="hover:text-[#1E2D2B] transition-colors">
              Fees & History
            </Link>
            <Link href="/dashboard/mcp" className="hover:text-[#1E2D2B] transition-colors">
              ChatGPT MCP Hub
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/dashboard/mcp"
              className="px-3.5 py-2 text-xs font-mono font-medium rounded-xl text-[#2F8EAC] bg-[#E8F0F1] border border-[#C7E7EC] hover:bg-[#BDDBD1]/30 transition-all flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5 text-[#2F8EAC]" />
              /api/mcp
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-[#2F8EAC] hover:bg-[#24728A] transition-all shadow-xs flex items-center gap-2 group"
            >
              Dentist Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FBF9F1] border-b border-[#E7E9E3] px-4 pt-2 pb-6 space-y-3">
          <Link
            href="/dashboard/patients"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-[#1E2D2B]"
          >
            Patients & EHR
          </Link>
          <Link
            href="/dashboard/appointments"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-[#1E2D2B]"
          >
            Appointments & Calendar
          </Link>
          <Link
            href="/dashboard/fees"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-[#1E2D2B]"
          >
            Fees & Collections
          </Link>
          <Link
            href="/dashboard/mcp"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-[#1E2D2B]"
          >
            ChatGPT MCP Hub
          </Link>
          <div className="pt-2 border-t border-[#E7E9E3]">
            <Link
              href="/dashboard"
              className="w-full text-center block py-3 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white font-semibold text-sm shadow-xs"
            >
              Open Dentist Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
