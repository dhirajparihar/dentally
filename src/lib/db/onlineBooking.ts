import { randomBytes } from "node:crypto";
import type { ClientSession } from "mongoose";
import { parseAppointmentTime } from "@/lib/appointmentTime";
import { isClinicConfigured } from "@/lib/clinicOnboarding";
import { ClinicAccessError, clinicSetupRequired } from "@/lib/db/clinicOnboarding";
import { connectDB } from "@/lib/db/connect";
import { ClinicProfileModel, type IClinicProfile } from "@/lib/db/models/ClinicProfile";
import { readScheduledAppointmentIntervals, withClinicBookingLock } from "@/lib/db/repository";
import { clinicProfile as defaultClinicProfile } from "@/lib/mockData";
import {
  defaultOnlineBookingPreferences,
  getOnlineAvailableSlots,
  getOnlineBookingDateRange,
  onlineBookingCodeSchema,
  type OnlineBookingSettings,
  type OnlineBookingSettingsMutation,
  type PublicBookingClinic,
} from "@/lib/onlineBooking";
import { inactiveBookingLink, OnlineBookingError } from "@/lib/submitOnlineBooking";

const clinicSelection = "dentistEmail name address phone workingHoursStart workingHoursEnd slotDuration isConfigured regNo upiId onlineBooking";
const activeClinic = { status: { $ne: "suspended" }, isActive: { $ne: false } } as const;
const rateWindowSeconds = 5 * 60;
const requestLimit = 60;

type BookingClinic = Pick<IClinicProfile,
  "dentistEmail" | "name" | "address" | "phone" | "workingHoursStart" | "workingHoursEnd" | "slotDuration" |
  "isConfigured" | "regNo" | "upiId" | "onlineBooking"
>;
type PublicClinic = BookingClinic & { onlineBooking: OnlineBookingSettings & { code: string } };

async function requireDatabase() {
  if (!(await connectDB())) throw new ClinicAccessError("Online booking is temporarily unavailable. Please try again.", 503);
}

async function findConfiguredClinic(filter: { dentistEmail?: string; "onlineBooking.code"?: string }, session?: ClientSession) {
  const query = ClinicProfileModel.findOne({ ...filter, ...activeClinic }).select(clinicSelection);
  if (session) query.session(session);
  const clinic = await query.lean<BookingClinic>().exec();
  if (!clinic || !isClinicConfigured(clinic)) return null;
  return {
    ...clinic,
    workingHoursStart: clinic.workingHoursStart || defaultClinicProfile.workingHoursStart,
    workingHoursEnd: clinic.workingHoursEnd || defaultClinicProfile.workingHoursEnd,
    slotDuration: clinic.slotDuration || defaultClinicProfile.slotDuration,
  };
}

export async function readPublicBookingClinic(code: string, session?: ClientSession): Promise<PublicClinic | null> {
  if (!onlineBookingCodeSchema.safeParse(code).success) return null;
  if (!session) await requireDatabase();
  const clinic = await findConfiguredClinic({ "onlineBooking.code": code }, session);
  if (!clinic?.onlineBooking?.enabled || clinic.onlineBooking.code !== code) return null;
  return { ...clinic, onlineBooking: { ...clinic.onlineBooking, code } };
}

export function getPublicBookingDetails(clinic: PublicClinic): PublicBookingClinic {
  return {
    name: clinic.name || "Dental clinic",
    address: clinic.address || "",
    phone: clinic.phone || "",
    visitType: clinic.onlineBooking.visitType,
    durationMinutes: clinic.onlineBooking.durationMinutes,
    ...getOnlineBookingDateRange(),
  };
}

export async function getPublicBookingSlots(clinic: PublicClinic, date: string) {
  const { firstDate, lastDate } = getOnlineBookingDateRange();
  const { visitType, durationMinutes, closedDates } = clinic.onlineBooking;
  const possible = date >= firstDate && date <= lastDate && !closedDates.includes(date);
  const intervals = possible ? await readScheduledAppointmentIntervals(date, clinic.dentistEmail) : [];
  return {
    firstDate, lastDate, visitType, durationMinutes,
    times: possible ? getOnlineAvailableSlots(clinic, clinic.onlineBooking, date, intervals) : [],
  };
}

function staffSettings(clinic: BookingClinic): OnlineBookingSettings {
  const booking = clinic.onlineBooking;
  if (!booking) return defaultOnlineBookingPreferences;
  const today = getOnlineBookingDateRange().firstDate;
  return {
    enabled: booking.enabled,
    code: booking.code,
    visitType: booking.visitType,
    durationMinutes: booking.durationMinutes,
    closedDates: booking.closedDates.filter((date) => date >= today),
  };
}

export async function readClinicBookingSettings(email: string) {
  await requireDatabase();
  const clinic = await findConfiguredClinic({ dentistEmail: email });
  if (!clinic) throw new ClinicAccessError(clinicSetupRequired, 403);
  return staffSettings(clinic);
}

export async function mutateClinicBookingSettings(email: string, mutation: OnlineBookingSettingsMutation) {
  await requireDatabase();
  await ClinicProfileModel.init();
  return withClinicBookingLock(email, async (session) => {
    const clinic = await findConfiguredClinic({ dentistEmail: email }, session);
    if (!clinic) throw new ClinicAccessError(clinicSetupRequired, 403);
    const current = staffSettings(clinic);
    let settings: OnlineBookingSettings;
    if (mutation.action === "replace") {
      if (!current.code) throw new OnlineBookingError("Save your booking settings to create a link first.", 409, "link_missing");
      if (current.code !== mutation.currentCode) return current;
      settings = { ...current, code: randomBytes(16).toString("hex") };
    } else {
      const { enabled, visitType, durationMinutes, closedDates } = mutation;
      const open = parseAppointmentTime(clinic.workingHoursStart);
      const close = parseAppointmentTime(clinic.workingHoursEnd);
      if (enabled && (open === null || close === null || close - open < durationMinutes)) {
        throw new OnlineBookingError("Set working hours long enough for this visit before enabling online booking.", 400, "invalid_hours");
      }
      settings = {
        code: current.code ?? randomBytes(16).toString("hex"),
        enabled,
        visitType,
        durationMinutes,
        closedDates: closedDates.filter((date) => date >= getOnlineBookingDateRange().firstDate),
      };
    }
    const update = await ClinicProfileModel.updateOne(
      { dentistEmail: email, ...activeClinic },
      { $set: { onlineBooking: settings } },
      { session, runValidators: true }
    ).exec();
    if (update.matchedCount !== 1) throw new ClinicAccessError(clinicSetupRequired, 403);
    return settings;
  });
}

export async function limitOnlineBookingAttempts(clinic: PublicClinic) {
  const seconds = Math.floor(Date.now() / 1000);
  const window = Math.floor(seconds / rateWindowSeconds);
  const filter = {
    dentistEmail: clinic.dentistEmail, ...activeClinic,
    "onlineBooking.code": clinic.onlineBooking.code,
    "onlineBooking.enabled": true,
  };
  const result = await ClinicProfileModel.updateOne(
    {
      ...filter,
      $or: [
        { "onlineBookingRate.window": { $lt: window } },
        { "onlineBookingRate": { $exists: false } },
        { "onlineBookingRate.window": window, "onlineBookingRate.count": { $lt: requestLimit } },
      ],
    },
    [{
      $set: {
        onlineBookingRate: {
          window,
          count: { $cond: [{ $eq: ["$onlineBookingRate.window", window] }, { $add: ["$onlineBookingRate.count", 1] }, 1] },
        },
      },
    }],
    { timestamps: false, updatePipeline: true }
  ).exec();
  if (result.matchedCount) return;
  if (!(await ClinicProfileModel.exists(filter))) throw inactiveBookingLink();
  throw new OnlineBookingError(
    "Online booking has received too many requests. Wait a few minutes or call the clinic.",
    429, "rate_limited", rateWindowSeconds - seconds % rateWindowSeconds
  );
}
