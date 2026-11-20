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
  Zap,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFC] text-[#111C3A]">
      <Navbar />

      <main className="flex-1">
        {/* ================= HERO SECTION ================= */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#E4E9F0_1px,transparent_1px)] [background-size:28px_28px] opacity-70 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-4xl mx-auto space-y-6">
              
              {/* Doctor-first Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#E4E9F0] text-[#111C3A] text-xs font-mono shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#0089A8] animate-pulse" />
                <span className="font-bold text-[#111C3A]">The AI Clinic Operating System for Solo Dentists</span>
                <span className="text-[#8291A7]">•</span>
                <span className="text-[#52627A] font-sans">Zero IT setup required</span>
              </div>

              {/* Master Headline */}
              <h1 className="font-sans text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#111C3A] leading-[1.12]">
                Run your dental clinic by <br />
                <span className="text-[#0089A8]">
                  just talking to ChatGPT.
                </span>
              </h1>

              {/* Subtext */}
              <p className="text-base sm:text-lg text-[#52627A] max-w-2xl mx-auto leading-relaxed font-normal">
                Your hands are on instruments all day. Check your appointments, view patient drug allergies,
                log treatment notes, and track who owes you money—simply by speaking or texting in ChatGPT.
                No software training. No typing notes at 9 PM.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#0089A8] text-white font-semibold text-sm sm:text-base hover:bg-[#00738E] transition-all shadow-xs flex items-center justify-center gap-2 group"
                >
                  <span>Open Clinic Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/dashboard/mcp"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white text-[#111C3A] font-semibold text-sm sm:text-base border border-[#E4E9F0] hover:bg-[#EDF7FA] hover:text-[#0089A8] transition-all shadow-xs flex items-center justify-center gap-2 font-mono text-xs"
                >
                  <Zap className="w-4 h-4 text-[#0089A8]" />
                  <span>Get 1-Click Clinic Link</span>
                </Link>
              </div>

              {/* Doctor Benefits Strip */}
              <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-mono text-[#52627A]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0089A8]" /> Zero Typing With Gloves On
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0089A8]" /> 1-Click WhatsApp Reminders
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0089A8]" /> Stop Losing Unpaid Patient Dues
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0089A8]" /> 30-Second Google Sign-In
                </span>
              </div>
            </div>

            {/* Interactive Live ChatGPT Showcase */}
            <div id="demo" className="mt-14 max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <span className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#00738E] bg-[#EDF7FA] px-3 py-1 rounded-full border border-[#D4EDF3]">
                  See It In Action
                </span>
                <h3 className="font-sans text-2xl sm:text-3xl font-bold text-[#111C3A] mt-2">
                  What it sounds like chairside
                </h3>
                <p className="text-xs sm:text-sm text-[#52627A] mt-1">
                  Try asking ChatGPT these 4 common questions a dentist faces every day:
                </p>
              </div>
              <LiveChatGPTSimulator />
            </div>
          </div>
        </section>

        {/* ================= THE 3 DAILY NIGHTMARES SECTION ================= */}
        <section className="py-20 bg-white border-y border-[#E4E9F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-[11px] font-mono font-semibold tracking-[0.16em] text-[#00738E] uppercase bg-[#EDF7FA] px-3.5 py-1 rounded-full border border-[#D4EDF3]">
                The Problem We Solve
              </span>
              <h2 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-bold text-[#111C3A] tracking-tight">
                The 3 Headaches of a Solo Dentist. <br />
                <span className="text-[#0089A8]">And how Dentally eliminates them.</span>
              </h2>
              <p className="text-[#52627A] text-sm sm:text-base leading-relaxed">
                Dentists don&apos;t need complex software manuals. You need tools that respect your surgical gloves and save your clinic time and money.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Pain 1: Gloves-on Charting */}
              <div className="p-7 rounded-3xl bg-[#FAFBFC] border border-[#E4E9F0] space-y-4 hover:border-[#8DC9D7] hover:shadow-[0_8px_20px_-4px_rgba(0,137,168,0.1)] transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#EDF7FA] text-[#0089A8] border border-[#D4EDF3] flex items-center justify-center font-bold">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-xl text-[#111C3A]">
                  1. &ldquo;I hate typing notes with gloves on.&rdquo;
                </h3>
                <div className="space-y-2 text-xs text-[#52627A]">
                  <p className="line-through text-rose-500/80">
                    The Old Way: Delaying notes until 8 PM after an exhausting day, then forgetting canal lengths, anesthesia, or composite shades.
                  </p>
                  <p className="text-[#111C3A] font-medium pt-2 border-t border-[#E4E9F0]">
                    <strong>The Dentally Way:</strong> Speak to ChatGPT between visits: <em>&ldquo;Note for Rahul: Crown preparation done, shade A2 selected.&rdquo;</em> Saved in 3 seconds.
                  </p>
                </div>
              </div>

              {/* Pain 2: Unpaid Dues */}
              <div className="p-7 rounded-3xl bg-[#FAFBFC] border border-[#E4E9F0] space-y-4 hover:border-[#8DC9D7] hover:shadow-[0_8px_20px_-4px_rgba(0,137,168,0.1)] transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#EDF7FA] text-[#0089A8] border border-[#D4EDF3] flex items-center justify-center font-bold">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-xl text-[#111C3A]">
                  2. &ldquo;Patients walk out promising to pay later.&rdquo;
                </h3>
                <div className="space-y-2 text-xs text-[#52627A]">
                  <p className="line-through text-rose-500/80">
                    The Old Way: Patients leave with partial payments, paper slips get misplaced, and thousands in revenue quietly leak away every month.
                  </p>
                  <p className="text-[#111C3A] font-medium pt-2 border-t border-[#E4E9F0]">
                    <strong>The Dentally Way:</strong> Outstanding balances flash in bold red. One click sends an itemized WhatsApp receipt so patients pay via UPI immediately.
                  </p>
                </div>
              </div>

              {/* Pain 3: Empty Chairs */}
              <div className="p-7 rounded-3xl bg-[#FAFBFC] border border-[#E4E9F0] space-y-4 hover:border-[#8DC9D7] hover:shadow-[0_8px_20px_-4px_rgba(0,137,168,0.1)] transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#EDF7FA] text-[#0089A8] border border-[#D4EDF3] flex items-center justify-center font-bold">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-xl text-[#111C3A]">
                  3. &ldquo;Patients forget visits and chairs sit empty.&rdquo;
                </h3>
                <div className="space-y-2 text-xs text-[#52627A]">
                  <p className="line-through text-rose-500/80">
                    The Old Way: Your assistant spends 2 hours every morning making awkward phone calls that go to voicemail.
                  </p>
                  <p className="text-[#111C3A] font-medium pt-2 border-t border-[#E4E9F0]">
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
