"use client";

import React from "react";
import { Users, Calendar, CreditCard, Bot, CheckCircle2, ShieldAlert, Sparkles, MessageSquare } from "lucide-react";

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
      "Clear daily timeline of who is waiting, in chair, or completed",
      "Instant slot checker so you know exactly when you have free time",
      "1-click WhatsApp reminders with date, time, and clinic address",
      "Follow-up recall tracker for crown seatings and suture removals",
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
      "Instant outstanding balance tracker for every patient",
      "1-tap payment recording for UPI (GPay/PhonePe), Cash, and Card",
      "Itemized WhatsApp bills sent to the patient with a single click",
      "Daily & monthly revenue summaries broken down by payment method",
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
    <section id="features" className="py-20 bg-white border-t border-[#E7E9E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-[11px] font-mono font-semibold tracking-[0.16em] text-[#2F8EAC] uppercase bg-[#E8F0F1] px-3.5 py-1 rounded-full border border-[#C7E7EC]">
            The 3 Pillars of Clinic Peace of Mind
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1E2D2B] tracking-tight">
            Patients. Appointments. Fees.
          </h2>
          <p className="text-[#586B67] text-sm sm:text-base leading-relaxed">
            No bloated enterprise software with 50 unused features. Everything in Dentally is designed around the 3 things a dentist actually deals with every day.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
          {corePillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="bg-[#FBF9F1] border border-[#E7E9E3] rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-[#2F8EAC]/60 transition-all shadow-card-subtle"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-[#E7E9E3] flex items-center justify-center text-[#2F8EAC] shadow-xs">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-serif font-bold text-2xl text-[#BDDBD1]">
                      {p.number}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#1E2D2B] mt-5">
                    {p.title}
                  </h3>
                  <span className="text-xs font-mono font-semibold text-[#2F8EAC] block mt-0.5">
                    {p.tagline}
                  </span>

                  <p className="text-xs sm:text-sm text-[#586B67] mt-3 leading-relaxed">
                    {p.description}
                  </p>

                  {/* Bullet Benefits */}
                  <div className="mt-6 pt-5 border-t border-[#E7E9E3] space-y-2.5">
                    {p.benefits.map((benefit, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2.5 text-xs text-[#1E2D2B]">
                        <CheckCircle2 className="w-4 h-4 text-[#2F8EAC] shrink-0 mt-0.5" />
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
