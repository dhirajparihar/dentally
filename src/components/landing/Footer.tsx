"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Heart, Bot } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#121D1B] text-white border-t border-[#243532] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#243532]">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2F8EAC] flex items-center justify-center text-white shadow-xs">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <path d="M7 4C5 4 4 6 4 9C4 13 6 17 8 20C9 21.5 10 21.5 10.5 20C11 18.5 11.5 16 12 16C12.5 16 13 18.5 13.5 20C14 21.5 15 21.5 16 20C18 17 20 13 20 9C20 6 19 4 17 4C14.5 4 13.5 6 12 6C10.5 6 9.5 4 7 4Z" />
                </svg>
              </div>
              <span className="font-serif font-bold text-2xl tracking-tight text-white">
                Dentally<span className="text-[#BDDBD1]">.</span>
              </span>
            </div>
            <p className="text-sm text-[#A7BCB7] max-w-sm leading-relaxed">
              The AI clinic assistant for private dental practices. Manage patients, appointments,
              and fee collections in effortless natural language without typing notes at 8 PM.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-[#7E9691] font-mono">
              <ShieldCheck className="w-4 h-4 text-[#BDDBD1]" /> Private Clinic Data • 1-Click Google Sign-In
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#BDDBD1] mb-4">
              Practice Management
            </h4>
            <ul className="space-y-2.5 text-sm text-[#A7BCB7]">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Daily Assistant
                </Link>
              </li>
              <li>
                <Link href="/dashboard/patients" className="hover:text-white transition-colors">
                  Patient EHR & 360° Dossiers
                </Link>
              </li>
              <li>
                <Link href="/dashboard/appointments" className="hover:text-white transition-colors">
                  Appointment Calendar
                </Link>
              </li>
              <li>
                <Link href="/dashboard/fees" className="hover:text-white transition-colors">
                  Fees & WhatsApp Billing
                </Link>
              </li>
            </ul>
          </div>

          {/* ChatGPT Assistant Integration */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#BDDBD1] mb-4">
              AI & ChatGPT
            </h4>
            <ul className="space-y-2.5 text-sm text-[#A7BCB7] text-xs">
              <li>
                <Link href="/dashboard/mcp" className="hover:text-white transition-colors">
                  1-Click Clinic Connection Link
                </Link>
              </li>
              <li>
                <span className="text-[#7E9691]">Auth: Clinic Gmail Account</span>
              </li>
              <li>
                <span className="text-[#7E9691]">Supports Voice Dictation</span>
              </li>
              <li>
                <span className="text-[#7E9691]">Works on Mobile & Desktop</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#7E9691] gap-4">
          <p>© {new Date().getFullYear()} Dentally. Built for private dental practices.</p>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Dentist Login
            </Link>
            <Link href="/dashboard/mcp" className="text-[#C7E7EC] hover:underline">
              Connect to ChatGPT
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

