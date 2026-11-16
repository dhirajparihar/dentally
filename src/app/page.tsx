"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { LiveChatGPTSimulator } from "@/components/landing/LiveChatGPTSimulator";
import { McpWorkflowStep } from "@/components/landing/McpWorkflowStep";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { Footer } from "@/components/landing/Footer";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  MessageCircle,
  Share2,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F1]">
      <Navbar />

      <main className="flex-1">
        {/* ================= HERO SECTION ================= */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-18 lg:pb-24">
          <div className="absolute inset-0 bg-[radial-gradient(#E7E9E3_1px,transparent_1px)] [background-size:32px_32px] opacity-60 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-4xl mx-auto space-y-6">
              
              {/* Doctor-first Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#E7E9E3] text-[#1E2D2B] text-xs font-mono shadow-card-subtle">
                <span className="w-2 h-2 rounded-full bg-[#2F8EAC] animate-pulse" />
                <span className="font-bold text-[#1E2D2B]">The AI Clinic Co-Pilot for Solo Dentists</span>
                <span className="text-[#BDDBD1]">•</span>
                <span className="text-[#586B67] font-sans">Zero IT setup required</span>
              </div>

              {/* Master Headline */}
              <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#1E2D2B] leading-[1.12]">
                Run your dental clinic by <br />
                <span className="text-[#2F8EAC] italic font-normal">
                  just talking to ChatGPT.
                </span>
              </h1>

              {/* Subtext */}
              <p className="text-base sm:text-lg text-[#586B67] max-w-2xl mx-auto leading-relaxed">
                Your hands are on instruments all day. Check your appointments, view patient drug allergies,
                log treatment notes, and track who owes you money—simply by speaking or texting in ChatGPT.
                No software training. No typing notes at 9 PM.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#2F8EAC] text-white font-semibold text-sm sm:text-base hover:bg-[#24728A] transition-all shadow-xs flex items-center justify-center gap-2 group"
                >
                  Open Dentist Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/dashboard/mcp"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white text-[#1E2D2B] font-semibold text-sm sm:text-base border border-[#E7E9E3] hover:bg-[#E8F0F1] transition-all shadow-card-subtle flex items-center justify-center gap-2 font-mono text-xs"
                >
                  <Zap className="w-4 h-4 text-[#2F8EAC]" />
                  Get 1-Click Clinic Link
                </Link>
              </div>

              {/* Doctor Benefits Strip */}
              <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-mono text-[#586B67]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2F8EAC]" /> Zero Typing With Gloves On
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2F8EAC]" /> 1-Click WhatsApp Reminders
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2F8EAC]" /> Stop Losing Unpaid Patient Dues
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2F8EAC]" /> 30-Second Google Sign-In
                </span>
              </div>
            </div>

            {/* Interactive Live ChatGPT Showcase with the 4 Exact Scenarios */}
            <div id="demo" className="mt-14 max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <span className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#2F8EAC] bg-[#E8F0F1] px-3 py-1 rounded-full border border-[#C7E7EC]">
                  See It In Action
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E2D2B] mt-2">
                  What it sounds like chairside
                </h3>
                <p className="text-xs sm:text-sm text-[#586B67] mt-1">
                  Try asking ChatGPT these 4 common questions a dentist faces every day:
                </p>
              </div>
              <LiveChatGPTSimulator />
            </div>
          </div>
        </section>

        {/* ================= THE 3 DAILY NIGHTMARES SECTION ================= */}
        <section className="py-20 bg-white border-y border-[#E7E9E3]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-[11px] font-mono font-semibold tracking-[0.16em] text-[#2F8EAC] uppercase bg-[#E8F0F1] px-3.5 py-1 rounded-full border border-[#C7E7EC]">
                The Problem We Solve
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1E2D2B] tracking-tight">
                The 3 Headaches of a Solo Dentist. <br />
                <span className="text-[#2F8EAC] italic font-normal">And how Dentally eliminates them.</span>
              </h2>
              <p className="text-[#586B67] text-sm sm:text-base leading-relaxed">
                Dentists don&apos;t need complex software manuals. You need tools that respect your surgical gloves and save your clinic time and money.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Pain 1: Gloves-on Charting */}
              <div className="p-7 rounded-3xl bg-[#FBF9F1] border border-[#E7E9E3] space-y-4 hover:border-[#2F8EAC]/60 transition-all shadow-card-subtle">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F0F1] text-[#2F8EAC] flex items-center justify-center font-bold">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#1E2D2B]">
                  1. &ldquo;I hate typing notes with gloves on.&rdquo;
                </h3>
                <div className="space-y-2 text-xs text-[#586B67]">
                  <p className="line-through text-rose-500/80">
                    The Old Way: Delaying notes until 8 PM after an exhausting day, then forgetting canal lengths, anesthesia, or composite shades.
                  </p>
                  <p className="text-[#1E2D2B] font-medium pt-2 border-t border-[#E7E9E3]">
                    <strong>The Dentally Way:</strong> Speak to ChatGPT between visits: <em>&ldquo;Note for Rahul: Crown preparation done, shade A2 selected.&rdquo;</em> Saved in 3 seconds.
                  </p>
                </div>
              </div>

              {/* Pain 2: Unpaid Dues */}
              <div className="p-7 rounded-3xl bg-[#FBF9F1] border border-[#E7E9E3] space-y-4 hover:border-[#2F8EAC]/60 transition-all shadow-card-subtle">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F0F1] text-[#2F8EAC] flex items-center justify-center font-bold">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#1E2D2B]">
                  2. &ldquo;Patients walk out promising to pay later.&rdquo;
                </h3>
                <div className="space-y-2 text-xs text-[#586B67]">
                  <p className="line-through text-rose-500/80">
                    The Old Way: Patients leave with partial payments, paper slips get misplaced, and thousands in revenue quietly leak away every month.
                  </p>
                  <p className="text-[#1E2D2B] font-medium pt-2 border-t border-[#E7E9E3]">
                    <strong>The Dentally Way:</strong> Outstanding balances flash in bold red. One click sends an itemized WhatsApp receipt so patients pay via UPI immediately.
                  </p>
                </div>
              </div>

              {/* Pain 3: Empty Chairs */}
              <div className="p-7 rounded-3xl bg-[#FBF9F1] border border-[#E7E9E3] space-y-4 hover:border-[#2F8EAC]/60 transition-all shadow-card-subtle">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F0F1] text-[#2F8EAC] flex items-center justify-center font-bold">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#1E2D2B]">
                  3. &ldquo;Patients forget visits and chairs sit empty.&rdquo;
                </h3>
                <div className="space-y-2 text-xs text-[#586B67]">
                  <p className="line-through text-rose-500/80">
                    The Old Way: Your assistant spends 2 hours every morning making awkward phone calls that go to voicemail.
                  </p>
                  <p className="text-[#1E2D2B] font-medium pt-2 border-t border-[#E7E9E3]">
                    <strong>The Dentally Way:</strong> 1-click WhatsApp reminders sent straight to the patient&apos;s phone with appointment time and clinic address.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 30-Second Setup */}
        <McpWorkflowStep />

        {/* Structured 3 Pillars Grid */}
        <FeaturesGrid />
      </main>

      <Footer />
    </div>
  );
}
