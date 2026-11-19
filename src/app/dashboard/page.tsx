"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowRight, Calendar, Check, CheckCircle2, CreditCard, IndianRupee, MoreHorizontal, Phone,
  Plus, QrCode, RefreshCw, Share2, User, X,
} from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import type { Appointment, Patient } from "@/lib/mockData";
import {
  findAppointmentConflict,
  findBookedFollowUp,
  getAppointmentClock,
  isFutureAppointment,
  parseAppointmentTime,
  shiftAppointmentDate,
} from "@/lib/appointmentTime";
import { useMinuteClock } from "@/lib/useMinuteClock";
import { AppointmentCard, AppointmentStatusSummary } from "@/components/dashboard/AppointmentCard";
import { RecordPaymentDialog, type RecordPaymentDefaults } from "@/components/dashboard/RecordPaymentDialog";

const appointmentsUrl = "/dashboard/appointments";
const feesUrl = "/dashboard/fees";
const recallsUrl = "/dashboard/patients?sort=recall";
const patientUrl = (id: string) => `/dashboard/patients/${encodeURIComponent(id)}`;
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const clinicDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const appointmentStatusOrder: Record<Appointment["status"], number> = {
  scheduled: 0,
  missed: 1,
  cancelled: 2,
  completed: 3,
};

function whatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/[^0-9]/g, "").replace(/^0+/, "");
  const recipient = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;
}

function getRecallBadge(dueDate: string, today: string) {
  const days = Math.round((Date.parse(dueDate) - Date.parse(today)) / 86_400_000);
  if (days < 0) return { label: `Overdue ${-days}d`, color: "border-rose-200 bg-rose-50 text-rose-700" };
  if (days > 0) return { label: `In ${days}d`, color: "border-teal-200 bg-teal-50 text-teal-800" };
  return { label: "Due Today", color: "border-amber-200 bg-amber-50 text-amber-800" };
}

export default function DashboardOverviewPage() {
  const {
    patients,
    appointments,
    fees,
    payments,
    clinicProfile,
    loading,
    cancelAppointment,
    bookAppointment,
    recordPayment,
  } = useClinic();

  const router = useRouter();

  // If a new dentist has not configured their clinic profile yet, redirect to Settings once
  useEffect(() => {
    if (!loading && clinicProfile && clinicProfile.isConfigured === false) {
      const alreadyRedirected =
        typeof window !== "undefined" &&
        sessionStorage.getItem("dentally_setup_visited");
      if (!alreadyRedirected) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("dentally_setup_visited", "true");
        }
        router.replace("/dashboard/settings?setup=first-time");
      }
    }
  }, [loading, clinicProfile, router]);

  const [paymentDefaults, setPaymentDefaults] = useState<RecordPaymentDefaults | null>(null);
  const [qrAmount, setQrAmount] = useState<number | null>(null);
  const [qrBalancePatient, setQrBalancePatient] = useState<Pick<Patient, "_id" | "name"> | null>(null);
  const [selectedQrPatientId, setSelectedQrPatientId] = useState("");
  const [qrRecordedSuccess, setQrRecordedSuccess] = useState<string | null>(null);
  const [isRecordingQrPayment, setIsRecordingQrPayment] = useState(false);

  useEffect(() => {
    if (!qrRecordedSuccess) return;
    const timer = setTimeout(() => {
      setQrAmount(null);
      setQrRecordedSuccess(null);
    }, 1600);
    return () => clearTimeout(timer);
  }, [qrRecordedSuccess]);

  const openQr = (amount: number, balancePatient: Patient | null = null) => {
    setQrBalancePatient(balancePatient);
    setSelectedQrPatientId(balancePatient?._id ?? patients[0]?._id ?? "");
    setQrRecordedSuccess(null);
    setQrAmount(amount);
  };

  const closeQr = () => {
    setQrAmount(null);
    setQrRecordedSuccess(null);
  };

  const now = useMinuteClock();
  const clock = getAppointmentClock(now);
  const today = clock.date;
  const greeting = clock.minutes < 12 * 60 ? "Good morning" : clock.minutes < 17 * 60 ? "Good afternoon" : "Good evening";
  const todayAppointments = appointments
    .filter((appointment) => appointment.date === today)
    .sort((a, b) => {
      const completionOrder = Number(a.status === "completed") - Number(b.status === "completed");
      if (completionOrder !== 0) return completionOrder;

      const timeA = parseAppointmentTime(a.time);
      const timeB = parseAppointmentTime(b.time);
      const timeOrder = a.status === "completed"
        ? (timeB ?? -1) - (timeA ?? -1)
        : (timeA ?? 24 * 60) - (timeB ?? 24 * 60);
      return timeOrder || appointmentStatusOrder[a.status] - appointmentStatusOrder[b.status];
    });

  // The Fees page and existing payment records use UTC dates.
  const paymentDate = now.toISOString().slice(0, 10);
  const todayPayments = payments.filter((payment) => payment.date === paymentDate && !payment.isRefund);
  const collectedToday = todayPayments.reduce((total, payment) => total + payment.amount, 0);
  const upiToday = todayPayments.filter((p) => p.paymentMethod === "UPI").reduce((sum, p) => sum + p.amount, 0);
  const cashToday = todayPayments.filter((p) => p.paymentMethod === "Cash").reduce((sum, p) => sum + p.amount, 0);
  const patientsWithBalances = patients.map((patient) => {
    const billed = fees
      .filter((fee) => fee.patientId === patient._id)
      .reduce((sum, fee) => sum + fee.netAmount, 0);
    const paid = payments
      .filter((payment) => payment.patientId === patient._id)
      .reduce((sum, payment) => sum + (payment.isRefund ? -payment.amount : payment.amount), 0);
    return { patient, balance: Number((billed - paid).toFixed(2)) };
  }).filter(({ balance }) => balance > 0);
  const outstanding = patientsWithBalances.reduce((total, { balance }) => total + balance, 0);
  const weekAhead = shiftAppointmentDate(today, 7);
  const scheduledPatients = new Set(
    appointments
      .filter((appointment) => appointment.status === "scheduled" && appointment.date >= today)
      .map((appointment) => appointment.patientId)
  );
  const recallsDue = patients.flatMap((patient) => {
    const { followUpDue, lastVisit, _id } = patient;
    return followUpDue && followUpDue <= weekAhead && (!lastVisit || lastVisit < followUpDue) && !scheduledPatients.has(_id)
      ? [{ patient, dueDate: followUpDue }]
      : [];
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const metrics = [
    { label: "Appointments", value: todayAppointments.length, icon: Calendar, href: appointmentsUrl, tone: "blue" },
    {
      label: "Collected Today",
      value: money.format(collectedToday),
      subtext: collectedToday > 0 ? `UPI ${money.format(upiToday)} · Cash ${money.format(cashToday)}` : undefined,
      icon: IndianRupee,
      href: feesUrl,
      tone: "green",
    },
    { label: "Outstanding", value: money.format(outstanding), icon: AlertCircle, href: feesUrl, tone: "rose" },
    { label: "Recalls Due", value: recallsDue.length, icon: RefreshCw, href: recallsUrl, tone: "teal" },
  ];

  const getReminderUrl = (appointment: Appointment) => {
    const message = `Hello ${appointment.patientName}, this is a reminder for your dental appointment today at ${appointment.time} (${appointment.procedure}) with ${clinicProfile.dentistName} at ${clinicProfile.name}.\n\nPlease let us know when you arrive. See you soon!`;
    return whatsAppUrl(appointment.patientPhone, message);
  };

  const getRecallUrl = (patient: Patient, dueDate: string) => {
    const message = `Hello ${patient.name}, greetings from ${clinicProfile.name}!\n\nDr. ${clinicProfile.dentistName} recommends a dental follow-up (due ${dueDate}). Would you like to book a visit? Reply here or call ${clinicProfile.phone}.`;
    return whatsAppUrl(patient.phone, message);
  };

  const getBalanceReminderUrl = (patient: Patient, balance: number) => {
    const upiId = clinicProfile.upiId || "dentally@upi";
    const message = `Hello ${patient.name}, greetings from ${clinicProfile.name}.\n\nYour account has an outstanding balance of ${money.format(balance)}. You can pay via UPI at ${upiId} or scan our QR code at your next visit.\n\n${clinicProfile.dentistName} · ${clinicProfile.phone}`;
    return whatsAppUrl(patient.phone, message);
  };

  return (
    <div className="overview space-y-5 sm:space-y-6">
      {/* Unconfigured Clinic Profile Warning */}
      {!loading && clinicProfile && clinicProfile.isConfigured === false && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Your clinic profile is not yet configured. Set up your clinic name, doctor credentials, and UPI ID to ensure receipts and AI booking work seamlessly.
            </span>
          </div>
          <Link
            href="/dashboard/settings"
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>Complete Setup</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold leading-tight sm:text-2xl">{greeting}</h2>
        <p className="mt-1 text-sm text-[#64748B]">
          <time dateTime={today}>{clinicDate.format(now)}</time> &middot; Clinic overview
        </p>
      </div>

      <section aria-label="Dashboard summary" aria-busy={loading} className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map(({ label, value, subtext, icon: Icon, href, tone }) => (
          <Link key={label} href={href} className="overview-metric" data-tone={tone}>
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xs font-medium text-[#52627A]">{label}</span>
              <span className="overview-metric-icon grid size-8 shrink-0 place-items-center rounded-full" aria-hidden="true">
                <Icon size={16} strokeWidth={1.75} />
              </span>
            </div>
            <p className="mt-2 break-words text-xl font-bold leading-tight tracking-tight tabular-nums sm:text-2xl">
              {loading ? "—" : value}
            </p>
            {subtext && !loading && (
              <p className="mt-1 text-[11px] font-mono text-[#52627A] truncate">
                {subtext}
              </p>
            )}
          </Link>
        ))}
      </section>

      <section aria-labelledby="quick-actions-heading" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="quick-actions-heading" className="text-sm font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="workspace-button secondary small"
            aria-haspopup="dialog"
            disabled={loading || patients.length === 0}
            onClick={() => {
              const firstBalance = patientsWithBalances[0];
              setPaymentDefaults({
                patientId: firstBalance?.patient._id ?? patients[0]?._id ?? "",
                amount: firstBalance?.balance,
              });
            }}
          >
            <IndianRupee size={16} aria-hidden="true" />
            Record Payment
          </button>
        </div>
      </section>

      <section aria-labelledby="today-appointments-heading" className="space-y-3" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 id="today-appointments-heading" className="text-base font-bold">
            Today&apos;s Appointments {!loading && <span className="ml-1 text-xs font-normal text-[#64748B]">({todayAppointments.length})</span>}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4">
            {!loading && <AppointmentStatusSummary appointments={todayAppointments} />}
            <Link href={appointmentsUrl} aria-label="View all appointments" className="inline-flex min-h-9 items-center text-sm font-semibold text-[#00738E] hover:underline">
              View All
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3" role="status" aria-label="Loading appointments">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[#E4E9F0] bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 rounded-lg bg-slate-100" />
                  <div className="h-6 w-20 rounded-full bg-slate-100" />
                </div>
                <div className="h-5 w-40 rounded-lg bg-slate-200" />
                <div className="h-4 w-32 rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        ) : todayAppointments.length === 0 ? (
          <div className="appointment-empty">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF7FA] text-[#0089A8] shadow-inner">
              <Calendar size={22} aria-hidden="true" />
            </div>
            <p className="text-sm font-bold text-[#111C3A]">No appointments scheduled today</p>
            <p className="mt-1 text-xs text-[#64748B]">Your operatory schedule is clear today.</p>
            <Link
              href={appointmentsUrl}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-[#0089A8] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#00738E]"
            >
              <Plus size={14} /> Book Appointment
            </Link>
          </div>
        ) : (
          <div className="appointment-timeline space-y-3">
            {todayAppointments.map((appointment) => {
              const dossierUrl = patientUrl(appointment.patientId);
              const visitId = encodeURIComponent(appointment._id);
              const followUp = appointment.status === "completed" ? findBookedFollowUp(appointments, appointment._id) : undefined;
              const isInactive = appointment.status === "missed" || appointment.status === "cancelled";
              const canReopen = isInactive
                && isFutureAppointment(appointment.date, appointment.time, clock)
                && !findAppointmentConflict(appointments, appointment.date, appointment.time, appointment.durationMinutes, appointment._id);

              return (
                <AppointmentCard key={appointment._id} appointment={appointment} clock={clock} patientHref={dossierUrl}>
                  <details
                    name="overview-appointment-actions"
                    className="appointment-menu"
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Escape" || !event.currentTarget.open) return;
                      event.currentTarget.open = false;
                      event.currentTarget.querySelector("summary")?.focus();
                    }}
                  >
                    <summary aria-label={`More actions for ${appointment.patientName}`}>
                      <MoreHorizontal size={20} aria-hidden="true" />
                    </summary>
                    <div className="appointment-menu-items" role="group" aria-label={`Actions for ${appointment.patientName}`} onClick={(event) => {
                      if (!(event.target as Element).closest("button, a")) return;
                      const menu = event.currentTarget.closest("details");
                      if (menu) {
                        menu.open = false;
                        menu.querySelector("summary")?.focus();
                      }
                    }}>
                      <a href={`tel:${appointment.patientPhone}`}><Phone size={15} aria-hidden="true" />Call Patient</a>
                      {appointment.status === "scheduled" && (
                        <>
                          <a href={getReminderUrl(appointment)} target="_blank" rel="noopener noreferrer"><Share2 size={15} aria-hidden="true" />WhatsApp Reminder</a>
                          <button type="button" onClick={() => cancelAppointment(appointment._id)} className="text-rose-700">
                            <X size={15} aria-hidden="true" />Cancel Appointment
                          </button>
                        </>
                      )}
                      {appointment.status === "completed" && (
                        <Link href={followUp ? `${dossierUrl}?visit=${encodeURIComponent(followUp._id)}` : `${dossierUrl}?followUp=${visitId}`}>
                          <Calendar size={15} aria-hidden="true" />{followUp ? "View Follow-Up" : "Book Follow-Up"}
                        </Link>
                      )}
                      {isInactive && (
                        canReopen ? (
                          <button type="button" onClick={() => bookAppointment({ ...appointment, status: "scheduled" })}>
                            <RefreshCw size={15} aria-hidden="true" />Reopen Appointment
                          </button>
                        ) : (
                          <Link href={appointmentsUrl}><Calendar size={15} aria-hidden="true" />Reschedule</Link>
                        )
                      )}
                    </div>
                  </details>
                </AppointmentCard>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <section aria-labelledby="recalls-heading" className="min-w-0 space-y-2" aria-busy={loading}>
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <h2 id="recalls-heading" className="flex items-center gap-2 text-base font-bold">
              <RefreshCw size={17} className="shrink-0 text-[#0089A8]" aria-hidden="true" />
              Due for Recall &amp; Follow-Up
            </h2>
            <Link href={recallsUrl} aria-label="View all recalls" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-[#00738E] hover:underline">
              View All <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-3xl border border-[#E4E9F0] bg-white overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3 animate-pulse" role="status" aria-label="Loading recalls">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-28 rounded bg-slate-200" />
                      <div className="h-3 w-16 rounded bg-slate-100" />
                    </div>
                    <div className="h-7 w-16 rounded-xl bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : recallsDue.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EDF7FA] text-[#0089A8]">
                  <CheckCircle2 size={20} aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-[#111C3A]">Recalls all caught up</p>
                <p className="mt-0.5 text-xs text-[#64748B]">No patient follow-ups or checkups due this week.</p>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-[#E4E9F0]">
                {recallsDue.slice(0, 5).map(({ patient, dueDate }) => {
                  const badge = getRecallBadge(dueDate, today);
                  return (
                    <li key={patient._id} className="patient-row flex-wrap justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="patient-avatar" aria-hidden="true"><User size={18} /></span>
                        <div className="min-w-0">
                          <Link href={patientUrl(patient._id)} className="break-words text-sm font-semibold hover:text-[#00738E] hover:underline">
                            {patient.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            <span className={`rounded-full border px-2 py-0.5 ${badge.color}`}>{badge.label}</span>
                            <time dateTime={dueDate} className="text-[#64748B]">{dueDate}</time>
                          </div>
                        </div>
                      </div>
                      <a
                        href={getRecallUrl(patient, dueDate)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Send WhatsApp recall reminder to ${patient.name}`}
                        title="WhatsApp recall reminder"
                        className="ml-auto inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <Share2 size={14} aria-hidden="true" /> Recall
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="balances-heading" className="min-w-0 space-y-2" aria-busy={loading}>
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <h2 id="balances-heading" className="flex items-center gap-2 text-base font-bold">
              <CreditCard size={17} className="shrink-0 text-[#0089A8]" aria-hidden="true" />
              Outstanding Balances
            </h2>
            <Link href={feesUrl} aria-label="View all outstanding balances" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-[#00738E] hover:underline">
              View All <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-3xl border border-[#E4E9F0] bg-white overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3 animate-pulse" role="status" aria-label="Loading balances">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-28 rounded bg-slate-200" />
                      <div className="h-3 w-16 rounded bg-slate-100" />
                    </div>
                    <div className="h-7 w-20 rounded-xl bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : patientsWithBalances.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={20} aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-[#111C3A]">All accounts settled</p>
                <p className="mt-0.5 text-xs text-[#64748B]">No outstanding patient dues at this time.</p>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-[#E4E9F0]">
                {patientsWithBalances.slice(0, 5).map(({ patient, balance }) => (
                  <li key={patient._id} className="patient-row flex-wrap justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="patient-avatar" aria-hidden="true"><User size={18} /></span>
                      <div className="min-w-0">
                        <Link href={patientUrl(patient._id)} className="break-words text-sm font-semibold hover:text-[#00738E] hover:underline">
                          {patient.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-[#64748B]">{patient.phone}</p>
                      </div>
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      <p className="text-right">
                        <span className="block text-sm font-bold tabular-nums text-rose-700">{money.format(balance)}</span>
                        <span className="block text-xs text-[#64748B]">Due</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => openQr(balance, patient)}
                        aria-label={`Open payment QR for ${patient.name}`}
                        title="Open payment QR"
                        className="inline-grid size-8 place-items-center rounded-full border border-[#8DC9D7] bg-[#EDF7FA] text-[#00738E] hover:bg-[#D8EEF3]"
                      >
                        <QrCode size={15} aria-hidden="true" />
                      </button>
                      <a
                        href={getBalanceReminderUrl(patient, balance)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Send WhatsApp payment reminder to ${patient.name}`}
                        title="WhatsApp payment reminder"
                        className="inline-grid size-8 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        <Share2 size={15} aria-hidden="true" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {paymentDefaults && (
        <RecordPaymentDialog defaults={paymentDefaults} onClose={() => setPaymentDefaults(null)} />
      )}

      {qrAmount !== null && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="desk-qr-heading" className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E4E9F0] text-center space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E9F0]">
              <h2 id="desk-qr-heading" className="font-mono text-xs font-bold text-[#0089A8] flex items-center gap-1.5">
                <QrCode className="w-4 h-4" aria-hidden="true" /> Chairside Desk UPI QR
              </h2>
              <button
                type="button"
                onClick={closeQr}
                disabled={isRecordingQrPayment}
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
                  aria-label="QR payment amount"
                  value={qrAmount || ""}
                  onChange={(event) => setQrAmount(Math.max(0, Number(event.target.value) || 0))}
                  placeholder="Amount"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E4E9F0] text-center font-mono font-bold text-lg text-[#111C3A] outline-none focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 bg-[#FAFBFC]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {[500, 1500, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQrAmount(amt)}
                    className={`text-[11px] px-2.5 py-1 rounded-xl border font-mono font-semibold transition-all ${
                      qrAmount === amt
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
                    )}&am=${qrAmount}&cu=INR`
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
              {qrBalancePatient ? (
                <p className="text-sm text-[#64748B]">Patient <strong className="text-[#111C3A]">{qrBalancePatient.name}</strong></p>
              ) : (
                <div className="text-left pt-1">
                  <label htmlFor="desk-qr-patient" className="text-[10px] font-mono text-[#64748B] block mb-1">Credit Payment To Patient:</label>
                  <select
                    id="desk-qr-patient"
                    value={selectedQrPatientId}
                    onChange={(event) => setSelectedQrPatientId(event.target.value)}
                    className="w-full p-2 rounded-xl border border-[#E4E9F0] text-xs bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                  >
                    <option value="">Walk-In (General Desk Collection)</option>
                    {patients.map((patient) => (
                      <option key={patient._id} value={patient._id}>{patient.name} ({patient.phone})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="text-2xl font-bold font-mono tracking-tight text-[#111C3A] pt-1">
                ₹{qrAmount.toLocaleString("en-IN")}
              </div>
              <span className="text-[10px] font-mono text-[#8291A7] block">
                UPI ID: {clinicProfile.upiId || "dentally@upi"}
              </span>
            </div>

            {qrRecordedSuccess ? (
              <div role="status" className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{qrRecordedSuccess}</span>
              </div>
            ) : (
              <div className="pt-2 border-t border-[#E4E9F0] flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isRecordingQrPayment || qrAmount <= 0}
                  onClick={async () => {
                    setIsRecordingQrPayment(true);
                    try {
                      const patient = qrBalancePatient ?? patients.find((entry) => entry._id === selectedQrPatientId);
                      await recordPayment({
                        _id: `pay_${Date.now()}`,
                        patientId: patient?._id || "walk_in",
                        patientName: patient?.name || "Walk-In Patient",
                        date: paymentDate,
                        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                        amount: qrAmount,
                        paymentMethod: "UPI",
                        notes: "Chairside Desk UPI QR collection",
                        receiptNo: `REC-${Date.now().toString().slice(-4)}`,
                      });
                      setQrRecordedSuccess(`₹${qrAmount.toLocaleString("en-IN")} recorded & credited to daily collections!`);
                    } catch (err) {
                      console.error("Failed to record QR payment", err);
                    } finally {
                      setIsRecordingQrPayment(false);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{isRecordingQrPayment ? "Recording..." : `Record ₹${qrAmount.toLocaleString("en-IN")} as Paid`}</span>
                </button>
                <button
                  type="button"
                  onClick={closeQr}
                  disabled={isRecordingQrPayment}
                  className="w-full py-2 rounded-xl text-[#8291A7] hover:text-[#111C3A] text-xs font-medium"
                >
                  Dismiss Without Recording
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
