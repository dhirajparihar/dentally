"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Plus,
  CheckCircle2,
  X,
  AlertCircle,
  Phone,
  Share2,
  ChevronLeft,
  ChevronRight,
  User,
  ArrowRight,
  Send,
  Check,
  MoreHorizontal,
} from "lucide-react";
import {
  Appointment,
  Patient,
} from "@/lib/mockData";
import { useRouter } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";
import { getAppointmentClock, isFutureAppointment, parseAppointmentTime, shiftAppointmentDate } from "@/lib/appointmentTime";

interface AppointmentActionsProps {
  appointment: Appointment;
  reminderUrl: string;
  careUrl: string;
  onView: () => void;
  onReschedule: () => void;
  onReopen: () => void;
  canReopen: boolean;
  onCancel: () => void;
  onMarkMissed: () => void;
}

function AppointmentActions({ appointment, reminderUrl, careUrl, onView, onReschedule, onReopen, canReopen, onCancel, onMarkMissed }: AppointmentActionsProps) {
  return (
    <details className="appointment-menu" onToggle={(event) => {
      if (!event.currentTarget.open) return;
      document.querySelectorAll<HTMLDetailsElement>("details.appointment-menu[open]").forEach((menu) => {
        if (menu !== event.currentTarget) menu.open = false;
      });
    }}>
      <summary aria-label={`More actions for ${appointment.patientName}`}><MoreHorizontal size={20} /></summary>
      <div className="appointment-menu-items" role="group" aria-label={`Actions for ${appointment.patientName}`} onClick={(event) => {
        if ((event.target as Element).closest("button, a")) event.currentTarget.closest("details")?.removeAttribute("open");
      }}>
        <button type="button" onClick={onView}><User size={15} />View Patient</button>
        <a href={appointment.status === "completed" ? careUrl : reminderUrl} target="_blank" rel="noopener noreferrer"><Share2 size={15} />{appointment.status === "completed" ? "WhatsApp Care" : "WhatsApp Reminder"}</a>
        <a href={`tel:${appointment.patientPhone}`}><Phone size={15} />Call Patient</a>
        {appointment.status === "scheduled" && <button type="button" onClick={onReschedule}><Calendar size={15} />Reschedule</button>}
        {appointment.status === "scheduled" && <button type="button" onClick={onMarkMissed} className="text-amber-700"><AlertCircle size={15} />Mark as Missed</button>}
        {canReopen && appointment.status !== "scheduled" && <button type="button" onClick={onReopen}><ArrowRight size={15} />Reopen Visit</button>}
        {appointment.status === "scheduled" && <button type="button" onClick={onCancel} className="text-rose-700"><X size={15} />Cancel Appointment</button>}
      </div>
    </details>
  );
}

export default function AppointmentsPage() {
  const {
    appointments,
    patients,
    clinicProfile,
    loading,
    addPatient,
    bookAppointment,
    completeAppointment,
    cancelAppointment,
    missAppointment,
    rescheduleAppointment,
  } = useClinic();

  // Selected Date for Single Dentist Practice
  const [clock, setClock] = useState(getAppointmentClock);
  const [selectedDate, setSelectedDate] = useState(clock.date);
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "completed" | "missed" | "cancelled">("all");

  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [rescheduleOverride, setRescheduleOverride] = useState(false);
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);
  const router = useRouter();
  const [bookedSuccessApt, setBookedSuccessApt] = useState<Appointment | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const updateClock = () => {
      setClock(getAppointmentClock());
      timer = setTimeout(updateClock, 60_000 - Date.now() % 60_000);
    };
    updateClock();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if ((event.target as Element).closest(".appointment-menu")) return;
      document.querySelectorAll<HTMLDetailsElement>("details.appointment-menu[open]").forEach((menu) => { menu.open = false; });
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      document.querySelectorAll<HTMLDetailsElement>("details.appointment-menu[open]").forEach((menu) => {
        menu.open = false;
        menu.querySelector<HTMLElement>("summary")?.focus();
      });
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

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
    time: "",
    durationMinutes: 30,
    procedure: "Root Canal Treatment (RCT)",
    notes: "",
  });

  // Reschedule Form State
  const [rescheduleData, setRescheduleData] = useState({
    date: selectedDate,
    time: "",
    reason: "",
  });

  // Dynamically generate slots from ClinicProfile settings
  const workingHours = useMemo(() => {
    const sMin = parseAppointmentTime(clinicProfile.workingHoursStart) ?? 600;
    const eMin = parseAppointmentTime(clinicProfile.workingHoursEnd) ?? 1140;
    const step = Math.max(15, clinicProfile.slotDuration || 30);
    const slots: string[] = [];

    for (let m = sMin; m + step <= eMin; m += step) {
      let h = Math.floor(m / 60);
      const min = m % 60;
      const period = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      const hStr = h.toString().padStart(2, "0");
      const mStr = min.toString().padStart(2, "0");
      slots.push(`${hStr}:${mStr} ${period}`);
    }

    if (slots.length === 0) {
      return ["10:00 AM", "10:30 AM", "11:15 AM", "12:00 PM", "02:00 PM", "02:45 PM", "03:30 PM", "04:15 PM", "05:00 PM", "05:45 PM", "06:30 PM"];
    }
    return slots;
  }, [clinicProfile.workingHoursStart, clinicProfile.workingHoursEnd, clinicProfile.slotDuration]);

  const findSlotConflict = (
    date: string,
    time: string,
    durationMinutes = 30,
    excludeAptId?: string
  ) => {
    const slotStart = parseAppointmentTime(time);
    if (slotStart === null) return;
    const slotEnd = slotStart + durationMinutes;

    return appointments.find((apt) => {
      if (apt._id === excludeAptId) return false;
      if (apt.date !== date) return false;
      if (apt.status === "cancelled" || apt.status === "missed") return false;

      const aptStart = parseAppointmentTime(apt.time);
      if (aptStart === null) return false;
      const aptEnd = aptStart + (apt.durationMinutes || 30);

      return slotStart < aptEnd && slotEnd > aptStart;
    });
  };

  const futureSlots = (date: string, currentClock = clock) =>
    workingHours.filter((slot) => isFutureAppointment(date, slot, currentClock));
  const bookingSlots = futureSlots(form.date);
  const bookingConflict = findSlotConflict(form.date, form.time, form.durationMinutes || 30);
  const rescheduleSlots = futureSlots(rescheduleData.date);
  const rescheduleConflict = rescheduleApt
    ? findSlotConflict(rescheduleData.date, rescheduleData.time, rescheduleApt.durationMinutes || 30, rescheduleApt._id)
    : undefined;
  const isToday = selectedDate === clock.date;
  const isPastDay = selectedDate < clock.date;

  // Filtered by selected date for single dentist timeline
  const dayAppointments = appointments
    .filter((a) => a.date === selectedDate)
    .sort((a, b) => (parseAppointmentTime(a.time) ?? 0) - (parseAppointmentTime(b.time) ?? 0));

  // Filtered for list view (sorted chronologically: upcoming & recent first)
  const listAppointments = appointments
    .filter((a) => {
      if (statusFilter === "all") return true;
      return a.status === statusFilter;
    })
    .sort((a, b) => {
      const dComp = b.date.localeCompare(a.date);
      if (dComp !== 0) return dComp;
      return (parseAppointmentTime(a.time) ?? 0) - (parseAppointmentTime(b.time) ?? 0);
    });

  // Date Navigator Helpers
  const shiftDate = (days: number) => setSelectedDate((date) => shiftAppointmentDate(date, days));

  // Status Handlers
  const handleMarkStatus = async (id: string, newStatus: Appointment["status"]) => {
    const appointment = appointments.find((entry) => entry._id === id);
    const currentClock = getAppointmentClock();
    if (!appointment || appointment.date < currentClock.date) return;
    if (newStatus === "completed") {
      completeAppointment(id);
    } else if (newStatus === "scheduled") {
      if (!isFutureAppointment(appointment.date, appointment.time, currentClock)) return;
      setBookingError("");
      const saved = await bookAppointment({ ...appointment, status: "scheduled" });
      if (!saved) {
        setBookingError("Could not reopen the appointment. Check the time and try again.");
      }
    } else if (newStatus === "cancelled") {
      cancelAppointment(id);
    } else if (newStatus === "missed") {
      missAppointment(id);
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
    if (isSubmitting) return;
    if (!isFutureAppointment(form.date, form.time)) {
      setBookingError("Choose a future time to book this appointment.");
      return;
    }
    if (bookingConflict && !emergencyOverride) return;
    const trimmedName = form.patientName.trim();
    const trimmedPhone = form.patientPhone.trim();
    if (!trimmedName) return;

    setBookingError("");
    setIsSubmitting(true);

    const matched = patients.find(
      (p) =>
        p.name.trim().toLowerCase() === trimmedName.toLowerCase() ||
        (trimmedPhone && p.phone.replace(/\D/g, "") === trimmedPhone.replace(/\D/g, ""))
    );

    let resolvedPatientId = matched?._id;
    let resolvedPhone = trimmedPhone || matched?.phone || "";

    if (!matched) {
      // Auto-create registered patient in MongoDB so clinical dossier navigation works seamlessly
      resolvedPatientId = `pat_${Date.now()}`;
      const newPat: Patient = {
        _id: resolvedPatientId,
        name: trimmedName,
        age: 30,
        gender: "Other",
        phone: resolvedPhone,
        email: "",
        address: "",
        medicalAlerts: ["None"],
        bloodGroup: "Unknown",
        registeredDate: form.date,
        notes: form.notes
          ? [
              {
                id: `note_${Date.now()}`,
                date: form.date,
                text: `Initial booking: ${form.procedure}. ${form.notes}`,
                doctor: clinicProfile.dentistName || "Doctor",
              },
            ]
          : [],
        history: [],
      };
      await addPatient(newPat);
    }

    const newApt: Appointment = {
      _id: `apt_${Date.now()}`,
      patientId: resolvedPatientId!,
      patientName: trimmedName,
      patientPhone: resolvedPhone,
      date: form.date,
      time: form.time,
      durationMinutes: Number(form.durationMinutes) || 30,
      procedure: form.procedure,
      status: "scheduled",
      notes: form.notes,
    };

    const saved = await bookAppointment(newApt);
    setIsSubmitting(false);
    if (!saved) {
      setBookingError("Could not book the appointment. Check the date and time and try again.");
      return;
    }
    setIsBookModalOpen(false);
    setEmergencyOverride(false);
    setBookedSuccessApt(newApt);
    setForm({
      patientName: "",
      patientPhone: "",
      date: selectedDate,
      time: "",
      durationMinutes: 30,
      procedure: "Root Canal Treatment (RCT)",
      notes: "",
    });
  };

  // Reschedule submit
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleApt || isSubmitting) return;
    const currentClock = getAppointmentClock();
    if (rescheduleApt.date < currentClock.date || !isFutureAppointment(rescheduleData.date, rescheduleData.time, currentClock)) {
      setBookingError("Choose a future time for a current appointment.");
      return;
    }
    if (rescheduleConflict && !rescheduleOverride) return;

    setBookingError("");
    setIsSubmitting(true);
    const saved = await rescheduleAppointment(
      rescheduleApt._id,
      rescheduleData.date,
      rescheduleData.time,
      rescheduleData.reason
    );
    setIsSubmitting(false);
    if (!saved) {
      setBookingError("Could not reschedule the appointment. Check the date and time and try again.");
      return;
    }
    setRescheduleApt(null);
    setRescheduleOverride(false);
  };

  // WhatsApp Instant Booking Confirmation
  const getBookingConfirmationWhatsAppUrl = (apt: Appointment) => {
    const cleanPhone = apt.patientPhone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello ${apt.patientName}, your dental appointment with ${clinicProfile.dentistName} at ${clinicProfile.name} is confirmed for ${apt.date} at ${apt.time} (${apt.procedure}).\n\nLocation: ${clinicProfile.address}.\nPhone: ${clinicProfile.phone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  // WhatsApp Pre-Appointment Reminder
  const getWhatsAppReminderUrl = (apt: Appointment) => {
    const cleanPhone = apt.patientPhone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello ${apt.patientName}, this is a reminder for your dental appointment on ${apt.date} at ${apt.time} (${apt.durationMinutes} mins) for ${apt.procedure} with ${clinicProfile.dentistName} at ${clinicProfile.name}.\n\nPlease let us know if you need to reschedule. See you soon!`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  // WhatsApp Post-Op Care Instructions
  const getWhatsAppPostOpUrl = (apt: Appointment) => {
    const cleanPhone = apt.patientPhone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello ${apt.patientName}, thank you for visiting ${clinicProfile.name} today.\n\nPost-procedure instructions from ${clinicProfile.dentistName}:\n1) Avoid chewing hard or crunchy foods on the treated side for 24 hours.\n2) If mild tenderness occurs, take prescribed medications as advised.\n3) Reach out directly if you experience persistent discomfort.\n\nWarm regards,\n${clinicProfile.dentistName} • ${clinicProfile.phone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  const availableSlots = futureSlots(selectedDate).filter((slot) => !findSlotConflict(selectedDate, slot));
  const visibleAppointments = viewMode === "timeline" ? dayAppointments : listAppointments;
  const openBooking = (time?: string) => {
    const currentClock = getAppointmentClock();
    if (loading || selectedDate < currentClock.date) return;
    const slots = futureSlots(selectedDate, currentClock);
    const initialTime = time && slots.includes(time)
      ? time
      : slots.find((slot) => !findSlotConflict(selectedDate, slot, form.durationMinutes || 30)) ?? slots[0] ?? "";
    setBookingError("");
    setEmergencyOverride(false);
    setForm((previous) => ({ ...previous, date: selectedDate, time: initialTime }));
    setIsBookModalOpen(true);
  };
  const openReschedule = (appointment: Appointment) => {
    const currentClock = getAppointmentClock();
    if (appointment.date < currentClock.date) return;
    setBookingError("");
    setRescheduleOverride(false);
    const appointmentTime = parseAppointmentTime(appointment.time);
    const time = futureSlots(appointment.date, currentClock).find((slot) => parseAppointmentTime(slot) === appointmentTime);
    setRescheduleData({ date: appointment.date, time: time ?? "", reason: "" });
    setRescheduleApt(appointment);
  };
  const selectedDateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="appointments-workspace space-y-5">
      <section className="appointment-toolbar" aria-label="Appointment controls">
        <div className="appointment-date-controls">
          <button type="button" onClick={() => shiftDate(-1)} className="calendar-icon-button" aria-label="Previous day"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => setSelectedDate(getAppointmentClock().date)} className={`calendar-today ${isToday ? "selected" : ""}`}>Today</button>
          <button type="button" onClick={() => shiftDate(1)} className="calendar-icon-button" aria-label="Next day"><ChevronRight size={18} /></button>
        </div>
        <p className="appointment-selected-date"><Calendar size={17} aria-hidden="true" /><time dateTime={selectedDate}>{selectedDateLabel}</time></p>
        <div className="appointment-view-toggle" role="group" aria-label="Appointment view">
          <button type="button" aria-pressed={viewMode === "timeline"} onClick={() => setViewMode("timeline")}>Day</button>
          <button type="button" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}>All Bookings</button>
        </div>
        {!isPastDay && <button type="button" disabled={loading} onClick={() => openBooking()} className="appointment-book-button"><Plus size={17} />Book Appointment</button>}
      </section>

      {bookingError && !isBookModalOpen && !rescheduleApt && <p role="alert" className="text-xs text-rose-700">{bookingError}</p>}

      {bookedSuccessApt && !isPastDay && (
        <div className="appointment-success" role="status">
          <CheckCircle2 size={19} className="shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-xs leading-5"><strong>{bookedSuccessApt.patientName}</strong> booked for {bookedSuccessApt.date} at {bookedSuccessApt.time}<span className="block text-[#52627A]">{bookedSuccessApt.procedure} &middot; {bookedSuccessApt.patientPhone}</span></p>
          <a href={getBookingConfirmationWhatsAppUrl(bookedSuccessApt)} target="_blank" rel="noopener noreferrer" className="appointment-text-action"><Share2 size={15} />Send Confirmation</a>
          <button type="button" onClick={() => setBookedSuccessApt(null)} className="calendar-icon-button" aria-label="Dismiss booking confirmation"><X size={17} /></button>
        </div>
      )}

      {viewMode === "timeline" && !isPastDay && (
        <section className="appointment-slots" aria-labelledby="slots-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="slots-heading" className="text-sm font-semibold">Available Slots <span className="font-normal text-[#64748B]">&middot; Chair 1</span></h2>
            <span className="text-xs text-[#64748B]">{loading ? "Loading..." : `${availableSlots.length} available`}</span>
          </div>
          {loading ? <p role="status" className="text-xs text-[#64748B]">Loading slots...</p> : availableSlots.length === 0 ? <p className="text-xs text-[#64748B]">No available slots on this date.</p> : (
            <div className="appointment-slot-list" role="group" aria-label={`Available slots on ${selectedDateLabel}`}>
              {availableSlots.map((slot) => <button key={slot} type="button" onClick={() => openBooking(slot)} className="appointment-time-chip" aria-label={`Book ${slot} on ${selectedDateLabel}`}><Plus size={14} aria-hidden="true" />{slot}</button>)}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="appointments-list-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="appointments-list-heading" className="text-sm font-semibold">{viewMode === "list" ? "All Bookings" : isToday ? "Today's Appointments" : "Appointments"} <span className="ml-1 text-xs font-normal text-[#64748B]">({visibleAppointments.length})</span></h2>
          {viewMode === "timeline" && <p className="text-xs text-[#64748B]">{dayAppointments.filter((appointment) => appointment.status === "scheduled").length} scheduled &middot; {dayAppointments.filter((appointment) => appointment.status === "completed").length} completed</p>}
          {viewMode === "list" && (
            <select aria-label="Filter appointments by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="appointment-status-filter">
              {(["all", "scheduled", "completed", "missed", "cancelled"] as const).map((status) => <option key={status} value={status}>{status === "all" ? "All statuses" : status.charAt(0).toUpperCase() + status.slice(1)} ({status === "all" ? appointments.length : appointments.filter((appointment) => appointment.status === status).length})</option>)}
            </select>
          )}
        </div>
        {loading ? <p role="status" className="appointment-empty">Loading appointments...</p> : visibleAppointments.length === 0 ? (
          <div className="appointment-empty"><Calendar size={25} className="mx-auto mb-3 text-[#0089A8]" aria-hidden="true" /><p className="text-sm font-medium">No appointments {viewMode === "timeline" ? "on this date" : "found"}.</p>{viewMode === "list" && <p className="mt-1 text-xs text-[#64748B]">Try another status filter.</p>}</div>
        ) : (
          <div className={viewMode === "list" ? "grid grid-cols-1 gap-3 xl:grid-cols-2" : "appointment-timeline space-y-3"}>
            {visibleAppointments.map((appointment) => (
              <article key={appointment._id} className="appointment-card">
                <div className="appointment-card-body">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="appointment-card-time">{appointment.time}</span>
                    <span className="text-xs text-[#64748B]">{appointment.durationMinutes} min{viewMode === "list" && <> &middot; {appointment.date}</>}</span>
                  </div>
                  <h3 className="mt-2 break-words text-base font-bold"><button type="button" onClick={() => handleOpenPatientDossier(appointment.patientId, appointment.patientName)} className="text-left hover:text-[#0089A8]">{appointment.patientName}</button></h3>
                  <p className="mt-1 text-sm font-medium text-[#007F96]">{appointment.procedure}</p>
                  {appointment.notes && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-[#64748B]">{appointment.notes}</p>}
                  {appointment.date < clock.date ? (
                    <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#52627A]"><Phone size={13} aria-hidden="true" />{appointment.patientPhone}</span>
                  ) : (
                    <a href={`tel:${appointment.patientPhone}`} className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#52627A]"><Phone size={13} aria-hidden="true" />{appointment.patientPhone}</a>
                  )}
                </div>
                <div className="appointment-card-controls">
                  <span className={`appointment-status ${appointment.status}`}>{appointment.status === "completed" && <Check size={13} aria-hidden="true" />}{appointment.status}</span>
                  {appointment.date >= clock.date && <AppointmentActions appointment={appointment} reminderUrl={getWhatsAppReminderUrl(appointment)} careUrl={getWhatsAppPostOpUrl(appointment)} onView={() => handleOpenPatientDossier(appointment.patientId, appointment.patientName)} onReschedule={() => openReschedule(appointment)} onReopen={() => handleMarkStatus(appointment._id, "scheduled")} canReopen={isFutureAppointment(appointment.date, appointment.time, clock)} onCancel={() => { if (confirm(`Cancel appointment for ${appointment.patientName}?`)) handleMarkStatus(appointment._id, "cancelled"); }} onMarkMissed={() => handleMarkStatus(appointment._id, "missed")} />}
                  {appointment.date >= clock.date && appointment.status === "scheduled" && <button type="button" onClick={() => handleMarkStatus(appointment._id, "completed")} className="appointment-complete"><Check size={14} aria-hidden="true" />Complete</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ================= SMART BOOKING MODAL FOR SINGLE DENTIST ================= */}
      {isBookModalOpen && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E4E9F0] text-xs my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <div>
                <h3 className="font-bold text-lg text-[#111C3A]">
                  Book Appointment
                </h3>

              </div>
              <button
                onClick={() => setIsBookModalOpen(false)}
                aria-label="Close booking form"
                className="p-1 rounded-lg text-[#8291A7] hover:text-[#111C3A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookSubmit} className="mt-4 space-y-4">
              
              {/* Quick Procedure Template Chips */}
              <div>
                <label className="font-semibold text-[#111C3A] block mb-1.5">
                  Treatment Presets
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
                          ? "bg-[#0089A8] text-white border-[#0089A8] font-semibold"
                          : "bg-[#FAFBFC] border-[#E4E9F0] text-[#64748B] hover:bg-[#EDF7FA]"
                      }`}
                    >
                      {preset.name} ({preset.duration}m)
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Patient Name *</label>
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
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none focus:border-[#0089A8] bg-[#FAFBFC]"
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
                <label className="font-semibold text-[#111C3A] block mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98201 44521"
                  value={form.patientPhone}
                  onChange={(e) => setForm({ ...form, patientPhone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none focus:border-[#0089A8] font-mono bg-[#FAFBFC]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    min={clock.date}
                    value={form.date}
                    onChange={(e) => {
                      const date = e.target.value;
                      setEmergencyOverride(false);
                      setForm({ ...form, date, time: "" });
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none focus:border-[#0089A8] font-mono bg-[#FAFBFC]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    step={15}
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none focus:border-[#0089A8] font-mono bg-[#FAFBFC]"
                  />
                </div>
              </div>

              {/* Visual Operatory Time Slot Selection Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#111C3A] block text-xs">
                    Select Available Time Slot for {form.date}:
                  </label>
                  <span className="text-[11px] font-mono text-[#8291A7]">
                    Selected: <strong className="text-[#0089A8]">{bookingSlots.includes(form.time) ? form.time : "None"}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {bookingSlots.map((hour) => {
                    const busyApt = findSlotConflict(form.date, hour, form.durationMinutes || 30);
                    const isSelected = form.time === hour;

                    if (busyApt) {
                      return (
                        <div
                          key={hour}
                          className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-center text-slate-400 text-xs font-mono cursor-not-allowed opacity-60"
                          title={`Operatory occupied by ${busyApt.patientName} (${busyApt.time}, ${busyApt.durationMinutes}m)`}
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
                            ? "bg-[#0089A8] text-white border-[#0089A8] font-bold shadow-xs scale-102"
                            : "bg-[#FAFBFC] hover:bg-[#EDF7FA] border-[#E4E9F0] text-[#111C3A]"
                        }`}
                      >
                        <div>{hour}</div>
                        <span className={`text-[9px] ${isSelected ? "text-white" : "text-[#0089A8]"}`}>
                          {isSelected ? "Selected" : "Free"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {bookingSlots.length === 0 && <p className="text-[#64748B]">Choose another date to see future slots.</p>}
              </div>

              {/* Overlap Conflict Detection Notice */}
              {bookingConflict && bookingSlots.includes(form.time) && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Chair 1 Operatory Conflict:</strong> {clinicProfile.dentistName} already has an appointment with{" "}
                        <strong>{bookingConflict.patientName}</strong> from <strong>{bookingConflict.time}</strong> ({bookingConflict.durationMinutes}m for {bookingConflict.procedure}).
                      </div>
                    </div>
                    <label className="flex items-center gap-2 pt-1 font-semibold text-amber-950 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={emergencyOverride}
                        onChange={(e) => setEmergencyOverride(e.target.checked)}
                        className="rounded border-amber-300 text-[#0089A8] focus:ring-[#0089A8]"
                      />
                      <span>Emergency Override: Allow double-booking operatory</span>
                    </label>
                  </div>
              )}

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Advised soft diet, bring previous X-rays"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none focus:border-[#0089A8] bg-[#FAFBFC]"
                />
              </div>

              {bookingError && <p role="alert" className="text-rose-700">{bookingError}</p>}

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E4E9F0]">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#64748B] hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !bookingSlots.includes(form.time) || Boolean(bookingConflict && !emergencyOverride)}
                  className="px-5 py-2 rounded-xl bg-[#0089A8] text-white font-semibold hover:bg-[#00738E] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RESCHEDULE MODAL ================= */}
      {rescheduleApt && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E4E9F0] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <h3 className="font-bold text-base text-[#111C3A]">Reschedule Appointment</h3>
              <button onClick={() => setRescheduleApt(null)} aria-label="Close reschedule form" className="text-[#8291A7] hover:text-[#111C3A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[#64748B] my-3">
              Rescheduling appointment for: <strong className="text-[#111C3A]">{rescheduleApt.patientName}</strong>
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">New Date *</label>
                <input
                  type="date"
                  required
                  min={clock.date}
                  value={rescheduleData.date}
                  onChange={(e) => {
                    setRescheduleOverride(false);
                    setRescheduleData({ ...rescheduleData, date: e.target.value, time: "" });
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none font-mono bg-[#FAFBFC]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">New Time *</label>
                <select
                  required
                  value={rescheduleSlots.includes(rescheduleData.time) ? rescheduleData.time : ""}
                  onChange={(e) => {
                    setRescheduleOverride(false);
                    setRescheduleData({ ...rescheduleData, time: e.target.value });
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none font-mono bg-[#FAFBFC]"
                >
                  <option value="" disabled>{rescheduleSlots.length ? "Choose a time" : "No future slots"}</option>
                  {rescheduleSlots.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Reason for Rescheduling</label>
                <input
                  type="text"
                  placeholder="e.g. Patient requested morning slot"
                  value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none bg-[#FAFBFC]"
                />
              </div>

              {/* Conflict Detection for Rescheduling */}
              {rescheduleConflict && rescheduleSlots.includes(rescheduleData.time) && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Chair 1 Conflict:</strong> {rescheduleConflict.patientName} is scheduled at {rescheduleConflict.time} ({rescheduleConflict.durationMinutes}m for {rescheduleConflict.procedure}).
                      </div>
                    </div>
                    <label className="flex items-center gap-2 pt-1 font-semibold text-amber-950 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rescheduleOverride}
                        onChange={(e) => setRescheduleOverride(e.target.checked)}
                        className="rounded border-amber-300 text-[#0089A8]"
                      />
                      <span>Emergency override conflict</span>
                    </label>
                  </div>
              )}

              {bookingError && <p role="alert" className="text-rose-700">{bookingError}</p>}
              <div className="pt-3 flex justify-end gap-2 border-t border-[#E4E9F0]">
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="px-3.5 py-1.5 rounded-xl text-[#64748B] hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || rescheduleApt.date < clock.date || !rescheduleSlots.includes(rescheduleData.time) || Boolean(rescheduleConflict && !rescheduleOverride)}
                  className="px-4 py-1.5 rounded-xl bg-[#0089A8] text-white font-semibold hover:bg-[#00738E] disabled:opacity-50 disabled:cursor-not-allowed"
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
