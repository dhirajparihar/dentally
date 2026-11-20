"use client";

import React from "react";
import { Users, Calendar, CreditCard, Bot, CheckCircle2 } from "lucide-react";

const corePillars = [
  {
    icon: Users,
    number: "01",
    title: "360° Patient Dossiers & Safety",
    tagline: "Instant Allergy Warnings & Chairside EHR",
    description:
      "See everything about the patient sitting in your chair in one view: emergency drug allergies (Penicillin, NSAIDs), previous treatments, and 1-tap clinical note phrases so you never type after surgery.",
    benefits: [
      "Flashing medical safety alerts for allergies & systemic conditions",
      "1-tap clinical phrase chips (e.g. RCT dressing, Crown cemented)",
      "Chronological visit logs & treated tooth numbers (FDI #46)",
      "Instant WhatsApp chat button to message patients directly",
    ],
  },
  {
    icon: Calendar,
    number: "02",
    title: "Smart Appointments & Recalls",
    tagline: "No Double Bookings & Fewer Missed Visits",
    description:
      "Manage your daily clinic calendar effortlessly. Check open slots in seconds, reschedule appointments with one tap, and eliminate patient no-shows with automated WhatsApp reminders.",
    benefits: [
      "Clear daily timeline of who is scheduled, completed, or missed",
      "Instant slot conflict checker preventing double-bookings",
      "1-click WhatsApp reminders with date, time, and clinic address",
      "Follow-up recall tracker for crown trials, healing reviews, and cleanings",
    ],
  },
  {
    icon: CreditCard,
    number: "03",
    title: "Fees & Zero Revenue Leakage",
    tagline: "Track Every Rupee & Stop Unpaid Dues",
    description:
      "Solo dentists lose thousands every month when patients promise to 'pay next visit'. Dentally highlights outstanding balances in bold red and gives you 1-click WhatsApp receipts.",
    benefits: [
      "Instant outstanding balance and advance credit tracker for every patient",
      "1-tap payment recording for UPI (GPay/PhonePe), Cash, and Card",
      "Itemized WhatsApp bills sent to the patient with a single click",
      "Daily closing breakdown showing UPI vs. Cash split",
    ],
  },
  {
    icon: Bot,
    number: "04",
    title: "Your 24/7 ChatGPT Receptionist",
    tagline: "Run Your Clinic by Just Asking",
    description:
      "Ask ChatGPT on your phone while driving or wearing gloves: 'Who are my appointments today?', 'Did Rahul pay?', or 'Add note: crown cemented'. It responds in seconds.",
    benefits: [
      "Morning clinic briefing: schedule count & expected collections",
      "Chairside lookups without touching a mouse or keyboard",
      "Evening summary: total revenue collected across UPI and Cash",
      "Works with voice speech-to-text built into ChatGPT mobile",
    ],
  },
];

export const FeaturesGrid: React.FC = () => {
  return (
    <section id="features" className="py-20 bg-white border-t border-[#E4E9F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-[11px] font-mono font-semibold tracking-[0.16em] text-[#00738E] uppercase bg-[#EDF7FA] px-3.5 py-1 rounded-full border border-[#D4EDF3]">
            Clinic Peace of Mind
          </span>
          <h2 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-bold text-[#111C3A] tracking-tight">
            Patients. Appointments. Fees.
          </h2>
          <p className="text-[#52627A] text-sm sm:text-base leading-relaxed">
            No bloated enterprise software with 50 unused features. Everything in Dentally is designed around the 3 things a dentist actually deals with every day.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
          {corePillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="bg-[#FAFBFC] border border-[#E4E9F0] rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-[#8DC9D7] hover:shadow-[0_8px_20px_-4px_rgba(0,137,168,0.1)] hover:-translate-y-0.5 transition-all"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#EDF7FA] border border-[#D4EDF3] flex items-center justify-center text-[#0089A8] shadow-xs">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-sans font-bold text-2xl text-[#8291A7]/50">
                      {p.number}
                    </span>
                  </div>

                  <h3 className="font-sans font-bold text-xl sm:text-2xl text-[#111C3A] mt-5">
                    {p.title}
                  </h3>
                  <span className="text-xs font-mono font-semibold text-[#0089A8] block mt-0.5">
                    {p.tagline}
                  </span>

                  <p className="text-xs sm:text-sm text-[#52627A] mt-3 leading-relaxed">
                    {p.description}
                  </p>

                  {/* Bullet Benefits */}
                  <div className="mt-6 pt-5 border-t border-[#E4E9F0] space-y-2.5">
                    {p.benefits.map((benefit, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2.5 text-xs text-[#111C3A]">
                        <CheckCircle2 className="w-4 h-4 text-[#0089A8] shrink-0 mt-0.5" />
                        <span className="leading-snug">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
