"use client";

import { useRef, useState, type FormEvent } from "react";
import { CalendarDays } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import { getAppointmentClock, isSunday, parseAppointmentTime } from "@/lib/appointmentTime";
import { formatBookingDate } from "@/lib/onlineBooking";
import { clinicDateScheduleMutationSchema, type ClinicDateScheduleMutation } from "@/lib/validations/clinic";

const inputClass = "mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-[#E4E9F0] bg-white px-3 text-sm text-[var(--workspace-text)]";
type DateOption = "closed" | "regular" | "custom";

function toTimeInput(time: string) {
  const minutes = parseAppointmentTime(time);
  if (minutes === null) return "";
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  return hour + ":" + String(minutes % 60).padStart(2, "0");
}

export function ClinicScheduleSettings() {
  const { clinicProfile, updateClinicDateSchedule } = useClinic();
  const today = getAppointmentClock().date;
  const overrides = clinicProfile.dateSchedules?.filter((entry) => entry.date >= today) ?? [];
  const dateInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [date, setDate] = useState("");
  const [option, setOption] = useState<DateOption>("closed");
  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");
  const [interval, setInterval] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const saved = overrides.find((entry) => entry.date === date);

  function selectDate(value: string) {
    const existing = overrides.find((entry) => entry.date === value);
    setDate(value);
    setOption(existing ? (existing.hours ? "custom" : existing.status === "open" ? "regular" : "closed") : isSunday(value) ? "regular" : "closed");
    setOpening(existing?.hours?.workingHoursStart ?? toTimeInput(clinicProfile.workingHoursStart));
    setClosing(existing?.hours?.workingHoursEnd ?? toTimeInput(clinicProfile.workingHoursEnd));
    setInterval(String(existing?.hours?.slotDuration ?? clinicProfile.slotDuration));
    setNotice(undefined);
  }

  async function persist(mutation: ClinicDateScheduleMutation) {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setNotice(undefined);
    try {
      const error = await updateClinicDateSchedule(mutation);
      if (error) {
        setNotice({ text: error, error: true });
      } else {
        selectDate("");
        setNotice({ text: mutation.action === "save" ? "Date schedule saved." : "Default schedule restored for this date." });
      }
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date || date < today) {
      setNotice({ text: "Choose today or a future date.", error: true });
      return;
    }
    const result = clinicDateScheduleMutationSchema.safeParse({
      action: "save",
      schedule: option === "closed" ? { date, status: "closed" } : {
        date,
        status: "open",
        hours: option === "custom"
          ? { workingHoursStart: opening, workingHoursEnd: closing, slotDuration: Number(interval) }
          : undefined,
      },
    });
    if (!result.success) {
      setNotice({ text: result.error.issues[0].message, error: true });
      return;
    }
    void persist(result.data);
  }

  return (
    <section aria-labelledby="booking-schedule-heading" className="space-y-4 rounded-[22px] border border-[#E4E9F0] bg-white p-5 sm:p-7">
      <div className="flex items-center gap-2.5 border-b border-[#E4E9F0] pb-3">
        <CalendarDays size={17} className="text-[var(--workspace-accent)]" aria-hidden />
        <h3 id="booking-schedule-heading" className="text-base font-bold text-[var(--workspace-text)]">Date-Specific Booking Schedule</h3>
      </div>
      <p className="text-sm text-[var(--workspace-muted)]">
        Sundays are closed by default. Date changes apply to new staff and patient bookings and reschedules.
      </p>
      <form onSubmit={save} aria-busy={saving}>
        <fieldset disabled={saving} className="min-w-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="min-w-0 text-sm font-semibold">
              Date
              <input ref={dateInput} type="date" min={today} value={date} onChange={(event) => selectDate(event.target.value)} className={inputClass} required />
            </label>
            <label className="min-w-0 text-sm font-semibold">
              Availability
              <select className={inputClass} value={option} disabled={!date} onChange={(event) => setOption(event.target.value as DateOption)}>
                <option value="closed">Closed all day</option>
                <option value="regular">Open with regular hours</option>
                <option value="custom">Open with custom hours</option>
              </select>
            </label>
          </div>
          {option === "custom" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="min-w-0 text-sm font-semibold">
                Opening time
                <input type="time" className={inputClass} value={opening} onChange={(event) => setOpening(event.target.value)} required />
              </label>
              <label className="min-w-0 text-sm font-semibold">
                Closing time
                <input type="time" className={inputClass} value={closing} onChange={(event) => setClosing(event.target.value)} required />
              </label>
              <label className="min-w-0 text-sm font-semibold">
                Slot interval (minutes)
                <input type="number" className={inputClass} min={5} max={120} step={1} value={interval} onChange={(event) => setInterval(event.target.value)} aria-describedby="slot-interval-help" required />
              </label>
              <p id="slot-interval-help" className="text-sm text-[var(--workspace-muted)] sm:col-span-3">
                The interval sets how often appointments can start. Each visit must finish by closing time.
              </p>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {saved && <button type="button" className="workspace-button secondary" onClick={() => void persist({ action: "reset", date })}>Restore default</button>}
            <button type="submit" className="workspace-button primary" disabled={!date}>{saving ? "Saving…" : "Save date schedule"}</button>
          </div>
        </fieldset>
      </form>
      {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-sm text-rose-700" : "text-sm text-emerald-800"}>{notice.text}</p>}
      {overrides.length > 0 && (
        <ul aria-label="Saved date schedules" className="divide-y divide-[#E4E9F0] border-t border-[#E4E9F0]">
          {overrides.map((entry) => (
            <li key={entry.date} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <time className="font-semibold" dateTime={entry.date}>{formatBookingDate(entry.date)}</time>
                <p className="text-[var(--workspace-muted)]">
                  {entry.status === "closed" ? "Closed all day" : entry.hours
                    ? `${entry.hours.workingHoursStart} to ${entry.hours.workingHoursEnd} · Every ${entry.hours.slotDuration} min`
                    : "Open with regular hours"}
                </p>
              </div>
              <button type="button" className="workspace-button secondary" disabled={saving} aria-label={`Edit schedule for ${formatBookingDate(entry.date)}`} onClick={() => {
                selectDate(entry.date);
                dateInput.current?.focus();
              }}>Edit</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
