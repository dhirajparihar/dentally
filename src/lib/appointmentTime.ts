import type { Appointment } from "@/lib/mockData";

const clinicUtcOffsetMinutes = 5 * 60 + 30;
const clinicClockFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function getAppointmentClock(now = new Date()) {
  const parts = Object.fromEntries(clinicClockFormatter.formatToParts(now).map(({ type, value }) => [type, value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export type AppointmentClock = ReturnType<typeof getAppointmentClock>;

export function shiftAppointmentDate(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function parseAppointmentTime(time: string): number | null {
  const match = typeof time === "string" && time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (minutes > 59 || (period ? hours < 1 || hours > 12 : hours > 23)) return null;
  const hours24 = period ? hours % 12 + (period === "PM" ? 12 : 0) : hours;
  return hours24 * 60 + minutes;
}

function getDateMidnightUtc(date: string) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const day = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) return null;
  return day.getTime();
}

export function isFutureAppointment(date: string, time: string, clock = getAppointmentClock()) {
  if (getDateMidnightUtc(date) === null || date < clock.date) return false;
  const timeInMinutes = parseAppointmentTime(time);
  return timeInMinutes !== null && (date > clock.date || timeInMinutes > clock.minutes);
}

export function isSunday(date: string) {
  const day = getDateMidnightUtc(date);
  return day !== null && new Date(day).getUTCDay() === 0;
}

export function getScheduledAppointmentEnd(appointment: Appointment) {
  if (appointment.status !== "scheduled") return null;
  const day = getDateMidnightUtc(appointment.date);
  const start = parseAppointmentTime(appointment.time);
  if (day === null || start === null) return null;

  const duration = Number.isFinite(appointment.durationMinutes) && appointment.durationMinutes > 0
    ? appointment.durationMinutes
    : 30;
  return day + (start + duration - clinicUtcOffsetMinutes) * 60_000;
}

export function findBookedFollowUp(appointments: Appointment[], sourceId: string) {
  return appointments.find((visit) =>
    visit.followUpOfAppointmentId === sourceId && (visit.status === "scheduled" || visit.status === "completed")
  );
}

export type ClinicBookingHours = { workingHoursStart: string; workingHoursEnd: string; slotDuration: number };
export type ClinicDateSchedule = { date: string } & (
  | { status: "closed"; hours?: never }
  | { status: "open"; hours?: ClinicBookingHours }
);
export type ClinicBookingSchedule = ClinicBookingHours & { dateSchedules?: readonly ClinicDateSchedule[] };

export function getClinicHoursForDate(clinic: ClinicBookingSchedule, date: string): ClinicBookingHours | null {
  const schedule = clinic.dateSchedules?.find((entry) => entry.date === date);
  if (schedule?.status === "closed" || (!schedule && isSunday(date))) return null;
  return schedule?.hours ?? clinic;
}

export function getClinicAppointmentSlots(
  clinic: ClinicBookingSchedule,
  date: string,
  durationMinutes?: number,
) {
  const hours = getClinicHoursForDate(clinic, date);
  if (!hours) return [];
  const { workingHoursStart, workingHoursEnd, slotDuration } = hours;
  const start = parseAppointmentTime(workingHoursStart);
  const end = parseAppointmentTime(workingHoursEnd);
  if (start === null || end === null) return [];
  const step = Number.isInteger(slotDuration) && slotDuration >= 5 && slotDuration <= 120 ? slotDuration : 30;
  const duration = durationMinutes ?? step;
  if (!Number.isInteger(duration) || duration <= 0) return [];
  const slots: string[] = [];

  for (let minute = start; minute + duration <= end; minute += step) {
    slots.push(formatAppointmentTime(minute));
  }

  return slots;
}

function formatAppointmentTime(minute: number) {
  const hour = Math.floor(minute / 60);
  const hours = (hour % 12 || 12).toString().padStart(2, "0");
  const minutes = (minute % 60).toString().padStart(2, "0");
  return `${hours}:${minutes} ${hour >= 12 ? "PM" : "AM"}`;
}

export type AppointmentInterval = Pick<Appointment, "_id" | "date" | "time" | "durationMinutes" | "status">;

export function findAppointmentConflict<T extends AppointmentInterval>(appointments: readonly T[], date: string, time: string, durationMinutes = 30, excludeId?: string) {
  const start = parseAppointmentTime(time);
  const day = getDateMidnightUtc(date);
  if (start === null || day === null) return;
  const end = start + durationMinutes;

  return appointments.find((appointment) => {
    if (appointment._id === excludeId) return false;
    if (appointment.status === "cancelled" || appointment.status === "missed") return false;
    const appointmentDay = appointment.date === date ? day : getDateMidnightUtc(appointment.date);
    const appointmentStart = parseAppointmentTime(appointment.time);
    if (appointmentDay === null || appointmentStart === null) return false;
    const adjustedStart = appointmentStart + (appointmentDay - day) / 60_000;
    return start < adjustedStart + (appointment.durationMinutes || 30) && end > adjustedStart;
  });
}
