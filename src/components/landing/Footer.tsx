"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, ArrowRight } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0B132B] text-white border-t border-slate-800 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                <Image
                  src="/logo.png"
                  alt="Dentally Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-2xl tracking-tight text-white font-sans">
                Dentally<span className="text-[#0089A8]">.</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              The AI clinic operating system for private dental practices. Manage patients, appointments,
              and fee collections in natural language without typing notes after exhausting surgeries.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-slate-400 font-mono">
              <ShieldCheck className="w-4 h-4 text-[#0089A8]" />
              <span>Multi-Tenant Isolation &middot; 1-Click Google Sign-In</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#0089A8] mb-4">
              Practice Management
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Clinic Overview
                </Link>
              </li>
              <li>
                <Link href="/dashboard/patients" className="hover:text-white transition-colors">
                  Patients & EHR Dossiers
                </Link>
              </li>
              <li>
                <Link href="/dashboard/appointments" className="hover:text-white transition-colors">
                  Appointment Calendar
                </Link>
              </li>
              <li>
                <Link href="/dashboard/fees" className="hover:text-white transition-colors">
                  Fees & WhatsApp Collections
                </Link>
              </li>
            </ul>
          </div>

          {/* ChatGPT Assistant Integration & Legal */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#0089A8] mb-4">
              AI & Governance
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/dashboard/mcp" className="hover:text-white transition-colors">
                  ChatGPT MCP Hub
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Dentist Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} Dentally. Dedicated to Patients, Appointments, and Collections.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/dashboard" className="text-[#0089A8] hover:text-[#BEE3E9] font-medium transition-colors">
              Open Dashboard &rarr;
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
