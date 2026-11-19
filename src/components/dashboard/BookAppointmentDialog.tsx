"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Share2, X } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import type { Appointment, Patient } from "@/lib/mockData";
import { getAppointmentTreatments } from "@/lib/appointmentTreatments";
import { findAppointmentConflict, getAppointmentClock, getClinicAppointmentSlots, isFutureAppointment } from "@/lib/appointmentTime";
import { useMinuteClock } from "@/lib/useMinuteClock";
import { PatientPicker } from "@/components/dashboard/PatientPicker";
import { PatientRegistrationForm } from "@/components/dashboard/PatientRegistrationForm";
import { TreatmentPicker } from "@/components/dashboard/TreatmentPicker";

export interface AppointmentBookingDraft {
  patientId: string;
  phoneForAppointment: string;
  durationMinutes: number;
  procedure: string;
  notes: string;
}

export function BookAppointmentDialog({ initialDate, preferredTime, draft, onClose, onBooked }: {
  initialDate: string;
  preferredTime?: string;
  draft?: AppointmentBookingDraft;
  onClose: (draft: AppointmentBookingDraft) => void;
  onBooked: (appointment: Appointment) => void;
}) {
  const { appointments, patients, clinicProfile, bookAppointment } = useClinic();
  const treatments = getAppointmentTreatments(clinicProfile.appointmentTreatments);
  const clock = getAppointmentClock(useMinuteClock());
  const dialog = useRef<HTMLDialogElement>(null);
  const bookingHeading = useRef<HTMLHeadingElement>(null);
  const [registrationSearch, setRegistrationSearch] = useState<string | null>(null);
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const workingHours = useMemo(() => getClinicAppointmentSlots(clinicProfile), [clinicProfile]);
  const findSlotConflict = (date: string, time: string, durationMinutes = 30) =>
    findAppointmentConflict(appointments, date, time, durationMinutes);
  const futureSlots = (date: string) => workingHours.filter((slot) => isFutureAppointment(date, slot, clock));
  const [form, setForm] = useState(() => {
    const draftTreatment = treatments.find(({ name }) => name === draft?.procedure);
    const treatment = draftTreatment ?? treatments.find(({ name }) => name === "Root Canal Treatment (RCT)") ?? treatments[0];
    const durationMinutes = draftTreatment && draft ? draft.durationMinutes : treatment.duration;
    const slots = futureSlots(initialDate);
    const time = preferredTime && slots.includes(preferredTime)
      ? preferredTime
      : slots.find((slot) => !findSlotConflict(initialDate, slot, durationMinutes || 30)) ?? slots[0] ?? "";
    return {
      patientId: draft?.patientId ?? "",
      phoneForAppointment: draft?.phoneForAppointment ?? "",
      date: initialDate,
      time,
      durationMinutes,
      procedure: treatment.name,
      notes: draft?.notes ?? "",
    };
  });

  const selectedPatient = patients.find((patient) => patient._id === form.patientId);
  const registeredPhone = selectedPatient?.phone?.trim();
  const appointmentPhone = registeredPhone || form.phoneForAppointment.trim();
  const bookingSlots = futureSlots(form.date);
  const bookingConflict = findSlotConflict(form.date, form.time, form.durationMinutes || 30);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const selectBookingPatient = (patientId: string) => {
    setForm((previous) => ({ ...previous, patientId, phoneForAppointment: "" }));
  };

  const returnToBooking = () => {
    setRegistrationSearch(null);
    bookingHeading.current?.focus();
  };

  const finishRegistration = (patient: Patient) => {
    selectBookingPatient(patient._id);
    returnToBooking();
  };

  const closeBooking = () => {
    if (!isSubmitting && registrationSearch === null) onClose(form);
  };

  const handleBookSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || registrationSearch !== null) return;
    if (!isFutureAppointment(form.date, form.time)) {
      setBookingError("Choose a future time to book this appointment.");
      return;
    }
    if (bookingConflict && !emergencyOverride) return;
    if (!selectedPatient || !appointmentPhone) return;

    setBookingError("");
    setIsSubmitting(true);

    const appointment: Appointment = {
      _id: `apt_${Date.now()}`,
      patientId: selectedPatient._id,
      patientName: selectedPatient.name.trim(),
      patientPhone: appointmentPhone,
      date: form.date,
      time: form.time,
      durationMinutes: Number(form.durationMinutes) || 30,
      procedure: form.procedure,
      status: "scheduled",
      notes: form.notes,
    };

    try {
      if (await bookAppointment(appointment)) onBooked(appointment);
      else setBookingError("Could not book the appointment. Check the date and time and try again.");
    } catch {
      setBookingError("Could not book the appointment. Check the date and time and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="booking-heading"
      onCancel={(event) => {
        event.preventDefault();
        closeBooking();
      }}
      className="mobile-dialog fixed inset-0 !m-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-[#111C3A]/75 p-4 backdrop-blur-sm backdrop:bg-transparent open:flex open:items-center open:justify-center"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E4E9F0] text-xs text-[#111C3A] my-auto animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
          <div>
            <h3 ref={bookingHeading} id="booking-heading" tabIndex={-1} className="font-bold text-lg text-[#111C3A]">
              Book Appointment
            </h3>
          </div>
          {registrationSearch === null && (
            <button
              type="button"
              onClick={closeBooking}
              disabled={isSubmitting}
              aria-label="Close booking form"
              className="p-1 rounded-lg text-[#8291A7] hover:text-[#111C3A]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {registrationSearch !== null && (
          <section aria-labelledby="booking-registration-heading" className="mt-4 space-y-3 rounded-2xl border border-[#E4E9F0] bg-[#FAFBFC] p-4">
            <h4 id="booking-registration-heading" className="text-sm font-bold text-[#111C3A]">Add New Patient</h4>
            <PatientRegistrationForm
              compact
              initialSearch={registrationSearch}
              onCancel={returnToBooking}
              onSaved={finishRegistration}
              onSelectExisting={finishRegistration}
            />
          </section>
        )}

        <form onSubmit={handleBookSubmit} hidden={registrationSearch !== null} className="mt-4 space-y-4">
          <PatientPicker
            patients={patients}
            value={form.patientId}
            onChange={selectBookingPatient}
            onAddPatient={isSubmitting ? undefined : setRegistrationSearch}
          />

          {selectedPatient && !registeredPhone && (
            <div>
              <label htmlFor="booking-contact-phone" className="font-semibold text-[#111C3A] block mb-1">Mobile Number for This Appointment *</label>
              <input
                id="booking-contact-phone"
                type="tel"
                required
                placeholder="+91 98201 44521"
                value={form.phoneForAppointment}
                onChange={(event) => setForm({ ...form, phoneForAppointment: event.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none focus:border-[#0089A8] font-mono bg-[#FAFBFC]"
              />
            </div>
          )}

          <TreatmentPicker
            presets={treatments}
            value={form.procedure}
            onChange={(preset) => setForm((previous) => ({
              ...previous,
              procedure: preset.name,
              durationMinutes: preset.duration,
            }))}
          />

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
                min={5}
                max={480}
                step={1}
                value={form.durationMinutes || ""}
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
              onClick={closeBooking}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-[#64748B] hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedPatient || !appointmentPhone || !bookingSlots.includes(form.time) || Boolean(bookingConflict && !emergencyOverride)}
              className="px-5 py-2 rounded-xl bg-[#0089A8] text-white font-semibold hover:bg-[#00738E] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Booking
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

export function AppointmentBookingConfirmation({ appointment, onDismiss }: {
  appointment: Appointment;
  onDismiss: () => void;
}) {
  const { clinicProfile } = useClinic();
  const cleanPhone = appointment.patientPhone.replace(/[^0-9]/g, "").replace(/^0+/, "");
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const message = `Hello ${appointment.patientName}, your dental appointment with ${clinicProfile.dentistName} at ${clinicProfile.name} is confirmed for ${appointment.date} at ${appointment.time} (${appointment.procedure}).\n\nLocation: ${clinicProfile.address}.\nPhone: ${clinicProfile.phone}`;
  const confirmationUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;

  return (
    <div className="appointment-success" role="status">
      <CheckCircle2 size={19} className="shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-xs leading-5">
        <strong>{appointment.patientName}</strong> booked for {appointment.date} at {appointment.time}
        <span className="block text-[#52627A]">{appointment.procedure} &middot; {appointment.patientPhone}</span>
      </p>
      <a href={confirmationUrl} target="_blank" rel="noopener noreferrer" className="appointment-text-action"><Share2 size={15} aria-hidden="true" />Send Confirmation</a>
      <button type="button" onClick={onDismiss} className="calendar-icon-button" aria-label="Dismiss booking confirmation"><X size={17} aria-hidden="true" /></button>
    </div>
  );
}
