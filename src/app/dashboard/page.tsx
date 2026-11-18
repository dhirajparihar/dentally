"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  User,
  ArrowRight,
  IndianRupee,
  Plus,
  Phone,
  RefreshCw,
  Share2,
  QrCode,
  X,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import { Patient, Appointment } from "@/lib/mockData";

const patientUrl = (id: string) => `/dashboard/patients/${encodeURIComponent(id)}`;
const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export default function DashboardOverviewPage() {
  const {
    patients,
    appointments,
    fees,
    payments,
    clinicProfile,
    loading,
    completeAppointment,
    cancelAppointment,
    missAppointment,
    bookAppointment,
    addPatient,
    recordPayment,
  } = useClinic();

  const [qrModalData, setQrModalData] = useState<{ patientId?: string; patientName?: string; amount: number } | null>(null);
  const [selectedQrPatientId, setSelectedQrPatientId] = useState<string>("");
  const [qrRecordedSuccess, setQrRecordedSuccess] = useState<string | null>(null);
  const [isRecordingQrPayment, setIsRecordingQrPayment] = useState(false);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Operatory Schedule Date Navigation
  const [scheduleDate, setScheduleDate] = useState(() => todayStr);
  const isViewingToday = scheduleDate === todayStr;

  const shiftScheduleDate = (days: number) => {
    const cur = new Date(scheduleDate + "T00:00:00");
    cur.setDate(cur.getDate() + days);
    setScheduleDate(cur.toISOString().split("T")[0]);
  };

  const formatScheduleHeaderDate = (dateStr: string) => {
    if (dateStr === todayStr) return "Today's Schedule";
    const d = new Date(dateStr + "T00:00:00");
    const diff = Math.round((new Date(dateStr + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) return "Tomorrow's Schedule";
    if (diff === -1) return "Yesterday's Schedule";
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  };

  // Quick Walk-In Booking Modal State
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    patientName: "",
    patientPhone: "",
    procedure: "Toothache / Emergency Exam",
    time: "11:30 AM",
    durationMinutes: 30,
    notes: "Emergency walk-in",
  });

  // Next 7 days boundary for practical recalls
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const weekAheadStr = weekAhead.toISOString().split("T")[0];

  // Chronologically sorted schedule for the selected date
  const scheduleList = appointments
    .filter((a) => a.date === scheduleDate)
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  // Live operatory chair indicators (only evaluated when viewing today)
  const inOperatoryApt = isViewingToday
    ? scheduleList.find((a) => {
        if (a.status !== "scheduled") return false;
        const start = parseTimeToMinutes(a.time);
        const end = start + (a.durationMinutes || 30);
        return currentMinutes >= start && currentMinutes <= end;
      })
    : undefined;

  const nextUpApt = isViewingToday
    ? scheduleList.find((a) => {
        if (a.status !== "scheduled") return false;
        const start = parseTimeToMinutes(a.time);
        return start > currentMinutes;
      })
    : undefined;

  const todayPayments = payments.filter((p) => p.date === todayStr && !p.isRefund);
  const totalDailyCollection = todayPayments.reduce((s, p) => s + p.amount, 0);

  // Payment breakdown
  const upiToday = todayPayments.filter((p) => p.paymentMethod === "UPI").reduce((s, p) => s + p.amount, 0);
  const cashToday = todayPayments.filter((p) => p.paymentMethod === "Cash").reduce((s, p) => s + p.amount, 0);
  const cardToday = todayPayments.filter((p) => p.paymentMethod === "Card").reduce((s, p) => s + p.amount, 0);

  // Patients with pending balance
  const patientsWithPending = patients
    .map((p) => {
      const pFees = fees.filter((f) => f.patientId === p._id);
      const paid = payments.filter((pay) => pay.patientId === p._id && !pay.isRefund).reduce((s, pay) => s + pay.amount, 0);
      const refunded = payments.filter((pay) => pay.patientId === p._id && pay.isRefund).reduce((s, pay) => s + pay.amount, 0);
      const billed = pFees.reduce((s, f) => s + f.netAmount, 0);
      return { ...p, balance: Math.max(0, billed - (paid - refunded)) };
    })
    .filter((p) => p.balance > 0);

  // Practical Recalls: Only patients due on/before today or in the next 7 days,
  // excluding those who have already visited since their recall date or already have an upcoming appointment scheduled.
  const dueForFollowUp = patients
    .filter((p) => {
      if (!p.followUpDue || p.followUpDue > weekAheadStr) return false;
      // If patient already visited on or after this recall date, the recall was attended
      if (p.lastVisit && p.lastVisit >= p.followUpDue) return false;
      // If patient already has an upcoming scheduled appointment, they are already on the calendar
      const hasUpcoming = appointments.some(
        (a) => a.patientId === p._id && a.status === "scheduled" && a.date >= todayStr
      );
      if (hasUpcoming) return false;
      return true;
    })
    .sort((a, b) => (a.followUpDue || "").localeCompare(b.followUpDue || ""));

  const getFollowUpBadge = (dateStr: string) => {
    if (dateStr < todayStr) {
      const diffTime = Math.abs(new Date(todayStr).getTime() - new Date(dateStr).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { label: `Overdue ${diffDays}d`, color: "bg-rose-50 text-rose-700 border-rose-200" };
    }
    if (dateStr === todayStr) {
      return { label: "Due Today", color: "bg-amber-50 text-amber-800 border-amber-200 font-semibold" };
    }
    const diffTime = Math.abs(new Date(dateStr).getTime() - new Date(todayStr).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { label: `In ${diffDays}d`, color: "bg-teal-50 text-teal-800 border-teal-200" };
  };

  // WhatsApp link generators
  const getWhatsAppTodayReminderUrl = (apt: Appointment) => {
    const cleanPhone = apt.patientPhone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello ${apt.patientName}, this is a reminder for your dental appointment today at ${apt.time} (${apt.procedure}) with ${clinicProfile.dentistName} at ${clinicProfile.name}.\n\nPlease let us know when you arrive. See you soon!`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  const getWhatsAppRecallUrl = (patient: Patient) => {
    const cleanPhone = patient.phone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello ${patient.name}, greetings from ${clinicProfile.name}!\n\nDr. ${clinicProfile.dentistName} recommends a periodic follow-up / checkup for your dental health (Due: ${patient.followUpDue}).\n\nWould you like to reserve a convenient slot this week? Reply here or call us at ${clinicProfile.phone}.`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  const getWhatsAppBillUrl = (patient: Patient, balance: number) => {
    const cleanPhone = patient.phone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const doctorUpi = clinicProfile.upiId || "dentally@upi";
    const msg = `Hello ${patient.name}, greetings from ${clinicProfile.name}.\n\nYour account has an outstanding balance of ₹${balance.toLocaleString()} for recent dental treatment.\n\nYou can pay directly via UPI: ${doctorUpi}, or scan our QR code on your next visit.\n\nWarm regards,\n${clinicProfile.dentistName} • ${clinicProfile.phone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = walkInForm.patientName.trim();
    const trimmedPhone = walkInForm.patientPhone.trim();
    if (!trimmedName) return;

    const matched = patients.find(
      (p) =>
        p.name.trim().toLowerCase() === trimmedName.toLowerCase() ||
        (trimmedPhone && p.phone.replace(/\D/g, "") === trimmedPhone.replace(/\D/g, ""))
    );

    let resolvedPatientId = matched?._id;
    let resolvedPhone = trimmedPhone || matched?.phone || "+91 98000 00000";

    if (!matched) {
      resolvedPatientId = `pat_${Date.now()}`;
      const newPat: Patient = {
        _id: resolvedPatientId,
        name: trimmedName,
        age: 32,
        gender: "Other",
        phone: resolvedPhone,
        email: "",
        address: "",
        medicalAlerts: ["None"],
        bloodGroup: "Unknown",
        registeredDate: scheduleDate,
        lastVisit: scheduleDate,
        notes: [
          {
            id: `note_${Date.now()}`,
            date: scheduleDate,
            text: `Walk-in emergency visit: ${walkInForm.procedure}. ${walkInForm.notes || ""}`.trim(),
            doctor: clinicProfile.dentistName || "Doctor",
          },
        ],
        history: [],
      };
      await addPatient(newPat);
    }

    const newApt: Appointment = {
      _id: `apt_${Date.now()}`,
      patientId: resolvedPatientId!,
      patientName: trimmedName,
      patientPhone: resolvedPhone,
      date: scheduleDate,
      time: walkInForm.time,
      durationMinutes: Number(walkInForm.durationMinutes) || 30,
      procedure: walkInForm.procedure,
      status: "scheduled",
      notes: walkInForm.notes || "Emergency Walk-In",
    };

    await bookAppointment(newApt);
    setIsWalkInOpen(false);
  };

  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const todayAppointments = appointments.filter((a) => a.date === todayStr);

  const metrics = [
    {
      label: "Today's Appointments",
      value: todayAppointments.length,
      detail: `${todayAppointments.filter((a) => a.status === "scheduled").length} scheduled / ${todayAppointments.filter((a) => a.status === "completed").length} completed`,
      icon: Calendar,
      tone: "blue",
      href: "/dashboard/appointments",
    },
    {
      label: "Today's Collection",
      value: money(totalDailyCollection),
      detail: `UPI ${money(upiToday)} / Cash ${money(cashToday)}${cardToday > 0 ? ` / Card ${money(cardToday)}` : ""}`,
      icon: IndianRupee,
      tone: "green",
      href: "/dashboard/fees",
    },
    {
      label: "Unpaid Dues",
      value: patientsWithPending.length,
      detail: `${money(patientsWithPending.reduce((s, p) => s + p.balance, 0))} total pending`,
      icon: AlertCircle,
      tone: "rose",
      href: "/dashboard/fees",
    },
    {
      label: "Due for Recall",
      value: dueForFollowUp.length,
      detail: `${dueForFollowUp.filter((p) => (p.followUpDue || "") < todayStr).length} overdue / ${dueForFollowUp.filter((p) => p.followUpDue === todayStr).length} today`,
      icon: RefreshCw,
      tone: "teal",
      href: "/dashboard/patients",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-white rounded-2xl border border-[#E4E9F0] p-6 flex flex-col justify-center space-y-2">
          <div className="h-5 w-48 bg-slate-200 rounded" />
          <div className="h-4 w-72 bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-[#E4E9F0] p-4 space-y-2">
              <div className="h-4 w-20 bg-slate-200 rounded" />
              <div className="h-7 w-16 bg-slate-300 rounded" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="h-64 bg-white rounded-2xl border border-[#E4E9F0]" />
      </div>
    );
  }

  return (
    <div className="overview space-y-6 sm:space-y-8">
      {/* ================= COMPACT CLINICAL GREETING & DESK TOOLBAR ================= */}
      <section className="bg-white rounded-3xl border border-[#E4E9F0] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#EDF7FA] text-[#00738E] border border-[#CDEBF2]">
              {formattedDate}
            </span>
            <span className="text-xs text-[#64748B] font-mono">Chair 1 Operatory</span>
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[#111C3A]">
            Good day, {clinicProfile.dentistName}
          </h1>
          <p className="mt-0.5 text-xs text-[#52627A]">
            {clinicProfile.name} &middot; {todayList.filter((a) => a.status === "scheduled").length} patients on schedule today
          </p>
        </div>

        {/* Rapid Desk Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/appointments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <Calendar size={15} />
            <span>Book Visit</span>
          </Link>
          <Link
            href="/dashboard/patients"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAFBFC] hover:bg-[#EDF7FA] border border-[#E4E9F0] text-[#111C3A] font-semibold text-xs transition-colors"
          >
            <Plus size={15} />
            <span>Add Patient</span>
          </Link>
          <Link
            href="/dashboard/fees"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAFBFC] hover:bg-[#EDF7FA] border border-[#E4E9F0] text-[#111C3A] font-semibold text-xs transition-colors"
          >
            <IndianRupee size={15} />
            <span>Record Payment</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setQrModalData({ amount: 500 });
              setSelectedQrPatientId(patients[0]?._id || "");
              setQrRecordedSuccess(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EDF7FA] hover:bg-[#DDF1F6] border border-[#C2E4ED] text-[#00738E] font-semibold text-xs transition-colors"
            title="Open Instant Chairside UPI QR for walk-in patient"
          >
            <QrCode size={15} />
            <span>Desk QR</span>
          </button>
        </div>
      </section>

      {/* ================= HIGH-LEVEL PULSE METRICS ================= */}
      <section aria-label="Practice overview" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {metrics.map(({ label, value, detail, icon: Icon, tone, href }) => (
          <Link key={label} href={href} className={`metric-card ${tone}`}>
            <div className={`metric-icon ${tone}`}><Icon size={22} /></div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight sm:text-3xl text-[#111C3A]">{loading ? "—" : value}</p>
              <h3 className="mt-1 text-xs font-semibold sm:text-sm text-[#111C3A]">{label}</h3>
              <p className="mt-1 text-[11px] leading-4 text-[#64748B]">{detail}</p>
            </div>
          </Link>
        ))}
      </section>

      {/* ================= CHRONOLOGICAL OPERATORY SCHEDULE WITH DATE NAVIGATOR ================= */}
      <section aria-labelledby="schedule-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id="schedule-heading" className="text-base font-bold text-[#111C3A] flex items-center gap-2">
              <Calendar size={18} className="text-[#0089A8]" />
              <span>{formatScheduleHeaderDate(scheduleDate)}</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#EDF7FA] font-bold text-[#00738E] border border-[#CDEBF2]">
              {scheduleList.length} visits
            </span>

            {/* Date Shifter Controls */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-[#E4E9F0] shadow-2xs">
              <button
                type="button"
                onClick={() => shiftScheduleDate(-1)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#111C3A] hover:bg-[#EDF7FA] transition-colors"
                title="Previous Day"
                aria-label="Previous Day"
              >
                <ChevronLeft size={15} />
              </button>
              {!isViewingToday && (
                <button
                  type="button"
                  onClick={() => setScheduleDate(todayStr)}
                  className="px-2 py-0.5 text-[11px] font-semibold text-[#0089A8] hover:bg-[#EDF7FA] rounded-md transition-colors"
                >
                  Today
                </button>
              )}
              <button
                type="button"
                onClick={() => shiftScheduleDate(1)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#111C3A] hover:bg-[#EDF7FA] transition-colors"
                title="Next Day"
                aria-label="Next Day"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setWalkInForm({
                  patientName: "",
                  patientPhone: "",
                  procedure: "Toothache / Emergency Exam",
                  time: "11:30 AM",
                  durationMinutes: 30,
                  notes: "Emergency walk-in",
                });
                setIsWalkInOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#EDF7FA] hover:bg-[#D4EDF3] text-[#00738E] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <UserPlus size={14} />
              <span>+ Quick Walk-In</span>
            </button>
            <Link href="/dashboard/appointments" className="text-xs font-semibold text-[#0089A8] hover:underline flex items-center gap-1">
              Full Calendar <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {scheduleList.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E4E9F0] p-8 text-center space-y-2">
            <Calendar size={28} className="mx-auto text-[#0089A8]" />
            <h3 className="font-semibold text-sm text-[#111C3A]">
              Chair 1 is open {isViewingToday ? "for today" : `on ${scheduleDate}`}
            </h3>
            <p className="text-xs text-[#64748B]">No appointments booked for this schedule.</p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsWalkInOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0089A8] hover:underline"
              >
                <Plus size={13} /> Book Walk-In
              </button>
              <Link
                href="/dashboard/appointments"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#64748B] hover:underline"
              >
                Open Calendar &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduleList.map((apt) => {
              const isCurrentChair = inOperatoryApt?._id === apt._id;
              const isNext = !inOperatoryApt && nextUpApt?._id === apt._id;

              return (
                <article
                  key={apt._id}
                  className={`schedule-card transition-all ${
                    isCurrentChair
                      ? "ring-2 ring-[#0089A8] bg-[#F7FCFD] shadow-xs"
                      : "hover:border-[#CCE5EC]"
                  }`}
                >
                  <div className="schedule-info min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="time-chip font-bold text-sm sm:text-base">{apt.time}</span>
                      <span className="text-xs text-[#64748B]">({apt.durationMinutes} mins)</span>
                      {isCurrentChair && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          In Operatory
                        </span>
                      )}
                      {isNext && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                          <Clock size={11} /> Next Up
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-lg font-bold text-[#111C3A]">
                      <Link href={patientUrl(apt.patientId)} className="hover:text-[#0089A8]">
                        {apt.patientName}
                      </Link>
                    </h3>

                    <p className="mt-0.5 text-xs font-medium text-[#00738E]">
                      {apt.procedure}
                      {apt.notes && <span className="text-[#64748B] font-normal italic"> &middot; {apt.notes}</span>}
                    </p>
                  </div>

                  <a
                    href={`tel:${apt.patientPhone}`}
                    className="schedule-phone inline-flex items-center gap-1.5 text-xs font-mono text-[#52627A] hover:text-[#111C3A]"
                  >
                    <Phone size={13} className="text-[#0089A8]" />
                    {apt.patientPhone}
                  </a>

                  <div className="schedule-status flex items-center justify-end">
                    <span className={`status-pill ${apt.status}`}>
                      {apt.status === "completed" && <Check size={13} aria-hidden="true" />}
                      {apt.status}
                    </span>
                  </div>

                  <div className="schedule-actions flex flex-wrap items-center gap-2">
                    <Link href={patientUrl(apt.patientId)} className="small-outline text-xs">
                      Dossier
                    </Link>
                    <a
                      href={getWhatsAppTodayReminderUrl(apt)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="small-outline text-xs text-emerald-700 hover:text-emerald-800"
                      title="Send WhatsApp appointment ping / reminder"
                    >
                      <Share2 size={13} />
                      <span>WhatsApp</span>
                    </a>
                    {apt.status === "scheduled" && (
                      <>
                        <button
                          type="button"
                          onClick={() => completeAppointment(apt._id)}
                          className="small-outline complete-action text-xs font-semibold"
                          title="Mark visit complete"
                        >
                          <Check size={13} />
                          <span>Complete</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => missAppointment(apt._id, "Marked missed at chairside")}
                          className="small-outline text-xs text-amber-700 hover:bg-amber-50 hover:border-amber-300 font-semibold"
                          title="Mark missed / no-show"
                        >
                          <Clock size={13} />
                          <span>Missed</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelAppointment(apt._id, "Cancelled from dashboard")}
                          className="small-outline text-xs text-rose-700 hover:bg-rose-50 hover:border-rose-300 font-semibold"
                          title="Cancel appointment"
                        >
                          <X size={13} />
                          <span>Cancel</span>
                        </button>
                      </>
                    )}
                    {(apt.status === "missed" || apt.status === "cancelled") && (
                      <button
                        type="button"
                        onClick={() => bookAppointment({ ...apt, status: "scheduled" })}
                        className="small-outline text-xs text-[#0089A8] hover:bg-[#EDF7FA] font-semibold"
                        title="Revert back to scheduled"
                      >
                        <RefreshCw size={12} />
                        <span>Re-open</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ================= LOWER TWO-COLUMN SPLIT: RECALLS & OUTSTANDING BALANCES ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PRACTICAL RECALL ENGINE */}
        <section aria-labelledby="followup-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="followup-heading" className="text-sm font-bold text-[#111C3A] flex items-center gap-2">
              <RefreshCw size={16} className="text-[#0089A8]" />
              Due for Recall & Follow-Up
            </h2>
            <Link href="/dashboard/patients?sort=recall" className="text-xs font-semibold text-[#0089A8] hover:underline flex items-center gap-1">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          <div className="bg-white rounded-3xl border border-[#E4E9F0] overflow-hidden divide-y divide-[#E4E9F0]">
            {dueForFollowUp.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#64748B]">
                All patient recalls caught up. No follow-ups due this week.
              </p>
            ) : (
              dueForFollowUp.slice(0, 5).map((patient) => {
                const badge = getFollowUpBadge(patient.followUpDue!);
                return (
                  <div key={patient._id} className="patient-row flex items-center justify-between p-3.5 hover:bg-[#FAFBFC] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="patient-avatar shrink-0"><User size={18} /></div>
                      <div className="min-w-0">
                        <Link href={patientUrl(patient._id)} className="truncate text-xs font-bold text-[#111C3A] hover:text-[#0089A8] block">
                          {patient.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-[10px] font-mono text-[#8291A7]">{patient.followUpDue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={getWhatsAppRecallUrl(patient)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs flex items-center gap-1 font-semibold"
                        title="Send WhatsApp recall reminder"
                      >
                        <Share2 size={13} />
                        <span className="hidden sm:inline text-[11px]">Recall</span>
                      </a>
                      <Link href={patientUrl(patient._id)} className="p-1.5 rounded-xl border border-[#E4E9F0] text-[#52627A] hover:text-[#111C3A] hover:bg-slate-100">
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* OUTSTANDING BALANCES & CHAIRSIDE COLLECTION */}
        <section aria-labelledby="balances-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="balances-heading" className="text-sm font-bold text-[#111C3A] flex items-center gap-2">
              <CreditCard size={16} className="text-[#0089A8]" />
              Outstanding Balances
            </h2>
            <Link href="/dashboard/fees" className="text-xs font-semibold text-[#0089A8] hover:underline flex items-center gap-1">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          <div className="bg-white rounded-3xl border border-[#E4E9F0] overflow-hidden divide-y divide-[#E4E9F0]">
            {patientsWithPending.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#64748B]">
                No pending balances across accounts. All settled.
              </p>
            ) : (
              patientsWithPending.slice(0, 5).map((patient) => (
                <div key={patient._id} className="patient-row flex items-center justify-between p-3.5 hover:bg-[#FAFBFC] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="patient-avatar shrink-0"><User size={18} /></div>
                    <div className="min-w-0">
                      <Link href={patientUrl(patient._id)} className="truncate text-xs font-bold text-[#111C3A] hover:text-[#0089A8] block">
                        {patient.name}
                      </Link>
                      <p className="text-[10px] font-mono text-[#8291A7] mt-0.5">{patient.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-rose-700">{money(patient.balance)}</div>
                      <span className="text-[9px] uppercase font-mono text-[#8291A7]">due</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setQrModalData({ patientId: patient._id, patientName: patient.name, amount: patient.balance });
                        setSelectedQrPatientId(patient._id);
                        setQrRecordedSuccess(null);
                      }}
                      className="p-1.5 rounded-xl border border-[#0089A8] text-[#0089A8] bg-[#EDF7FA] hover:bg-[#D8EEF3]"
                      title="Generate instant UPI QR for this patient's balance"
                    >
                      <QrCode size={14} />
                    </button>

                    <a
                      href={getWhatsAppBillUrl(patient, patient.balance)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                      title="Send WhatsApp payment reminder with doctor's UPI"
                    >
                      <Share2 size={14} />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ================= INSTANT CHAIRSIDE DESK UPI QR MODAL ================= */}
      {qrModalData && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E4E9F0] text-center space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E9F0]">
              <span className="font-mono text-xs font-bold text-[#0089A8] flex items-center gap-1.5">
                <QrCode className="w-4 h-4" /> Chairside Desk UPI QR
              </span>
              <button
                onClick={() => setQrModalData(null)}
                aria-label="Close QR code"
                className="text-[#8291A7] hover:text-[#111C3A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h4 className="font-bold text-base text-[#111C3A]">{clinicProfile.name}</h4>
              <p className="text-xs text-[#64748B]">{clinicProfile.dentistName}</p>
            </div>

            {/* Custom Amount Input & Quick Amount Presets */}
            <div className="space-y-2">
              <div className="relative max-w-[200px] mx-auto">
                <span className="absolute left-3.5 top-2 font-mono font-bold text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  min="1"
                  value={qrModalData.amount || ""}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setQrModalData((prev) => (prev ? { ...prev, amount: val } : null));
                  }}
                  placeholder="Amount"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E4E9F0] text-center font-mono font-bold text-lg text-[#111C3A] outline-none focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 bg-[#FAFBFC]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {[500, 1500, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQrModalData((prev) => (prev ? { ...prev, amount: amt } : null))}
                    className={`text-[11px] px-2.5 py-1 rounded-xl border font-mono font-semibold transition-all ${
                      qrModalData.amount === amt
                        ? "bg-[#0089A8] text-white border-[#0089A8]"
                        : "bg-[#FAFBFC] border-[#E4E9F0] text-[#64748B] hover:bg-[#EDF7FA]"
                    }`}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Real Dynamic UPI QR Graphic */}
            <div className="p-3 bg-[#FAFBFC] rounded-2xl border border-[#E4E9F0] inline-block shadow-inner mx-auto">
              <div className="w-44 h-44 bg-white rounded-xl border border-slate-300 p-2 flex flex-col items-center justify-center relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `upi://pay?pa=${clinicProfile.upiId || "dentally@upi"}&pn=${encodeURIComponent(
                      clinicProfile.name
                    )}&am=${qrModalData.amount}&cu=INR`
                  )}`}
                  alt="UPI QR Code"
                  width={160}
                  height={160}
                  className="rounded-lg"
                />
              </div>
              <div className="mt-1.5 text-[11px] font-mono text-[#586B67]">
                Scan with GPay &middot; PhonePe &middot; Paytm
              </div>
            </div>

            <div className="space-y-1">
              {qrModalData.patientName ? (
                <span className="text-xs text-[#64748B] block">Patient: <strong>{qrModalData.patientName}</strong></span>
              ) : (
                <div className="text-left pt-1">
                  <label className="text-[10px] font-mono text-[#64748B] block mb-1">Credit Payment To Patient:</label>
                  <select
                    value={selectedQrPatientId}
                    onChange={(e) => setSelectedQrPatientId(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#E4E9F0] text-xs bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                  >
                    <option value="">Walk-In (General Desk Collection)</option>
                    {patients.map((p) => (
                      <option key={p._id} value={p._id}>{p.name} ({p.phone})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="text-2xl font-bold font-mono tracking-tight text-[#111C3A] pt-1">
                ₹{qrModalData.amount.toLocaleString()}
              </div>
              <span className="text-[10px] font-mono text-[#8291A7] block">
                UPI ID: {clinicProfile.upiId || "dentally@upi"}
              </span>
            </div>

            {qrRecordedSuccess ? (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{qrRecordedSuccess}</span>
              </div>
            ) : (
              <div className="pt-2 border-t border-[#E4E9F0] flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isRecordingQrPayment}
                  onClick={async () => {
                    setIsRecordingQrPayment(true);
                    try {
                      const patientObj = patients.find((p) => p._id === (qrModalData.patientId || selectedQrPatientId));
                      await recordPayment({
                        _id: `pay_${Date.now()}`,
                        patientId: patientObj?._id || "walk_in",
                        patientName: patientObj?.name || qrModalData.patientName || "Walk-In Patient",
                        date: todayStr,
                        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                        amount: qrModalData.amount,
                        paymentMethod: "UPI",
                        notes: "Chairside Desk UPI QR collection",
                        receiptNo: `REC-${Date.now().toString().slice(-4)}`,
                      });
                      setQrRecordedSuccess(`₹${qrModalData.amount.toLocaleString()} recorded & credited to daily collections!`);
                      setTimeout(() => {
                        setQrModalData(null);
                        setQrRecordedSuccess(null);
                      }, 1600);
                    } catch (err) {
                      console.error("Failed to record QR payment", err);
                    } finally {
                      setIsRecordingQrPayment(false);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{isRecordingQrPayment ? "Recording..." : `Record ₹${qrModalData.amount.toLocaleString()} as Paid`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrModalData(null)}
                  className="w-full py-2 rounded-xl text-[#8291A7] hover:text-[#111C3A] text-xs font-medium"
                >
                  Dismiss Without Recording
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= QUICK CHAIRSIDE WALK-IN BOOKING MODAL ================= */}
      {isWalkInOpen && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E4E9F0] space-y-4 animate-in fade-in zoom-in-95 my-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-[#EDF7FA] text-[#0089A8]">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#111C3A]">Quick Walk-In Booking</h3>
                  <p className="text-[11px] text-[#64748B]">Schedule an immediate chairside visit for {formatScheduleHeaderDate(scheduleDate)}</p>
                </div>
              </div>
              <button
                onClick={() => setIsWalkInOpen(false)}
                aria-label="Close modal"
                className="text-[#8291A7] hover:text-[#111C3A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Patient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={walkInForm.patientName}
                  onChange={(e) => setWalkInForm({ ...walkInForm, patientName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 11223"
                    value={walkInForm.patientPhone}
                    onChange={(e) => setWalkInForm({ ...walkInForm, patientPhone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Time Slot *</label>
                  <input
                    type="text"
                    required
                    placeholder="11:30 AM"
                    value={walkInForm.time}
                    onChange={(e) => setWalkInForm({ ...walkInForm, time: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-[#111C3A] block mb-1">Procedure / Complaint</label>
                  <select
                    value={walkInForm.procedure}
                    onChange={(e) => setWalkInForm({ ...walkInForm, procedure: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                  >
                    <option value="Toothache / Emergency Exam">Toothache / Emergency Exam</option>
                    <option value="Temporary Dressing">Temporary Dressing</option>
                    <option value="Emergency Tooth Extraction">Emergency Tooth Extraction</option>
                    <option value="Suture Removal">Suture Removal</option>
                    <option value="RCT Sitting / Access Opening">RCT Sitting / Access Opening</option>
                    <option value="Recement Crown">Recement Crown</option>
                    <option value="Scaling & Cleaning">Scaling & Cleaning</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Duration</label>
                  <select
                    value={walkInForm.durationMinutes}
                    onChange={(e) => setWalkInForm({ ...walkInForm, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Clinical / Operatory Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Severe throbbing pain in lower molar"
                  value={walkInForm.notes}
                  onChange={(e) => setWalkInForm({ ...walkInForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E4E9F0]">
                <button
                  type="button"
                  onClick={() => setIsWalkInOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#64748B] hover:bg-[#EDF7FA] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0089A8] text-white font-semibold hover:bg-[#00738E] shadow-xs flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Confirm Walk-In</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
