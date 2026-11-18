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

export function isFutureAppointment(date: string, time: string, clock = getAppointmentClock()) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < clock.date) return false;
  const day = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) return false;
  const timeInMinutes = parseAppointmentTime(time);
  return timeInMinutes !== null && (date > clock.date || timeInMinutes > clock.minutes);
}
