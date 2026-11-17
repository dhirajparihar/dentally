"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  X,
  AlertTriangle,
  AlertCircle,
  CalendarCheck,
  CalendarX,
  Phone,
  Share2,
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles,
  ArrowRight,
  Send,
  SlidersHorizontal,
  Check,
  Flame,
} from "lucide-react";
import {
  Appointment,
} from "@/lib/mockData";
import { useRouter } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";

export default function AppointmentsPage() {
  const {
    appointments,
    patients,
    clinicProfile,
    loading,
    bookAppointment,
    completeAppointment,
    rescheduleAppointment,
  } = useClinic();

  // Selected Date for Single Dentist Practice
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "completed" | "missed">("all");

  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);
  const router = useRouter();
  const [bookedSuccessApt, setBookedSuccessApt] = useState<Appointment | null>(null);

  // Quick procedure templates for single dentist (Auto-sets procedure and duration)
  const procedurePresets = [
    { name: "Consultation & Diagnostic X-Ray", duration: 15, tag: "Quick" },
    { name: "Composite Restoration / Filling", duration: 30, tag: "Restorative" },
    { name: "Root Canal Treatment (RCT)", duration: 45, tag: "Endodontics" },
    { name: "Crown Preparation & Impression", duration: 60, tag: "Prosthetics" },
    { name: "Permanent Crown Cementation", duration: 30, tag: "Prosthetics" },
    { name: "Scaling & Root Planing (Teeth Cleaning)", duration: 30, tag: "Hygiene" },
    { name: "Simple Extraction", duration: 30, tag: "Surgery" },
  ];

  // Book Appointment Form State
  const [form, setForm] = useState({
    patientName: "",
    patientPhone: "",
    date: selectedDate,
    time: "10:30 AM",
    durationMinutes: 30,
    procedure: "Root Canal Treatment (RCT)",
    notes: "",
  });

  // Reschedule Form State
  const [rescheduleData, setRescheduleData] = useState({
    date: selectedDate,
    time: "11:00 AM",
    reason: "",
  });

  // Dental Working Day Hours (10 AM - 7 PM)
  const workingHours = [
    "10:00 AM",
    "10:30 AM",
    "11:15 AM",
    "12:00 PM",
    "12:45 PM",
    "02:00 PM",
    "02:45 PM",
    "03:30 PM",
    "04:15 PM",
    "05:00 PM",
    "05:45 PM",
    "06:30 PM",
  ];

  // Filtered by selected date for single dentist timeline
  const dayAppointments = appointments
    .filter((a) => a.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Filtered for list view
  const listAppointments = appointments.filter((a) => {
    if (statusFilter === "all") return true;
    return a.status === statusFilter;
  });

  // Date Navigator Helpers
  const shiftDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  // Status Handlers
  const handleMarkStatus = (id: string, newStatus: "scheduled" | "completed" | "missed" | "cancelled") => {
    if (newStatus === "completed") {
      completeAppointment(id);
    }
  };

  // Open Dossier for Patient
  const handleOpenPatientDossier = (patientId: string, patientName: string) => {
    const found = patients.find((p) => p._id === patientId || p.name === patientName);
    router.push(`/dashboard/patients/${encodeURIComponent(found?._id || patientId)}`);
  };

  // Booking submit
  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const matched = patients.find(
      (p) => p.name.trim().toLowerCase() === form.patientName.trim().toLowerCase()
    );
    const resolvedPatientId = matched ? matched._id : `pat_${Date.now().toString().slice(-4)}`;
    const resolvedPhone = form.patientPhone || (matched ? matched.phone : "+91 98201 00000");

    const newApt: Appointment = {
      _id: `apt_${Date.now()}`,
      patientId: resolvedPatientId,
      patientName: form.patientName.trim(),
      patientPhone: resolvedPhone,
      date: form.date,
      time: form.time,
      durationMinutes: Number(form.durationMinutes) || 30,
      procedure: form.procedure,
      status: "scheduled",
      notes: form.notes,
    };

    await bookAppointment(newApt);
    setIsBookModalOpen(false);
    setBookedSuccessApt(newApt);
    setForm({
      patientName: "",
      patientPhone: "",
      date: selectedDate,
      time: "10:30 AM",
      durationMinutes: 30,
      procedure: "Root Canal Treatment (RCT)",
      notes: "",
    });
  };

  // Reschedule submit
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleApt) return;

    await rescheduleAppointment(
      rescheduleApt._id,
      rescheduleData.date,
      rescheduleData.time,
      rescheduleData.reason
    );
    setRescheduleApt(null);
  };

  // WhatsApp Instant Booking Confirmation
  const getBookingConfirmationWhatsAppUrl = (apt: Appointment) => {
    const cleanPhone = apt.patientPhone.replace(/[^0-9]/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello ${apt.patientName}, your dental appointment with ${clinicProfile.dentistName} at ${clinicProfile.name} is confirmed for ${apt.date} at ${apt.time} (${apt.procedure}).\n\nLocation: ${clinicProfile.address}.\nPhone: ${clinicProfile.phone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  // WhatsApp Pre-Appointment Reminder
  const getWhatsAppReminderUrl = (apt: Appointment) => {
    const cleanPhone = apt.patientPhone.replace(/[^0-9]/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello ${apt.patientName}, this is a reminder for your dental appointment on ${apt.date} at ${apt.time} (${apt.durationMinutes} mins) for ${apt.procedure} with ${clinicProfile.dentistName} at ${clinicProfile.name}.\n\nPlease let us know if you need to reschedule. See you soon!`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  // WhatsApp Post-Op Care Instructions
  const getWhatsAppPostOpUrl = (apt: Appointment) => {
    const cleanPhone = apt.patientPhone.replace(/[^0-9]/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello ${apt.patientName}, thank you for visiting ${clinicProfile.name} today.\n\nPost-procedure instructions from ${clinicProfile.dentistName}:\n1) Avoid chewing hard or crunchy foods on the treated side for 24 hours.\n2) If mild tenderness occurs, take prescribed medications as advised.\n3) Reach out directly if you experience persistent discomfort.\n\nWarm regards,\n${clinicProfile.dentistName} • ${clinicProfile.phone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-white rounded-2xl border border-[#DCE2DE]" />
        <div className="h-32 bg-white rounded-2xl border border-[#DCE2DE]" />
        <div className="h-96 bg-white rounded-2xl border border-[#DCE2DE]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ================= SINGLE DENTIST HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2F8EAC] animate-pulse" />
            <h2 className="font-bold text-2xl sm:text-3xl text-[#1E2D2B] tracking-tight">
              {clinicProfile.dentistName}&apos;s Chair Schedule
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#586B67] mt-1">
            Solo practice operatory calendar • Zero double bookings • 1-click WhatsApp reminders & chairside EHR.
          </p>
        </div>

        {/* View Switcher & Book Action */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <div className="bg-white p-1 rounded-xl border border-[#E7E9E3] flex items-center shadow-2xs">
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "timeline"
                  ? "bg-[#2F8EAC] text-white shadow-2xs"
                  : "text-[#586B67] hover:text-[#1E2D2B]"
              }`}
            >
              Day Stream
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-[#2F8EAC] text-white shadow-2xs"
                  : "text-[#586B67] hover:text-[#1E2D2B]"
              }`}
            >
              All Bookings
            </button>
          </div>

          <button
            onClick={() => {
              setForm((prev) => ({ ...prev, date: selectedDate }));
              setIsBookModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#2F8EAC] text-white text-xs sm:text-sm font-semibold hover:bg-[#24728A] transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Book Patient</span>
          </button>
        </div>
      </div>

      {/* ================= DATE NAVIGATOR BAR ================= */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E7E9E3] shadow-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Previous / Today / Next Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            className="p-2 rounded-xl border border-[#E7E9E3] hover:bg-[#E8F0F1] text-[#586B67] transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all border ${
              isToday
                ? "bg-[#E8F0F1] border-[#C7E7EC] text-[#2F8EAC]"
                : "border-[#E7E9E3] text-[#586B67] hover:bg-slate-50"
            }`}
          >
            Today
          </button>

          <button
            onClick={() => shiftDate(1)}
            className="p-2 rounded-xl border border-[#E7E9E3] hover:bg-[#E8F0F1] text-[#586B67] transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="ml-2">
            <span className="font-bold text-base sm:text-lg text-[#1E2D2B]">
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Schedule Summary Stat Chips for Today */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1 rounded-xl bg-[#FBF9F1] border border-[#E7E9E3] text-[#1E2D2B]">
            <strong>{dayAppointments.length}</strong> Patients on Schedule
          </span>
          <span className="px-3 py-1 rounded-xl bg-[#E8F0F1] border border-[#C7E7EC] text-[#2F8EAC] hidden sm:inline">
            <strong>{dayAppointments.filter((a) => a.status === "completed").length}</strong> Completed
          </span>
        </div>
      </div>

      {/* ================= BOOKING SUCCESS WHATSAPP BANNER ================= */}
      {bookedSuccessApt && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold">
                Appointment Booked: {bookedSuccessApt.patientName} on {bookedSuccessApt.date} at {bookedSuccessApt.time}
              </div>
              <div className="text-[11px] text-emerald-700 font-mono">
                {bookedSuccessApt.procedure} • {bookedSuccessApt.patientPhone}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href={getBookingConfirmationWhatsAppUrl(bookedSuccessApt)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send WhatsApp Slip</span>
            </a>
            <button
              onClick={() => setBookedSuccessApt(null)}
              className="p-1.5 rounded-xl hover:bg-emerald-100 text-emerald-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= INTERACTIVE OPERATORY QUICK SLOTS BAR ================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#DCE2DE]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="font-bold text-xs sm:text-sm text-[#1E2D2B]">
              Chair 1 Operatory Availability ({selectedDate})
            </h4>
          </div>
          <span className="text-[11px] font-mono font-medium text-[#3D5450] hidden sm:inline">
            Click any open slot to instant-book patient
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {workingHours.map((slot) => {
            const bookedApt = dayAppointments.find((a) => a.time === slot && a.status !== "cancelled");
            if (bookedApt) {
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handleOpenPatientDossier(bookedApt.patientId, bookedApt.patientName)}
                  title={`Booked by ${bookedApt.patientName} (${bookedApt.procedure}). Tap to open patient details.`}
                  className="px-3 py-2 rounded-xl bg-[#F8FAF9] border border-[#DCE2DE] text-xs font-mono text-[#3D5450] whitespace-nowrap flex items-center gap-2 shrink-0 hover:border-[#2F8EAC] transition-colors shadow-2xs group"
                >
                  <span className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-[#2F8EAC]" />
                  <span className="font-bold text-[#1E2D2B]">{slot}</span>
                  <span className="truncate max-w-[90px] text-[#2F8EAC] font-sans font-semibold">({bookedApt.patientName.split(" ")[0]})</span>
                </button>
              );
            }

            return (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    date: selectedDate,
                    time: slot,
                  }));
                  setIsBookModalOpen(true);
                }}
                title={`Slot ${slot} is open. Tap to book.`}
                className="px-3 py-2 rounded-xl bg-[#E8F4F8] hover:bg-[#2F8EAC] hover:text-white border border-[#C7E7EC] text-xs font-mono font-bold text-[#24728A] whitespace-nowrap flex items-center gap-1.5 shrink-0 transition-all shadow-2xs hover:scale-105 group"
              >
                <Plus className="w-3.5 h-3.5 group-hover:text-white" />
                <span>{slot}</span>
                <span className="text-[10px] font-normal group-hover:text-white/90">Open</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= VIEW 1: THE DENTIST'S DAY STREAM ================= */}
      {viewMode === "timeline" ? (
        <div className="space-y-4">
          
          {dayAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E7E9E3] p-10 text-center space-y-4 shadow-card-subtle">
              <div className="w-14 h-14 rounded-2xl bg-[#E8F0F1] text-[#2F8EAC] flex items-center justify-center mx-auto border border-[#C7E7EC]">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-[#1E2D2B]">
                  No Patients Scheduled for this Date
                </h3>
                <p className="text-xs sm:text-sm text-[#586B67] max-w-md mx-auto mt-1">
                  {clinicProfile.dentistName}&apos;s chair is currently open all day. Tap below to schedule a walk-in, recall visit, or treatment session.
                </p>
              </div>
              <button
                onClick={() => {
                  setForm((prev) => ({ ...prev, date: selectedDate }));
                  setIsBookModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#2F8EAC] text-white text-xs sm:text-sm font-semibold hover:bg-[#24728A] transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Book Patient for {selectedDate}
              </button>
            </div>
          ) : (
            <div className="relative pl-4 sm:pl-8 space-y-6">
              {/* Vertical Chronological Spine */}
              <div className="absolute top-4 bottom-4 left-6 sm:left-10 w-0.5 bg-[#E7E9E3]" />

              {dayAppointments.map((apt, index) => {
                const isCompleted = apt.status === "completed";
                const isMissed = apt.status === "missed";

                return (
                  <div key={apt._id} className="relative flex items-start gap-4 sm:gap-6 group">
                    {/* Time Bubble & Spine Indicator */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono text-xs font-bold shadow-2xs border ${
                          isCompleted
                            ? "bg-[#E8F0F1] text-[#2F8EAC] border-[#BDDBD1]"
                            : isMissed
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-[#2F8EAC] text-white border-[#24728A]"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[#1E2D2B] mt-1 whitespace-nowrap">
                        {apt.time}
                      </span>
                      <span className="font-mono text-[10px] text-[#7E9691]">
                        {apt.durationMinutes}m
                      </span>
                    </div>

                    {/* Patient Appointment Card */}
                    <div
                      className={`flex-1 rounded-2xl border p-5 transition-all shadow-card-subtle ${
                        isCompleted
                          ? "bg-white/80 border-[#E7E9E3] opacity-80"
                          : isMissed
                          ? "bg-rose-50/40 border-rose-200"
                          : "bg-white border-[#E7E9E3] hover:border-[#2F8EAC]/60"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Patient & Treatment Details */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              onClick={() => handleOpenPatientDossier(apt.patientId, apt.patientName)}
                              className="font-bold text-lg text-[#1E2D2B] hover:text-[#2F8EAC] transition-colors cursor-pointer flex items-center gap-1.5"
                              title="Click to view full patient details"
                            >
                              {apt.patientName}
                              <span className="text-[10px] font-mono font-normal bg-[#E8F0F1] text-[#2F8EAC] px-2 py-0.5 rounded-md border border-[#C7E7EC]">
                                View Patient →
                              </span>
                            </h3>

                            {/* Status Pill */}
                            <span
                              className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                                isCompleted
                                  ? "bg-[#E8F0F1] text-[#2F8EAC] border border-[#BDDBD1]"
                                  : isMissed
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-[#BDDBD1]/30 text-[#1E2D2B] border border-[#BDDBD1]"
                              }`}
                            >
                              {apt.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-[#2F8EAC] font-semibold">
                            <span>{apt.procedure}</span>
                          </div>

                          {apt.notes && (
                            <p className="text-xs text-[#586B67] italic mt-1 font-sans">
                              &ldquo;{apt.notes}&rdquo;
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-[#586B67] font-mono pt-1">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-[#7E9691]" />
                              {apt.patientPhone}
                            </span>
                          </div>
                        </div>

                        {/* Direct Chairside Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E7E9E3]">
                          {/* Send WhatsApp Reminder or Post-Op */}
                          {isCompleted ? (
                            <a
                              href={getWhatsAppPostOpUrl(apt)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-[#E8F0F1] hover:bg-[#BDDBD1]/40 text-[#2F8EAC] text-xs font-semibold flex items-center gap-1 border border-[#C7E7EC] transition-colors"
                              title="Send post-procedure care instructions via WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5 text-[#2F8EAC]" />
                              <span>WhatsApp Post-Op Care</span>
                            </a>
                          ) : (
                            <a
                              href={getWhatsAppReminderUrl(apt)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#586B67] text-xs font-semibold flex items-center gap-1 border border-[#E7E9E3] transition-colors"
                              title="Send appointment reminder on WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5 text-[#2F8EAC]" />
                              <span>WhatsApp Reminder</span>
                            </a>
                          )}

                          {/* 1-Tap Chairside Status Transitions */}
                          {!isCompleted && !isMissed && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleMarkStatus(apt._id, "completed")}
                                className="px-3 py-1.5 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Complete Visit</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRescheduleApt(apt);
                                  setRescheduleData({ date: apt.date, time: apt.time, reason: "" });
                                }}
                                className="px-2.5 py-1.5 rounded-xl text-xs text-[#586B67] hover:bg-slate-100 font-semibold"
                              >
                                Reschedule
                              </button>
                            </div>
                          )}

                          {isCompleted && (
                            <button
                              onClick={() => handleMarkStatus(apt._id, "scheduled")}
                              className="text-[11px] font-mono text-[#7E9691] hover:underline px-2"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* End of Day Chair Indicator */}
              <div className="pt-2 text-center">
                <button
                  onClick={() => {
                    setForm((prev) => ({ ...prev, date: selectedDate }));
                    setIsBookModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E7E9E3] hover:border-[#2F8EAC] text-xs font-mono text-[#586B67] hover:text-[#2F8EAC] transition-all shadow-2xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Patient for {selectedDate}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= VIEW 2: COMPLETE BOOKINGS LIST ================= */
        <div className="space-y-4">
          {/* Status Filters */}
          <div className="flex items-center gap-2 border-b border-[#E7E9E3] pb-2 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                statusFilter === "all"
                  ? "bg-[#2F8EAC] text-white"
                  : "text-[#586B67] hover:text-[#1E2D2B]"
              }`}
            >
              All ({appointments.length})
            </button>
            <button
              onClick={() => setStatusFilter("scheduled")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                statusFilter === "scheduled"
                  ? "bg-[#2F8EAC] text-white"
                  : "text-[#586B67] hover:text-[#1E2D2B]"
              }`}
            >
              Scheduled ({appointments.filter((a) => a.status === "scheduled").length})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                statusFilter === "completed"
                  ? "bg-[#2F8EAC] text-white"
                  : "text-[#586B67] hover:text-[#1E2D2B]"
              }`}
            >
              Completed ({appointments.filter((a) => a.status === "completed").length})
            </button>
            <button
              onClick={() => setStatusFilter("missed")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                statusFilter === "missed"
                  ? "bg-[#2F8EAC] text-white"
                  : "text-[#586B67] hover:text-[#1E2D2B]"
              }`}
            >
              Missed ({appointments.filter((a) => a.status === "missed").length})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listAppointments.map((apt) => (
              <div
                key={apt._id}
                className="bg-white p-5 rounded-2xl border border-[#E7E9E3] shadow-card-subtle flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#2F8EAC]">
                      {apt.date} • {apt.time}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                        apt.status === "completed"
                          ? "bg-[#E8F0F1] text-[#2F8EAC]"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  <h4
                    onClick={() => handleOpenPatientDossier(apt.patientId, apt.patientName)}
                    className="font-bold text-base text-[#1E2D2B] mt-1.5 hover:text-[#2F8EAC] cursor-pointer"
                  >
                    {apt.patientName}
                  </h4>
                  <p className="text-xs font-semibold text-[#586B67]">{apt.procedure}</p>
                  <p className="text-[11px] font-mono text-[#7E9691] mt-1">{apt.patientPhone}</p>
                </div>

                <div className="pt-2 border-t border-[#E7E9E3] flex items-center justify-between text-xs">
                  <a
                    href={getWhatsAppReminderUrl(apt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2F8EAC] font-semibold hover:underline flex items-center gap-1"
                  >
                    <Share2 className="w-3.5 h-3.5" /> WhatsApp
                  </a>

                  {apt.status === "scheduled" && (
                    <button
                      onClick={() => handleMarkStatus(apt._id, "completed")}
                      className="px-3 py-1 rounded-lg bg-[#2F8EAC] text-white font-semibold text-xs hover:bg-[#24728A]"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= SMART BOOKING MODAL FOR SINGLE DENTIST ================= */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-[#162321]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E7E9E3] text-xs my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E9E3]">
              <div>
                <h3 className="font-bold text-lg text-[#1E2D2B]">
                  Book Patient into {clinicProfile.dentistName}&apos;s Chair
                </h3>
                <p className="text-[11px] text-[#586B67] mt-0.5">
                  Single operatory schedule • Avoids time overlaps automatically
                </p>
              </div>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="p-1 rounded-lg text-[#7E9691] hover:text-[#1E2D2B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookSubmit} className="mt-4 space-y-4">
              
              {/* Quick Procedure Template Chips */}
              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1.5">
                  1-Tap Procedure Preset (Auto-sets duration):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {procedurePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          procedure: preset.name,
                          durationMinutes: preset.duration,
                        }));
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all text-left ${
                        form.procedure === preset.name
                          ? "bg-[#2F8EAC] text-white border-[#2F8EAC] font-semibold"
                          : "bg-[#FBF9F1] border-[#E7E9E3] text-[#586B67] hover:bg-[#E8F0F1]"
                      }`}
                    >
                      {preset.name} ({preset.duration}m)
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  list="registered-patients"
                  placeholder="e.g. Rahul Sharma"
                  value={form.patientName}
                  onChange={(e) => {
                    const name = e.target.value;
                    const matched = patients.find((p) => p.name.toLowerCase() === name.toLowerCase());
                    setForm((prev) => ({
                      ...prev,
                      patientName: name,
                      ...(matched ? { patientPhone: matched.phone } : {}),
                    }));
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none focus:border-[#2F8EAC] bg-[#FBF9F1]"
                />
                <datalist id="registered-patients">
                  {patients.map((p) => (
                    <option key={p._id} value={p.name}>
                      {p.phone} ({p._id})
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Patient WhatsApp Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98201 44521"
                  value={form.patientPhone}
                  onChange={(e) => setForm({ ...form, patientPhone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none focus:border-[#2F8EAC] font-mono bg-[#FBF9F1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1E2D2B] block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none focus:border-[#2F8EAC] font-mono bg-[#FBF9F1]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1E2D2B] block mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    step={15}
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none focus:border-[#2F8EAC] font-mono bg-[#FBF9F1]"
                  />
                </div>
              </div>

              {/* Visual Operatory Time Slot Selection Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#1E2D2B] block text-xs">
                    Select Available Time Slot for {form.date}:
                  </label>
                  <span className="text-[11px] font-mono text-[#7E9691]">
                    Selected: <strong className="text-[#2F8EAC]">{form.time}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {workingHours.map((hour) => {
                    const booked = appointments.some(
                      (a) => a.date === form.date && a.time === hour && a.status === "scheduled"
                    );
                    const isSelected = form.time === hour;

                    if (booked) {
                      return (
                        <div
                          key={hour}
                          className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-center text-slate-400 text-xs font-mono cursor-not-allowed opacity-60"
                          title="Time slot already occupied"
                        >
                          <div className="line-through">{hour}</div>
                          <span className="text-[9px]">Booked</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => setForm({ ...form, time: hour })}
                        className={`p-2 rounded-xl text-center text-xs font-mono transition-all border ${
                          isSelected
                            ? "bg-[#2F8EAC] text-white border-[#2F8EAC] font-bold shadow-xs scale-102"
                            : "bg-[#FBF9F1] hover:bg-[#E8F0F1] border-[#E7E9E3] text-[#1E2D2B]"
                        }`}
                      >
                        <div>{hour}</div>
                        <span className={`text-[9px] ${isSelected ? "text-white" : "text-[#2F8EAC]"}`}>
                          {isSelected ? "Selected" : "Free"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conflict Detection Notice */}
              {(() => {
                const conflict = appointments.find(
                  (a) => a.date === form.date && a.time === form.time && a.status === "scheduled"
                );
                if (!conflict) return null;
                return (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Solo Operatory Notice:</strong> {clinicProfile.dentistName} is already scheduled with{" "}
                      <strong>{conflict.patientName}</strong> at {form.time}. Please select an adjacent time slot to avoid double booking.
                    </span>
                  </div>
                );
              })()}

              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Chairside Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Advised soft diet, bring previous X-rays"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none focus:border-[#2F8EAC] bg-[#FBF9F1]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E7E9E3]">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#586B67] hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2F8EAC] text-white font-semibold hover:bg-[#24728A] transition-colors shadow-xs"
                >
                  Lock Appointment Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RESCHEDULE MODAL ================= */}
      {rescheduleApt && (
        <div className="fixed inset-0 bg-[#162321]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E9E3] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E9E3]">
              <h3 className="font-bold text-base text-[#1E2D2B]">Reschedule Patient</h3>
              <button onClick={() => setRescheduleApt(null)} className="text-[#7E9691] hover:text-[#1E2D2B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[#586B67] my-3">
              Rescheduling appointment for: <strong className="text-[#1E2D2B]">{rescheduleApt.patientName}</strong>
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">New Date *</label>
                <input
                  type="date"
                  required
                  value={rescheduleData.date}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none font-mono bg-[#FBF9F1]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">New Time *</label>
                <select
                  value={rescheduleData.time}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none font-mono bg-[#FBF9F1]"
                >
                  {workingHours.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Reason for Rescheduling</label>
                <input
                  type="text"
                  placeholder="e.g. Patient requested morning slot"
                  value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none bg-[#FBF9F1]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E7E9E3]">
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="px-3.5 py-1.5 rounded-xl text-[#586B67] hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#2F8EAC] text-white font-semibold hover:bg-[#24728A]"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
