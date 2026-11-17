"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Share2,
  User,
  ArrowRight,
  IndianRupee,
  Plus,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";

export default function DashboardOverviewPage() {
  const {
    patients,
    appointments,
    fees,
    payments,
    clinicProfile,
    loading,
    loadSampleData,
    completeAppointment,
  } = useClinic();
  const router = useRouter();

  const todayStr = new Date().toISOString().split("T")[0];

  const todayList = appointments.filter((a) => a.date === todayStr);
  const todayPayments = payments.filter((p) => p.date === todayStr && !p.isRefund);
  const totalDailyCollection = todayPayments.reduce((s, p) => s + p.amount, 0);

  // Payment method breakdown
  const upiToday = todayPayments.filter((p) => p.paymentMethod === "UPI").reduce((s, p) => s + p.amount, 0);
  const cashToday = todayPayments.filter((p) => p.paymentMethod === "Cash").reduce((s, p) => s + p.amount, 0);

  // Patients with pending fees
  const patientsWithPending = patients
    .map((p) => {
      const pFees = fees.filter((f) => f.patientId === p._id);
      const paid = payments.filter((pay) => pay.patientId === p._id && !pay.isRefund).reduce((s, pay) => s + pay.amount, 0);
      const billed = pFees.reduce((s, f) => s + f.netAmount, 0);
      return { ...p, balance: Math.max(0, billed - paid) };
    })
    .filter((p) => p.balance > 0);

  // Patients due for follow up
  const dueForFollowUp = patients.filter((p) => p.followUpDue);


  const openPatientById = (patientId: string) => {
    const found = patients.find((p) => p._id === patientId);
    if (found) router.push(`/dashboard/patients/${encodeURIComponent(found._id)}`);
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-28 bg-white rounded-2xl border border-[#DCE2DE] p-6 flex flex-col justify-center space-y-3">
          <div className="h-6 w-56 bg-slate-200 rounded-lg" />
          <div className="h-4 w-96 bg-slate-100 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-[#DCE2DE] p-5 space-y-3">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-8 w-16 bg-slate-300 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-72 bg-white rounded-2xl border border-[#DCE2DE]" />
          <div className="h-72 bg-white rounded-2xl border border-[#DCE2DE]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2F8EAC] animate-pulse" />
            <h2 className="font-bold text-2xl sm:text-3xl text-[#1E2D2B] tracking-tight">
              Dentist Daily Assistant
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#3D5450] mt-1.5 leading-relaxed">
            Welcome back, <strong className="text-[#1E2D2B]">{clinicProfile.dentistName}</strong>.
            Chairside operatory, 360° EHR dossiers, and ChatGPT MCP server online.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Link
            href="/dashboard/appointments"
            className="px-4 py-2.5 rounded-xl bg-[#2F8EAC] text-white text-xs sm:text-sm font-semibold hover:bg-[#24728A] transition-all shadow-sm flex items-center gap-2 border border-[#24728A]"
          >
            <Calendar className="w-4 h-4 text-[#C7E7EC]" />
            <span>Book Appointment</span>
          </Link>
          <Link
            href="/dashboard/fees"
            className="px-4 py-2.5 rounded-xl bg-[#F0F7F5] hover:bg-[#BDDBD1]/50 text-[#1E2D2B] text-xs sm:text-sm font-bold transition-all shadow-2xs flex items-center gap-2 border border-[#BDDBD1]"
          >
            <IndianRupee className="w-4 h-4 text-[#2F8EAC]" />
            <span>Record Payment</span>
          </Link>
        </div>
      </div>

      {/* Pristine Clinic Onboarding Card for New Accounts */}
      {!loading && patients.length === 0 && (
        <div className="bg-gradient-to-r from-[#F0F7F5] via-white to-[#E8F0F1] p-6 sm:p-7 rounded-2xl border-2 border-dashed border-[#2F8EAC]/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2F8EAC]/10 text-[#2F8EAC] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Private Clinic Database Ready</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#1E2D2B]">
              Welcome, Dr. {clinicProfile.dentistName}!
            </h3>
            <p className="text-xs sm:text-sm text-[#3D5450] leading-relaxed">
              Your clinic is securely connected to your account (<strong>{clinicProfile.email}</strong>). All patient dossiers, appointments, and fees you create here are 100% private to your email.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <Link
              href="/dashboard/patients"
              className="px-4 py-2.5 rounded-xl bg-[#2F8EAC] text-white text-xs sm:text-sm font-semibold hover:bg-[#24728A] transition-all text-center flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Patient</span>
            </Link>
            <button
              onClick={() => loadSampleData()}
              className="px-4 py-2.5 rounded-xl bg-white border border-[#2F8EAC] text-[#2F8EAC] hover:bg-[#E8F0F1] text-xs sm:text-sm font-semibold transition-all text-center flex items-center justify-center gap-2 shadow-2xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Sample Records</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards: The 4 Core Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] hover:border-[#2F8EAC]/60 transition-all">
          <div className="flex items-center justify-between text-[#3D5450] text-[11px] font-mono uppercase tracking-[0.12em] font-bold">
            <span>Today&apos;s Schedule</span>
            <div className="w-8 h-8 rounded-xl bg-[#E8F0F1] flex items-center justify-center text-[#2F8EAC] border border-[#C7E7EC]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-[#1E2D2B]">
            {todayList.length}
          </div>
          <span className="text-xs text-[#3D5450] font-medium mt-1 block">
            <strong className="text-[#1E2D2B]">{todayList.filter((a) => a.status === "scheduled").length}</strong> scheduled, <strong className="text-[#1E2D2B]">{todayList.filter((a) => a.status === "completed").length}</strong> completed
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] hover:border-[#2F8EAC]/60 transition-all">
          <div className="flex items-center justify-between text-[#3D5450] text-[11px] font-mono uppercase tracking-[0.12em] font-bold">
            <span>Today&apos;s Collection</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-[#1E2D2B]">
            ₹{totalDailyCollection.toLocaleString()}
          </div>
          <span className="text-xs text-[#3D5450] font-mono mt-1 block">
            UPI: ₹{upiToday.toLocaleString()} • Cash: ₹{cashToday.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] hover:border-rose-400 transition-all">
          <div className="flex items-center justify-between text-rose-900 text-[11px] font-mono uppercase tracking-[0.12em] font-bold">
            <span>Unpaid Dues</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-rose-600">
            {patientsWithPending.length}
          </div>
          <span className="text-xs text-rose-800 font-medium mt-1 block">
            Patients with balance due
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between text-amber-900 text-[11px] font-mono uppercase tracking-[0.12em] font-bold">
            <span>Due for Recall</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-[#1E2D2B]">
            {dueForFollowUp.length}
          </div>
          <span className="text-xs text-[#3D5450] font-medium mt-1 block">
            Patients needing checkup
          </span>
        </div>
      </div>

      {/* Main Grid: Today's Appointments & Pending Fees / Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Today's Appointments List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-[#1E2D2B] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#2F8EAC]" />
              <span>Today&apos;s Appointments</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#E8F0F1] text-[#2F8EAC] font-bold">
                {todayList.length}
              </span>
            </h3>
            <Link
              href="/dashboard/appointments"
              className="text-xs font-semibold text-[#2F8EAC] hover:underline flex items-center gap-1"
            >
              <span>View Full Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {todayList.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-[#DCE2DE] text-center space-y-2 text-xs text-[#3D5450] shadow-card-subtle">
                <Calendar className="w-8 h-8 text-[#2F8EAC] mx-auto opacity-60" />
                <p className="font-bold text-sm text-[#1E2D2B]">No appointments booked for today</p>
                <p>Use the Quick Action above to book a new patient.</p>
              </div>
            ) : (
              todayList.map((apt) => (
                <div
                  key={apt._id}
                  className="bg-white p-5 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] flex items-start justify-between gap-4 hover:border-[#2F8EAC]/60 transition-all cursor-pointer group"
                  onClick={() => openPatientById(apt.patientId)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-[#2F8EAC] bg-[#E8F0F1] px-2 py-0.5 rounded-lg border border-[#C7E7EC]">
                        {apt.time}
                      </span>
                      <span className="text-xs font-mono font-medium text-[#3D5450]">
                        ({apt.durationMinutes} mins)
                      </span>
                    </div>

                    <h4 className="font-bold text-[#1E2D2B] text-base mt-1 flex items-center gap-2 group-hover:text-[#2F8EAC] transition-colors">
                      <span>{apt.patientName}</span>
                      <span className="text-[10px] font-mono bg-[#E8F0F1] text-[#2F8EAC] px-2 py-0.5 rounded-md font-semibold border border-[#C7E7EC]">
                        Patient Details
                      </span>
                    </h4>
                    <p className="text-xs text-[#2F8EAC] font-semibold">
                      {apt.procedure}
                    </p>
                    {apt.notes && (
                      <p className="text-xs text-[#3D5450] italic">&quot;{apt.notes}&quot;</p>
                    )}
                    <span className="text-xs text-[#3D5450] font-mono block">
                      Phone: <strong className="text-[#1E2D2B]">{apt.patientPhone}</strong>
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-full ${
                        apt.status === "completed"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-sky-100 text-sky-900 border border-sky-300"
                      }`}
                    >
                      {apt.status}
                    </span>

                    {apt.status === "scheduled" && (
                      <button
                        onClick={() => completeAppointment(apt._id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#2F8EAC] text-white font-semibold text-xs hover:bg-[#24728A] transition-colors shadow-sm"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Pending Fees & Recall Follow-ups */}
        <div className="space-y-6">
          {/* Outstanding Fees Box */}
          <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-rose-100">
              <h4 className="font-bold text-sm text-[#1E2D2B] flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <span>Unpaid Patient Fees</span>
              </h4>
              <Link href="/dashboard/fees" className="text-xs text-[#2F8EAC] font-semibold hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-2.5">
              {patientsWithPending.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#3D5450]">
                  No outstanding patient balances.
                </div>
              ) : (
                patientsWithPending.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => openPatientById(p._id)}
                    className="p-3 rounded-xl bg-[#F8FAF9] border border-[#DCE2DE] flex items-center justify-between text-xs hover:border-[#2F8EAC]/60 cursor-pointer transition-colors group"
                  >
                    <div>
                      <span className="font-bold text-[#1E2D2B] block group-hover:text-[#2F8EAC]">
                        {p.name}
                      </span>
                      <span className="text-[11px] text-[#3D5450] font-mono">{p.phone}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-rose-600 text-sm block">
                        ₹{p.balance.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#2F8EAC] font-bold">
                        Patient Details →
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Follow-up Due Box */}
          <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-amber-100">
              <h4 className="font-bold text-sm text-[#1E2D2B] flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                  <Clock className="w-4 h-4" />
                </div>
                <span>Patients Due for Follow-Up</span>
              </h4>
            </div>

            <div className="space-y-2.5 text-xs">
              {dueForFollowUp.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#3D5450]">
                  No patients due for follow-up.
                </div>
              ) : (
                dueForFollowUp.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => openPatientById(p._id)}
                    className="p-3 rounded-xl bg-[#F8FAF9] border border-[#DCE2DE] flex items-center justify-between hover:border-[#2F8EAC]/60 cursor-pointer transition-colors group"
                  >
                    <div>
                      <span className="font-bold text-[#1E2D2B] block group-hover:text-[#2F8EAC]">
                        {p.name}
                      </span>
                      <span className="text-[11px] text-[#3D5450] font-mono font-medium">
                        Due: {p.followUpDue}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-[#E8F0F1] text-[#2F8EAC] border border-[#C7E7EC] font-bold text-[11px]">
                      View
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
