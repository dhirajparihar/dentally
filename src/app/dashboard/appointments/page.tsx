"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Calendar,
  X,
  Phone,
  Share2,
  ChevronLeft,
  ChevronRight,
  User,
  ArrowRight,
} from "lucide-react";
import type { Appointment } from "@/lib/mockData";
import { useRouter } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";
import { findAppointmentConflict, getAppointmentClock, getClinicAppointmentSlots, isFutureAppointment, parseAppointmentTime, shiftAppointmentDate } from "@/lib/appointmentTime";
import { useMinuteClock } from "@/lib/useMinuteClock";
import { AppointmentCard, AppointmentStatusSummary } from "@/components/dashboard/AppointmentCard";
import { AppointmentMenu } from "@/components/dashboard/AppointmentMenu";
import { isOnlineBookingAppointment } from "@/lib/onlineBookingIds";
const RescheduleAppointmentDialog = dynamic(
  () => import("@/components/dashboard/RescheduleAppointmentDialog").then((mod) => mod.RescheduleAppointmentDialog),
  { ssr: false }
);

interface AppointmentActionsProps {
  appointment: Appointment;
  reminderUrl: string;
  careUrl: string;
  onView: () => void;
  onReschedule: () => void;
  onReopen: () => void;
  canReopen: boolean;
  onCancel: () => void;
}

function AppointmentActions({ appointment, reminderUrl, careUrl, onView, onReschedule, onReopen, canReopen, onCancel }: AppointmentActionsProps) {
  return (
    <AppointmentMenu patientName={appointment.patientName}>
      <button type="button" onClick={onView}><User size={15} />View Patient</button>
      <a href={appointment.status === "completed" ? careUrl : reminderUrl} target="_blank" rel="noopener noreferrer"><Share2 size={15} />{appointment.status === "completed" ? "WhatsApp Care" : "WhatsApp Reminder"}</a>
      <a href={`tel:${appointment.patientPhone}`}><Phone size={15} />Call Patient</a>
      {appointment.status === "scheduled" && <button type="button" onClick={onReschedule}><Calendar size={15} />Reschedule</button>}
      {canReopen && appointment.status !== "scheduled" && <button type="button" onClick={onReopen}><ArrowRight size={15} />Reopen Visit</button>}
      {appointment.status === "scheduled" && <button type="button" onClick={onCancel} className="text-rose-700"><X size={15} />Cancel Appointment</button>}
    </AppointmentMenu>
  );
}

const earliestAppointmentDate = "0001-01-01";
const latestAppointmentDate = "9999-12-31";

export default function AppointmentsPage() {
  const {
    appointments,
    clinicProfile,
    loading,
    bookAppointment,
    cancelAppointment,
  } = useClinic();

  // Selected Date for Single Dentist Practice
  const clock = getAppointmentClock(useMinuteClock());
  const [selectedDate, setSelectedDate] = useState(clock.date);
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "completed" | "missed" | "cancelled">("all");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [onlineFirst, setOnlineFirst] = useState(false);

  // Modals
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);
  const router = useRouter();
  const [bookingError, setBookingError] = useState("");
  const handledCalendarLink = useRef(false);

  useEffect(() => {
    if (loading || handledCalendarLink.current) return;
    handledCalendarLink.current = true;
    const params = new URLSearchParams(window.location.search);
    const visitId = params.get("visit");
    const requestedId = visitId || params.get("followUp");
    if (!requestedId) return;
    const visit = appointments.find((record) => record._id === requestedId);
    if (!visit) {
      setBookingError("This appointment is unavailable.");
      return;
    }
    const query = visitId ? "visit" : "followUp";
    router.replace(`/dashboard/patients/${encodeURIComponent(visit.patientId)}?${query}=${encodeURIComponent(visit._id)}`);
  }, [appointments, loading, router]);

  const workingHours = useMemo(() => getClinicAppointmentSlots(clinicProfile), [clinicProfile]);
  const findSlotConflict = (date: string, time: string, durationMinutes = 30, excludeId?: string) =>
    findAppointmentConflict(appointments, date, time, durationMinutes, excludeId);

  const futureSlots = (date: string) => workingHours.filter((slot) => isFutureAppointment(date, slot, clock));
  const isToday = selectedDate === clock.date;
  const isPastDay = selectedDate < clock.date;
  const sourceAppointments = onlineOnly
    ? appointments.filter((appointment) => isOnlineBookingAppointment(appointment._id))
    : appointments;

  // Filtered by selected date for single dentist timeline
  const dayAppointments = sourceAppointments
    .filter((a) => a.date === selectedDate)
    .sort((a, b) => (parseAppointmentTime(a.time) ?? 0) - (parseAppointmentTime(b.time) ?? 0));

  const listAppointments = sourceAppointments
    .filter((a) => {
      if (statusFilter === "all") return true;
      return a.status === statusFilter;
    })
    .sort((a, b) => {
      if (onlineFirst) {
        const sourceOrder = Number(isOnlineBookingAppointment(b._id)) - Number(isOnlineBookingAppointment(a._id));
        if (sourceOrder) return sourceOrder;
      }
      const dComp = b.date.localeCompare(a.date);
      if (dComp !== 0) return dComp;
      return (parseAppointmentTime(a.time) ?? 0) - (parseAppointmentTime(b.time) ?? 0);
    });

  // Date Navigator Helpers
  const shiftDate = (days: number) => setSelectedDate((date) => shiftAppointmentDate(date, days));

  const handleReopen = async (appointment: Appointment) => {
    if (!isFutureAppointment(appointment.date, appointment.time)) return;
    setBookingError("");
    const saved = await bookAppointment({ ...appointment, status: "scheduled" });
    if (!saved) setBookingError("Could not reopen the appointment. Check the time and try again.");
  };

  const handleCancel = async (appointment: Appointment) => {
    if (appointment.date < getAppointmentClock().date || !confirm(`Cancel appointment for ${appointment.patientName}?`)) return;
    setBookingError("");
    const saved = await cancelAppointment(appointment._id);
    if (!saved) setBookingError("Could not cancel the appointment. Try again.");
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
  const selectedDateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="appointments-workspace space-y-5">
      <section className="appointment-toolbar" aria-label="Appointment controls">
        <div className="appointment-date-controls">
          <button type="button" onClick={() => shiftDate(-1)} disabled={selectedDate === earliestAppointmentDate} className="calendar-icon-button" aria-label="Previous day"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => setSelectedDate(getAppointmentClock().date)} className={`calendar-today ${isToday ? "selected" : ""}`}>Today</button>
          <button type="button" onClick={() => shiftDate(1)} disabled={selectedDate === latestAppointmentDate} className="calendar-icon-button" aria-label="Next day"><ChevronRight size={18} /></button>
        </div>
        <input
          type="date"
          className="appointment-date-picker"
          aria-label="Choose appointment date"
          value={selectedDate}
          min={earliestAppointmentDate}
          max={latestAppointmentDate}
          required
          onChange={(event) => {
            if (!event.currentTarget.validity.valid) return;
            setSelectedDate(event.currentTarget.value);
            setViewMode("timeline");
          }}
        />
        <div className="appointment-view-toggle" role="group" aria-label="Appointment view">
          <button type="button" aria-pressed={viewMode === "timeline"} onClick={() => setViewMode("timeline")}>Day</button>
          <button type="button" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}>All Bookings</button>
        </div>
      </section>

      {bookingError && !rescheduleApt && <p role="alert" className="text-xs text-rose-700">{bookingError}</p>}

      {viewMode === "timeline" && !isPastDay && (
        <section className="appointment-slots" aria-labelledby="slots-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="slots-heading" className="text-sm font-semibold">Available Slots <span className="font-normal text-[#64748B]">&middot; Chair 1</span></h2>
            <span className="text-xs text-[#64748B]">{loading ? "Loading..." : `${availableSlots.length} available`}</span>
          </div>
          {loading ? (
            <div className="flex flex-wrap gap-2 animate-pulse" role="status" aria-label="Loading available slots">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-9 w-24 rounded-lg bg-slate-200/60" />
              ))}
            </div>
          ) : availableSlots.length === 0 ? <p className="text-xs text-[#64748B]">No available slots on this date.</p> : (
            <ul className="appointment-slot-list" role="list" aria-label={`Available slots on ${selectedDateLabel}`}>
              {availableSlots.map((slot) => <li key={slot} className="appointment-time-chip">{slot}</li>)}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="appointments-list-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="appointments-list-heading" className="text-sm font-semibold">{viewMode === "list" ? "All Bookings" : isToday ? "Today's Appointments" : "Appointments"} <span className="ml-1 text-xs font-normal text-[#64748B]">({visibleAppointments.length})</span></h2>
          {viewMode === "timeline" && <AppointmentStatusSummary appointments={dayAppointments} />}
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <select
              aria-label="Filter appointments by booking source"
              value={onlineOnly ? "online" : "all"}
              onChange={(event) => setOnlineOnly(event.target.value === "online")}
              disabled={loading}
              className="appointment-status-filter min-h-11 flex-1 sm:flex-none"
            >
              <option value="all">All sources</option>
              <option value="online">Booked online</option>
            </select>
            {viewMode === "list" && (
              <>
                <select aria-label="Filter appointments by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="appointment-status-filter min-h-11 flex-1 sm:flex-none">
                  {(["all", "scheduled", "completed", "missed", "cancelled"] as const).map((status) => <option key={status} value={status}>{status === "all" ? "All statuses" : status.charAt(0).toUpperCase() + status.slice(1)} ({status === "all" ? sourceAppointments.length : sourceAppointments.filter((appointment) => appointment.status === status).length})</option>)}
                </select>
                <select aria-label="Sort appointments" value={onlineFirst ? "online" : "date"} onChange={(event) => setOnlineFirst(event.target.value === "online")} disabled={loading} className="appointment-status-filter min-h-11 flex-1 sm:flex-none">
                  <option value="date">Sort: Date</option>
                  <option value="online">Sort: Online First</option>
                </select>
              </>
            )}
          </div>
        </div>
        {loading ? (
          <div className="space-y-3" role="status" aria-label="Loading appointments">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[#E4E9F0] bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 rounded-lg bg-slate-100" />
                  <div className="h-6 w-20 rounded-full bg-slate-100" />
                </div>
                <div className="h-5 w-44 rounded-lg bg-slate-200" />
                <div className="h-4 w-32 rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        ) : visibleAppointments.length === 0 ? (
          <div className="appointment-empty">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF7FA] text-[#0089A8] shadow-inner">
              <Calendar size={22} aria-hidden="true" />
            </div>
            <p className="text-sm font-bold text-[#111C3A]">{onlineOnly ? "No online bookings" : "No appointments"} {viewMode === "timeline" ? "on this date" : "found"}</p>
            <p className="mt-1 text-xs text-[#64748B]">
              {viewMode === "list" ? "Try a different status or booking source." : onlineOnly ? "Choose another date or booking source." : "Select a date above or book a new appointment from the top header."}
            </p>
          </div>
        ) : (
          <div className={viewMode === "list" ? "grid grid-cols-1 gap-3 xl:grid-cols-2" : "appointment-timeline space-y-3"}>
            {visibleAppointments.map((appointment) => {
              const patientHref = `/dashboard/patients/${encodeURIComponent(appointment.patientId)}`;
              const canCall = appointment.date >= clock.date;
              return (
                <AppointmentCard key={appointment._id} appointment={appointment} clock={clock} patientHref={patientHref} showDate={viewMode === "list"} canCall={canCall}>
                  {canCall && (
                    <AppointmentActions
                      appointment={appointment}
                      reminderUrl={getWhatsAppReminderUrl(appointment)}
                      careUrl={getWhatsAppPostOpUrl(appointment)}
                      onView={() => router.push(patientHref)}
                      onReschedule={() => {
                        setBookingError("");
                        setRescheduleApt(appointment);
                      }}
                      onReopen={() => handleReopen(appointment)}
                      canReopen={!appointment.rescheduledToAppointmentId && isFutureAppointment(appointment.date, appointment.time, clock)}
                      onCancel={() => handleCancel(appointment)}
                    />
                  )}
                </AppointmentCard>
              );
            })}
          </div>
        )}
      </section>

      {rescheduleApt && <RescheduleAppointmentDialog appointment={rescheduleApt} onClose={() => setRescheduleApt(null)} />}

    </div>
  );
}
