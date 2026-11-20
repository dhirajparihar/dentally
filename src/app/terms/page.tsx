"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Scale, CheckCircle2, AlertTriangle, FileText, ArrowLeft, Shield } from "lucide-react";

export default function TermsOfServicePage() {
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
              <Scale size={14} className="text-[#0089A8]" />
              <span>Platform Service Terms & Professional Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111C3A]">
              Terms of Service
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Last updated: {lastUpdated} &middot; Effective for all dentists and clinic staff
            </p>
          </div>

          {/* Core Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#EDF7FA] text-[#0089A8] flex items-center justify-center">
                <Shield size={16} />
              </div>
              <h3 className="text-xs font-bold text-[#111C3A]">Professional Practice Tool</h3>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Dentally is built solely for licensed dental professionals and practice managers.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#EDF7FA] text-[#0089A8] flex items-center justify-center">
                <AlertTriangle size={16} />
              </div>
              <h3 className="text-xs font-bold text-[#111C3A]">Clinical Discretion</h3>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                All treatment decisions, diagnoses, and prescriptions remain the sole responsibility of the attending dentist.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#EDF7FA] text-[#0089A8] flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
              <h3 className="text-xs font-bold text-[#111C3A]">Continuous Availability</h3>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                We maintain high-uptime cloud infrastructure with seamless local memory fallback capabilities.
              </p>
            </div>
          </div>

          {/* Terms Content Sections */}
          <div className="space-y-8 text-xs sm:text-sm text-[#52627A] leading-relaxed">
            
            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the Dentally application, dashboard, APIs, or Model Context Protocol (MCP) integrations, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the platform.
              </p>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">2. Nature of Service & Clinical Disclaimer</h2>
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                <strong>IMPORTANT CLINICAL NOTICE:</strong> Dentally is an administrative practice management software and clinical documentation tool. Dentally does NOT provide medical or dental advice, diagnostic services, or clinical treatment plans.
              </div>
              <p>
                The attending dental practitioner retains 100% independent professional clinical discretion for all patient diagnoses, drug prescriptions, anesthesia choices, procedural workflows, and treatment recommendations. Artificial intelligence assistants interacting with Dentally via MCP are documentation aids, not certified healthcare providers.
              </p>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">3. Account Registration & Multi-Tenancy</h2>
              <p>
                To use Dentally, you must authenticate through a verified Google account. You agree to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>Provide accurate, current clinic credentials (such as your dental council registration number and legal clinic name).</li>
                <li>Safeguard your authentication credentials and private MCP access URLs.</li>
                <li>Immediately notify us if you suspect any unauthorized access to your clinic account.</li>
              </ul>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">4. Practice Billing & UPI Payments</h2>
              <p>
                Dentally facilitates chairside fee logging, payment receipt generation, and WhatsApp billing reminders. Dentally does not act as a payment gateway and does not custody clinic funds; all UPI and bank settlements are conducted directly between your patient and your designated clinic accounts.
              </p>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">5. Permitted Use & Conduct</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>Attempt to reverse-engineer, decompile, or compromise the multi-tenant isolation mechanisms of the platform.</li>
                <li>Store fraudulent or intentionally deceptive health or billing records.</li>
                <li>Share your private MCP token publicly or embed it in untrusted clients.</li>
              </ul>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">6. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by applicable law, Dentally and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, resulting from your use of the platform or any patient dispute.
              </p>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">7. Modifications to the Service</h2>
              <p>
                We continuously refine and improve Dentally to better serve dental clinics. We reserve the right to modify or discontinue features with reasonable prior notice to active practitioners.
              </p>
            </section>

            <section className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4E9F0] shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-[#111C3A]">8. Contact & Legal Notices</h2>
              <p>
                For questions regarding these Terms or legal matters, please contact:
              </p>
              <p className="font-mono text-xs text-[#0089A8]">
                Email: legal@dentally.reline.me &middot; Practice Support: support@dentally.reline.me
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

