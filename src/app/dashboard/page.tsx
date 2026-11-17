"use client";

import Link from "next/link";
import { Calendar, CreditCard, CheckCircle2, AlertCircle, User, ArrowRight, IndianRupee, Plus, Sparkles, Phone, RefreshCw } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";

const patientUrl = (id: string) => `/dashboard/patients/${encodeURIComponent(id)}`;
const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

export default function DashboardOverviewPage() {
  const {
    patients,
    appointments,
    fees,
    payments,
    clinicProfile,
    loading,
    completeAppointment,
  } = useClinic();

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



  const metrics = [
    { label: "Today's Appointments", value: todayList.length, detail: `${todayList.filter((a) => a.status === "scheduled").length} scheduled / ${todayList.filter((a) => a.status === "completed").length} completed`, icon: Calendar, tone: "blue", href: "/dashboard/appointments" },
    { label: "Today's Collection", value: money(totalDailyCollection), detail: `UPI ${money(upiToday)} / Cash ${money(cashToday)}`, icon: IndianRupee, tone: "green", href: "/dashboard/fees" },
    { label: "Unpaid Dues", value: patientsWithPending.length, detail: "Patients with a balance due", icon: AlertCircle, tone: "rose", href: "/dashboard/fees" },
    { label: "Due for Recall", value: dueForFollowUp.length, detail: "Patients ready for follow-up", icon: RefreshCw, tone: "teal", href: "/dashboard/patients" },
  ];

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
    <div className="overview space-y-8 sm:space-y-10">
      <section className="welcome-card">
        <div className="relative z-10 max-w-2xl">
          <p className="text-base text-[#52627A] sm:text-lg">Welcome back,</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-[#111C3A] sm:text-4xl">{clinicProfile.dentistName}</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-[#52627A] sm:text-base">Manage your appointments, patients and payments with ease.</p>
          <div className="mt-6 flex flex-col gap-3 min-[440px]:flex-row">
            <Link href="/dashboard/appointments" className="action-primary"><Calendar size={19} />Book Appointment</Link>
            <Link href="/dashboard/fees" className="action-secondary"><IndianRupee size={20} />Record Payment</Link>
          </div>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <svg viewBox="0 0 160 160" fill="none" className="h-36 w-36">
            <path d="M78 37C60 22 40 28 35 47c-7 25 8 42 12 64 3 18 8 24 15 20 8-5 5-34 17-34s10 29 18 34c8 4 13-5 16-23 4-23 18-40 10-61-7-20-29-24-45-10Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m78 37 15 8" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <path d="M126 40v30m-15-15h30" stroke="#FAFBFC" strokeWidth="16" strokeLinecap="round" />
            <path d="M126 40v30m-15-15h30" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
          </svg>
        </div>
      </section>

      {!loading && patients.length === 0 && (
        <section className="premium-card flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
          <div><h3 className="font-semibold">Your practice starts here</h3><p className="mt-2 text-sm text-[#64748B]">Add your first patient to start managing care at {clinicProfile.name}.</p></div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/patients" className="action-primary"><Plus size={17} />Add First Patient</Link>
          </div>
        </section>
      )}

      <section aria-labelledby="schedule-heading" className="space-y-4">
        <div className="section-heading">
          <h2 id="schedule-heading"><Calendar />Today&apos;s Schedule <span className="section-count">{todayList.length}</span></h2>
          <Link href="/dashboard/appointments">View Full Schedule<ArrowRight size={18} /></Link>
        </div>
        {loading ? <div className="premium-card p-8 text-sm text-[#64748B]" role="status">Loading your schedule...</div> : todayList.length === 0 ? (
          <div className="premium-card flex flex-col items-center gap-3 p-10 text-center">
            <div className="metric-icon blue"><Calendar /></div>
            <h3 className="font-semibold">A little room in your day</h3>
            <p className="text-sm text-[#64748B]">No appointments booked for today.</p>
            <Link href="/dashboard/appointments" className="text-sm font-semibold text-[#0089A8]">Book an appointment <span aria-hidden="true">&rarr;</span></Link>
          </div>
        ) : <div className="space-y-3">{todayList.map((apt) => (
          <article key={apt._id} className="schedule-card">
            <div className="schedule-info min-w-0">
              <div className="flex flex-wrap items-center gap-3"><span className="time-chip">{apt.time}</span><span className="text-sm text-[#64748B]">({apt.durationMinutes} mins)</span></div>
              <h3 className="mt-3 text-xl font-bold sm:text-2xl"><Link href={patientUrl(apt.patientId)} className="hover:text-[#0089A8]">{apt.patientName}</Link></h3>
              <p className="mt-2 text-sm leading-6 text-[#52627A]">{apt.procedure}{apt.notes && <span className="italic"> &middot; {apt.notes}</span>}</p>
            </div>
            <a href={`tel:${apt.patientPhone}`} className="schedule-phone inline-flex items-center gap-2 text-sm font-medium"><Phone size={15} className="shrink-0 text-[#0089A8]" />{apt.patientPhone}</a>
            <span className={`schedule-status status-pill ${apt.status}`}><CheckCircle2 size={15} />{apt.status}</span>
            <div className="schedule-actions flex flex-wrap gap-2">
              <Link href={patientUrl(apt.patientId)} className="small-outline">View Details</Link>
              {apt.status === "scheduled" && <button onClick={() => completeAppointment(apt._id)} className="small-outline complete-action">Complete</button>}
            </div>
          </article>
        ))}</div>}
      </section>

      <section aria-label="Practice overview" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {metrics.map(({ label, value, detail, icon: Icon, tone, href }) => (
          <Link key={label} href={href} className={`metric-card ${tone}`}>
            <div className={`metric-icon ${tone}`}><Icon size={23} /></div>
            <div className="min-w-0"><p className="text-2xl font-bold tracking-tight sm:text-3xl">{loading ? "—" : value}</p><h3 className="mt-1 text-xs font-medium sm:text-sm">{label}</h3><p className="mt-2 text-[11px] leading-5 text-[#64748B]">{detail}</p></div>
          </Link>
        ))}
      </section>

      <section aria-labelledby="followup-heading" className="space-y-4">
        <div className="section-heading"><h2 id="followup-heading"><RefreshCw />Patients Due for Follow-Up</h2><Link href="/dashboard/patients">View All<ArrowRight size={18} /></Link></div>
        <div className="premium-card overflow-hidden divide-y divide-[#E4E9F0]">
          {loading ? <p className="p-6 text-sm text-[#64748B]" role="status">Loading follow-ups...</p> : dueForFollowUp.length === 0 ? <p className="p-8 text-center text-sm text-[#64748B]">You&apos;re all caught up. No patients due for follow-up.</p> : dueForFollowUp.map((patient) => (
            <div key={patient._id} className="patient-row">
              <div className="patient-avatar"><User size={22} /></div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:flex-row md:items-center md:gap-4"><Link href={patientUrl(patient._id)} className="truncate text-sm font-semibold hover:text-[#0089A8] sm:text-base">{patient.name}</Link><span className="flex items-center gap-2 text-xs text-[#64748B] sm:text-sm"><Calendar size={15} />Due: {patient.followUpDue}</span></div>
              <Link href={patientUrl(patient._id)} className="view-pill" aria-label={`View ${patient.name}`}>View<ArrowRight size={14} className="hidden sm:block" /></Link>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="balances-heading" className="space-y-4">
        <div className="section-heading"><h2 id="balances-heading"><CreditCard />Outstanding Balances</h2><Link href="/dashboard/fees">View All<ArrowRight size={18} /></Link></div>
        <div className="premium-card overflow-hidden divide-y divide-[#E4E9F0]">
          {loading ? <p className="p-6 text-sm text-[#64748B]" role="status">Loading balances...</p> : patientsWithPending.length === 0 ? <p className="p-8 text-center text-sm text-[#64748B]">No outstanding patient balances.</p> : patientsWithPending.map((patient) => (
            <Link key={patient._id} href={patientUrl(patient._id)} className="patient-row hover:bg-[#F8FAFC]">
              <div className="patient-avatar"><User size={22} /></div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold sm:text-base">{patient.name}</h3><p className="mt-1 text-xs text-[#64748B]">{patient.phone}</p></div><span className="text-sm font-semibold text-rose-700">{money(patient.balance)}</span><ArrowRight size={17} className="text-[#8291A7]" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
