"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ShieldCheck, Lock, EyeOff, Server, FileText, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function PrivacyPolicyPage() {
  const lastUpdated = "November 20, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFC] text-[#111C3A]">
      <Navbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Breadcrumb / Back Link */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0089A8] hover:text-[#00738E] transition-colors"
            >
              <ArrowLeft size={14} /> Back to Home
            </Link>
          </div>

          {/* Header */}
          <div className="space-y-3 border-b border-[#E4E9F0] pb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EDF7FA] text-[#00738E] border border-[#D4EDF3] text-xs font-mono font-semibold">
              <ShieldCheck size={14} className="text-[#0089A8]" />
              <span>Patient Confidentiality & Data Security</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111C3A]">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Last updated: {lastUpdated} &middot; Effective immediately for all Dentally users
            </p>
          </div>

          {/* Policy Overview Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#EDF7FA] text-[#0089A8] flex items-center justify-center">
                <Lock size={16} />
              </div>
              <h3 className="text-xs font-bold text-[#111C3A]">Encrypted at Rest & Transit</h3>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                All records, medical alerts, and payment transactions are encrypted using AES-256 and TLS 1.3.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#EDF7FA] text-[#0089A8] flex items-center justify-center">
                <EyeOff size={16} />
              </div>
              <h3 className="text-xs font-bold text-[#111C3A]">Zero AI Model Training</h3>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Your clinic notes, clinical procedures, and patient dossiers are never used to train public LLM models.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#EDF7FA] text-[#0089A8] flex items-center justify-center">
                <Server size={16} />
              </div>
              <h3 className="text-xs font-bold text-[#111C3A]">Doctor-Owned Data</h3>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                You retain complete ownership and full control over your clinic data, with 1-click export and deletion.
              </p>
            </div>
          </div>

          {/* Policy Content Sections */}
          <div className="space-y-8 text-xs sm:text-sm text-[#52627A] leading-relaxed">
            
            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">1. Overview & Scope</h2>
              <p>
                Dentally (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) provides an AI-native clinic operating system and practice management platform tailored specifically for licensed dental practitioners and private dental clinics.
              </p>
              <p>
                This Privacy Policy explains how we collect, use, safeguard, and disclose confidential dental practice data when you use the Dentally platform, including our web dashboard, clinic APIs, and Model Context Protocol (MCP) server endpoints.
              </p>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">2. Information We Collect</h2>
              <p>We process information strictly necessary to operate your clinic practice management software:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li><strong>Practitioner Account Data:</strong> Name, professional qualifications, dental registration number, clinic address, official contact number, Google account email, and UPI ID for payments.</li>
                <li><strong>Patient Demographic & Clinical Records:</strong> Patient name, contact details, age, gender, emergency medical alerts (such as drug allergies or medical conditions), appointment logs, and clinical procedure notes.</li>
                <li><strong>Financial & Fee Records:</strong> Itemized procedure billing amounts, discounts, payment transactions (UPI, Cash, Card), timestamps, receipt numbers, and outstanding/advance balances.</li>
                <li><strong>MCP Access Logs:</strong> Ephemeral tool call counts, latency metrics, and execution statuses for the AI assistant integrations.</li>
              </ul>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">3. How Your Data Is Used</h2>
              <p>We use the collected information solely for legitimate clinical administration:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>Facilitating seamless appointment scheduling, chairside consultation reviews, and follow-up recall tracking.</li>
                <li>Generating patient invoices, recording settlements, and providing accurate daily/monthly financial closings.</li>
                <li>Enabling authorized Model Context Protocol (MCP) tool executions when you query your clinic data via ChatGPT or Claude.</li>
                <li>Preventing slot conflicts, double bookings, and unauthorized multi-tenant data access.</li>
              </ul>
              <div className="p-3.5 rounded-2xl bg-[#EDF7FA] border border-[#D4EDF3] text-xs text-[#00738E] font-medium flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-[#0089A8]" />
                <span>We never sell, rent, monetize, or trade patient records or doctor financial ledgers to third-party advertisers or data brokers.</span>
              </div>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">4. AI Integrations & MCP Security</h2>
              <p>
                When you connect Dentally to AI clients (such as ChatGPT or Claude) via our MCP endpoint, tool requests are authenticated using your private HMAC-signed token.
              </p>
              <p>
                Only the data specifically requested by your voice or text prompts (e.g., today&apos;s appointments or a patient balance) is transmitted. Furthermore, data processed via our MCP protocol is handled under enterprise zero-data-retention standards and is never used to train public foundation models.
              </p>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">5. Data Security & Storage</h2>
              <p>
                We implement robust technical and organizational security controls to safeguard sensitive health and financial data:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>Database multi-tenancy isolation strictly scoped to each doctor&apos;s authenticated email address.</li>
                <li>Industry-standard TLS 1.3 encryption for all data in transit across browser and API requests.</li>
                <li>Masked MCP security tokens in administrative interfaces to prevent shoulder-surfing and operatory exposure.</li>
                <li>Automated backups and isolated database clusters with strict network firewalls.</li>
              </ul>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">6. Doctor Rights & Data Retention</h2>
              <p>
                As a participating dentist, you maintain complete custody of your practice records. You may at any time:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>Access, modify, or correct patient profiles, fee entries, and clinic settings directly via the dashboard.</li>
                <li>Request a complete export or permanent purge of your clinic tenant records by contacting support or using the administrative tools.</li>
                <li>Revoke your MCP authorization keys instantly with a single click.</li>
              </ul>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">7. Contact & Inquiries</h2>
              <p>
                If you have any questions or data privacy concerns regarding Dentally, please reach out to our privacy team:
              </p>
              <p className="font-mono text-xs text-[#0089A8]">
                Email: privacy@dentally.reline.me &middot; Support: support@dentally.reline.me
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

