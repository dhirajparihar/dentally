"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import { findAppointmentConflict, getAppointmentClock, getClinicAppointmentSlots, isFutureAppointment, parseAppointmentTime } from "@/lib/appointmentTime";
import type { Appointment } from "@/lib/mockData";
import { useMinuteClock } from "@/lib/useMinuteClock";

const fieldClassName = "w-full rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] p-2.5 focus:border-[#0089A8]";

export function RescheduleAppointmentDialog({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const { appointments, clinicProfile, rescheduleAppointment } = useClinic();
  const clock = getAppointmentClock(useMinuteClock());
  const workingHours = getClinicAppointmentSlots(clinicProfile);
  const [date, setDate] = useState(appointment.date >= clock.date ? appointment.date : clock.date);
  const [time, setTime] = useState(() => appointment.status === "scheduled"
    ? workingHours.find((slot) => parseAppointmentTime(slot) === parseAppointmentTime(appointment.time) && isFutureAppointment(date, slot, clock)) ?? ""
    : "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const slots = workingHours.filter((slot) => isFutureAppointment(date, slot, clock));
  const conflict = findAppointmentConflict(
    appointments.filter((visit) => visit.status === "scheduled"),
    date, time, appointment.durationMinutes || 30, appointment._id,
  );

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || conflict) return;
    const currentClock = getAppointmentClock();
    if (appointment.date < currentClock.date || !isFutureAppointment(date, time, currentClock)) {
      setError("Choose a future time for a current appointment.");
      return;
    }
    setError("");
    setSaving(true);
    const saved = await rescheduleAppointment(appointment._id, date, time, reason.trim());
    if (saved) {
      onClose();
    } else {
      setSaving(false);
      setError("Could not reschedule the appointment. Check the date and time and try again.");
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="reschedule-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      className="mobile-dialog fixed inset-0 !m-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-[#111C3A]/75 p-4 backdrop-blur-sm backdrop:bg-transparent open:flex open:items-center open:justify-center"
    >
      <div className="w-full max-w-sm rounded-3xl border border-[#E4E9F0] bg-white p-6 text-xs text-[#111C3A] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#E4E9F0] pb-3">
          <h3 id="reschedule-heading" className="text-base font-bold">Reschedule Appointment</h3>
          <button type="button" disabled={saving} onClick={onClose} aria-label="Close reschedule form" className="text-[#64748B] hover:text-[#111C3A]">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 font-semibold">{appointment.patientName}</p>
        <p className="mb-3 text-[#64748B]">{appointment.procedure} &middot; {appointment.durationMinutes} min</p>

        <form onSubmit={handleSubmit}>
          <fieldset disabled={saving} className="space-y-3">
            <label className="block">
              <span className="mb-1 block font-semibold">New Date</span>
              <input type="date" required min={clock.date} value={date} onChange={(event) => {
                setDate(event.target.value);
                setTime("");
                setError("");
              }} className={fieldClassName} />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold">New Time</span>
              <select required value={slots.includes(time) ? time : ""} onChange={(event) => {
                setTime(event.target.value);
                setError("");
              }} className={fieldClassName}>
                <option value="" disabled>{slots.length ? "Choose a time" : "No future slots"}</option>
                {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold">Reason for Rescheduling (optional)</span>
              <input type="text" value={reason} onChange={(event) => setReason(event.target.value)} className={fieldClassName} />
            </label>
            {conflict && slots.includes(time) && (
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                This time overlaps with {conflict.patientName}&apos;s appointment at {conflict.time}. Choose another time.
              </p>
            )}
            {error && <p role="alert" className="text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-[#E4E9F0] pt-3">
              <button type="button" onClick={onClose} className="workspace-button secondary small">Cancel</button>
              <button type="submit" disabled={!slots.includes(time) || Boolean(conflict) || appointment.date < clock.date} className="workspace-button small">
                {saving ? "Saving…" : "Confirm Reschedule"}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </dialog>
  );
}
