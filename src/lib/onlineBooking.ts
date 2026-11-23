import { z } from "zod";
import {
  findAppointmentConflict,
  getAppointmentClock,
  getClinicAppointmentSlots,
  isFutureAppointment,
  parseAppointmentTime,
  shiftAppointmentDate,
  type AppointmentInterval,
} from "@/lib/appointmentTime";
import type { Appointment, ClinicProfile, Patient } from "@/lib/mockData";
import { isBookingMobile, normalizeOnlineRegistrationPhone, normalizePatientName, normalizePatientPhone } from "@/lib/patientSearch";

export const onlineBookingWindowDays = 30;

export const bookingDateSchema = z.iso.date();
export const onlineBookingCodeSchema = z.string().regex(/^[a-f0-9]{32}$/);

const patientName = z.string().trim().min(1, "Enter your full name.").max(100, "Enter up to 100 characters.");
const patientPhone = z.string().trim().max(25);
export const onlineRegistrationPhoneError = "Enter a 10-digit Indian mobile number.";

export const bookingIdentitySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("existing"),
    name: patientName,
    phone: patientPhone.refine(isBookingMobile, "Enter a valid mobile number with 10 to 15 digits."),
  }),
  z.object({
    kind: z.literal("new"),
    name: patientName,
    phone: patientPhone.refine((phone) => Boolean(normalizeOnlineRegistrationPhone(phone)), onlineRegistrationPhoneError),
    age: z.number().int().min(0, "Enter an age between 0 and 130.").max(130, "Enter an age between 0 and 130."),
    gender: z.enum(["Female", "Male", "Other"], { error: "Select a gender." }),
  }),
]);

const onlineBookingPreferencesSchema = z.object({
  enabled: z.boolean(),
  visitType: z.string().trim().min(1, "Enter a visit type.").max(100, "Enter up to 100 characters."),
  durationMinutes: z.number().int().min(5).max(480),
  closedDates: z.array(bookingDateSchema).max(100).transform((dates) => [...new Set(dates)].sort()),
});

export const onlineBookingSettingsMutationSchema = z.discriminatedUnion("action", [
  onlineBookingPreferencesSchema.extend({ action: z.literal("save") }),
  z.object({ action: z.literal("replace"), currentCode: onlineBookingCodeSchema }),
]);

export const onlineBookingRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("identify"), identity: bookingIdentitySchema }),
  z.object({
    action: z.literal("book"),
    identity: bookingIdentitySchema,
    date: bookingDateSchema,
    time: z.string().regex(/^\d{2}:\d{2} (AM|PM)$/),
    requestId: z.uuidv4(),
    visitType: onlineBookingPreferencesSchema.shape.visitType,
    durationMinutes: onlineBookingPreferencesSchema.shape.durationMinutes,
  }),
]);

export type BookingIdentity = z.infer<typeof bookingIdentitySchema>;
export type OnlineBookingPreferences = z.infer<typeof onlineBookingPreferencesSchema>;
export type OnlineBookingSettings = OnlineBookingPreferences & { code?: string };
export type OnlineBookingSettingsMutation = z.infer<typeof onlineBookingSettingsMutationSchema>;
export type OnlineBookingRequest = Extract<z.infer<typeof onlineBookingRequestSchema>, { action: "book" }>;
export type PublicBookingClinic = Pick<ClinicProfile, "name" | "phone" | "address"> & {
  visitType: string;
  durationMinutes: number;
  firstDate: string;
  lastDate: string;
};
export type OnlineBookingConfirmation = Pick<Appointment, "date" | "time" | "durationMinutes"> & {
  reference: string;
  visitType: string;
};

export const defaultOnlineBookingPreferences: OnlineBookingPreferences = {
  enabled: false,
  visitType: "Consultation",
  durationMinutes: 30,
  closedDates: [],
};

export function getOnlineBookingDateRange(clock = getAppointmentClock()) {
  return { firstDate: clock.date, lastDate: shiftAppointmentDate(clock.date, onlineBookingWindowDays - 1) };
}

export function formatBookingDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export type BookingHours = Pick<ClinicProfile, "workingHoursStart" | "workingHoursEnd" | "slotDuration">;

export function getOnlineAvailableSlots(
  clinic: BookingHours,
  preferences: Pick<OnlineBookingPreferences, "durationMinutes" | "closedDates">,
  date: string,
  appointments: readonly AppointmentInterval[],
  clock = getAppointmentClock()
) {
  const { firstDate, lastDate } = getOnlineBookingDateRange(clock);
  if (!bookingDateSchema.safeParse(date).success || date < firstDate || date > lastDate || preferences.closedDates.includes(date)) return [];
  const opening = parseAppointmentTime(clinic.workingHoursStart);
  const closing = parseAppointmentTime(clinic.workingHoursEnd);
  if (opening === null || closing === null || closing <= opening) return [];

  return getClinicAppointmentSlots(clinic, { durationMinutes: preferences.durationMinutes }).filter((time) =>
    isFutureAppointment(date, time, clock) && !findAppointmentConflict(appointments, date, time, preferences.durationMinutes)
  );
}

type BookingPatientIdentity = Pick<Patient, "_id" | "name" | "phone">;

export function findOnlineBookingPatient<T extends BookingPatientIdentity>(patients: readonly T[], identity: BookingIdentity) {
  const name = normalizePatientName(identity.name);
  const phone = normalizePatientPhone(identity.phone);
  const matches = patients.filter((patient) =>
    normalizePatientName(patient.name) === name && normalizePatientPhone(patient.phone ?? "") === phone
  );
  if (matches.length === 1) return { status: "matched" as const, patient: matches[0] };
  if (matches.length === 0 && identity.kind === "new") return { status: "new" as const };
  return { status: "unresolved" as const };
}
